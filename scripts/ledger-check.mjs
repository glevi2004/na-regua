#!/usr/bin/env node
/**
 * Verifica que os resumos do ledger conferem com as linhas dele.
 *
 *   pnpm ledger:check
 *
 * Existe por causa de um bug real: o painel, a carga por trilha e a tabela de
 * bloqueios tinham numeros escritos a mao que nao fechavam com as tarefas —
 * total de 152 dias quando a soma dava 153, uma trilha com 12 tarefas quando
 * tinha 13, uma tarefa contada duas vezes, e "51 dias bloqueados" na prosa
 * quando a tabela logo abaixo somava 45. Dois erros que se cancelavam na
 * contagem e nao nos dias.
 *
 * Resumo errado e pior que resumo nenhum: e a partir dele que se decide o que
 * entra na sprint. Este script transforma "confira as somas" em portao.
 *
 * Nao reescreve nada e nao mexe no disco — so le e compara.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const LEDGER = 'docs/processo/task-ledger.md'
const CSV = 'docs/processo/monday-import.csv'

/*
 * Normaliza fim de linha antes de qualquer busca.
 *
 * Sem isso, um arquivo gravado com CRLF faz toda procura por cabecalho de
 * secao falhar, e o erro reportado vira "secao nao encontrada" — mensagem que
 * manda a pessoa procurar no lugar errado. O `.gitattributes` e o Prettier
 * mantem LF no repo; isto e cinto de seguranca para quem editar fora deles.
 */
const ler = (rel) => readFileSync(join(root, rel), 'utf8').replaceAll('\r\n', '\n')

const md = ler(LEDGER)
const csv = ler(CSV)

const problemas = []
const erro = (msg) => problemas.push(msg)

const celulas = (linha) =>
  linha
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim())

/** Remove link, codigo e enfase para comparar conteudo de celula. */
const plano = (s) =>
  s
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*]/g, '')
    .trim()

const STATUS_CSV = { '✅': 'Done', '🟨': 'Working on it', '🚧': 'Blocked', '⬜': 'Not started' }
const TRILHA_CSV = {
  '🔵': 'Trilha 1 — Nucleo & Dados',
  '🟠': 'Trilha 2 — Plataforma & Integracoes',
  '🟢': 'Trilha 3 — Clientes',
  '—': 'Compartilhada',
}

/* ---------- 1. as linhas de tarefa, a fonte de tudo ---------- */

const tarefas = new Map()
let cabecalho = null

for (const linha of md.split('\n')) {
  if (/^\|\s*ID\s+\|\s*Tarefa/.test(linha)) {
    cabecalho = celulas(linha)
    continue
  }
  const m = /^\| (NR-\d{3}) \|/.exec(linha)
  if (!cabecalho || !m) continue

  const c = celulas(linha)
  const em = (nome) => {
    const i = cabecalho.indexOf(nome)
    return i === -1 ? '' : (c[i] ?? '')
  }
  const id = m[1]

  if (tarefas.has(id)) erro(`${id} aparece duas vezes. ID nunca e reaproveitado.`)

  const est = Number(em('Est'))
  if (!Number.isInteger(est) || est <= 0) {
    erro(`${id}: estimativa "${em('Est')}" nao e um numero de dias.`)
  }

  tarefas.set(id, {
    est: Number.isInteger(est) ? est : 0,
    trilha: em('Trilha'),
    dep: em('Dep'),
    bloq: plano(em('Bloq')),
    status: em('Status'),
  })
}

if (tarefas.size === 0) {
  console.error(`Nenhuma tarefa encontrada em ${LEDGER} — o formato mudou?`)
  process.exit(1)
}

for (const [id, t] of tarefas) {
  if (!Object.hasOwn(STATUS_CSV, t.status)) {
    erro(`${id}: status "${t.status}" nao e um dos quatro da legenda.`)
  }
  if (!Object.hasOwn(TRILHA_CSV, t.trilha)) {
    erro(`${id}: trilha "${t.trilha}" nao e uma das da legenda.`)
  }
}

/* ---------- 2. coerencia de dependencia ---------- */

// Convencao do ledger: tarefa cuja dependencia esta 🚧 tambem esta 🚧. Deixa-la
// ⬜ enche o painel de trabalho que nao existe, e planejamento manda que
// ninguem comece tarefa bloqueada.
for (const [id, t] of tarefas) {
  if (t.status === '✅') continue
  for (const dep of t.dep.match(/NR-\d{3}/g) ?? []) {
    if (!tarefas.has(dep)) {
      erro(`${id} depende de ${dep}, que nao existe no ledger.`)
      continue
    }
    if (tarefas.get(dep).status === '🚧' && t.status !== '🚧') {
      erro(`${id} esta ${t.status} mas depende de ${dep}, que esta 🚧.`)
    }
  }
  if (t.status === '🚧' && !/DEC-\d{3}/.test(t.bloq)) {
    erro(`${id} esta 🚧 sem referenciar uma DEC-xxx na coluna Bloq.`)
  }
  if (t.status !== '🚧' && /DEC-\d{3}/.test(t.bloq) && t.bloq !== '—') {
    // Tarefa liberada com Bloq preenchido: sobra de decisao que fechou.
    erro(`${id} nao esta 🚧 mas ainda tem "${t.bloq}" na coluna Bloq.`)
  }
}

/* ---------- 3. os totais calculados ---------- */

const soma = (pred) => {
  let n = 0
  let dias = 0
  for (const t of tarefas.values()) {
    if (!pred(t)) continue
    n += 1
    dias += t.est
  }
  return { n, dias }
}

const porDecisao = (t) => t.status === '🚧' && !t.bloq.includes('→')
const porDependencia = (t) => t.status === '🚧' && t.bloq.includes('→')

const calculado = {
  Total: soma(() => true),
  '✅': soma((t) => t.status === '✅'),
  decisao: soma(porDecisao),
  dependencia: soma(porDependencia),
  '⬜': soma((t) => t.status === '⬜'),
}

/* ---------- 4. o painel ---------- */

/** Le uma tabela de duas colunas numericas depois de um titulo `## `. */
function tabelaDaSecao(titulo) {
  const i = md.indexOf(`\n## ${titulo}\n`)
  if (i === -1) return null
  const resto = md.slice(i + 1)
  const fim = resto.indexOf('\n## ', 1)
  return fim === -1 ? resto : resto.slice(0, fim)
}

const painel = tabelaDaSecao('Painel')
if (!painel) {
  erro('Secao "## Painel" nao encontrada.')
} else {
  const esperado = [
    [/^\|\s*Total\s*\|/, 'Total'],
    [/^\|\s*✅/, '✅'],
    [/^\|\s*🚧[^|]*decis/i, 'decisao'],
    [/^\|\s*🚧[^|]*depend/i, 'dependencia'],
    [/^\|\s*⬜/, '⬜'],
  ]

  for (const [padrao, chave] of esperado) {
    const linha = painel.split('\n').find((l) => padrao.test(l))
    if (!linha) {
      erro(`Painel: falta a linha de ${chave}.`)
      continue
    }
    const c = celulas(linha)
    const [n, dias] = [Number(c.at(-2)), Number(c.at(-1))]
    const alvo = calculado[chave]
    if (n !== alvo.n || dias !== alvo.dias) {
      erro(
        `Painel, linha de ${chave}: diz ${n} tarefas / ${dias} dias, ` +
          `as linhas somam ${alvo.n} / ${alvo.dias}.`,
      )
    }
  }
}

/* ---------- 5. carga por trilha ---------- */

const carga = tabelaDaSecao('Carga por trilha')
if (!carga) {
  erro('Secao "## Carga por trilha" nao encontrada.')
} else {
  const porTrilha = new Map()
  for (const t of tarefas.values()) {
    const atual = porTrilha.get(t.trilha) ?? { n: 0, dias: 0 }
    porTrilha.set(t.trilha, { n: atual.n + 1, dias: atual.dias + t.est })
  }

  let somaN = 0
  let somaDias = 0
  for (const linha of carga.split('\n')) {
    if (!/^\|/.test(linha) || /^\|\s*-+/.test(linha)) continue
    const c = celulas(linha)
    if (c.length < 4) continue
    const n = Number(c[1])
    const dias = Number(c[2])
    if (!Number.isInteger(n) || !Number.isInteger(dias)) continue

    const emoji = ['🔵', '🟠', '🟢'].find((e) => c[0].includes(e)) ?? '—'
    const alvo = porTrilha.get(emoji)
    if (!alvo) {
      erro(`Carga por trilha: linha "${plano(c[0])}" nao corresponde a nenhuma trilha.`)
    } else if (n !== alvo.n || dias !== alvo.dias) {
      erro(
        `Carga por trilha, ${plano(c[0])}: diz ${n} / ${dias}, ` +
          `as linhas somam ${alvo.n} / ${alvo.dias}.`,
      )
    }
    somaN += n
    somaDias += dias
  }

  if (somaN !== calculado.Total.n || somaDias !== calculado.Total.dias) {
    erro(
      `Carga por trilha soma ${somaN} tarefas / ${somaDias} dias, ` +
        `mas o total e ${calculado.Total.n} / ${calculado.Total.dias}. ` +
        `Alguma tarefa esta contada duas vezes ou de menos.`,
    )
  }
}

/* ---------- 6. bloqueios por decisao ---------- */

const bloqueios = tabelaDaSecao('Bloqueios por decisão')
if (!bloqueios) {
  erro('Secao "## Bloqueios por decisão" nao encontrada.')
} else {
  // Cada tarefa 🚧 conta UMA vez, na decisao que aparece no proprio Bloq. Uma
  // tarefa pode estar atras de mais de uma decisao; somar todas contaria o
  // mesmo dia duas vezes.
  const diasPorDec = new Map()
  for (const t of tarefas.values()) {
    if (t.status !== '🚧') continue
    const decs = t.bloq.match(/DEC-\d{3}/g)
    if (!decs) continue
    const dono = t.bloq.includes('→') ? decs.at(-1) : decs.join('/')
    diasPorDec.set(dono, (diasPorDec.get(dono) ?? 0) + t.est)
  }

  let somaTabela = 0
  const listadas = new Set()
  for (const linha of bloqueios.split('\n')) {
    if (!/^\|\s*\[?DEC-\d{3}/.test(linha)) continue
    const c = celulas(linha)
    const dias = Number(c.at(-1))
    if (!Number.isInteger(dias)) {
      erro(`Bloqueios: linha "${plano(c[0])}" sem numero de dias parados.`)
      continue
    }
    somaTabela += dias
    for (const dec of plano(c[0]).match(/DEC-\d{3}/g) ?? []) listadas.add(dec)
  }

  const bloqueados = soma((t) => t.status === '🚧').dias
  if (somaTabela !== bloqueados) {
    erro(
      `Bloqueios por decisão soma ${somaTabela} dias, ` + `mas as tarefas 🚧 somam ${bloqueados}.`,
    )
  }

  for (const dec of diasPorDec.keys()) {
    for (const parte of dec.split('/')) {
      if (!listadas.has(parte)) {
        erro(`${parte} bloqueia tarefa mas nao aparece na tabela de bloqueios.`)
      }
    }
  }
}

/* ---------- 7. o CSV nao ficou para tras ---------- */

const linhasCsv = csv.trim().split('\n')
const colunas = celulasCsv(linhasCsv[0])
const idx = (nome) => colunas.indexOf(nome)

/** Divide uma linha de CSV respeitando campo entre aspas. */
function celulasCsv(linha) {
  const saida = []
  let atual = ''
  let dentro = false
  for (let i = 0; i < linha.length; i += 1) {
    const ch = linha[i]
    if (ch === '"') {
      if (dentro && linha[i + 1] === '"') {
        atual += '"'
        i += 1
      } else {
        dentro = !dentro
      }
    } else if (ch === ',' && !dentro) {
      saida.push(atual)
      atual = ''
    } else {
      atual += ch
    }
  }
  saida.push(atual)
  return saida
}

const noCsv = new Map()
for (const linha of linhasCsv.slice(1)) {
  const c = celulasCsv(linha)
  const id = /^(NR-\d{3})/.exec(c[idx('Name')])?.[1]
  if (id) noCsv.set(id, c)
}

if (noCsv.size !== tarefas.size) {
  erro(
    `${CSV} tem ${noCsv.size} tarefas e o ledger tem ${tarefas.size}. ` +
      `Rode \`pnpm ledger:csv\`.`,
  )
}

for (const [id, t] of tarefas) {
  const c = noCsv.get(id)
  if (!c) {
    erro(`${id} nao esta em ${CSV}. Rode \`pnpm ledger:csv\`.`)
    continue
  }
  const estCsv = Number(c[idx('Estimate (d)')])
  if (estCsv !== t.est) {
    erro(`${id}: ledger diz ${t.est} dias, CSV diz ${estCsv}. Rode \`pnpm ledger:csv\`.`)
  }
  const statusCsv = c[idx('Status')]
  if (statusCsv !== STATUS_CSV[t.status]) {
    erro(
      `${id}: ledger esta ${t.status} (${STATUS_CSV[t.status]}), ` +
        `CSV diz ${statusCsv}. Rode \`pnpm ledger:csv\`.`,
    )
  }
  const trilhaCsv = c[idx('Trilha')]
  if (trilhaCsv !== TRILHA_CSV[t.trilha]) {
    erro(`${id}: trilha divergente entre ledger e CSV. Rode \`pnpm ledger:csv\`.`)
  }
}

/* ---------- resultado ---------- */

if (problemas.length > 0) {
  console.error(`\n${problemas.length} problema(s) no ledger:\n`)
  for (const p of problemas) console.error(`  - ${p}`)
  console.error(
    `\nO ledger e a fonte da verdade versionada: as linhas mandam, os resumos` +
      `\nacompanham. Corrija os resumos, nao as linhas.\n`,
  )
  process.exit(1)
}

const { n, dias } = calculado.Total
console.log(
  `${LEDGER} confere: ${n} tarefas, ${dias} dias — ` +
    `${calculado['✅'].n} concluidas, ${calculado.decisao.n} bloqueadas por decisao, ` +
    `${calculado.dependencia.n} por dependencia, ${calculado['⬜'].n} disponiveis.`,
)
