import type { StatementParseResult } from '@na-regua/contracts'
import type {
  BankTransactionWriter,
  NewBankTransaction,
  StatementFile,
  StatementParser,
} from '../ports/statement-import.js'

/**
 * Leitor programavel.
 *
 * Nao le arquivo de verdade de proposito: o que os testes de `core` provam e o
 * que o caso de uso FAZ com cada desfecho da leitura — grava, recusa, conta. A
 * leitura de OFX e CSV de verdade e testada em `banking`, onde ela mora.
 */
export class FakeStatementParser implements StatementParser {
  private resultado: StatementParseResult = {
    outcome: 'rejected',
    code: 'FORMATO_DESCONHECIDO',
    message: 'nada programado',
    line: null,
  }

  chamadas = 0

  programar(resultado: StatementParseResult): void {
    this.resultado = resultado
  }

  parse(_arquivo: StatementFile): StatementParseResult {
    this.chamadas += 1
    return this.resultado
  }
}

/**
 * Gravacao em memoria com deduplicacao por `(companyId, externalId)`.
 *
 * O falso deduplica de verdade porque e essa a propriedade que o caso de uso
 * depende para contar "quantas ja existiam". Um falso que gravasse tudo faria
 * o teste da reimportacao passar dizendo 45 importadas — o numero errado, com
 * o teste verde.
 */
export class InMemoryBankTransactionWriter implements BankTransactionWriter {
  private readonly gravadas = new Map<string, NewBankTransaction>()
  /** Liga para simular o banco fora do ar no meio da gravacao. */
  falhar = false

  async insertIgnoringDuplicates(transacoes: readonly NewBankTransaction[]): Promise<number> {
    if (this.falhar) throw new Error('banco indisponivel')

    let entraram = 0
    for (const t of transacoes) {
      const chave = `${t.companyId}|${t.externalId}`
      if (this.gravadas.has(chave)) continue
      this.gravadas.set(chave, t)
      entraram += 1
    }
    return entraram
  }

  daEmpresa(companyId: string): readonly NewBankTransaction[] {
    return [...this.gravadas.values()].filter((t) => t.companyId === companyId)
  }

  quantas(): number {
    return this.gravadas.size
  }
}
