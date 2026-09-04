import { corpoDe, encaminhar } from '@/lib/bff'

/** Importar extrato — RF-076, RF-077. */
export async function POST(request: Request) {
  /* 200 e nao 201: reimportar o mesmo arquivo e caso normal e nao cria nada. */
  return encaminhar('/extratos', { method: 'POST', body: await corpoDe(request) })
}
