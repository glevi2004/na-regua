import type { StatementParseResult } from '@na-regua/contracts'
import { lerCsv, pareceCsv } from './csv.js'
import { decodificar, lerOfx, pareceOfx } from './ofx.js'

/**
 * Leitor de extrato em arquivo — RF-076, RF-077. NR-047.
 *
 * Implementa a porta `StatementParser` de `core` sem importar `core`: os tipos
 * vem de `contracts`, e a verificacao de fronteiras na CI barra o contrario.
 *
 * ## Por que o formato e detectado, e nao informado
 *
 * A alternativa era o lojista escolher "OFX" ou "CSV" antes de subir. Ele nao
 * sabe: o banco chama de "extrato para Money", "OFX", "arquivo para o
 * contador". E se escolher errado, o erro que aparece e sobre o conteudo do
 * arquivo, nao sobre a escolha — o que manda ele procurar problema no lugar
 * errado.
 *
 * Detectar custa uma leitura dos primeiros bytes e remove um passo em que ele
 * so pode errar.
 *
 * A extensao do nome do arquivo NAO e usada para isso. Extrato baixado do
 * banco chega como `extrato.txt`, `Extrato(1).ofx`, `download.csv` contendo
 * OFX — a extensao e o que menos se pode confiar. O conteudo decide.
 */

export type ArquivoDeExtrato = {
  /** Bytes crus. A decodificacao e daqui, porque depende do cabecalho. */
  readonly content: Uint8Array
  /** So para a mensagem de recusa. Nao decide formato. */
  readonly filename: string
}

export function createFileStatementReader(): {
  parse(arquivo: ArquivoDeExtrato): StatementParseResult
} {
  return { parse: lerArquivo }
}

export function lerArquivo(arquivo: ArquivoDeExtrato): StatementParseResult {
  if (arquivo.content.length === 0) {
    return {
      outcome: 'rejected',
      code: 'FORMATO_DESCONHECIDO',
      message: `O arquivo ${arquivo.filename} esta vazio. Baixe o extrato de novo no banco.`,
      line: null,
    }
  }

  /*
   * PDF antes de tudo, porque e o erro mais comum de verdade: o lojista baixa
   * o extrato em PDF, que e o formato que o banco oferece primeiro, e sobe. Sem
   * este caso, ele receberia "nao reconhecemos as colunas", que nao diz o que
   * fazer. Com ele, recebe "baixe em OFX ou CSV".
   */
  if (ehPdf(arquivo.content)) {
    return {
      outcome: 'rejected',
      code: 'FORMATO_DESCONHECIDO',
      message:
        'Este arquivo e um PDF, e PDF nao da para importar. No banco, procure a opcao de ' +
        'baixar o extrato em OFX (as vezes chamado de "arquivo para o contador") ou em CSV.',
      line: null,
    }
  }

  const conteudo = decodificar(arquivo.content)

  if (pareceOfx(conteudo)) return lerOfx(conteudo)
  if (pareceCsv(conteudo)) return lerCsv(conteudo)

  return {
    outcome: 'rejected',
    code: 'FORMATO_DESCONHECIDO',
    message:
      `Nao reconhecemos o formato de ${arquivo.filename}. ` +
      'Baixe o extrato do banco em OFX ou em CSV com cabecalho de data, historico e valor.',
    line: null,
  }
}

/** `%PDF-` nos primeiros bytes. E o unico jeito honesto de saber. */
function ehPdf(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  )
}
