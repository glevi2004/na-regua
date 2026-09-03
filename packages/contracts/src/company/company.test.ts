import { describe, expect, it } from 'vitest'
import { createCustomerInputSchema } from '../customer/customer.js'
import {
  createAccountInputSchema,
  createCompanyInputSchema,
  createUserInputSchema,
} from './company.js'

const endereco = {
  cep: '80010-010',
  street: 'Rua das Flores',
  number: '100',
  neighborhood: 'Centro',
  city: 'Curitiba',
  state: 'PR' as const,
}

const empresa = {
  legalName: 'Mercearia da Marina LTDA',
  cnpj: '11.222.333/0001-81',
  email: 'Contato@Mercearia.COM.BR',
  phone: '(11) 98765-4321',
  taxRegime: 'simples_nacional' as const,
  address: endereco,
}

describe('cadastro de empresa', () => {
  it('normaliza documento, e-mail, telefone e CEP', () => {
    const r = createCompanyInputSchema.parse(empresa)
    expect(r.cnpj).toBe('11222333000181')
    expect(r.email).toBe('contato@mercearia.com.br')
    expect(r.phone).toBe('11987654321')
    expect(r.address.cep).toBe('80010010')
  })

  it('aceita MEI e a declaracao de Hibrido — o ERP nao recusa a forma', () => {
    const r = createCompanyInputSchema.parse({
      ...empresa,
      taxRegime: 'mei',
      optedReformaHibrida: true,
    })
    expect(r.taxRegime).toBe('mei')
    expect(r.optedReformaHibrida).toBe(true)
  })

  it('assume que nao optou pelo Hibrido quando o campo vem omitido', () => {
    const r = createCompanyInputSchema.parse(empresa)
    expect(r.optedReformaHibrida).toBe(false)
  })

  it.each([
    [{ ...empresa, cnpj: '11222333000182' }, 'CNPJ com digito errado'],
    [{ ...empresa, email: 'contato@' }, 'e-mail incompleto'],
    [{ ...empresa, phone: '99999' }, 'telefone curto'],
    [{ ...empresa, legalName: 'X' }, 'razao social curta'],
    [{ ...empresa, companyId: 'outra' }, 'companyId no corpo'],
    [{ ...empresa, taxRegime: 'simples' }, 'regime inventado'],
  ])('recusa %o (%s)', (entrada, _motivo) => {
    expect(createCompanyInputSchema.safeParse(entrada).success).toBe(false)
  })
})

describe('signup da conta', () => {
  it('aceita dados pessoais sem empresa', () => {
    const r = createAccountInputSchema.parse({
      name: 'Marina Alves',
      email: 'Marina@Loja.com',
      phone: '11987654321',
      password: 'senha-ok-1',
    })
    expect(r.email).toBe('marina@loja.com')
  })
})

describe('cadastro de usuario', () => {
  it.each(['owner', 'staff', 'platform_admin'])('aceita o papel %s', (role) => {
    const r = createUserInputSchema.safeParse({ name: 'Marina Alves', email: 'm@x.com', role })
    expect(r.success).toBe(true)
  })

  it('recusa accountant e papel inventado', () => {
    expect(
      createUserInputSchema.safeParse({
        name: 'Marina Alves',
        email: 'm@x.com',
        role: 'accountant',
      }).success,
    ).toBe(false)
    expect(
      createUserInputSchema.safeParse({
        name: 'Marina Alves',
        email: 'm@x.com',
        role: 'gerente',
      }).success,
    ).toBe(false)
  })
})

describe('cadastro de cliente', () => {
  it('aceita so o nome — o balcao vende antes de cadastrar tudo', () => {
    expect(createCustomerInputSchema.safeParse({ name: 'Joana Ribeiro' }).success).toBe(true)
  })

  it('aceita endereco opcional para tomador da nota', () => {
    const r = createCustomerInputSchema.parse({
      name: 'Padaria Sol',
      document: '11222333000181',
      address: {
        cep: '80010-010',
        street: 'Rua das Flores',
        number: '100',
        neighborhood: 'Centro',
        city: 'Curitiba',
        state: 'PR',
      },
    })
    expect(r.address?.cep).toBe('80010010')
  })

  it('aceita CPF e CNPJ no mesmo campo', () => {
    expect(
      createCustomerInputSchema.parse({ name: 'Joana R', document: '529.982.247-25' }).document,
    ).toBe('52998224725')
    expect(
      createCustomerInputSchema.parse({ name: 'Padaria Sol', document: '11222333000181' }).document,
    ).toBe('11222333000181')
  })

  it.each([
    [{ name: 'J' }, 'nome curto'],
    [{ name: 'Joana R', document: '12345678900' }, 'CPF com digito errado'],
    [{ name: 'Joana R', walletLimitCents: 99.9 }, 'limite decimal'],
    [{ name: 'Joana R', companyId: 'outra' }, 'companyId no corpo'],
  ])('recusa %o (%s)', (entrada, _motivo) => {
    expect(createCustomerInputSchema.safeParse(entrada).success).toBe(false)
  })
})
