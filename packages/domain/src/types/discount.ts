import type { Money } from '@na-regua/money'

/**
 * Desconto em valor ou em percentual — RF-030.
 *
 * Uniao discriminada, e nao um objeto com os dois campos opcionais: assim o
 * tipo impede o estado `{ amount, rate }` preenchido ao mesmo tempo, que nao
 * significa nada e alguem teria de decidir qual vence em tempo de execucao.
 */
export type Discount =
  | { readonly kind: 'amount'; readonly amount: Money }
  /** Pontos por cem: 10 e 10%, nao 0.1. E como o lojista digita. */
  | { readonly kind: 'percentage'; readonly rate: number }

/**
 * Teto de desconto do operador — RF-031, RF-008.
 *
 * Chega resolvido, em percentual. `domain` NAO recebe o papel nem consulta
 * configuracao: descobrir que `staff` tem 10% e leitura de dado da empresa,
 * portanto de `core`. Aqui so se aplica o limite, que e calculo.
 */
export type DiscountPolicy = {
  /** 0 a 100. Zero significa operador sem alcada para desconto. */
  readonly maxDiscountRate: number
}

export type DiscountResult = {
  /** Quanto foi abatido, ja convertido para valor. */
  readonly discountAmount: Money
  /** Base menos o desconto. Nunca negativo — desconto maior que a base e recusado. */
  readonly total: Money
  /**
   * Percentual efetivo sobre a base, truncado em 4 casas.
   *
   * Existe porque desconto em VALOR tambem precisa ser confrontado com o teto
   * do papel: R$ 50 numa venda de R$ 100 sao 50%, e o limite vale igual.
   */
  readonly effectiveRate: number
}
