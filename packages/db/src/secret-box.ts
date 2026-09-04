import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

/**
 * Cifragem de segredo em coluna — RF-004, RNF-022.
 *
 * O que passa por aqui e segredo de LOJISTA guardado por nos: token do emissor
 * fiscal, certificado A1 e a senha dele. Sao coisas que autorizam emitir
 * documento fiscal em nome de uma empresa — um vazamento de banco nao pode
 * entregar isso legivel.
 *
 * ## AES-256-GCM, e nao CBC
 *
 * GCM autentica alem de cifrar: adulterar o texto cifrado faz a decifragem
 * FALHAR, em vez de devolver lixo que alguem trata como valor. Com CBC, trocar
 * bytes no banco produziria um "token" diferente e plausivel, e a falha
 * apareceria como recusa do provedor — no lugar errado, muito depois.
 *
 * ## O `companyId` entra como dado autenticado
 *
 * O texto cifrado de uma empresa NAO decifra sob outra. Sem isso, copiar a
 * linha de uma empresa para outra dentro do banco daria a ela o token fiscal do
 * vizinho, e a nota sairia em nome de quem nao autorizou. A RLS impede a
 * leitura cruzada pela aplicacao; isto impede que ela signifique alguma coisa
 * mesmo quando alguem escreve por fora.
 *
 * ## A chave nao mora aqui
 *
 * Ela chega de `SECRETS_KEY`, validada na raiz de composicao. Este modulo nao
 * le ambiente de proposito: um modulo que se serve sozinho e um modulo que se
 * pode chamar por engano com a chave errada.
 */

/** Prefixo de versao. Trocar de algoritmo um dia exige saber o que ja existe. */
const VERSAO = 'v1'

const TAMANHO_DA_CHAVE = 32
const TAMANHO_DO_IV = 12

export class ChaveDeSegredoInvalida extends Error {
  constructor(motivo: string) {
    super(`SECRETS_KEY invalida: ${motivo}`)
    this.name = 'ChaveDeSegredoInvalida'
  }
}

/**
 * A chave de 32 bytes, a partir do base64 do ambiente.
 *
 * Valida o TAMANHO e recusa. Uma chave curta nao falha na cifragem — o Node
 * aceitaria e produziria algo que decifra —, entao o erro so apareceria numa
 * auditoria, ou nunca.
 */
export function lerChaveDeSegredo(base64: string): Buffer {
  let bruta: Buffer
  try {
    bruta = Buffer.from(base64, 'base64')
  } catch {
    throw new ChaveDeSegredoInvalida('nao e base64.')
  }

  if (bruta.length !== TAMANHO_DA_CHAVE) {
    throw new ChaveDeSegredoInvalida(
      `precisa de ${TAMANHO_DA_CHAVE} bytes em base64, e veio com ${bruta.length}. ` +
        'Gere com: openssl rand -base64 32',
    )
  }

  /*
   * Chave de bytes todos iguais e placeholder — `AAAA...` em base64 e trinta e
   * dois zeros. Passar num teste com ela e o jeito mais facil de leva-la para
   * producao sem ninguem perceber.
   */
  const primeiro = bruta[0]!
  if (bruta.every((b) => b === primeiro)) {
    throw new ChaveDeSegredoInvalida('todos os bytes sao iguais — isso e placeholder, nao chave.')
  }

  return bruta
}

/**
 * Cifra um segredo de uma empresa.
 *
 * O formato e `v1:iv:tag:texto`, tudo em base64url. Auto-descritivo de
 * proposito: quem olhar a coluna no banco ve que e cifrado e qual versao, em
 * vez de um blob que alguem tentaria interpretar.
 */
export function cifrar(texto: string, chave: Buffer, companyId: string): string {
  const iv = randomBytes(TAMANHO_DO_IV)
  const cifra = createCipheriv('aes-256-gcm', chave, iv)

  /* O tenant como dado autenticado — ver o cabecalho. */
  cifra.setAAD(Buffer.from(companyId, 'utf8'))

  const corpo = Buffer.concat([cifra.update(texto, 'utf8'), cifra.final()])
  const tag = cifra.getAuthTag()

  return [
    VERSAO,
    iv.toString('base64url'),
    tag.toString('base64url'),
    corpo.toString('base64url'),
  ].join(':')
}

/**
 * Decifra, ou LANCA.
 *
 * Nunca devolve `undefined` em falha de autenticacao: um valor ausente e um
 * valor adulterado pedem reacoes opostas — o primeiro e "a empresa ainda nao
 * configurou", o segundo e incidente de seguranca. Achatar os dois faria o
 * segundo passar por rotina.
 */
export function decifrar(guardado: string, chave: Buffer, companyId: string): string {
  const partes = guardado.split(':')

  if (partes.length !== 4 || partes[0] !== VERSAO) {
    throw new Error('Segredo guardado em formato desconhecido.')
  }

  const iv = Buffer.from(partes[1]!, 'base64url')
  const tag = Buffer.from(partes[2]!, 'base64url')
  const corpo = Buffer.from(partes[3]!, 'base64url')

  if (iv.length !== TAMANHO_DO_IV) {
    throw new Error('Segredo guardado com vetor de inicializacao invalido.')
  }

  const decifra = createDecipheriv('aes-256-gcm', chave, iv)
  decifra.setAAD(Buffer.from(companyId, 'utf8'))
  decifra.setAuthTag(tag)

  try {
    return Buffer.concat([decifra.update(corpo), decifra.final()]).toString('utf8')
  } catch {
    /*
     * A mensagem NAO diz o que falhou — tag errada, chave errada, empresa
     * errada. Quem esta atacando aprenderia com a distincao, e quem esta
     * operando age igual nos tres casos: conferir a chave e o backup.
     */
    throw new Error('Nao foi possivel decifrar o segredo desta empresa.')
  }
}
