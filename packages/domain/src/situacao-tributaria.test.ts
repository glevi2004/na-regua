import { describe, expect, it } from 'vitest'
import {
  porQueNaoCombina,
  situacaoCombinaComRegime,
  situacaoTributariaPadrao,
  usaCsosn,
  type RegimeTributario,
} from './situacao-tributaria.js'

/**
 * CST e CSOSN — RF-003, RF-046.
 *
 * O que se guarda aqui nao e a tabela de codigos (ela muda com a legislacao e
 * nao cabe no sistema), e sim a regra que decide QUAL tabela vale — porque
 * errar essa manda a nota para a rejeicao antes de qualquer outra coisa.
 */

const REGIMES: RegimeTributario[] = ['simples', 'presumido', 'real', 'mei']

describe('qual tabela o regime usa', () => {
  it('Simples e MEI usam CSOSN; presumido e real usam CST', () => {
    expect(usaCsosn('simples')).toBe(true)
    expect(usaCsosn('mei')).toBe(true)
    expect(usaCsosn('presumido')).toBe(false)
    expect(usaCsosn('real')).toBe(false)
  })

  it('o padrao tem o numero de digitos da tabela do regime', () => {
    /*
     * A contagem de digitos nao e formatacao: e como a SEFAZ distingue as duas
     * tabelas no XML. Um CST de dois digitos numa empresa do Simples e rejeicao
     * na hora.
     */
    expect(situacaoTributariaPadrao('simples')).toHaveLength(3)
    expect(situacaoTributariaPadrao('mei')).toHaveLength(3)
    expect(situacaoTributariaPadrao('presumido')).toHaveLength(2)
    expect(situacaoTributariaPadrao('real')).toHaveLength(2)
  })

  it('todo regime tem padrao, e todo padrao combina com o proprio regime', () => {
    /* Um regime sem padrao deixaria o cadastro vazio e travaria a emissao no
       primeiro dia — que e o que estes campos existem para evitar. */
    for (const regime of REGIMES) {
      expect(situacaoCombinaComRegime(situacaoTributariaPadrao(regime), regime)).toBe(true)
    }
  })
})

describe('o codigo informado combina com o regime', () => {
  it('recusa CST em empresa do Simples, e CSOSN em regime normal', () => {
    expect(situacaoCombinaComRegime('00', 'simples')).toBe(false)
    expect(situacaoCombinaComRegime('102', 'presumido')).toBe(false)
  })

  it('aceita substituicao tributaria nas duas tabelas', () => {
    /* Bebida e cigarro vem com ST ja recolhida, e sao o maior giro de um
       mercadinho: 500 no Simples, 60 no normal. */
    expect(situacaoCombinaComRegime('500', 'simples')).toBe(true)
    expect(situacaoCombinaComRegime('60', 'real')).toBe(true)
  })

  it('ignora pontuacao, porque o lojista digita como quiser', () => {
    expect(situacaoCombinaComRegime('1 0 2', 'simples')).toBe(true)
  })

  it('nao valida o VALOR do codigo, so o tamanho', () => {
    /*
     * Deliberado. A tabela completa muda com a legislacao, e uma lista
     * desatualizada aqui recusaria codigo legitimo — pior que aceitar um que a
     * SEFAZ recusa com a mensagem dela, que ao menos e a mensagem certa.
     */
    expect(situacaoCombinaComRegime('999', 'simples')).toBe(true)
  })
})

describe('a explicacao para a tela', () => {
  it('diz qual tabela usar e da um exemplo', () => {
    /* "Codigo invalido" nao ajuda ninguem: o lojista precisa saber que a conta
       dele usa outra tabela, e como ela se parece. */
    expect(porQueNaoCombina('simples')).toContain('CSOSN')
    expect(porQueNaoCombina('simples')).toContain('102')
    expect(porQueNaoCombina('real')).toContain('CST')
  })
})
