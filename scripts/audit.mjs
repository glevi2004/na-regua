#!/usr/bin/env node
/**
 * Auditoria de dependencias — RNF-029, bloqueante em severidade alta.
 *
 * Existe para separar duas coisas que o `pnpm audit` confunde: ele sai com
 * codigo 1 tanto quando ACHA vulnerabilidade quanto quando NAO CONSEGUE
 * consultar o registry. As duas exigem reacoes opostas — uma pede corrigir um
 * pacote, a outra pede tentar de novo — e o log so revela qual foi para quem
 * baixar o arquivo inteiro.
 *
 * O custo dessa confusao nao e teorico. Na primeira vez que o registry deu
 * timeout, o PR ficou vermelho com "Auditoria de dependencias: Failing after
 * 4m" e a leitura natural foi "meu PR introduziu vulnerabilidade". Repetido
 * algumas vezes, o desfecho previsivel e alguem trocar o passo por
 * `pnpm audit || true` — e ai a vulnerabilidade de verdade passa em silencio,
 * que e exatamente o que a RNF-029 existe para impedir.
 *
 * Aqui os dois casos terminam em vermelho, porque "nao consegui verificar" nao
 * e "verifiquei e esta limpo" — mas com mensagens que nao se parecem.
 */
import { spawnSync } from 'node:child_process'
import { basename } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Severidades que barram o PR — RNF-029. */
const BLOQUEIAM = ['high', 'critical']

const TENTATIVAS = 3
const ESPERA_MS = [0, 15_000, 45_000]

function rodarAudit() {
  /*
   * `--json` para decidir pelo CONTEUDO e nao pelo codigo de saida, que e o
   * ponto do arquivo. `shell: true` porque no Windows o pnpm e um .CMD.
   */
  const r = spawnSync('pnpm', ['audit', '--json'], {
    encoding: 'utf8',
    shell: true,
    /* Sem timeout proprio: o pnpm ja tem o dele, e um timeout menor aqui
       cortaria a tentativa que ia dar certo. */
  })

  return { saida: r.stdout ?? '', erro: r.stderr ?? '', status: r.status }
}

/**
 * O audit CONSEGUIU rodar?
 *
 * A pergunta nao e sobre o codigo de saida — e sobre haver um relatorio.
 * Relatorio com zero vulnerabilidades e sucesso; ausencia de relatorio e
 * "nao verifiquei", por mais que o processo tenha terminado.
 */
export function lerRelatorio(saida) {
  const inicio = saida.indexOf('{')
  if (inicio === -1) return undefined

  try {
    const json = JSON.parse(saida.slice(inicio))
    /* `metadata.vulnerabilities` e o formato do npm/pnpm. Exigir a forma, e nao
       so "e um JSON", evita tratar uma mensagem de erro em JSON como sucesso. */
    return json?.metadata?.vulnerabilities === undefined ? undefined : json
  } catch {
    return undefined
  }
}

export function contarBloqueantes(relatorio) {
  const v = relatorio.metadata.vulnerabilities
  return BLOQUEIAM.reduce((soma, nivel) => soma + (v[nivel] ?? 0), 0)
}

export function listarBloqueantes(relatorio) {
  const advisories = Object.values(relatorio.advisories ?? {})
  return advisories
    .filter((a) => BLOQUEIAM.includes(a.severity))
    .map((a) => `  ${a.severity.padEnd(8)} ${a.module_name} — ${a.title}\n    ${a.url ?? ''}`)
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * `executar` e `dormir` sao parametros para o caminho de falha ser
 * verificavel sem esperar o backoff de verdade — sem isso, conferir a mensagem
 * de "nao rodou" custaria oito minutos e ninguem confere.
 */
export async function main(executar = rodarAudit, dormir = espera) {
  let ultimoErro = ''

  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa += 1) {
    if (ESPERA_MS[tentativa - 1] > 0) {
      console.log(
        `Registry nao respondeu. Tentativa ${tentativa} em ${ESPERA_MS[tentativa - 1] / 1000}s...`,
      )
      await dormir(ESPERA_MS[tentativa - 1])
    }

    const { saida, erro, status } = executar()
    const relatorio = lerRelatorio(saida)

    if (relatorio === undefined) {
      /* Sem relatorio: nao rodou. Guarda e tenta de novo. */
      ultimoErro = (erro || saida || `codigo de saida ${status}`)
        .trim()
        .split('\n')
        .slice(-5)
        .join('\n')
      continue
    }

    const bloqueantes = contarBloqueantes(relatorio)

    if (bloqueantes === 0) {
      const v = relatorio.metadata.vulnerabilities
      console.log(
        `Auditoria OK — nenhuma vulnerabilidade alta ou critica. ` +
          `(moderada: ${v.moderate ?? 0}, baixa: ${v.low ?? 0})`,
      )
      process.exit(0)
    }

    console.error(`\n::error::${bloqueantes} vulnerabilidade(s) de severidade alta ou critica.\n`)
    for (const linha of listarBloqueantes(relatorio)) console.error(linha)
    console.error(
      '\nRNF-029: severidade alta bloqueia. Suba a dependencia, ou registre a excecao\n' +
        'com prazo em docs/decisoes/ se nao houver versao corrigida.',
    )
    process.exit(1)
  }

  /*
   * Esgotou as tentativas sem relatorio nenhum.
   *
   * Termina em vermelho de proposito: "nao consegui verificar" nao e
   * "verifiquei e esta limpo", e deixar passar transformaria uma
   * indisponibilidade do registry numa porta de entrada. Mas a mensagem diz o
   * que aconteceu, para ninguem procurar vulnerabilidade que nao existe.
   */
  console.error(
    `\n::error::A auditoria NAO RODOU — o registry nao respondeu em ${TENTATIVAS} tentativas.\n`,
  )
  console.error('Isto NAO e uma vulnerabilidade no seu PR: nenhum pacote foi reprovado.')
  console.error('Nada foi verificado, e por isso o passo termina em vermelho.\n')
  console.error('O que fazer: re-rode este job. Se persistir, veja https://status.npmjs.org.\n')
  console.error('Ultima resposta do pnpm:')
  console.error(ultimoErro)
  process.exit(1)
}

/* So executa quando chamado direto. Importar o arquivo — para conferir as
   funcoes de decisao — nao dispara auditoria nenhuma. */
if (
  process.argv[1] !== undefined &&
  basename(process.argv[1]) === basename(fileURLToPath(import.meta.url))
) {
  await main()
}
