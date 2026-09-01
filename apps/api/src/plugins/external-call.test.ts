import { describe, expect, it, vi } from 'vitest'
import { mask, withExternalCallLogging } from './external-call.js'

/** Logger falso: guarda o que foi registrado para o teste inspecionar. */
function fakeLog() {
  return {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    silent: vi.fn(),
    level: 'info',
    child: vi.fn(),
  }
}

describe('mask', () => {
  it.each([
    ['senha', 'minhasenha123'],
    ['password', 'hunter2'],
    ['token', 'abc.def.ghi'],
    ['apiKey', 'sk-live-1234'],
    ['authorization', 'Bearer xyz'],
    ['cpf', '52998224725'],
    ['cnpj', '11222333000181'],
    ['email', 'joana@exemplo.com'],
    ['telefone', '11987654321'],
    ['cardNumber', '4111111111111111'],
  ])('mascara o campo %s', (chave, valor) => {
    const saida = mask({ [chave]: valor }) as Record<string, string>

    expect(saida[chave]).not.toBe(valor)
    expect(saida[chave]).not.toContain(valor)
  })

  it('preserva o que nao e sensivel — senao o log perde utilidade', () => {
    const saida = mask({ orderId: 'ped-42', total: 4990, pago: true })

    expect(saida).toEqual({ orderId: 'ped-42', total: 4990, pago: true })
  })

  it('desce em objeto aninhado', () => {
    const saida = mask({ cliente: { nome: 'Joana', cpf: '52998224725' } }) as {
      cliente: Record<string, string>
    }

    expect(saida.cliente.nome).toBe('Joana')
    expect(saida.cliente.cpf).not.toContain('52998224725')
  })

  it('desce em array', () => {
    const saida = mask([{ token: 'segredo-1' }, { token: 'segredo-2' }]) as Record<string, string>[]

    expect(saida[0]?.token).not.toContain('segredo-1')
    expect(saida[1]?.token).not.toContain('segredo-2')
  })

  it('corta profundidade em vez de percorrer estrutura infinita', () => {
    const ciclo: Record<string, unknown> = {}
    ciclo.self = ciclo

    expect(() => mask(ciclo)).not.toThrow()
  })

  it('nao guarda valor curto nem parcialmente', () => {
    expect(mask({ token: 'abcd' })).toEqual({ token: '[oculto]' })
  })

  it('passa null e undefined adiante sem quebrar', () => {
    expect(mask(null)).toBeNull()
    expect(mask(undefined)).toBeUndefined()
  })
})

describe('withExternalCallLogging', () => {
  it('devolve o resultado e registra a duracao no sucesso', async () => {
    const log = fakeLog()

    const saida = await withExternalCallLogging(log as never, {
      operation: 'pagmaxx.criarCobranca',
      run: async () => ({ id: 'cob-1' }),
    })

    expect(saida).toEqual({ id: 'cob-1' })
    expect(log.debug).toHaveBeenCalledOnce()
    expect(log.error).not.toHaveBeenCalled()

    const [dados] = log.debug.mock.calls[0] as [Record<string, unknown>]
    expect(dados.operation).toBe('pagmaxx.criarCobranca')
    expect(typeof dados.durationMs).toBe('number')
  })

  it('relanca o erro — log nao e tratamento', async () => {
    const log = fakeLog()

    await expect(
      withExternalCallLogging(log as never, {
        operation: 'fiscal.emitir',
        run: async () => {
          throw new Error('502 Bad Gateway')
        },
      }),
    ).rejects.toThrow('502 Bad Gateway')
  })

  it('registra requisicao, resposta e duracao na falha — RNF-059', async () => {
    const log = fakeLog()

    await expect(
      withExternalCallLogging(log as never, {
        operation: 'fiscal.emitir',
        request: { cnpj: '11222333000181', valor: 4990 },
        run: async () => {
          throw Object.assign(new Error('recusado'), { response: { erro: 'CNPJ invalido' } })
        },
      }),
    ).rejects.toThrow()

    const [dados] = log.error.mock.calls[0] as [Record<string, unknown>]
    expect(dados.operation).toBe('fiscal.emitir')
    expect(typeof dados.durationMs).toBe('number')
    expect(dados.response).toEqual({ erro: 'CNPJ invalido' })
  })

  it('mascara o que foi enviado antes de virar linha de log — RNF-034', async () => {
    const log = fakeLog()

    await expect(
      withExternalCallLogging(log as never, {
        operation: 'fiscal.emitir',
        request: { cnpj: '11222333000181', apiKey: 'sk-live-segredo' },
        run: async () => {
          throw new Error('falhou')
        },
      }),
    ).rejects.toThrow()

    const linha = JSON.stringify(log.error.mock.calls[0])
    expect(linha).not.toContain('11222333000181')
    expect(linha).not.toContain('sk-live-segredo')
  })
})
