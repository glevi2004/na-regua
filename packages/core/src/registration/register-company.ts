import type { CompanyOutput, CreateCompanyInput } from '@na-regua/contracts'
import { AppError } from '../app-error.js'
import type { ExecutionContext } from '../context.js'
import type { CompanyRepository } from '../ports/registration-repositories.js'

export type RegisterCompanyDeps = {
  readonly companies: CompanyRepository
}

/**
 * Cadastra a empresa — RF-001, RF-002.
 *
 * Nao chama `assertCanWrite`: quem cria a empresa ainda nao tem papel NELA,
 * porque ela nao existe. Este e o unico caso de uso de escrita do sistema em
 * que isso vale, e por isso esta escrito aqui em vez de subentendido. Quem
 * pode chamar e assunto da rota de onboarding (DEC-008), nao do papel de
 * tenant.
 *
 * O preenchimento automatico de razao social e endereco a partir do CNPJ, que a
 * RF-001 tambem pede, depende de um servico externo de consulta e ainda nao tem
 * porta nem decisao. Ele vem antes deste caso de uso, na borda: aqui os dados
 * chegam prontos, validados por `contracts`.
 */
export async function registerCompany(
  deps: RegisterCompanyDeps,
  ctx: ExecutionContext,
  input: CreateCompanyInput,
): Promise<CompanyOutput> {
  /*
   * RF-002 pede recusar CNPJ repetido "sem revelar dados da empresa
   * existente". Por isso a porta responde se EXISTE, e nao qual e: com a linha
   * em maos, a tentacao de por a razao social na mensagem ("Ja cadastrada como
   * MERCEARIA DO JOAO LTDA") seria grande, e ela transformaria o formulario num
   * consultor de CNPJ para qualquer um.
   */
  if (await deps.companies.cnpjTaken(input.cnpj)) {
    throw AppError.conflict(
      'Este CNPJ ja tem cadastro. Se a empresa e sua, peca acesso a quem administra a conta.',
    )
  }

  return deps.companies.create({
    legalName: input.legalName,
    tradeName: input.tradeName,
    cnpj: input.cnpj,
    email: input.email,
    phone: input.phone,
    createdAt: ctx.now,
  })
}
