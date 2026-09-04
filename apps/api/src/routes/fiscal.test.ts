import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import { registerErrorHandler } from '../plugins/error-handler.js'
import type { AuthenticatedPrincipal } from '../plugins/execution-context.js'
import { registerRateLimit } from '../plugins/rate-limit.js'
import { type CredenciaisFiscaisDeps, registerFiscalRoutes } from './fiscal.js'

/**
 * Configuracao da emissao fiscal — NR-042, RF-004, RNF-022.
 *
 * A cifragem tem teste proprio em `db`. Aqui se prova o que so a rota faz: que
 * segredo NAO volta na leitura, que a atualizacao e parcial, e que a falta da
 * chave desliga a tela em vez de derrubar a api.
 */

const PRINCIPAL: AuthenticatedPrincipal = {
  companyId: 'empresa-1',
  userId: 'usuario-1',
  role: 'owner',
}

const CERTIFICADO = Buffer.from('pfx-de-mentira').toString('base64')

/*
 * Montado, e nao literal — e a varredura de segredos que pediu.
 *
 * A versao anterior tinha um literal com letras e digitos ao lado do campo do
 * token, e a CI o marcou como `generic-api-key`. O scanner estava certo em
 * desconfiar: e exatamente o que uma credencial vazada parece.
 *
 * O exemplo NAO e reproduzido aqui nem em comentario — a regra olha a
 * vizinhanca do texto, e escreve-lo de novo faria a varredura reprovar de novo,
 * agora por causa da explicacao.
 *
 * A saida NAO foi abrir excecao no `.gitleaks.toml`. O proprio arquivo diz que
 * ele "so abre excecao, nunca afrouxa uma regra", e liberar este caminho
 * cegaria a varredura para um vazamento de verdade aqui depois. Entao o dado de
 * teste e que mudou — reconhecivelmente falso, como docs/engenharia/testes.md
 * ja pede para CPF e CNPJ.
 */
const TOKEN_DE_TESTE = ['token', 'de', 'teste', 'sem', 'valor'].join('-')

function guardaEmMemoria() {
  const gravado: Record<string, string | undefined> = {}

  const deps: CredenciaisFiscaisDeps = {
    fiscalCredentials: {
      salvar: async (e) => {
        /* Imita o `COALESCE` do repositorio: o que nao veio nao e apagado. */
        if (e.focusToken !== undefined) gravado.token = e.focusToken
        if (e.certificadoBase64 !== undefined) {
          gravado.certificado = e.certificadoBase64
          gravado.senha = e.senhaDoCertificado
          gravado.vence = e.certificadoVenceEm
        }
      },
      situacao: async () => ({
        temToken: gravado.token !== undefined,
        temCertificado: gravado.certificado !== undefined,
        certificadoVenceEm: gravado.vence ?? null,
      }),
    },
  }

  return { deps, gravado }
}

async function buildApp(comChave = true, principal: AuthenticatedPrincipal | null = PRINCIPAL) {
  const memoria = guardaEmMemoria()
  const app = Fastify({ logger: false })
  registerErrorHandler(app)
  await registerRateLimit(app)
  app.addHook('onRequest', async (request) => {
    if (principal !== null) request.principal = principal
  })
  registerFiscalRoutes(app, comChave ? memoria.deps : null)
  return { app, memoria }
}

let app: FastifyInstance

afterEach(async () => {
  await app?.close()
})

describe('ler a configuracao', () => {
  it('empresa sem nada configurado responde tudo falso, e nao 404', async () => {
    const c = await buildApp()
    app = c.app

    const r = await app.inject({ method: 'GET', url: '/empresa/credenciais-fiscais' })

    /* "Nunca configurou" e uma resposta. 404 diria que a tela nao existe. */
    expect(r.statusCode).toBe(200)
    expect(r.json()).toEqual({
      hasToken: false,
      hasCertificate: false,
      certificateExpiresAt: null,
    })
  })

  it('NUNCA devolve o segredo', async () => {
    const c = await buildApp()
    app = c.app

    await app.inject({
      method: 'PUT',
      url: '/empresa/credenciais-fiscais',
      payload: { focusToken: TOKEN_DE_TESTE },
    })

    const r = await app.inject({ method: 'GET', url: '/empresa/credenciais-fiscais' })

    /* Devolver o token para a tela "conferir" seria desfazer a cifragem na
       saida — o segredo passaria por HTTP e ficaria no cache do navegador. */
    expect(r.body).not.toContain(TOKEN_DE_TESTE)
    expect(r.json().hasToken).toBe(true)
  })
})

describe('gravar', () => {
  it('trocar so o certificado nao apaga o token', async () => {
    const c = await buildApp()
    app = c.app

    await app.inject({
      method: 'PUT',
      url: '/empresa/credenciais-fiscais',
      payload: { focusToken: TOKEN_DE_TESTE },
    })

    const r = await app.inject({
      method: 'PUT',
      url: '/empresa/credenciais-fiscais',
      payload: {
        certificateBase64: CERTIFICADO,
        certificatePassword: 'senha',
        certificateExpiresAt: '2027-03-15',
      },
    })

    /* Um formulario que envia so o campo alterado nao pode apagar o resto. */
    expect(r.json()).toEqual({
      hasToken: true,
      hasCertificate: true,
      certificateExpiresAt: '2027-03-15',
    })
  })

  it('certificado sem senha e recusado', async () => {
    const c = await buildApp()
    app = c.app

    const r = await app.inject({
      method: 'PUT',
      url: '/empresa/credenciais-fiscais',
      payload: { certificateBase64: CERTIFICADO },
    })

    /* Certificado sem senha nao abre. Guardar assim so adiaria a descoberta
       para a primeira emissao. */
    expect(r.statusCode).toBe(400)
  })

  it('certificado sem vencimento e recusado', async () => {
    const c = await buildApp()
    app = c.app

    const r = await app.inject({
      method: 'PUT',
      url: '/empresa/credenciais-fiscais',
      payload: { certificateBase64: CERTIFICADO, certificatePassword: 'senha' },
    })

    /* Sem vencimento o aviso da RF-004 e impossivel, e o lojista descobriria o
       vencimento quando a nota parasse de sair. */
    expect(r.statusCode).toBe(400)
  })

  it('corpo vazio e recusado, em vez de gravar nada em silencio', async () => {
    const c = await buildApp()
    app = c.app

    const r = await app.inject({
      method: 'PUT',
      url: '/empresa/credenciais-fiscais',
      payload: {},
    })

    expect(r.statusCode).toBe(400)
  })

  it('recusa base64 corrompido antes de guardar', async () => {
    const c = await buildApp()
    app = c.app

    const r = await app.inject({
      method: 'PUT',
      url: '/empresa/credenciais-fiscais',
      payload: {
        certificateBase64: 'nao é base64!!',
        certificatePassword: 'senha',
        certificateExpiresAt: '2027-03-15',
      },
    })

    /* Guardar bytes truncados daria um certificado que so falha na emissao —
       longe daqui, e sem dizer que o upload foi que corrompeu. */
    expect(r.statusCode).toBe(400)
    expect(c.memoria.gravado.certificado).toBeUndefined()
  })
})

describe('quando falta a chave de cifragem', () => {
  it('responde 503 com explicacao, e nao 404', async () => {
    const c = await buildApp(false)
    app = c.app

    const r = await app.inject({ method: 'GET', url: '/empresa/credenciais-fiscais' })

    /*
     * 404 diria "esta tela nao existe" para quem so precisa saber que o
     * servidor esta sem a chave. A acao de quem le e diferente nos dois casos:
     * um e "voce se enganou de endereco", o outro e "fale com o suporte".
     */
    expect(r.statusCode).toBe(503)
    expect(r.json().error.message).toContain('chave de cifragem')
  })

  it('a escrita tambem recusa, em vez de guardar em texto puro', async () => {
    const c = await buildApp(false)
    app = c.app

    const r = await app.inject({
      method: 'PUT',
      url: '/empresa/credenciais-fiscais',
      payload: { focusToken: TOKEN_DE_TESTE },
    })

    expect(r.statusCode).toBe(503)
  })
})

describe('quem pode', () => {
  it('sem sessao, 401', async () => {
    const c = await buildApp(true, null)
    app = c.app

    expect(
      (await app.inject({ method: 'GET', url: '/empresa/credenciais-fiscais' })).statusCode,
    ).toBe(401)
  })
})
