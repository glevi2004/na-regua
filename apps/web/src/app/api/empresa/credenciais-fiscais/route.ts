import { corpoDe, encaminhar } from '@/lib/bff'

/**
 * Configuracao da emissao fiscal — NR-042, RF-004.
 *
 * O certificado e a senha atravessam este handler e NAO ficam nele: sem log,
 * sem cache, sem cookie. O corpo vai direto para a api, que cifra antes de
 * tocar o banco.
 */

/** O que esta configurado — sem os segredos. */
export async function GET() {
  return encaminhar('/empresa/credenciais-fiscais')
}

/** Atualizacao parcial: quem troca so o certificado nao perde o token. */
export async function PUT(request: Request) {
  return encaminhar('/empresa/credenciais-fiscais', {
    method: 'PUT',
    body: await corpoDe(request),
  })
}
