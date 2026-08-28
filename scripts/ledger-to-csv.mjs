#!/usr/bin/env node
/**
 * Gera docs/processo/monday-import.csv a partir de docs/processo/task-ledger.md
 *
 *   pnpm ledger:csv
 *
 * O ledger em Markdown e a fonte da verdade; o CSV e artefato. Gerar em vez de
 * manter os dois a mao e o que impede a divergencia silenciosa entre o board e
 * o repositorio.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const md = readFileSync(join(root, 'docs/processo/task-ledger.md'), 'utf8')

const TRILHAS = {
  '🔵': 'Trilha 1 — Nucleo & Dados',
  '🟠': 'Trilha 2 — Plataforma & Integracoes',
  '🟢': 'Trilha 3 — Clientes',
  '—': 'Compartilhada',
}
const STATUS = {
  '✅': 'Done',
  '🟨': 'Working on it',
  '🚧': 'Blocked',
  '⬜': 'Not started',
}

const cells = (line) =>
  line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim())

/** Remove marcacao Markdown: links, codigo, enfase. */
const plain = (s) =>
  s
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*]/g, '')
    .trim()

const linhas = md.split('\n')
const tarefas = []
let grupo = null
let cabecalho = null

for (const linha of linhas) {
  const secao = linha.match(/^## (.+)$/)
  if (secao) {
    grupo = secao[1].replace(/ ✅$/, '').trim()
    cabecalho = null
    continue
  }
  if (/^\|\s*ID\s+\|\s*Tarefa/.test(linha)) {
    cabecalho = cells(linha)
    continue
  }
  if (!cabecalho || !/^\| NR-\d{3} \|/.test(linha)) continue

  const c = cells(linha)
  const at = (nome) => {
    const i = cabecalho.indexOf(nome)
    return i === -1 ? '' : (c[i] ?? '')
  }

  const bloq = plain(at('Bloq'))
  const status = at('Status')
  tarefas.push({
    Name: `${c[0]} — ${plain(at('Tarefa'))}`,
    Group: grupo,
    Trilha: TRILHAS[at('Trilha')] ?? 'Compartilhada',
    Status: status
      ? (STATUS[status] ?? 'Not started')
      : bloq && bloq !== '—'
        ? 'Blocked'
        : 'Not started',
    Priority: grupo?.startsWith('Backlog') ? 'Low' : bloq && bloq !== '—' ? 'High' : 'Medium',
    'Estimate (d)': at('Est'),
    Sprint: grupo?.match(/^Sprint \d/)?.[0] ?? 'Backlog',
    'Depends on': plain(at('Dep')).replace(/^—$/, ''),
    'Blocked by': bloq.replace(/^—$/, ''),
    Module: plain(at('Módulo')),
    Requirements: plain(at('US/RF')),
    // Sem ancora: gerar slug de titulo com acento e travessao da errado com
    // frequencia, e link quebrado no board e pior que link para o topo.
    Docs: 'docs/processo/task-ledger.md',
  })
}

if (tarefas.length === 0) {
  console.error('Nenhuma tarefa encontrada — o formato do ledger mudou?')
  process.exit(1)
}

const colunas = Object.keys(tarefas[0])
const escape = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
const csv = [
  colunas.join(','),
  ...tarefas.map((t) => colunas.map((k) => escape(String(t[k] ?? ''))).join(',')),
].join('\n')

const destino = join(root, 'docs/processo/monday-import.csv')
writeFileSync(destino, csv + '\n', 'utf8')
console.log(`${tarefas.length} tarefas → docs/processo/monday-import.csv`)
