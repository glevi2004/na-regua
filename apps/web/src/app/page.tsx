import Benefits from '@/components/Benefits'
import CtaBuddy from '@/components/CtaBuddy'
import DashboardPreview from '@/components/DashboardPreview'
import FAQ from '@/components/FAQ'
import FeatureSection from '@/components/FeatureSection'
import { AssistantVisual, CrmVisual, FinanceVisual, SalesVisual } from '@/components/FeatureVisuals'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import Hero from '@/components/Hero'
import Modules from '@/components/Modules'
import Pricing from '@/components/Pricing'

export default function Home() {
  return (
    <>
      <Header />

      <main>
        <Hero />
        <Modules />

        {/*
          O assistente vem primeiro entre os blocos detalhados: e o que
          diferencia o produto de qualquer outro ERP de balcao. Os exemplos de
          comando sao os mesmos que a tela do assistente sugere hoje.
        */}
        <FeatureSection
          id="como-funciona"
          eyebrow="Assistente de IA"
          title={
            <>
              Pergunte pelo <span className="gradientText">WhatsApp</span>
            </>
          }
          text="Em vez de abrir o painel, montar filtro e exportar planilha, mande uma mensagem. O assistente consulta os mesmos dados do sistema e devolve o numero pronto — e pede confirmacao antes de qualquer acao que altere dado."
          bullets={[
            '"Qual foi o faturamento mes a mes dos ultimos meses"',
            '"Quais produtos precisam de reposicao de estoque"',
            '"O que ha para pagar ate sexta"',
            '"Cadastra um cliente para mim"',
          ]}
          visual={<AssistantVisual />}
        />

        <FeatureSection
          eyebrow="Vendas"
          title={
            <>
              A nota sai junto com a <span className="gradientText">venda</span>
            </>
          }
          text="Monte o carrinho pelo leitor de codigo de barras ou pela busca, aplique desconto por item e receba em Pix, cartao, dinheiro ou carteira. A NFC-e ou NFS-e e emitida no fechamento."
          bullets={[
            'Leitor de codigo de barras direto no catalogo',
            'Desconto por item ou no total da venda',
            'Custo, imposto e taxa de cartao calculados na hora',
            'Valor liquido lancado sozinho em contas a receber',
          ]}
          visual={<SalesVisual />}
          reverse
          muted
        />

        <FeatureSection
          eyebrow="Financeiro"
          title={
            <>
              Contas a pagar e a <span className="gradientText">receber</span>
            </>
          }
          text="Plano de contas proprio, com titulos organizados por vencimento. Baixa total ou parcial, estorno de lancamento e a previsao de caixa sempre um passo a frente."
          bullets={[
            'Plano de contas para classificar cada lancamento',
            'Baixa total, parcial ou estorno',
            'Titulos vencidos separados dos a vencer',
            'DRE do mes pelo painel ou pelo assistente',
          ]}
          visual={<FinanceVisual />}
        />

        <FeatureSection
          eyebrow="Clientes e CRM"
          title={
            <>
              O historico do cliente na <span className="gradientText">mao</span>
            </>
          }
          text="Cada cliente com suas compras, pendencias e contatos no mesmo lugar. As pendencias viram cartoes num quadro, e os compromissos aparecem na agenda."
          bullets={[
            'Busca por CPF ou CNPJ e importacao por planilha',
            'Historico de compras e o que esta em aberto',
            'Pendencias e contatos em quadro estilo Kanban',
            'Agenda de compromissos com lembrete antes da hora',
          ]}
          visual={<CrmVisual />}
          reverse
          muted
        />

        <DashboardPreview />
        <Benefits />
        <Pricing />
        <FAQ />
        <CtaBuddy />
      </main>

      <Footer />
    </>
  )
}
