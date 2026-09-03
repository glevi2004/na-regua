import { QUEUES } from '../queues.js'
import type { ConsumerDeps, RecebivelVencido, ResultadoDoJob } from './types.js'

/**
 * Varredura diaria de recebiveis vencidos — fluxos.md, RF-015.
 *
 * Este consumidor **nao envia mensagem**: ele le os vencidos e enfileira um
 * envio para cada. A separacao importa por dois motivos concretos:
 *
 * - Uma varredura que envia direto tem o tempo de trezentos envios dentro de um
 *   job so. Se o job falhar no envio 280, retentar reenvia os 279 primeiros —
 *   e o cliente que ja recebeu a cobranca recebe de novo.
 * - Com um job por mensagem, a politica de tentativas vale POR cliente: quem
 *   falhou por instabilidade e retentado sozinho.
 *
 * Uma falha ao enfileirar um item nao derruba os outros. O resultado conta os
 * dois lados, porque "varredura concluida" sem numero nao distingue trezentas
 * cobrancas enfileiradas de zero.
 */
export async function consumirCobranca(deps: ConsumerDeps): Promise<ResultadoDoJob> {
  const hoje = deps.now().toISOString().slice(0, 10)
  const vencidos = await deps.overdue.listOverdue(hoje)

  let enfileirados = 0
  const falhas: string[] = []

  for (const r of vencidos) {
    try {
      await deps.enqueue.add(QUEUES.whatsappSend, {
        companyId: r.companyId,
        to: r.phone,
        body: textoDaCobranca(r),
      })
      enfileirados += 1
    } catch {
      /* Guarda o id e segue: parar aqui deixaria os demais sem cobranca por
         causa de um. A varredura roda de novo amanha, e a linha de log diz
         quais ficaram para tras. */
      falhas.push(r.receivableId)
    }
  }

  return {
    outcome: 'scanned',
    detalhes: { hoje, vencidos: vencidos.length, enfileirados, falhas },
  }
}

/**
 * O texto da cobranca.
 *
 * Fica aqui **provisoriamente**, e isso e divida reconhecida: mensagem que o
 * cliente le e regra de produto, e regra em consumidor de fila e regra que o
 * canal WhatsApp (NR-060) nao vai aplicar igual. Quando existir um caso de uso
 * de cobranca em `core`, o texto vai junto e este consumidor volta a ser so
 * orquestracao.
 *
 * Sem valor em reais formatado por conta propria: `money` faz isso, e duplicar
 * a formatacao de dinheiro e como as duas versoes divergem no centavo.
 */
export function textoDaCobranca(r: RecebivelVencido): string {
  return (
    `Ola, ${r.customerName}! Passando para lembrar do valor em aberto ` +
    `com vencimento em ${formatarDia(r.dueDate)}. Qualquer duvida, e so responder por aqui.`
  )
}

/** `AAAA-MM-DD` para `DD/MM`. O ano so aparece quando muda, e ainda nao muda. */
function formatarDia(iso: string): string {
  const [, mes, dia] = iso.split('-')
  return `${dia}/${mes}`
}
