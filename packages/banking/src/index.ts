/**
 * Adapter de extrato bancario — NR-047.
 *
 * Importacao de OFX/CSV implementa a porta `StatementParser` de `core` sem
 * importar `core`: os tipos vem de `contracts`, e a verificacao de fronteiras
 * na CI barra o contrario.
 *
 * Open Finance (NR-048) entra atras da mesma porta quando a DEC-005 fechar. A
 * DEC-005 NAO bloqueia a importacao por arquivo — a propria decisao recomenda
 * comecar por ela, porque ela ja entrega conciliacao sem depender de fornecedor
 * nem de certificacao.
 */
export { createFileStatementReader, lerArquivo } from './file-statement-reader.js'
export type { ArquivoDeExtrato } from './file-statement-reader.js'
export { lerCsv, pareceCsv } from './csv.js'
export { decodificar, lerOfx, pareceOfx } from './ofx.js'
