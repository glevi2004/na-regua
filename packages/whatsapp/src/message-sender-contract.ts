import {
  inboundReadResultSchema,
  sendResultSchema,
  type InboundReadResult,
  type SendMediaRequest,
  type SendResult,
  type SendTextRequest,
} from '@na-regua/contracts'
import { describe, expect, it } from 'vitest'

/**
 * Suite de contrato da porta `MessageSender`.
 *
 * Nao conhece o falso, so a porta. Quando o adapter real entrar (NR-046), ele
 * passa por aqui ou nao e substituivel.
 *
 * Fica de fora o que exige o segredo do webhook do adapter (o real le de
 * `WHATSAPP_WEBHOOK_SECRET`) e a injecao de recusa por numero. Assinatura
 * invalida fica dentro: e propriedade universal.
 */

export type RemetenteSobTeste = {
  sendText(request: SendTextRequest): Promise<SendResult>
  sendMedia(request: SendMediaRequest): Promise<SendResult>
  readInbound(rawBody: string, signature: string): InboundReadResult
}

const EMPRESA = 'empresa-1'
const AGORA = '2026-09-02T13:00:00.000Z'
const CLIENTE = '41999990000'

export function pedidoDeTexto(sobrescreve: Partial<SendTextRequest> = {}): SendTextRequest {
  return {
    companyId: EMPRESA,
    to: CLIENTE,
    consent: { basis: 'customer_opt_in', recordedAt: '2026-08-01T10:00:00.000Z' },
    idempotencyKey: 'msg-1',
    body: 'Sua compra foi registrada. Obrigado!',
    requestedAt: AGORA,
    ...sobrescreve,
  }
}

export function pedidoDeMidia(sobrescreve: Partial<SendMediaRequest> = {}): SendMediaRequest {
  return {
    companyId: EMPRESA,
    to: CLIENTE,
    consent: { basis: 'customer_opt_in', recordedAt: '2026-08-01T10:00:00.000Z' },
    idempotencyKey: 'mid-1',
    kind: 'document',
    url: 'https://fake.local/danfe/1.pdf',
    filename: 'nota-fiscal.pdf',
    requestedAt: AGORA,
    ...sobrescreve,
  }
}

export function verificarContratoDoRemetente(nome: string, criar: () => RemetenteSobTeste): void {
  describe(`contrato MessageSender — ${nome}`, () => {
    it('envia texto e devolve resultado que satisfaz o contrato', async () => {
      const remetente = criar()

      const resultado = await remetente.sendText(pedidoDeTexto())

      expect(() => sendResultSchema.parse(resultado)).not.toThrow()
      expect(resultado.status).toBe('sent')
      if (resultado.status !== 'sent') return
      expect(resultado.messageId.length).toBeGreaterThan(0)
    })

    it('normaliza o numero para o formato com codigo do pais', async () => {
      const remetente = criar()

      const resultado = await remetente.sendText(pedidoDeTexto({ to: '(41) 99999-0000' }))

      expect(resultado.status).toBe('sent')
      if (resultado.status !== 'sent') return
      /* O cadastro guarda DDD + numero; o provedor exige o pais. A diferenca
         entre os dois e a origem de "a mensagem nao chegou e ninguem sabe". */
      expect(resultado.to).toBe('5541999990000')
    })

    it('envia midia com nome de arquivo', async () => {
      const remetente = criar()

      const resultado = await remetente.sendMedia(pedidoDeMidia())

      expect(() => sendResultSchema.parse(resultado)).not.toThrow()
      expect(resultado.status).toBe('sent')
    })

    it('reenviar a mesma chave de idempotencia nao manda duas mensagens', async () => {
      const remetente = criar()
      const pedido = pedidoDeTexto()

      const primeira = await remetente.sendText(pedido)
      const segunda = await remetente.sendText(pedido)

      /* Fila reprocessa, e mensagem repetida faz o lojista parecer insistente
         com o cliente dele. */
      expect(segunda).toEqual(primeira)
    })

    it('recusa webhook com assinatura invalida', async () => {
      const remetente = criar()

      const resultado = remetente.readInbound('{"entry":[]}', 'assinatura-forjada')

      expect(() => inboundReadResultSchema.parse(resultado)).not.toThrow()
      /* Nao e 200: 200 ensina o atacante que o corpo foi aceito. */
      expect(resultado.status).toBe('invalid_signature')
    })

    it('recusa webhook sem assinatura nenhuma', async () => {
      const remetente = criar()

      expect(remetente.readInbound('{"entry":[]}', '').status).toBe('invalid_signature')
    })
  })
}
