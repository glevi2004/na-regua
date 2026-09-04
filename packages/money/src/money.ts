/**
 * Valor monetario como inteiro em centavos.
 *
 * Existe porque `0.1 + 0.2 !== 0.3` e, em ERP, isso e a diferenca entre o caixa
 * fechar e nao fechar. Ver RNF-044 e docs/arquitetura/principios.md#5-money-e-obrigatorio.
 *
 * Regra do projeto: dinheiro NUNCA e `number` com casa decimal. Nem em variavel,
 * nem em campo de banco, nem em corpo de requisicao.
 */

const CENTS_IN_UNIT = 100

export type Currency = 'BRL'

export class Money {
  private constructor(
    readonly cents: bigint,
    readonly currency: Currency,
  ) {}

  /** Cria a partir de centavos — a forma canonica. */
  static fromCents(cents: bigint | number, currency: Currency = 'BRL'): Money {
    const value = typeof cents === 'number' ? BigInt(Math.trunc(cents)) : cents
    if (typeof cents === 'number' && !Number.isInteger(cents)) {
      throw new RangeError(`Money.fromCents espera um inteiro, recebeu ${cents}`)
    }
    return new Money(value, currency)
  }

  /**
   * Cria a partir de uma string decimal ("49.90", "1.234,56", "R$ 49,90").
   *
   * Aceita string — nao `number` — de proposito: e assim que valor entra vindo
   * de API externa (o Asaas devolve `129.9`) sem passar por ponto flutuante.
   */
  static parse(input: string, currency: Currency = 'BRL'): Money {
    const cleaned = input.replace(/[^\d,.-]/g, '').trim()
    if (cleaned === '' || cleaned === '-') {
      throw new RangeError(`Valor monetario invalido: ${JSON.stringify(input)}`)
    }

    const negative = cleaned.startsWith('-')
    const digitsOnly = cleaned.replace('-', '')

    // Decide qual e o separador decimal: o ultimo `,` ou `.` que aparecer,
    // desde que sobrem 1 ou 2 casas depois dele. Cobre "1.234,56" e "1,234.56".
    const lastComma = digitsOnly.lastIndexOf(',')
    const lastDot = digitsOnly.lastIndexOf('.')
    const sepIndex = Math.max(lastComma, lastDot)
    const decimals = sepIndex === -1 ? '' : digitsOnly.slice(sepIndex + 1)

    let integerPart: string
    let fractionPart: string
    if (sepIndex !== -1 && decimals.length > 0 && decimals.length <= 2) {
      integerPart = digitsOnly.slice(0, sepIndex).replace(/[.,]/g, '')
      fractionPart = decimals.padEnd(2, '0')
    } else {
      integerPart = digitsOnly.replace(/[.,]/g, '')
      fractionPart = '00'
    }

    if (!/^\d*$/.test(integerPart) || !/^\d{2}$/.test(fractionPart)) {
      throw new RangeError(`Valor monetario invalido: ${JSON.stringify(input)}`)
    }

    const cents = BigInt(integerPart === '' ? '0' : integerPart) * 100n + BigInt(fractionPart)
    return new Money(negative ? -cents : cents, currency)
  }

  static zero(currency: Currency = 'BRL'): Money {
    return new Money(0n, currency)
  }

  add(other: Money): Money {
    this.assertSameCurrency(other)
    return new Money(this.cents + other.cents, this.currency)
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other)
    return new Money(this.cents - other.cents, this.currency)
  }

  /** Multiplica por uma quantidade inteira (ex.: 3 unidades do produto). */
  multiply(quantity: number): Money {
    if (!Number.isInteger(quantity)) {
      throw new RangeError(`multiply espera inteiro; para percentual use percentage()`)
    }
    return new Money(this.cents * BigInt(quantity), this.currency)
  }

  /**
   * Aplica um percentual com arredondamento meio-para-cima.
   * `rate` em pontos por cem: 12.5 = 12,5%.
   */
  percentage(rate: number): Money {
    const scaled = (this.cents * BigInt(Math.round(rate * 10_000))) / 10_000n
    const remainder = (this.cents * BigInt(Math.round(rate * 10_000))) % 10_000n
    const roundUp = remainder * 2n >= 1_000_000n / 100n
    return new Money(scaled / 100n + (roundUp ? 1n : 0n), this.currency)
  }

  /**
   * Divide em N partes cujo somatorio e EXATAMENTE o total.
   * O resto e distribuido nas primeiras parcelas — RNF-045.
   *
   * Money.parse('100.00').allocate(3)
   *   => [33.34, 33.33, 33.33]   soma = 100.00
   */
  allocate(parts: number): Money[] {
    if (!Number.isInteger(parts) || parts < 1) {
      throw new RangeError(`allocate espera um inteiro >= 1, recebeu ${parts}`)
    }
    const n = BigInt(parts)
    const base = this.cents / n
    const remainder = this.cents - base * n
    const absRemainder = remainder < 0n ? -remainder : remainder
    const step = remainder < 0n ? -1n : 1n

    return Array.from(
      { length: parts },
      (_, i) => new Money(base + (BigInt(i) < absRemainder ? step : 0n), this.currency),
    )
  }

  isZero(): boolean {
    return this.cents === 0n
  }

  isNegative(): boolean {
    return this.cents < 0n
  }

  equals(other: Money): boolean {
    return this.cents === other.cents && this.currency === other.currency
  }

  compare(other: Money): -1 | 0 | 1 {
    this.assertSameCurrency(other)
    return this.cents < other.cents ? -1 : this.cents > other.cents ? 1 : 0
  }

  /** Soma uma lista garantindo moeda unica. Lista vazia devolve zero. */
  static sum(values: readonly Money[], currency: Currency = 'BRL'): Money {
    return values.reduce((acc, v) => acc.add(v), Money.zero(currency))
  }

  /** Representacao decimal com ponto ("49.90") — para API e serializacao. */
  toDecimalString(): string {
    const negative = this.cents < 0n
    const abs = negative ? -this.cents : this.cents
    const units = abs / BigInt(CENTS_IN_UNIT)
    const cents = abs % BigInt(CENTS_IN_UNIT)
    return `${negative ? '-' : ''}${units}.${cents.toString().padStart(2, '0')}`
  }

  /** Formato brasileiro para exibicao ("R$ 49,90"). */
  format(): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: this.currency,
    }).format(Number(this.cents) / CENTS_IN_UNIT)
  }

  /** Serializa como centavos — nunca como decimal, para nao perder precisao. */
  toJSON(): { cents: string; currency: Currency } {
    return { cents: this.cents.toString(), currency: this.currency }
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new TypeError(`Moedas diferentes: ${this.currency} e ${other.currency}`)
    }
  }
}
