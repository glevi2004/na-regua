import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { ChaveDeSegredoInvalida, cifrar, decifrar, lerChaveDeSegredo } from './secret-box.js'

/**
 * Cifragem de segredo em coluna — RF-004, RNF-022.
 *
 * Nao precisa de banco: e aritmetica. Mas e o modulo em que um defeito silencia
 * em vez de gritar, entao o que se prova aqui e o que falha ALTO.
 */

const CHAVE = randomBytes(32)
const EMPRESA = 'empresa-1'

describe('a chave', () => {
  it('aceita 32 bytes em base64', () => {
    const base64 = randomBytes(32).toString('base64')
    expect(lerChaveDeSegredo(base64)).toHaveLength(32)
  })

  it('recusa chave curta, com instrucao de como gerar', () => {
    /* Chave curta nao falha na cifragem — o Node produziria algo que decifra —,
       entao o erro so apareceria numa auditoria, ou nunca. */
    const erro = (() => {
      try {
        lerChaveDeSegredo(randomBytes(16).toString('base64'))
        return null
      } catch (e) {
        return e as Error
      }
    })()

    expect(erro).toBeInstanceOf(ChaveDeSegredoInvalida)
    expect(erro?.message).toContain('openssl rand -base64 32')
  })

  it('recusa chave de bytes todos iguais, que e placeholder', () => {
    /* `AAAA...` em base64 sao trinta e dois zeros. Passar num teste com ela e o
       jeito mais facil de leva-la para producao sem ninguem perceber. */
    expect(() => lerChaveDeSegredo(Buffer.alloc(32, 0).toString('base64'))).toThrow(/placeholder/)
  })
})

describe('cifrar e decifrar', () => {
  it('devolve o mesmo texto', () => {
    const guardado = cifrar('tok-focus-abc123', CHAVE, EMPRESA)
    expect(decifrar(guardado, CHAVE, EMPRESA)).toBe('tok-focus-abc123')
  })

  it('o mesmo texto cifra diferente a cada vez', () => {
    /* IV novo por cifragem. Sem isso, duas empresas com o mesmo token teriam a
       mesma coluna — e quem olha o banco descobre isso sem decifrar nada. */
    const a = cifrar('mesmo-token', CHAVE, EMPRESA)
    const b = cifrar('mesmo-token', CHAVE, EMPRESA)
    expect(a).not.toBe(b)
    expect(decifrar(a, CHAVE, EMPRESA)).toBe(decifrar(b, CHAVE, EMPRESA))
  })

  it('o formato diz que e cifrado, e qual versao', () => {
    /* Auto-descritivo de proposito: quem olhar a coluna ve um segredo cifrado,
       em vez de um blob que alguem tentaria interpretar. */
    expect(cifrar('x', CHAVE, EMPRESA)).toMatch(/^v1:[\w-]+:[\w-]+:[\w-]+$/)
  })

  it('NAO decifra sob outra empresa', () => {
    const guardado = cifrar('tok-da-empresa-1', CHAVE, EMPRESA)

    /*
     * O `companyId` entra como dado autenticado. Sem isso, copiar a linha de
     * uma empresa para outra dentro do banco daria a ela o token fiscal do
     * vizinho, e a nota sairia em nome de quem nao autorizou.
     */
    expect(() => decifrar(guardado, CHAVE, 'empresa-2')).toThrow(/nao foi possivel decifrar/i)
  })

  it('NAO decifra com outra chave', () => {
    const guardado = cifrar('tok', CHAVE, EMPRESA)
    expect(() => decifrar(guardado, randomBytes(32), EMPRESA)).toThrow()
  })

  it('adulterar o texto cifrado FALHA, em vez de devolver lixo', () => {
    const guardado = cifrar('tok-original', CHAVE, EMPRESA)
    const partes = guardado.split(':')
    const corpo = Buffer.from(partes[3]!, 'base64url')
    corpo[0] = corpo[0]! ^ 0xff
    const adulterado = [partes[0], partes[1], partes[2], corpo.toString('base64url')].join(':')

    /*
     * E o motivo de GCM e nao CBC. Com CBC, trocar bytes produziria um "token"
     * diferente e plausivel, e a falha apareceria como recusa do provedor — no
     * lugar errado, muito depois.
     */
    expect(() => decifrar(adulterado, CHAVE, EMPRESA)).toThrow()
  })

  it('a mensagem de falha nao diz O QUE falhou', () => {
    const guardado = cifrar('tok', CHAVE, EMPRESA)

    const porEmpresa = (() => {
      try {
        decifrar(guardado, CHAVE, 'outra')
        return ''
      } catch (e) {
        return (e as Error).message
      }
    })()

    /* Quem ataca aprenderia com a distincao entre "chave errada" e "empresa
       errada"; quem opera age igual nos dois casos. */
    expect(porEmpresa).not.toMatch(/chave|empresa-|tag/i)
  })

  it('formato desconhecido lanca, e nao devolve o proprio texto', () => {
    /* Um valor gravado em texto puro por engano nao pode passar por segredo
       decifrado — seria exatamente o vazamento que este modulo evita. */
    expect(() => decifrar('tok-em-texto-puro', CHAVE, EMPRESA)).toThrow(/formato desconhecido/i)
  })
})
