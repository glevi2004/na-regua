/**
 * Aritmetica de periodo — NR-077, US-041.
 *
 * Arquivo proprio, sem nenhum import: e o que permite testa-lo. Os modulos de
 * `lib` que falam com a api carregam `react-native` na cadeia, e o vitest nao
 * analisa a sintaxe Flow que vem junto — uma conta de data escondida la dentro
 * seria uma conta sem teste.
 *
 * E ela precisa de teste. Recuar um mes a partir do dia 31 cai no mes errado, e
 * converter para ISO em fuso negativo recua um dia; as duas coisas ja custaram
 * correcao neste projeto.
 */

/**
 * Os ultimos `meses` meses, terminando no fim do mes de `agora`, em AAAA-MM-DD.
 *
 * Campos LOCAIS, nunca `toISOString`: no fuso do Brasil o dia 1 as 00h ainda e
 * o dia 30 em UTC, e o periodo comecaria no mes anterior.
 *
 * Recua a partir do dia 1, e nao do dia de hoje: em 31 de marco, `setMonth` com
 * o dia 31 daria 3 de marco, porque fevereiro nao tem 31. O dia 1 existe em
 * todo mes.
 */
export function ultimosMeses(meses: number, agora: Date = new Date()): { de: string; ate: string } {
  const dois = (n: number) => String(n).padStart(2, '0')

  const ano = agora.getFullYear()
  const mes = agora.getMonth()

  const inicio = new Date(ano, mes, 1)
  inicio.setMonth(inicio.getMonth() - (meses - 1))

  /* Dia 0 do mes seguinte e o ultimo deste — inclusive em fevereiro bissexto. */
  const ultimo = new Date(ano, mes + 1, 0).getDate()

  return {
    de: `${inicio.getFullYear()}-${dois(inicio.getMonth() + 1)}-01`,
    ate: `${ano}-${dois(mes + 1)}-${dois(ultimo)}`,
  }
}
