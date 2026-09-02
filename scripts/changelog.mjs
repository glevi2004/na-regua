#!/usr/bin/env node
/**
 * Gera CHANGELOG.md a partir dos Conventional Commits — NR-016.
 *
 *   pnpm changelog              # do ultimo tag ate HEAD, secao "Nao lancado"
 *   pnpm changelog v0.2.0       # fecha a secao com esse numero de versao
 *
 * Por que script proprio e nao `conventional-changelog`: os pacotes daqui sao
 * `private: true` com versao fixa em `0.0.0` e nunca vao para registry, entao
 * a maior parte do que aquelas ferramentas fazem — bump por pacote, publish,
 * dependencia entre versoes — nao se aplica. O que sobra e agrupar commit por
 * tipo e escopo, que cabe em um arquivo e sai em pt-BR com os escopos reais
 * do monorepo. Ver docs/engenharia/git-workflow.md#versionamento-e-release
 *
 * Usamos squash merge, entao cada PR vira UM commit na main — o historico ja
 * chega no formato que este script espera.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const arquivo = join(root, 'CHANGELOG.md')

/** Titulo de cada tipo. Ordem = ordem das secoes no changelog. */
const TIPOS = new Map([
  ['feat', 'Novidades'],
  ['fix', 'Correções'],
  ['perf', 'Desempenho'],
  ['revert', 'Revertido'],
  ['refactor', 'Refatoração'],
  ['docs', 'Documentação'],
  ['test', 'Testes'],
  ['build', 'Build e dependências'],
  ['ci', 'Integração contínua'],
  ['chore', 'Manutenção'],
  ['style', 'Estilo'],
])

/**
 * Tipos que nao entram por padrao.
 *
 * `style` e formatacao pura e `chore` costuma ser tarefa interna: quem le o
 * changelog quer saber o que mudou no produto, nao que o Prettier rodou. Saem
 * do arquivo, nao do historico — `git log` continua tendo tudo.
 */
const OCULTOS = new Set(['style'])

function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
}

/**
 * Ultima tag de versao, ou `undefined` no primeiro release.
 *
 * `stdio` silencia o "fatal: No names found" que o git escreve quando ainda
 * nao ha tag nenhuma. Nao e erro: e o primeiro release.
 */
function ultimaTag() {
  try {
    return execFileSync('git', ['describe', '--tags', '--abbrev=0', '--match', 'v*'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return undefined
  }
}

/**
 * Separadores de campo e de registro.
 *
 * Sao os caracteres de controle ASCII feitos exatamente para isso (US e RS).
 * Um separador comum como `|` apareceria dentro da mensagem de commit e
 * partiria o registro no lugar errado.
 */
const SEP_CAMPO = '\x1f'
const SEP_REGISTRO = '\x1e'

/**
 * Le os commits do intervalo. `%s` e o assunto e `%b` o corpo — o corpo e onde
 * mora a referencia `NR-xxx`, por convencao do repo.
 */
function commits(desde) {
  const intervalo = desde ? `${desde}..HEAD` : 'HEAD'
  const bruto = git(
    'log',
    intervalo,
    '--no-merges',
    `--pretty=format:%H${SEP_CAMPO}%s${SEP_CAMPO}%b${SEP_REGISTRO}`,
  )

  return bruto
    .split(SEP_REGISTRO)
    .map((bloco) => bloco.trim())
    .filter(Boolean)
    .map((bloco) => {
      const [hash = '', assunto = '', corpo = ''] = bloco.split(SEP_CAMPO)
      return { hash, assunto, corpo }
    })
}

const CABECALHO = /^(?<tipo>\w+)(?:\((?<escopo>[^)]+)\))?(?<quebra>!)?:\s*(?<descricao>.+)$/

function parse(commit) {
  const m = CABECALHO.exec(commit.assunto)
  if (!m?.groups) return undefined

  const { tipo, escopo, quebra, descricao } = m.groups

  /*
   * So o rodape `Refs:` conta — nao qualquer NR-xxx no corpo.
   *
   * A primeira versao varria o corpo inteiro e atribuia o commit a toda tarefa
   * citada em prosa: "enquanto o NR-014 nao existe" virava referencia ao
   * NR-014. Changelog que atribui trabalho a tarefa errada e pior que
   * changelog sem referencia nenhuma.
   */
  const rodape = /^Refs:\s*(.+)$/m.exec(commit.corpo)
  const refs = rodape?.[1] ? [...rodape[1].matchAll(/NR-\d+/g)].map((r) => r[0]) : []

  return {
    tipo,
    escopo,
    descricao,
    hash: commit.hash.slice(0, 7),
    /* `!` no cabecalho ou `BREAKING CHANGE:` no corpo — Conventional Commits. */
    quebraContrato: quebra === '!' || /BREAKING CHANGE:/.test(commit.corpo),
    refs: [...new Set(refs)],
  }
}

function linha(entrada) {
  const escopo = entrada.escopo ? `**${entrada.escopo}**: ` : ''
  const tarefas = entrada.refs.length > 0 ? ` (${entrada.refs.join(', ')})` : ''
  return `- ${escopo}${entrada.descricao}${tarefas} — \`${entrada.hash}\``
}

function secao(entradas, versao) {
  const hoje = new Date().toISOString().slice(0, 10)
  const titulo = versao ? `## ${versao} — ${hoje}` : `## Não lançado`
  const partes = [titulo, '']

  /* Quebra de contrato primeiro: e o que faz alguem adiar a atualizacao. */
  const quebras = entradas.filter((e) => e.quebraContrato)
  if (quebras.length > 0) {
    partes.push('### ⚠️ Mudanças que quebram contrato', '')
    for (const e of quebras) partes.push(linha(e))
    partes.push('')
  }

  for (const [tipo, titulo] of TIPOS) {
    if (OCULTOS.has(tipo)) continue

    const doTipo = entradas.filter((e) => e.tipo === tipo && !e.quebraContrato)
    if (doTipo.length === 0) continue

    partes.push(`### ${titulo}`, '')
    /* Agrupa por escopo para dar para ler so o modulo que interessa. */
    const ordenadas = [...doTipo].sort((a, b) =>
      (a.escopo ?? '').localeCompare(b.escopo ?? '', 'pt-BR'),
    )
    for (const e of ordenadas) partes.push(linha(e))
    partes.push('')
  }

  return partes.join('\n')
}

const PREAMBULO = `# Changelog

Gerado dos [Conventional Commits](https://www.conventionalcommits.org) por
\`pnpm changelog\`. **Não edite à mão** — a próxima geração sobrescreve.

O que não aparece aqui está no \`git log\`: commits de estilo ficam de fora
porque quem lê um changelog quer saber o que mudou no produto.
`

function main() {
  const versao = process.argv[2]
  if (versao && !/^v\d+\.\d+\.\d+$/.test(versao)) {
    console.error(`Versao invalida: ${versao}. Use o formato vX.Y.Z, ex.: v0.2.0`)
    process.exit(1)
  }

  const desde = ultimaTag()
  const entradas = commits(desde).map(parse).filter(Boolean)

  if (entradas.length === 0) {
    console.error(
      desde
        ? `Nenhum commit convencional desde ${desde}. Nada a gerar.`
        : 'Nenhum commit convencional encontrado. Nada a gerar.',
    )
    process.exit(1)
  }

  const novaSecao = secao(entradas, versao)

  /*
   * Preserva o que ja foi lancado: so a secao nova entra no topo. Regerar o
   * arquivo inteiro perderia o historico anterior ao ultimo tag.
   */
  let anterior = ''
  if (existsSync(arquivo)) {
    const atual = readFileSync(arquivo, 'utf8')
    const corte = atual.indexOf('\n## ')
    anterior = corte === -1 ? '' : atual.slice(corte + 1)
    /* Substitui a secao "Nao lancado" em vez de empilhar outra igual. */
    if (anterior.startsWith('## Não lançado')) {
      const proxima = anterior.indexOf('\n## ', 1)
      anterior = proxima === -1 ? '' : anterior.slice(proxima + 1)
    }
  }

  writeFileSync(arquivo, `${PREAMBULO}\n${novaSecao}\n${anterior}`.trimEnd() + '\n')

  const intervalo = desde ? `${desde}..HEAD` : 'desde o inicio'
  console.log(`CHANGELOG.md atualizado — ${entradas.length} commit(s) de ${intervalo}`)
  if (!versao) {
    console.log('Secao "Nao lancado". Rode com a versao para fechar: pnpm changelog v0.2.0')
  }
}

main()
