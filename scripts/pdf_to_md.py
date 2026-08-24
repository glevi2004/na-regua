"""Converte um PDF (ex.: docs/ZapGestor_Apresentacao.pdf) para Markdown.

Uso:
    python scripts/pdf_to_md.py docs/ZapGestor_Apresentacao.pdf docs/ZapGestor_Apresentacao.md

Requer: pip install pypdf
"""

import sys
from pathlib import Path

from pypdf import PdfReader


def pdf_to_md(pdf_path: Path, md_path: Path) -> None:
    reader = PdfReader(str(pdf_path))
    lines = [f"# {pdf_path.stem}\n"]

    for i, page in enumerate(reader.pages, start=1):
        lines.append(f"\n## Página {i}\n")
        lines.append(page.extract_text() or "")

    md_path.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Uso: python scripts/pdf_to_md.py <entrada.pdf> <saida.md>")
        sys.exit(1)

    pdf_to_md(Path(sys.argv[1]), Path(sys.argv[2]))
