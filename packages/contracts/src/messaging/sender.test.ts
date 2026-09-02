import { describe, expect, it } from 'vitest'
import {
  inboundMessageSchema,
  inboundReadResultSchema,
  mediaKindSchema,
  messageConsentSchema,
  sendMediaRequestSchema,
  sendRejectionReasonSchema,
  sendResultSchema,
  sendTextRequestSchema,
  whatsappNumberSchema,
} from './sender.js'

const AGORA = '2026-09-02T13:00:00.000Z'
const OPT_IN = { basis: 'customer_opt_in' as const, recordedAt: '2026-08-01T10:00:00.000Z' }

const texto = {
  companyId: 'e1',
  to: '41999990000',
  consent: OPT_IN,
  idempotencyKey: 'msg-1',
  body: 'Sua compra foi registrada.',
  requestedAt: AGORA,
}

describe('numero de WhatsApp', () => {
  it('acrescenta o codigo do pais a DDD + numero', () => {
    /* O cadastro guarda DDD + numero; o provedor exige o pais. */
    expect(whatsappNumberSchema.parse('41999990000')).toBe('5541999990000')
    expect(whatsappNumberSchema.parse('4133330000')).toBe('554133330000')
  })

  it('preserva o numero que ja vem com o pais', () => {
    expect(whatsappNumberSchema.parse('5541999990000')).toBe('5541999990000')
  })

  it('descarta a pontuacao do jeito que a pessoa digita', () => {
    expect(whatsappNumberSchema.parse('+55 (41) 99999-0000')).toBe('5541999990000')
  })

  it.each([
    ['119999', 'curto'],
    ['5541999990000123', 'longo'],
    ['', 'vazio'],
    ['abcdefghij', 'sem digito'],
  ])('recusa %s (%s)', (entrada, _motivo) => {
    const r = whatsappNumberSchema.safeParse(entrada)
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe('Numero de WhatsApp invalido. Use DDD e numero.')
    }
  })
})

describe('base de consentimento', () => {
  it('aceita opt-in do cliente, com a data do registro', () => {
    expect(messageConsentSchema.safeParse(OPT_IN).success).toBe(true)
  })

  it('aceita mensagem para a propria usuaria, sem data', () => {
    expect(messageConsentSchema.safeParse({ basis: 'own_user' }).success).toBe(true)
  })

  it('aceita resposta de atendimento, com o instante da mensagem do cliente', () => {
    const r = messageConsentSchema.safeParse({ basis: 'service_reply', inboundAt: AGORA })
    expect(r.success).toBe(true)
  })

  it('exige a data do registro no opt-in', () => {
    /* "Tem consentimento" sem quando nao vale como registro. */
    expect(messageConsentSchema.safeParse({ basis: 'customer_opt_in' }).success).toBe(false)
  })

  it('recusa base inventada', () => {
    expect(messageConsentSchema.safeParse({ basis: 'achei_que_podia' }).success).toBe(false)
  })

  it('recusa objeto vazio — nao existe envio sem declarar a base', () => {
    expect(messageConsentSchema.safeParse({}).success).toBe(false)
  })
})

describe('pedido de texto', () => {
  it('aceita o caso minimo', () => {
    expect(sendTextRequestSchema.safeParse(texto).success).toBe(true)
  })

  it('exige consentimento — o esquecimento e inexpressavel', () => {
    const { consent: _fora, ...semConsentimento } = texto
    expect(sendTextRequestSchema.safeParse(semConsentimento).success).toBe(false)
  })

  it.each([
    [{ ...texto, body: '' }, 'mensagem vazia'],
    [{ ...texto, body: '   ' }, 'so espaco'],
    [{ ...texto, idempotencyKey: '' }, 'sem chave de idempotencia'],
    [{ ...texto, companyId: '' }, 'sem empresa'],
    [{ ...texto, to: '123' }, 'numero invalido'],
    [{ ...texto, requestedAt: '2026-09-02T13:00:00' }, 'instante sem fuso'],
    [{ ...texto, campoInventado: 1 }, 'campo desconhecido'],
  ])('recusa %o (%s)', (entrada, _motivo) => {
    expect(sendTextRequestSchema.safeParse(entrada).success).toBe(false)
  })

  it('recusa mensagem acima de 4096 caracteres', () => {
    expect(sendTextRequestSchema.safeParse({ ...texto, body: 'a'.repeat(4097) }).success).toBe(
      false,
    )
  })
})

describe('pedido de midia', () => {
  const midia = {
    companyId: 'e1',
    to: '41999990000',
    consent: OPT_IN,
    idempotencyKey: 'mid-1',
    kind: 'document' as const,
    url: 'https://exemplo.com/nota.pdf',
    filename: 'nota.pdf',
    requestedAt: AGORA,
  }

  it('aceita documento com nome de arquivo', () => {
    expect(sendMediaRequestSchema.safeParse(midia).success).toBe(true)
  })

  it('aceita imagem com legenda', () => {
    const r = sendMediaRequestSchema.safeParse({
      ...midia,
      kind: 'image',
      url: 'https://exemplo.com/produto.jpg',
      caption: 'Chegou o cafe novo',
      filename: undefined,
    })
    expect(r.success).toBe(true)
  })

  it('recusa URL que nao e URL — o provedor baixa dela', () => {
    const r = sendMediaRequestSchema.safeParse({ ...midia, url: '/local/nota.pdf' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0]?.message).toBe('Link da midia invalido.')
  })

  it.each([['video'], ['audio'], ['sticker']])('recusa midia do tipo %s no MVP', (kind) => {
    expect(mediaKindSchema.safeParse(kind).success).toBe(false)
  })
})

describe('resultado do envio', () => {
  it('aceita enviado com id do provedor', () => {
    const r = sendResultSchema.safeParse({
      status: 'sent',
      messageId: 'wamid.1',
      to: '5541999990000',
      sentAt: AGORA,
    })
    expect(r.success).toBe(true)
  })

  it.each([
    'invalid_number',
    'not_on_whatsapp',
    'blocked_by_recipient',
    'outside_service_window',
    'rate_limited',
  ])('aceita recusa por %s', (reason) => {
    expect(sendRejectionReasonSchema.safeParse(reason).success).toBe(true)
    const r = sendResultSchema.safeParse({
      status: 'rejected',
      reason,
      message: 'Motivo em PT-BR.',
    })
    expect(r.success).toBe(true)
  })

  it('exige mensagem na recusa — a tela precisa dizer o que fazer', () => {
    const r = sendResultSchema.safeParse({
      status: 'rejected',
      reason: 'not_on_whatsapp',
      message: '',
    })
    expect(r.success).toBe(false)
  })

  it('recusa motivo fora da lista', () => {
    expect(sendRejectionReasonSchema.safeParse('nao_quis_mandar').success).toBe(false)
  })
})

describe('mensagem recebida', () => {
  const entrada = {
    providerMessageId: 'wamid.in1',
    from: '5541999990000',
    to: '554133330000',
    text: 'bom dia',
    media: null,
    receivedAt: AGORA,
  }

  it('aceita mensagem de texto', () => {
    expect(inboundMessageSchema.safeParse(entrada).success).toBe(true)
  })

  it('aceita mensagem de midia sem texto', () => {
    const r = inboundMessageSchema.safeParse({
      ...entrada,
      text: null,
      media: { kind: 'image', url: 'https://exemplo.com/foto.jpg', filename: null },
    })
    expect(r.success).toBe(true)
  })

  it('exige text e media explicitamente nulos, nao ausentes', () => {
    const { text: _t, media: _m, ...incompleta } = entrada
    expect(inboundMessageSchema.safeParse(incompleta).success).toBe(false)
  })

  it('exige o numero que recebeu — e por ele que core acha a empresa', () => {
    const { to: _fora, ...semDestino } = entrada
    expect(inboundMessageSchema.safeParse(semDestino).success).toBe(false)
  })
})

describe('leitura do webhook de mensagem', () => {
  it('aceita os quatro estados', () => {
    const casos = [
      {
        status: 'accepted',
        message: {
          providerMessageId: 'wamid.in1',
          from: '5541999990000',
          to: '554133330000',
          text: 'oi',
          media: null,
          receivedAt: AGORA,
        },
      },
      { status: 'ignored', reason: 'Recibo de entrega.' },
      { status: 'invalid_signature' },
      { status: 'malformed', reason: 'Corpo sem entry.' },
    ]

    for (const caso of casos) {
      expect(inboundReadResultSchema.safeParse(caso).success).toBe(true)
    }
  })

  it('assinatura invalida nao carrega motivo', () => {
    const r = inboundReadResultSchema.safeParse({
      status: 'invalid_signature',
      reason: 'HMAC nao confere',
    })
    expect(r.success).toBe(false)
  })

  it('recusa estado fora da uniao', () => {
    expect(inboundReadResultSchema.safeParse({ status: 'erro' }).success).toBe(false)
  })
})
