/**
 * ============================================================================
 * PONTOS DE INTEGRACAO COM O BACKEND
 * ============================================================================
 *
 * Tudo neste arquivo e SIMULADO no front. Cada funcao abaixo marca exatamente
 * onde entra uma chamada real — as telas nao precisam mudar desde que o
 * formato de retorno seja mantido.
 *
 *  | Funcao                  | Endpoint esperado                  | Quando            |
 *  |-------------------------|------------------------------------|-------------------|
 *  | signIn                  | POST /auth/login                   | submit do login   |
 *  | fetchSubscription       | GET  /billing/subscription         | apos o login      |
 *  | validateCoupon          | GET  /partners/coupons/:codigo     | digitacao (debounce) |
 *  | createAccount           | POST /auth/signup                  | fim da etapa 3    |
 *  | createPixCharge         | POST /billing/charges (pix)        | entrada na etapa 4|
 *  | fetchPixChargeStatus    | GET  /billing/charges/:id          | polling da etapa 4|
 *
 * O polling da etapa 4 deve idealmente ser trocado por webhook + SSE/websocket
 * quando o backend suportar; a UI ja trata os quatro estados.
 */

export type SubscriptionStatus = 'active' | 'overdue' | 'trial'

export type Subscription = {
  status: SubscriptionStatus
  planName: string
  amount: number
  /** Data do proximo vencimento ou do vencimento em atraso. */
  dueDate: string
  daysOverdue: number
}

export type AuthUser = {
  id: string
  nome: string
  email: string
  empresa: string
}

export type SignInResult =
  { ok: true; user: AuthUser; subscription: Subscription } | { ok: false; error: string }

/** Atraso artificial so para exercitar os estados de loading da UI. */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/* -------------------------------------------------------------------------- */
/* Autenticacao                                                               */
/* -------------------------------------------------------------------------- */

/**
 * SUBSTITUIR POR: POST /auth/login
 *
 * Enquanto nao existe backend, qualquer credencial com senha valida entra.
 * A conta cai em "pagamento pendente" quando o e-mail contem "pendente",
 * o que permite demonstrar o fluxo bloqueado sem precisar de dados reais.
 */
export async function signIn(credential: string, password: string): Promise<SignInResult> {
  await delay(900)

  if (password.length < 6) {
    return { ok: false, error: 'E-mail ou senha incorretos.' }
  }

  const overdue = credential.toLowerCase().includes('pendente')

  return {
    ok: true,
    user: {
      id: 'usr-1',
      nome: 'Marina Alves',
      email: credential,
      empresa: 'Mercearia Sol Nascente',
    },
    subscription: overdue
      ? {
          status: 'overdue',
          planName: 'Plano unico',
          amount: 149,
          dueDate: '2026-08-10',
          daysOverdue: 14,
        }
      : {
          status: 'active',
          planName: 'Plano unico',
          amount: 149,
          dueDate: '2026-09-10',
          daysOverdue: 0,
        },
  }
}

/**
 * SUBSTITUIR POR: GET /billing/subscription
 *
 * Chamada no login e, depois, sempre que o painel precisar reavaliar o
 * acesso (por exemplo ao voltar da tela de pagamento).
 */
export async function fetchSubscription(): Promise<Subscription> {
  await delay(400)
  return {
    status: 'active',
    planName: 'Plano unico',
    amount: 149,
    dueDate: '2026-09-10',
    daysOverdue: 0,
  }
}

/* -------------------------------------------------------------------------- */
/* Cadastro                                                                   */
/* -------------------------------------------------------------------------- */

export type CouponResult =
  | { status: 'valid'; code: string; partner: string; benefit: string }
  | { status: 'invalid'; message: string }

/**
 * SUBSTITUIR POR: GET /partners/coupons/:codigo
 *
 * A UI chama com debounce a cada digitacao. Retornar 404 para cupom
 * inexistente e 200 com os dados do parceiro quando valido.
 */
export async function validateCoupon(code: string): Promise<CouponResult> {
  await delay(650)

  const known: Record<string, { partner: string; benefit: string }> = {
    PARCEIRO10: {
      partner: 'Contabilidade Prisma',
      benefit: '10% de desconto nos 3 primeiros meses',
    },
    INDICA20: { partner: 'Rede Lojista PR', benefit: '20% de desconto no primeiro mes' },
    SOCIO15: { partner: 'Associacao Comercial', benefit: '15% de desconto recorrente' },
  }

  const found = known[code.trim().toUpperCase()]
  if (!found) {
    return { status: 'invalid', message: 'Cupom nao encontrado.' }
  }

  return {
    status: 'valid',
    code: code.trim().toUpperCase(),
    partner: found.partner,
    benefit: found.benefit,
  }
}

export type SignupData = {
  nome: string
  email: string
  telefone: string
  senha: string
  cupom: string | null
}

/** SUBSTITUIR POR: POST /auth/signup — deve devolver o id da conta criada. */
export async function createAccount(
  data: SignupData,
): Promise<{ ok: true; accountId: string } | { ok: false; error: string }> {
  await delay(1100)
  void data
  return { ok: true, accountId: 'acc-1' }
}

/* -------------------------------------------------------------------------- */
/* Cobranca Pix                                                               */
/* -------------------------------------------------------------------------- */

export type PixCharge = {
  chargeId: string
  /** Payload "copia e cola" — e o conteudo que vira o QR Code. */
  payload: string
  /** Timestamp (ms) em que o codigo expira. */
  expiresAt: number
  amount: number
  planName: string
}

export type PixChargeStatus = 'pending' | 'paid' | 'expired'

/** Minutos de validade do codigo Pix. */
export const PIX_EXPIRATION_MINUTES = 15

/**
 * SUBSTITUIR POR: POST /billing/charges
 *
 * O backend devolve o payload Pix (BR Code) gerado pelo PSP. O front apenas
 * transforma essa string em QR Code — nunca monta o payload sozinho.
 */
export async function createPixCharge(planName: string, amount: number): Promise<PixCharge> {
  await delay(800)

  const chargeId = `chg-${Math.random().toString(36).slice(2, 10)}`

  /* Payload de exemplo no formato BR Code. O real vem pronto do PSP. */
  const payload = [
    '00020126580014BR.GOV.BCB.PIX0136',
    chargeId.padEnd(36, '0'),
    '52040000530398654',
    amount.toFixed(2).padStart(6, '0'),
    '5802BR5913EI BUDDY LTDA6008CURITIBA62070503***6304',
  ].join('')

  return {
    chargeId,
    payload,
    expiresAt: Date.now() + PIX_EXPIRATION_MINUTES * 60_000,
    amount,
    planName,
  }
}

/**
 * SUBSTITUIR POR: GET /billing/charges/:id
 *
 * A UI faz polling a cada 4s enquanto o estado for "pending". Quando houver
 * webhook no backend, trocar por SSE/websocket e remover o polling.
 */
export async function fetchPixChargeStatus(chargeId: string): Promise<PixChargeStatus> {
  await delay(500)
  void chargeId
  /* Sem backend nao ha como confirmar de verdade: a tela oferece um botao
     explicito de simulacao para demonstrar o estado "pago". */
  return 'pending'
}
