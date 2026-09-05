import type { RevenueByMonthInput, RevenueByMonthOutput, RevenueMonth } from '@na-regua/contracts'
import type { ExecutionContext } from '../context.js'
import type { MesFaturado, ReportRepository } from '../ports/report-repository.js'

export type RevenueReportDeps = {
  readonly reports: ReportRepository
}

/**
 * Faturamento mes a mes — NR-077, US-041.
 *
 * Leitura: sem `assertCanWrite`. `accountant` e somente leitura e e quem mais
 * abre relatorio.
 *
 * A serie sai COMPLETA: todo mes entre o inicio e o fim aparece, com zeros
 * quando nao houve venda. O `GROUP BY` do banco devolve so os meses que tiveram
 * movimento, e entregar isso direto faria um grafico de doze meses com nove
 * barras e nenhuma indicacao de que faltam tres — o mes parado sumiria em vez
 * de aparecer parado. E o criterio de aceite da US-041: "periodo sem movimento
 * → zeros explicitos, nao erro".
 */
export async function buildRevenueByMonth(
  deps: RevenueReportDeps,
  ctx: ExecutionContext,
  input: RevenueByMonthInput,
): Promise<RevenueByMonthOutput> {
  const comVenda = await deps.reports.revenueByMonth(ctx.companyId, input.from, input.to)
  const porMes = new Map(comVenda.map((m) => [m.month, m]))

  const months = mesesEntre(input.from, input.to).map((mes) => paraSaida(mes, porMes.get(mes)))

  return {
    from: input.from,
    to: input.to,
    months,
    totalNetCents: months.reduce((soma, m) => soma + m.netCents, 0),
  }
}

const MES_VAZIO = { grossCents: 0, discountsCents: 0, netCents: 0, salesCount: 0 }

function paraSaida(month: string, mes: MesFaturado | undefined): RevenueMonth {
  const { grossCents, discountsCents, netCents, salesCount } = mes ?? MES_VAZIO

  return {
    month,
    grossCents,
    discountsCents,
    netCents,
    salesCount,
    averageTicketCents: salesCount === 0 ? null : Math.round(netCents / salesCount),
  }
}

/**
 * Os meses do periodo, de AAAA-MM-DD a AAAA-MM-DD, inclusive nas duas pontas.
 *
 * Aritmetica sobre os numeros do texto, e nao sobre `Date`. `new Date('2026-01-31')`
 * e meia-noite UTC, e somar um mes a ele em maquina no fuso de Sao Paulo pula
 * ou repete mes de acordo com o dia — que e exatamente o defeito que ja custou
 * uma correcao nas datas de vencimento. Aqui nao existe instante nenhum: mes e
 * ano sao contagem, e contagem nao tem fuso.
 */
function mesesEntre(from: string, to: string): string[] {
  const [anoInicial, mesInicial] = from.split('-').map(Number) as [number, number]
  const [anoFinal, mesFinal] = to.split('-').map(Number) as [number, number]

  /* Meses corridos desde o ano zero: transforma "ate o fim" numa comparacao de
     inteiros, sem carregar o "12 vira 1 e o ano anda" para dentro do laco. */
  const primeiro = anoInicial * 12 + (mesInicial - 1)
  const ultimo = anoFinal * 12 + (mesFinal - 1)

  const meses: string[] = []

  for (let n = primeiro; n <= ultimo; n += 1) {
    const ano = Math.floor(n / 12)
    const mes = (n % 12) + 1
    meses.push(`${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}`)
  }

  return meses
}
