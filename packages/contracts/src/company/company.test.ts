import { describe, expect, it } from 'vitest'
import { createCustomerInputSchema } from '../customer/customer.js'
import { createCompanyInputSchema, createUserInputSchema } from './company.js'

const empresa = {
  legalName: 'Mercearia da Marina LTDA',
  cnpj: '11.222.333/0001-81',
  email: 'Contato@Mercearia.COM.BR',
  phone: '(11) 98765-4321',
}

describe('cadastro de empresa', () => {
  it('normaliza documento, e-mail e telefone', () => {
    const r = createCompanyInputSchema.parse(empresa)
    expect(r.cnpj).toBe('11222333000181')
    expect(r.email).toBe('contato@mercearia.com.br')
    expect(r.phone).toBe('11987654321')
  })

  it.each([
    [{ ...empresa, cnpj: '11222333000182' }, 'CNPJ com digito errado'],
    [{ ...empresa, email: 'contato@' }, 'e-mail incompleto'],
    [{ ...empresa, phone: '99999' }, 'telefone curto'],
    [{ ...empresa, legalName: 'X' }, 'razao social curta'],
    [{ ...empresa, companyId: 'outra' }, 'companyId no corpo'],
  ])('recusa %o (%s)', (entrada, _motivo) => {
    expect(createCompanyInputSchema.safeParse(entrada).success).toBe(false)
  })
})

describe('cadastro de usuario', () => {
  it.each(['owner', 'staff', 'accountant', 'platform_admin'])(
    'aceita o papel %s',
    (role, _motivo) => {
      const r = createUserInputSchema.safeParse({ name: 'Marina Alves', email: 'm@x.com', role })
      expect(r.success).toBe(true)
    },
  )

  it('recusa papel inventado', () => {
    const r = createUserInputSchema.safeParse({
      name: 'Marina Alves',
      email: 'm@x.com',
      role: 'gerente',
    })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0]?.message).toBe('Papel de acesso invalido.')
  })
})

describe('cadastro de cliente', () => {
  it('aceita so o nome — o balcao vende antes de cadastrar tudo', () => {
    expect(createCustomerInputSchema.safeParse({ name: 'Joana Ribeiro' }).success).toBe(true)
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
