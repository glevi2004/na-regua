import DashboardPreview from '@/components/DashboardPreview'
import FAQ from '@/components/FAQ'
import FeatureSection from '@/components/FeatureSection'
import { AssistantVisual, FinanceVisual, SalesVisual } from '@/components/FeatureVisuals'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import Hero from '@/components/Hero'
import Modules from '@/components/Modules'
import Pricing from '@/components/Pricing'
import Testimonials from '@/components/Testimonials'

export default function Home() {
  return (
    <>
      <Header />

      <main>
        <Hero />
        <Modules />

        <FeatureSection
          id="como-funciona"
          eyebrow="Vendas"
          title={
            <>
              Do balcao ao caixa em <span className="gradientText">segundos</span>
            </>
          }
          text="Monte o carrinho pelo leitor de codigo de barras ou pela busca, aplique desconto por item e feche na forma de pagamento que o cliente escolher."
          bullets={[
            'Leitor de codigo de barras direto no catalogo',
            'Desconto por item ou no total da venda',
            'Custo, imposto e taxa de cartao calculados na hora',
            'Valor liquido lancado sozinho em contas a receber',
          ]}
          visual={<SalesVisual />}
        />

        <FeatureSection
          eyebrow="Financeiro"
          title={
            <>
              O caixa do mes que vem, <span className="gradientText">hoje</span>
            </>
          }
          text="Contas a pagar e a receber com baixa total ou parcial, saldo conciliado pelo Open Finance e a previsao de caixa sempre um passo a frente."
          bullets={[
            'Baixa total, parcial ou estorno em dois cliques',
            'Saldo bancario conciliado automaticamente',
            'Custos fixos viram contas a pagar sozinhos',
            'Cobranca enviada ao cliente sem sair do sistema',
          ]}
          visual={<FinanceVisual />}
          reverse
          muted
        />

        <FeatureSection
          eyebrow="Assistente"
          title={
            <>
              Pergunte. O sistema <span className="gradientText">responde</span>.
            </>
          }
          text="Em vez de montar filtro e exportar planilha, escreva o que precisa. O assistente consulta os mesmos dados do painel e devolve o numero pronto — e pede confirmacao antes de qualquer acao."
          bullets={[
            'Cadastro de cliente, produto e fornecedor por mensagem',
            'Consulta de contas, ranking e faturamento em texto',
            'Confirmacao obrigatoria antes de lancar ou estornar',
            'Contexto da conversa preservado entre perguntas',
          ]}
          visual={<AssistantVisual />}
        />

        <DashboardPreview />
        <Testimonials />
        <Pricing />
        <FAQ />
      </main>

      <Footer />
    </>
  )
}
