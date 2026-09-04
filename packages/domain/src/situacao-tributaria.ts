/**
 * CST ou CSOSN, e qual deles a empresa usa — RF-003, RF-046.
 *
 * Duas tabelas para a mesma pergunta ("como esta mercadoria e tributada"), e
 * qual delas vale sai do REGIME da empresa:
 *
 * | Regime               | Tabela | Digitos |
 * | -------------------- | ------ | ------- |
 * | Simples, MEI         | CSOSN  | 3       |
 * | Presumido, Real      | CST    | 2       |
 *
 * A contagem de digitos nao e detalhe de formatacao: e como a SEFAZ distingue
 * as duas tabelas no XML. Mandar um CST de dois digitos por uma empresa do
 * Simples e rejeicao na hora.
 *
 * Isto mora em `domain` e nao no adapter porque e regra fiscal, nao formato de
 * provedor: vale igual no Focus NFe, num concorrente e na conferencia que o
 * contador faz depois.
 */

export type RegimeTributario = 'simples' | 'presumido' | 'real' | 'mei'

/** Simples e MEI usam CSOSN; o resto usa CST. */
export function usaCsosn(regime: RegimeTributario): boolean {
  return regime === 'simples' || regime === 'mei'
}

/**
 * O codigo padrao para uma mercadoria de revenda comum.
 *
 * - **CSOSN 102** — "tributada pelo Simples Nacional sem permissao de credito".
 *   E o caso da esmagadora maioria dos itens de um mercadinho optante.
 * - **CST 00** — "tributada integralmente" no regime normal.
 *
 * Padrao, e nao imposicao: existe para o cadastro nao comecar vazio e travar a
 * emissao no primeiro dia. Item com substituicao tributaria ja recolhida (500
 * no Simples, 60 no normal) e comum em bebida e cigarro, e ai o lojista — ou o
 * contador dele — troca.
 *
 * O sistema NAO adivinha isso a partir do NCM: a substituicao depende do
 * produto E do estado, muda por convenio, e errar para menos e sonegacao.
 * Sugerir o caso comum e ajudar; deduzir o caso especifico seria dar conselho
 * fiscal que ninguem aqui pode dar.
 */
export function situacaoTributariaPadrao(regime: RegimeTributario): string {
  return usaCsosn(regime) ? '102' : '00'
}

/**
 * O codigo informado serve para o regime da empresa?
 *
 * Confere so o TAMANHO, que e o que distingue as duas tabelas. Validar o valor
 * exigiria a tabela inteira de CSOSN e CST, que muda com a legislacao — e uma
 * lista desatualizada recusaria codigo legitimo, que e pior que aceitar um
 * codigo que a SEFAZ vai recusar com a mensagem dela.
 */
export function situacaoCombinaComRegime(codigo: string, regime: RegimeTributario): boolean {
  const digitos = codigo.replace(/\D/g, '')
  return usaCsosn(regime) ? digitos.length === 3 : digitos.length === 2
}

/** A explicacao para a tela, quando o codigo nao combina com o regime. */
export function porQueNaoCombina(regime: RegimeTributario): string {
  return usaCsosn(regime)
    ? 'Empresa do Simples usa CSOSN, de tres digitos (por exemplo, 102).'
    : 'Empresa do regime normal usa CST, de dois digitos (por exemplo, 00).'
}
