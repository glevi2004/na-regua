#!/usr/bin/env python3
"""Convert a PDF into Markdown, preserving page/slide boundaries.

Text is reconstructed from PyMuPDF span data so that font-size jumps become
heading levels and bold/large lines stay distinguishable. Optionally renders
each page to PNG (useful for slide decks where layout carries meaning).

Usage:
    python scripts/pdf_to_md.py input.pdf [-o output.md] [--images DIR] [--dpi N]
"""

import argparse
import os
import re
import sys

import fitz  # PyMuPDF


def collect_sizes(doc):
    """Return the body-text font size (the most common rounded span size)."""
    counts = {}
    for page in doc:
        for block in page.get_text("dict")["blocks"]:
            if block.get("type") != 0:
                continue
            for line in block["lines"]:
                for span in line["spans"]:
                    text = span["text"].strip()
                    if not text:
                        continue
                    size = round(span["size"], 1)
                    counts[size] = counts.get(size, 0) + len(text)
    if not counts:
        return 10.0
    return max(counts.items(), key=lambda kv: kv[1])[0]


def heading_level(size, body_size):
    ratio = size / body_size if body_size else 1.0
    if ratio >= 1.8:
        return 2
    if ratio >= 1.45:
        return 3
    if ratio >= 1.18:
        return 4
    return 0


BULLET_RE = re.compile(r"^\s*([•●▪◦‣⁃\-\*·])\s+")


def line_text(line):
    return "".join(span["text"] for span in line["spans"])


def is_bold(line):
    spans = [s for s in line["spans"] if s["text"].strip()]
    if not spans:
        return False
    return all(
        (s["flags"] & 2 ** 4) or "bold" in s["font"].lower() for s in spans
    )


def _block_text(block):
    return "".join(
        span["text"] for line in block["lines"] for span in line["spans"]
    ).strip()


def _columns(blocks, gutter):
    """Merge block x-ranges into columns separated by at least `gutter`.

    Decorative one- or two-glyph blocks (flow arrows, check marks, step badges)
    are ignored here: they often sit in the gutter and would otherwise fuse
    neighbouring columns into one.
    """
    real = [b for b in blocks if len(_block_text(b)) > 2] or blocks
    columns = []
    for x0, x1 in sorted((b["bbox"][0], b["bbox"][2]) for b in real):
        if columns and x0 <= columns[-1][1] + gutter:
            columns[-1][1] = max(columns[-1][1], x1)
        else:
            columns.append([x0, x1])
    return columns


def order_blocks(blocks, page_width):
    """Sort blocks into human reading order, handling multi-column slide layouts.

    Wide blocks (titles, footers, full-width callouts) are pulled out as row
    separators until the remaining blocks fall into clean vertical columns.
    Those separators then split the page into horizontal bands, and inside each
    band whole columns are emitted one at a time — so side-by-side cards no
    longer interleave line by line.
    """
    if not blocks:
        return []

    gutter = 0.03 * page_width
    spanning_ids = set()
    rest = blocks
    columns = _columns(rest, gutter)

    # Widest first: a block only counts as a separator if removing it is what
    # reveals the column structure underneath.
    for block in sorted(blocks, key=lambda b: b["bbox"][0] - b["bbox"][2]):
        if len(columns) >= 2:
            break
        if (block["bbox"][2] - block["bbox"][0]) < 0.30 * page_width:
            break
        spanning_ids.add(id(block))
        rest = [b for b in blocks if id(b) not in spanning_ids]
        columns = _columns(rest, gutter)

    if len(columns) < 2:
        return sorted(blocks, key=lambda b: (round(b["bbox"][1], 1), round(b["bbox"][0], 1)))

    dividers = sorted(blocks[i]["bbox"][1] for i in range(len(blocks)) if id(blocks[i]) in spanning_ids)

    def band_of(block):
        return sum(1 for d in dividers if d <= block["bbox"][1] + 0.5)

    def column_of(block):
        if id(block) in spanning_ids:
            return -1  # separators lead their band
        center = (block["bbox"][0] + block["bbox"][2]) / 2
        for i, (x0, x1) in enumerate(columns):
            if x0 - gutter <= center <= x1 + gutter:
                return i
        return len(columns)

    return sorted(
        blocks,
        key=lambda b: (band_of(b), column_of(b), round(b["bbox"][1], 1), round(b["bbox"][0], 1)),
    )


def page_to_markdown(page, body_size):
    """Render one page's text blocks to markdown, in reading order."""
    blocks = [b for b in page.get_text("dict")["blocks"] if b.get("type") == 0]
    blocks = order_blocks(blocks, page.rect.width)

    out = []
    for block in blocks:
        for line in block["lines"]:
            raw = line_text(line)
            text = raw.strip()
            if not text:
                continue

            sizes = [s["size"] for s in line["spans"] if s["text"].strip()]
            size = max(sizes) if sizes else body_size

            bullet = BULLET_RE.match(text)
            if bullet:
                out.append("- " + BULLET_RE.sub("", text).strip())
                continue

            level = heading_level(size, body_size)
            if level:
                out.append("#" * level + " " + text)
            elif is_bold(line):
                out.append(f"**{text}**")
            else:
                out.append(text)
        out.append("")  # blank line between blocks

    # collapse runs of blank lines
    cleaned = []
    for line in out:
        if line == "" and cleaned and cleaned[-1] == "":
            continue
        cleaned.append(line)
    return "\n".join(cleaned).strip()


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("pdf")
    ap.add_argument("-o", "--output", help="markdown output path (default: <pdf>.md)")
    ap.add_argument("--images", help="directory to render page PNGs into")
    ap.add_argument("--dpi", type=int, default=110, help="render DPI (default 110)")
    args = ap.parse_args()

    if not os.path.exists(args.pdf):
        sys.exit(f"not found: {args.pdf}")

    doc = fitz.open(args.pdf)
    body_size = collect_sizes(doc)

    out_path = args.output or os.path.splitext(args.pdf)[0] + ".md"
    title = os.path.splitext(os.path.basename(args.pdf))[0]

    parts = [f"# {title}", "", f"> {len(doc)} pages — extracted from `{os.path.basename(args.pdf)}`", ""]

    if args.images:
        os.makedirs(args.images, exist_ok=True)

    for i, page in enumerate(doc, start=1):
        parts.append(f"---\n\n## Page {i}\n")
        body = page_to_markdown(page, body_size)
        parts.append(body if body else "_(no extractable text — likely an image-only page)_")
        parts.append("")

        if args.images:
            png = os.path.join(args.images, f"page-{i:02d}.png")
            page.get_pixmap(dpi=args.dpi).save(png)

    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(parts).rstrip() + "\n")

    print(f"wrote {out_path} ({len(doc)} pages, body size {body_size}pt)")
    if args.images:
        print(f"rendered PNGs -> {args.images}")


if __name__ == "__main__":
    main()
