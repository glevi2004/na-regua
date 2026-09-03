#!/usr/bin/env node
/**
 * Auditoria de dependencias — RNF-029, bloqueante em severidade alta.
 *
 * Existe para separar duas coisas que o `pnpm audit` confunde: ele sai com
 * codigo 1 tanto quando ACHA vulnerabilidade quanto quando NAO CONSEGUE
 * consultar o registry. As duas exigem reacoes opostas — uma pede corrigir um
 * pacote, a outra pede esperar — e o log so revela qual foi para quem baixar o
 * arquivo inteiro.
 *
 * O custo dessa confusao nao e teorico. No PR #74 o passo ficou vermelho com
 * "Auditoria de dependencias: Failing after 4m" e a leitura natural foi "meu PR
 * introduziu vulnerabilidade". Repetido algumas vezes, o desfecho previsivel e
 * alguem trocar o passo por `pnpm audit || true` — e ai a vulnerabilidade de
 * verdade passa em silencio, que e exatamente o que a RNF-029 impede.
 *
 * Os dois casos continuam terminando em vermelho, porque "nao consegui
 * verificar" nao e "verifiquei e esta limpo". O que muda e a mensagem.
 *
 * **NAO ha laco de repeticao aqui, e a ausencia foi aprendida.** A primeira
 * versao tentava tres vezes com espera crescente. O `pnpm audit` ja retenta
 * tres vezes por dentro (10s, 60s), entao o laco externo virou nove idas a
 * rede: o job levou 10min40 e o `timeout-minutes: 10` o matou. Passo CANCELADO
 * e pior que vermelho — nao diz se achou vulnerabilidade, se nao rodou, ou se
 * alguem apertou o botao.
 *
 * O que este arquivo agrega e a LEITURA do desfecho, nao mais tentativas.
 */
import { spawnSync } from 'node:child_process'
import { basename } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Severidades que barram o PR — RNF-029. */
const BLOQUEIAM = ['high', 'critical']

/**
 * Teto da execucao, folgado abaixo do `timeout-minutes: 10` do job.
 *
 * O pnpm ja tem o proprio backoff e leva ~4min ate desistir. Este teto e para o
 * caso em que ele NAO desiste: melhor um vermelho que explica do que um
 * cancelamento que nao explica nada.
 */
const TETO_MS = 6 * 60 * 1000

function rodarAudit() {
  /*
   * `--json` para decidir pelo CONTEUDO e nao pelo codigo de saida, que e o
   * ponto do arquivo. `shell: true` porque no Windows o pnpm e um .CMD.
   */
  const r = spawnSync('pnpm', ['audit', '--json'], {
    encoding: 'utf8',
    shell: true,
    timeout: TETO_MS,
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

/**
 * `executar` e parametro para os tres desfechos serem verificaveis sem
 * depender do registry — sem isso, conferir a mensagem de "nao rodou" exigiria
 * uma indisponibilidade de verdade, e ninguem conferiria.
 */
export function main(executar = rodarAudit) {
  const { saida, erro, status } = executar()
  const relatorio = lerRelatorio(saida)

  if (relatorio === undefined) {
    /*
     * Vermelho de proposito: "nao consegui verificar" nao e "verifiquei e esta
     * limpo", e deixar passar transformaria indisponibilidade do registry em
     * porta de entrada. Mas a mensagem diz o que aconteceu, para ninguem
     * procurar vulnerabilidade que nao existe.
     */
    const ultimo = (erro || saida || `codigo de saida ${status}`)
      .trim()
      .split('\n')
      .slice(-5)
      .join('\n')

    console.error('\n::error::A auditoria NAO RODOU — o registry nao respondeu.\n')
    console.error('Isto NAO e uma vulnerabilidade no seu PR: nenhum pacote foi reprovado.')
    console.error('Nada foi verificado, e por isso o passo termina em vermelho.\n')
    console.error('O que fazer: confira https://status.npmjs.org e re-rode o job.')
    console.error('Se o endpoint /-/npm/v1/security/advisories/bulk estiver fora,')
    console.error('re-rodar nao adianta — o jeito e esperar.\n')
    console.error('Ultima resposta do pnpm:')
    console.error(ultimo)
    return 1
  }

  const bloqueantes = contarBloqueantes(relatorio)

  if (bloqueantes === 0) {
    const v = relatorio.metadata.vulnerabilities
    console.log(
      `Auditoria OK — nenhuma vulnerabilidade alta ou critica. ` +
        `(moderada: ${v.moderate ?? 0}, baixa: ${v.low ?? 0})`,
    )
    return 0
  }

  console.error(`\n::error::${bloqueantes} vulnerabilidade(s) de severidade alta ou critica.\n`)
  for (const linha of listarBloqueantes(relatorio)) console.error(linha)
  console.error(
    '\nRNF-029: severidade alta bloqueia. Suba a dependencia, ou registre a excecao\n' +
      'com prazo em docs/decisoes/ se nao houver versao corrigida.',
  )
  return 1
}

/* So executa quando chamado direto. Importar o arquivo — para conferir as
   funcoes de decisao — nao dispara auditoria nenhuma. */
if (
  process.argv[1] !== undefined &&
  basename(process.argv[1]) === basename(fileURLToPath(import.meta.url))
) {
  process.exit(main())
}
