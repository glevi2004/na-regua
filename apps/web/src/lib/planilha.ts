/**
 * Leitura de planilhas para os assistentes de importacao.
 *
 * CSV e lido no proprio navegador: a previa precisa ser instantanea, e
 * mandar o arquivo ao servidor so para mostrar as primeiras linhas seria
 * uma ida e volta desnecessaria.
 *
 * .xlsx NAO e lido no cliente — abrir esse formato exigiria uma biblioteca
 * pesada no bundle. O arquivo vai para o backend, que devolve exatamente o
 * mesmo formato `PlanilhaLida`, entao a tela nao muda.
 */

import type { CampoImportacao } from '@/components/app/ImportarPlanilha'

export type PlanilhaLida = {
  colunas: string[]
  linhas: string[][]
}

export type ErroImportacao = {
  linha: number
  nome: string
  motivo: string
  tipo: 'invalido' | 'duplicado'
}

export type RelatorioImportacao = {
  importados: number
  ignorados: number
  erros: ErroImportacao[]
}

/** Le um CSV, detectando o separador usado. */
export function lerCsv(texto: string): PlanilhaLida {
  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  if (linhas.length === 0) return { colunas: [], linhas: [] }

  /* Planilha exportada em pt-BR costuma sair com ponto e virgula. */
  const cabecalho = linhas[0]
  const sep = cabecalho.split(';').length > cabecalho.split(',').length ? ';' : ','

  const partir = (linha: string) => linha.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''))

  return {
    colunas: partir(cabecalho),
    linhas: linhas.slice(1).map(partir),
  }
}

/**
 * SUBSTITUIR POR: POST /importar/previa
 *
 * O backend abre o .xlsx e devolve o mesmo formato do CSV. Enquanto isso
 * nao existe, devolvemos um cabecalho coerente com os campos pedidos para
 * a tela poder ser exercitada.
 */
export async function analisarPlanilhaXlsx(
  arquivo: File,
  campos: CampoImportacao[],
): Promise<{ ok: true; planilha: PlanilhaLida } | { ok: false; error: string }> {
  await new Promise((r) => setTimeout(r, 1200))
  void arquivo

  return {
    ok: true,
    planilha: {
      colunas: campos.map((c) => c.label),
      linhas: [campos.map(() => '—')],
    },
  }
}
