import { describe, expect, it } from 'vitest'
import { isAppError } from '../app-error.js'
import type { Role } from '@na-regua/contracts'
import type { ExecutionContext } from '../context.js'
import {
  InMemoryCompanyRepository,
  InMemoryCustomerRepository,
  InMemoryProductRepository,
} from './fakes.js'
import { registerCompany } from './register-company.js'
import { assertIdentifiable, registerCustomer } from './register-customer.js'
import { findProductByBarcode, generateInternalCode, registerProduct } from './register-product.js'

const AGORA = new Date('2026-09-02T13:00:00.000Z')

function contexto(sobrescreve: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    companyId: 'emp-1',
    userId: 'usr-1',
    role: 'owner' as Role,
    channel: 'app',
    requestId: 'req-1',
    now: AGORA,
    ...sobrescreve,
  }
}

const empresaValida = {
  legalName: 'Mercearia do Joao LTDA',
  cnpj: '12345678000195',
  email: 'joao@mercearia.local',
  phone: '4133330000',
}

describe('registerCompany — RF-001, RF-002', () => {
  it('cadastra a empresa', async () => {
    const companies = new InMemoryCompanyRepository()

    const empresa = await registerCompany({ companies }, contexto(), empresaValida)

    expect(empresa.cnpj).toBe('12345678000195')
    expect(empresa.createdAt).toBe(AGORA.toISOString())
  })

  it('usa a razao social como nome fantasia quando ele nao vem', async () => {
    const companies = new InMemoryCompanyRepository()
    const empresa = await registerCompany({ companies }, contexto(), empresaValida)
    expect(empresa.tradeName).toBe('Mercearia do Joao LTDA')
  })

  it('recusa CNPJ repetido', async () => {
    const companies = new InMemoryCompanyRepository()
    await registerCompany({ companies }, contexto(), empresaValida)

    await expect(registerCompany({ companies }, contexto(), empresaValida)).rejects.toThrow(
      /ja tem cadastro/i,
    )
  })

  it('nao revela nada da empresa existente na recusa — RF-002', async () => {
    const companies = new InMemoryCompanyRepository()
    await registerCompany({ companies }, contexto(), empresaValida)

    expect.assertions(3)
    try {
      await registerCompany({ companies }, contexto(), {
        ...empresaValida,
        legalName: 'Outra Empresa ME',
      })
    } catch (erro) {
      if (!isAppError(erro)) throw erro
      expect(erro.code).toBe('CONFLICT')
      /*
       * A mensagem nao pode conter razao social, e-mail nem telefone da
       * empresa ja cadastrada: com eles, o formulario de cadastro vira um
       * consultor de CNPJ para qualquer um.
       */
      expect(erro.message).not.toContain('Mercearia')
      expect(erro.message).not.toContain('joao@mercearia.local')
    }
  })

  it('nao exige papel na empresa, porque ela ainda nao existe', async () => {
    const companies = new InMemoryCompanyRepository()

    /*
     * Unico caso de uso de escrita sem `assertCanWrite`. Quem cria a empresa
     * nao tem papel NELA — e `accountant` aqui e o papel que a pessoa tem em
     * outra loja, que nao diz nada sobre esta.
     */
    const empresa = await registerCompany(
      { companies },
      contexto({ role: 'accountant' as Role }),
      empresaValida,
    )
    expect(empresa.id).toBeTruthy()
  })
})

describe('registerCustomer — RF-009, RF-010', () => {
  it('cadastra exigindo apenas o nome', async () => {
    const customers = new InMemoryCustomerRepository()

    const r = await registerCustomer({ customers }, contexto(), { name: 'Joao do Bar' })

    expect(r.status).toBe('created')
    if (r.status !== 'created') return
    expect(r.customer.phone).toBeNull()
    /* Nao deve nada e zero, nao nulo. */
    expect(r.customer.walletBalanceCents).toBe(0)
  })

  it('avisa do parecido por telefone em vez de recusar — RF-010', async () => {
    const customers = new InMemoryCustomerRepository()
    await registerCustomer({ customers }, contexto(), { name: 'Joao', phone: '41999990000' })

    const r = await registerCustomer({ customers }, contexto(), {
      name: 'Joao da Silva',
      phone: '41999990000',
    })

    /*
     * "Achei alguem parecido" nao e erro, e pergunta — e a resposta e do
     * balcao, com o cliente na frente. Por isso e resultado, nao excecao.
     */
    expect(r.status).toBe('duplicate_found')
    if (r.status !== 'duplicate_found') return
    expect(r.candidates.map((c) => c.name)).toEqual(['Joao'])
  })

  it('avisa do parecido por documento', async () => {
    const customers = new InMemoryCustomerRepository()
    await registerCustomer({ customers }, contexto(), { name: 'Maria', document: '12345678909' })

    const r = await registerCustomer({ customers }, contexto(), {
      name: 'Maria Souza',
      document: '12345678909',
    })

    expect(r.status).toBe('duplicate_found')
  })

  it('cadastra mesmo assim quando o balcao confirma', async () => {
    const customers = new InMemoryCustomerRepository()
    await registerCustomer({ customers }, contexto(), { name: 'Joao', phone: '41999990000' })

    const r = await registerCustomer(
      { customers },
      contexto(),
      { name: 'Pedro', phone: '41999990000' },
      { allowDuplicate: true },
    )

    /* Dois irmaos com o mesmo telefone de casa acontece; recusar travaria a
       venda dos dois. */
    expect(r.status).toBe('created')
  })

  it('nao procura parecido quando nao ha telefone nem documento', async () => {
    const customers = new InMemoryCustomerRepository()
    await registerCustomer({ customers }, contexto(), { name: 'Cliente Balcao' })

    const r = await registerCustomer({ customers }, contexto(), { name: 'Cliente Balcao' })

    /* Dois "Cliente Balcao" sem contato nenhum nao sao duplicata detectavel —
       e travar por homonimo travaria o balcao. */
    expect(r.status).toBe('created')
  })

  it('nao ve o cliente de outra empresa como parecido', async () => {
    const customers = new InMemoryCustomerRepository()
    await registerCustomer({ customers }, contexto({ companyId: 'emp-1' }), {
      name: 'Joao',
      phone: '41999990000',
    })

    const r = await registerCustomer({ customers }, contexto({ companyId: 'emp-2' }), {
      name: 'Joao',
      phone: '41999990000',
    })

    /* Se o filtro por empresa falhasse, uma loja veria o cadastro da outra —
       e o teste passaria se o falso nao filtrasse de verdade. */
    expect(r.status).toBe('created')
  })

  it('recusa escrita de quem so pode ler', async () => {
    const customers = new InMemoryCustomerRepository()

    await expect(
      registerCustomer({ customers }, contexto({ role: 'accountant' as Role }), { name: 'X' }),
    ).rejects.toThrow(/somente de leitura/i)
  })

  it('assertIdentifiable recusa cliente sem telefone e sem documento', async () => {
    const customers = new InMemoryCustomerRepository()
    const r = await registerCustomer({ customers }, contexto(), { name: 'Anonimo' })
    if (r.status !== 'created') throw new Error('esperava created')

    expect(() => assertIdentifiable(r.customer)).toThrow(/telefone nem documento/i)
  })

  it('assertIdentifiable aceita quem tem so telefone', async () => {
    const customers = new InMemoryCustomerRepository()
    const r = await registerCustomer({ customers }, contexto(), {
      name: 'Joao',
      phone: '41999990000',
    })
    if (r.status !== 'created') throw new Error('esperava created')

    expect(() => assertIdentifiable(r.customer)).not.toThrow()
  })
})

describe('generateInternalCode — RF-019', () => {
  it.each([
    [0, 'PROD-0001'],
    [1, 'PROD-0002'],
    [41, 'PROD-0042'],
  ])('com %i produtos gera %s', (quantos, esperado) => {
    expect(generateInternalCode(quantos)).toBe(esperado)
  })

  it('nao usa caractere ambiguo', () => {
    /* O codigo vai na etiqueta escrita a mao e e ditado no telefone: `a1b2c3`
       volta como `alb2c3`. Digito e prefixo fixo evitam isso. */
    expect(generateInternalCode(9)).toMatch(/^PROD-\d{4}$/)
  })
})

describe('registerProduct — RF-017, RF-018', () => {
  const produtoValido = {
    description: 'Cafe torrado 500g',
    unitOfMeasure: 'un' as const,
    salePriceCents: 1990,
    costPriceCents: 1200,
    stock: 0,
    minStock: 0,
  }

  it('cadastra e gera codigo interno', async () => {
    const products = new InMemoryProductRepository()

    const p = await registerProduct({ products }, contexto(), produtoValido)

    expect(p.internalCode).toBe('PROD-0001')
    expect(p.barcode).toBeNull()
  })

  it('gera codigo interno tambem para produto com codigo de barras', async () => {
    const products = new InMemoryProductRepository()

    const p = await registerProduct({ products }, contexto(), {
      ...produtoValido,
      barcode: '7891234567895',
    })

    /* E por ele que o lojista se refere ao item quando o leitor nao le. */
    expect(p.internalCode).toBe('PROD-0001')
    expect(p.barcode).toBe('7891234567895')
  })

  it('recusa codigo de barras repetido, dizendo em qual produto ele esta', async () => {
    const products = new InMemoryProductRepository()
    await registerProduct({ products }, contexto(), {
      ...produtoValido,
      barcode: '7891234567895',
    })

    /*
     * Dois cadastros para o mesmo EAN deixariam a loja com dois precos para o
     * mesmo produto — e o problema se descobre no dia em que o caixa cobra o
     * barato. Aqui a mensagem PODE nomear o produto: e dado da propria loja.
     */
    await expect(
      registerProduct({ products }, contexto(), {
        ...produtoValido,
        description: 'Cafe outro cadastro',
        barcode: '7891234567895',
      }),
    ).rejects.toThrow(/Cafe torrado 500g/)
  })

  it('o mesmo codigo de barras vale em outra empresa', async () => {
    const products = new InMemoryProductRepository()
    await registerProduct({ products }, contexto({ companyId: 'emp-1' }), {
      ...produtoValido,
      barcode: '7891234567895',
    })

    const p = await registerProduct({ products }, contexto({ companyId: 'emp-2' }), {
      ...produtoValido,
      barcode: '7891234567895',
    })

    /* Duas lojas vendem o mesmo produto: EAN igual nas duas e o caso normal. */
    expect(p.id).toBeTruthy()
  })

  it('a sequencia do codigo interno e por empresa', async () => {
    const products = new InMemoryProductRepository()
    await registerProduct({ products }, contexto({ companyId: 'emp-1' }), produtoValido)
    await registerProduct({ products }, contexto({ companyId: 'emp-1' }), produtoValido)

    const naOutra = await registerProduct(
      { products },
      contexto({ companyId: 'emp-2' }),
      produtoValido,
    )

    expect(naOutra.internalCode).toBe('PROD-0001')
  })

  it('recusa escrita de quem so pode ler', async () => {
    const products = new InMemoryProductRepository()
    await expect(
      registerProduct({ products }, contexto({ role: 'accountant' as Role }), produtoValido),
    ).rejects.toThrow(/somente de leitura/i)
  })

  it('findProductByBarcode devolve undefined em vez de lancar', async () => {
    const products = new InMemoryProductRepository()

    const achado = await findProductByBarcode({ products }, contexto(), '0000000000000')

    /* No PDV, "nao achei" e resposta normal e leva a tela de cadastro. */
    expect(achado).toBeUndefined()
  })

  it('findProductByBarcode acha o da propria empresa e nao o da outra', async () => {
    const products = new InMemoryProductRepository()
    await registerProduct({ products }, contexto({ companyId: 'emp-1' }), {
      ...produtoValido,
      barcode: '7891234567895',
    })

    const naPropria = await findProductByBarcode(
      { products },
      contexto({ companyId: 'emp-1' }),
      '7891234567895',
    )
    const naOutra = await findProductByBarcode(
      { products },
      contexto({ companyId: 'emp-2' }),
      '7891234567895',
    )

    expect(naPropria?.description).toBe('Cafe torrado 500g')
    expect(naOutra).toBeUndefined()
  })
})
