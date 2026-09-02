import { AppError } from './app-error.js'
import type { ExecutionContext } from './context.js'

/**
 * Verificacao de papel — em `core`, nunca no handler HTTP.
 *
 * Se ficasse no handler, o canal WhatsApp nao a aplicaria: as duas entradas
 * chamam o mesmo caso de uso, e so uma passa por rota HTTP. E o principio 1,
 * e e o que torna verificavel a promessa de que app e WhatsApp fazem a mesma
 * coisa. Ver docs/arquitetura/seguranca.md
 */

/** Papeis que so leem. Documentado em seguranca.md: "accountant e somente leitura e exportacao". */
const SOMENTE_LEITURA = new Set(['accountant'])

/**
 * Recusa escrita de quem so pode ler.
 *
 * `platform_admin` NAO entra nesta lista: ele nao e operador da empresa, e o
 * que rege o acesso dele e a RF-131 (nao acessa dado de tenant sem registro),
 * que e outra regra e ainda nao existe. Deixar passar aqui seria inventar
 * politica; barrar aqui tambem seria. Quando a RF-131 for implementada, este
 * e o lugar dela.
 */
export function assertCanWrite(ctx: ExecutionContext): void {
  if (SOMENTE_LEITURA.has(ctx.role)) {
    throw AppError.forbidden('Seu perfil tem acesso somente de leitura.')
  }
}
