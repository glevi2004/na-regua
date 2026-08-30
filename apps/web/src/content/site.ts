/**
 * Conteudo da landing.
 *
 * REGRA DESTE ARQUIVO: nada aqui pode ser inventado. Numero, depoimento ou
 * selo so entra quando existir dado real por tras. Enquanto nao existir, a
 * pagina fala do que o produto FAZ — que e verificavel — em vez de quanto ele
 * ja vendeu, que nao e.
 *
 * O primeiro escopo usou metricas e depoimentos ficticios para dar forma ao
 * layout. Eles sairam. Os pontos onde dado real entra estao marcados com TODO.
 */

/**
 * Nome do produto. Todo lugar que exibe a marca le daqui — header da
 * landing, painel de login, sidebar do app, rodape e titulos de pagina —
 * entao trocar o nome continua sendo uma linha so.
 */
export const BRAND = 'Ei Buddy'

export const nav = [
  { label: 'Modulos', href: '#modulos' },
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'Painel', href: '#painel' },
  { label: 'Planos', href: '#planos' },
  { label: 'Duvidas', href: '#duvidas' },
]

/**
 * Barra que corre abaixo do hero.
 *
 * Eram metricas ficticias ("+12 mil negocios", "R$ 4,2 bi movimentados").
 * Agora sao capacidades do produto: cada item corresponde a uma tela que
 * existe no app.
 *
 * TODO: quando houver numero real de empresas ativas ou volume processado,
 * uma barra de metricas pode voltar — com dado apurado, nao estimado.
 */
export const highlights = [
  'Gestao completa do negocio',
  'Assistente por WhatsApp',
  'Emissao de NFC-e e NFS-e',
  'Contas a pagar e a receber',
  'Controle de estoque',
  'CRM e agenda integrados',
]

/** Cards de modulos — os sete modulos que o app tem hoje. */
export const modules = [
  {
    id: 'empresa',
    icon: 'store',
    name: 'Empresa',
    tag: 'Cadastro e fiscal',
    description:
      'Cadastro completo do negocio, com busca automatica de CNPJ e CEP e envio do certificado digital para emitir nota.',
  },
  {
    id: 'clientes',
    icon: 'users',
    name: 'Clientes',
    tag: 'Historico e contatos',
    description:
      'Historico de compras, pendencias e contatos de cada cliente, com busca por CPF ou CNPJ e importacao por planilha.',
  },
  {
    id: 'produtos',
    icon: 'box',
    name: 'Produtos',
    tag: 'Catalogo e estoque',
    description:
      'Catalogo com controle de estoque, importacao de XML de compra, busca por EAN e NCM e historico de movimentacao.',
  },
  {
    id: 'financeiro',
    icon: 'wallet',
    name: 'Financeiro',
    tag: 'Contas e plano de contas',
    description:
      'Plano de contas com contas a pagar e a receber, baixa total ou parcial e estorno de lancamento.',
  },
  {
    id: 'vendas',
    icon: 'bag',
    name: 'Vendas',
    tag: 'PDV e nota fiscal',
    description:
      'Catalogo, carrinho e pagamento em Pix, cartao, dinheiro ou carteira — com NFC-e ou NFS-e emitida no fechamento.',
  },
  {
    id: 'crm',
    icon: 'calendar',
    name: 'CRM e Agenda',
    tag: 'Pendencias e compromissos',
    description:
      'Pendencias e contatos em quadro estilo Kanban, com agenda de compromissos integrada ao Google Agenda.',
  },
  {
    id: 'assistente',
    icon: 'sparkles',
    name: 'Assistente de IA',
    tag: 'Pelo WhatsApp',
    description:
      'Faturamento, rankings, DRE, contas em aberto e cadastros — perguntando em texto, sem abrir relatorio.',
  },
]

/**
 * Secao que substituiu a prova social.
 *
 * Depoimentos e metricas ficticios sairam. Ate existir cliente real disposto a
 * dar depoimento, a pagina fala de beneficio concreto, ligado a uma tela que
 * existe.
 *
 * TODO: reativar a secao de depoimentos quando houver citacao real, com nome
 * (ou iniciais autorizadas), negocio e permissao de uso.
 */
export const benefits = [
  {
    icon: 'sparkles',
    title: 'Pergunte em vez de procurar',
    text: 'O numero que voce precisa vem por mensagem, sem abrir relatorio nem montar filtro.',
  },
  {
    icon: 'receipt',
    title: 'A nota sai junto com a venda',
    text: 'NFC-e e NFS-e emitidas no fechamento, com imposto e taxa de cartao ja calculados.',
  },
  {
    icon: 'wallet',
    title: 'O caixa deixa de ser estimativa',
    text: 'Valor liquido da venda cai em contas a receber sozinho, ja descontada a taxa da maquininha.',
  },
  {
    icon: 'box',
    title: 'Reposicao antes da falta',
    text: 'Estoque minimo por produto e aviso de quando repor, antes de o cliente pedir o que acabou.',
  },
  {
    icon: 'users',
    title: 'O historico do cliente na mao',
    text: 'O que comprou, quando comprou e o que deve — na hora do atendimento, nao depois.',
  },
  {
    icon: 'shield',
    title: 'Cada empresa vê só o que é dela',
    text: 'Dados isolados por empresa, com papel de acesso separado para dono, equipe e contador.',
  },
]

export const plan = {
  name: 'Plano unico',
  badge: 'Todos os modulos inclusos',
  price: 'R$ 59,90',
  period: '/mes por empresa',
  /*
   * Sem periodo de teste anunciado: o trial existe no escopo (E12), mas prazo
   * e limites sao pergunta em aberto nas decisoes. Anunciar "14 dias" antes de
   * a decisao fechar seria promessa que o produto ainda nao sustenta.
   */
  note: 'Cobranca mensal, sem fidelidade. Cancele quando quiser.',
  features: [
    'Empresa, clientes, produtos e estoque',
    'Vendas com emissao de NFC-e e NFS-e',
    'Financeiro: plano de contas, contas a pagar e a receber',
    'CRM em quadro Kanban e agenda integrada ao Google Agenda',
    'Assistente de IA pelo WhatsApp',
    'Importacao de clientes e produtos por planilha',
    'Usuarios ilimitados por empresa',
  ],
}

export const faq = [
  {
    question: 'Como funciona o assistente de IA pelo WhatsApp?',
    answer:
      'Voce pergunta em texto e ele responde com o dado do seu negocio: faturamento mes a mes, ranking de clientes e produtos, DRE, o que ha para pagar hoje. Tambem executa cadastro de cliente e lancamento de pendencia — e pede confirmacao antes de qualquer acao que altere dado.',
  },
  {
    question: 'Preciso de certificado digital para usar o app?',
    answer:
      'So para emitir nota fiscal. Vendas, financeiro, estoque, clientes e o assistente funcionam sem ele. O certificado A1 e enviado na tela de Empresa e fica guardado cifrado.',
  },
  {
    question: 'O app emite nota fiscal?',
    answer:
      'Sim, NFC-e para venda de produto e NFS-e para servico, emitidas no mesmo passo do fechamento da venda. O imposto e a taxa de cartao entram no calculo e o valor liquido vai para contas a receber.',
  },
  {
    question: 'Posso importar meus clientes e produtos de uma planilha?',
    answer:
      'Sim. Clientes e produtos aceitam importacao por planilha, com mapeamento das colunas do seu arquivo. Produtos tambem aceitam XML de nota de compra, que ja traz descricao, EAN e NCM preenchidos.',
  },
  {
    question: 'Como funciona o pagamento da mensalidade?',
    answer:
      'Assinatura mensal por empresa, cobrada no cartao ou por Pix. A fatura fica na tela de Assinatura, com o historico das anteriores.',
  },
  {
    question: 'Posso cancelar quando quiser?',
    answer:
      'Sim, nao ha fidelidade nem multa. Ao cancelar voce continua podendo ler e exportar seus dados.',
  },
]

export const footerColumns = [
  {
    title: 'Produto',
    links: [
      { label: 'Modulos', href: '/#modulos' },
      { label: 'Como funciona', href: '/#como-funciona' },
      { label: 'Painel', href: '/#painel' },
      { label: 'Planos', href: '/#planos' },
      { label: 'Duvidas', href: '/#duvidas' },
    ],
  },
  {
    title: 'Conta',
    links: [
      { label: 'Entrar', href: '/login' },
      { label: 'Criar conta', href: '/criar-conta' },
      { label: 'Recuperar senha', href: '/recuperar-senha' },
    ],
  },
  {
    /*
     * Suporte publico ainda nao existe como pagina: /app/suporte fica atras do
     * login. Enquanto nao houver pagina de contato aberta, os links levam para
     * onde ha resposta de verdade — as duvidas na propria landing e o login.
     *
     * TODO: apontar para a pagina publica de contato quando ela existir, e
     * incluir o canal de atendimento (e-mail ou WhatsApp) quando definido.
     */
    title: 'Suporte',
    links: [
      { label: 'Duvidas frequentes', href: '/#duvidas' },
      { label: 'Falar com o suporte', href: '/login' },
    ],
  },
]
