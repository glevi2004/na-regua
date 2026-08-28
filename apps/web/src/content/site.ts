/**
 * Conteudo da landing.
 *
 * Numeros e depoimentos aqui sao ilustrativos, para dar forma ao layout.
 */

/**
 * Nome do produto. Todo lugar que exibe a marca le daqui — header da
 * landing, painel de login, sidebar do app, rodape e titulos de pagina —
 * entao trocar o nome continua sendo uma linha so.
 *
 * A LOGO ainda nao existe: o quadradinho de gradiente ao lado do nome e
 * um marcador, nao um simbolo. Quando houver arte, ela entra no lugar
 * dele nos mesmos pontos.
 */
export const BRAND = 'Ei Buddy'

export const nav = [
  { label: 'Modulos', href: '#modulos' },
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'Painel', href: '#painel' },
  { label: 'Planos', href: '#planos' },
  { label: 'Duvidas', href: '#duvidas' },
]

/** Barra de confianca que corre horizontalmente abaixo do hero. */
export const trustMetrics = [
  '+12 mil negocios ativos',
  'R$ 4,2 bi movimentados',
  'Seguranca nivel bancario',
  '99,9% de disponibilidade',
  'Suporte humano em ate 4 min',
  'Emissao fiscal em todo o Brasil',
]

/** Cards de modulos — o nucleo da proposta modular do produto. */
export const modules = [
  {
    id: 'vendas',
    icon: 'bag',
    name: 'Vendas',
    tag: 'Balcao e catalogo',
    description:
      'Carrinho com leitor de codigo de barras, desconto por item e fechamento em dinheiro, Pix ou cartao.',
  },
  {
    id: 'financeiro',
    icon: 'wallet',
    name: 'Financeiro',
    tag: 'Contas e conciliacao',
    description:
      'Contas a pagar e a receber com baixa total ou parcial, e saldo conciliado direto do banco.',
  },
  {
    id: 'estoque',
    icon: 'box',
    name: 'Estoque',
    tag: 'Reposicao guiada',
    description:
      'Giro por produto, alerta de ruptura e sugestao de compra antes da prateleira esvaziar.',
  },
  {
    id: 'fiscal',
    icon: 'receipt',
    name: 'Fiscal',
    tag: 'NFC-e e NFS-e',
    description:
      'Nota emitida no mesmo passo da venda, com imposto e taxa de cartao ja calculados.',
  },
  {
    id: 'assistente',
    icon: 'sparkles',
    name: 'Assistente',
    tag: 'Linguagem natural',
    description:
      'Pergunte pelo que precisa e receba o numero pronto — sem abrir relatorio nem montar filtro.',
  },
]

/** Ecossistema: o mesmo nucleo, adaptado por segmento. */
export const verticals = [
  { icon: 'store', label: 'Loja' },
  { icon: 'home', label: 'Casa' },
  { icon: 'utensils', label: 'Alimentacao' },
  { icon: 'heart', label: 'Saude' },
  { icon: 'shirt', label: 'Moda' },
]

/** Metricas grandes da secao de prova social. */
export const proofMetrics = [
  { value: '12.400', label: 'negocios usando hoje' },
  { value: 'R$ 4,2 bi', label: 'movimentados na plataforma' },
  { value: '38%', label: 'menos tempo em tarefa manual' },
  { value: '4,8/5', label: 'satisfacao media do lojista' },
]

export const testimonials = [
  {
    quote:
      'Fechei o mes sem abrir uma planilha. O caixa previsto ja vinha com a taxa do cartao descontada, entao o numero bateu certinho.',
    name: 'Marina Alves',
    role: 'Mercearia de bairro · Curitiba',
    initials: 'MA',
  },
  {
    quote:
      'O alerta de reposicao pagou a assinatura no primeiro mes. Parei de descobrir que faltava produto na hora que o cliente pedia.',
    name: 'Rogerio Tavares',
    role: 'Distribuidora · Belo Horizonte',
    initials: 'RT',
  },
  {
    quote:
      'Perguntar em texto e receber o ranking de produtos pronto mudou minha rotina. Antes eu levava uma tarde para montar isso.',
    name: 'Camila Nunes',
    role: 'Loja de roupas · Recife',
    initials: 'CN',
  },
  {
    quote:
      'A nota sai junto com a venda. Meu contador parou de me cobrar arquivo no fim do mes porque ja esta tudo la.',
    name: 'Eduardo Lima',
    role: 'Restaurante · Sao Paulo',
    initials: 'EL',
  },
]

export const plan = {
  name: 'Plano unico',
  badge: 'Todos os modulos inclusos',
  price: 'R$ 149',
  period: '/mes por empresa',
  note: 'Sem taxa de implantacao. Cancele quando quiser.',
  features: [
    'Todos os modulos: vendas, financeiro, estoque e fiscal',
    'Assistente em linguagem natural, sem limite de perguntas',
    'Emissao ilimitada de NFC-e e NFS-e',
    'Conciliacao bancaria automatica',
    'Usuarios ilimitados por empresa',
    'Importacao de clientes e produtos por planilha',
    'Suporte humano em horario comercial',
  ],
}

export const faq = [
  {
    question: 'Preciso trocar meu sistema atual de uma vez?',
    answer:
      'Nao. Os modulos sao independentes — da para comecar so por vendas ou so por financeiro e ligar os outros quando fizer sentido. Os dados que ja existem entram por importacao de planilha.',
  },
  {
    question: 'Funciona para qualquer tipo de negocio?',
    answer:
      'O nucleo e o mesmo para todos, e cada segmento ganha um ajuste proprio de catalogo e relatorio. Hoje atendemos loja, casa, alimentacao, saude e moda.',
  },
  {
    question: 'Como funciona a emissao de nota fiscal?',
    answer:
      'A nota e emitida no mesmo passo do fechamento da venda. O sistema calcula imposto e taxa de cartao e ja lanca o valor liquido em contas a receber.',
  },
  {
    question: 'Meus dados ficam seguros?',
    answer:
      'Cada empresa tem seus dados isolados por politica de acesso, com criptografia em transito e em repouso e backup diario com retencao de 30 dias.',
  },
  {
    question: 'O assistente substitui o painel?',
    answer:
      'Ele e um atalho, nao um substituto. Tudo que da para fazer no painel tambem da para pedir em texto — e o contrario tambem vale, entao voce escolhe o caminho.',
  },
  {
    question: 'Existe periodo de teste?',
    answer:
      'Sim, 14 dias com todos os modulos liberados e sem cartao de credito. Ao final voce decide se continua, sem cobranca automatica.',
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
      { label: 'Indicar um amigo', href: '/criar-conta' },
    ],
  },
  {
    title: 'Suporte',
    links: [
      { label: 'Central de ajuda', href: '/#duvidas' },
      { label: 'Falar com o time', href: '/#duvidas' },
      { label: 'Status do sistema', href: '/#duvidas' },
      { label: 'Contato', href: '/#duvidas' },
    ],
  },
]
