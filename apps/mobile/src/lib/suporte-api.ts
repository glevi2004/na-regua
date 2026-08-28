/**
 * ============================================================================
 * PONTOS DE INTEGRACAO — SUPORTE
 * ============================================================================
 *
 *  | Funcao           | Endpoint esperado            | Disparo             |
 *  |------------------|------------------------------|---------------------|
 *  | listarChamados   | GET  /suporte/chamados       | abertura da tela    |
 *  | abrirChamado     | POST /suporte/chamados       | submit do form      |
 *  | responderChamado | POST /suporte/chamados/:id/mensagens | resposta    |
 *  | marcarLido       | PATCH /suporte/chamados/:id  | abrir o detalhe     |
 *
 * O CHAMADO NAO E DO APP, E DA CONVERSA. O modelo abaixo guarda o chamado
 * e as mensagens separadamente, com `autor` em cada mensagem, justamente
 * porque a equipe de suporte vai responder de FORA do app, por um painel
 * administrativo. Se as respostas morassem no registro do chamado, esse
 * painel teria de reescrever o mesmo campo em concorrencia com o cliente.
 *
 * `naoLidas` fica no chamado e e zerado ao abrir o detalhe — e o que
 * alimenta o badge da navegacao.
 */

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* -------------------------------------------------------------------------- */
/* Modelo                                                                     */
/* -------------------------------------------------------------------------- */

export type StatusChamado = "aberto" | "andamento" | "respondido" | "encerrado";

export type CategoriaChamado =
  | "financeiro"
  | "cadastro"
  | "vendas"
  | "tecnico"
  | "outro";

export const CATEGORIAS: { valor: CategoriaChamado; rotulo: string }[] = [
  { valor: "financeiro", rotulo: "Financeiro" },
  { valor: "cadastro", rotulo: "Cadastro" },
  { valor: "vendas", rotulo: "Vendas" },
  { valor: "tecnico", rotulo: "Tecnico" },
  { valor: "outro", rotulo: "Outro" },
];

export const ROTULO_STATUS: Record<StatusChamado, string> = {
  aberto: "Aberto",
  andamento: "Em andamento",
  respondido: "Respondido",
  encerrado: "Encerrado",
};

export type MensagemChamado = {
  id: string;
  autor: "cliente" | "suporte";
  autorNome: string;
  texto: string;
  /** Nome do arquivo anexado, quando houver. */
  anexo: string | null;
  data: string;
};

export type Chamado = {
  id: string;
  protocolo: string;
  assunto: string;
  categoria: CategoriaChamado;
  status: StatusChamado;
  abertoEm: string;
  atualizadoEm: string;
  /** Respostas do suporte que o cliente ainda nao viu. */
  naoLidas: number;
  mensagens: MensagemChamado[];
};

/* -------------------------------------------------------------------------- */
/* Dados de exemplo                                                           */
/* -------------------------------------------------------------------------- */

/** SUBSTITUIR POR: GET /suporte/chamados */
export function listarChamados(): Chamado[] {
  return [
    {
      id: "ch-1",
      protocolo: "2026-0842",
      assunto: "Nota fiscal saiu com CFOP errado",
      categoria: "financeiro",
      status: "respondido",
      abertoEm: "2026-08-22",
      atualizadoEm: "2026-08-23",
      naoLidas: 1,
      mensagens: [
        {
          id: "m-1",
          autor: "cliente",
          autorNome: "Marina Alves",
          texto:
            "Emiti a NFC-e 4181 e o CFOP saiu como 5102, mas deveria ser 5405. Como corrijo?",
          anexo: "nfce-4181.pdf",
          data: "2026-08-22",
        },
        {
          id: "m-2",
          autor: "suporte",
          autorNome: "Suporte · Rafael",
          texto:
            "Oi, Marina. O CFOP vem da regra fiscal do produto. Confere em Produtos > Cafe torrado se o NCM esta como 0901.21.00 e se a origem esta marcada. Se estiver, me avisa que ajusto a regra da sua empresa aqui.",
          anexo: null,
          data: "2026-08-23",
        },
      ],
    },
    {
      id: "ch-2",
      protocolo: "2026-0838",
      assunto: "Importacao de planilha ignorou 3 clientes",
      categoria: "cadastro",
      status: "andamento",
      abertoEm: "2026-08-20",
      atualizadoEm: "2026-08-21",
      naoLidas: 0,
      mensagens: [
        {
          id: "m-3",
          autor: "cliente",
          autorNome: "Marina Alves",
          texto:
            "Importei 120 clientes e o relatorio disse que 3 ficaram de fora por CPF invalido, mas os CPFs estao certos.",
          anexo: "clientes.csv",
          data: "2026-08-20",
        },
        {
          id: "m-4",
          autor: "suporte",
          autorNome: "Suporte · Camila",
          texto:
            "Recebemos a planilha e estamos conferindo. Pela primeira olhada, esses tres estao com um espaco no fim do campo. Volto ate amanha com a correcao.",
          anexo: null,
          data: "2026-08-21",
        },
      ],
    },
    {
      id: "ch-3",
      protocolo: "2026-0811",
      assunto: "Como conectar a conta do Google Agenda",
      categoria: "tecnico",
      status: "encerrado",
      abertoEm: "2026-08-11",
      atualizadoEm: "2026-08-12",
      naoLidas: 0,
      mensagens: [
        {
          id: "m-5",
          autor: "cliente",
          autorNome: "Marina Alves",
          texto: "Nao acho onde conecto minha agenda do Google.",
          anexo: null,
          data: "2026-08-11",
        },
        {
          id: "m-6",
          autor: "suporte",
          autorNome: "Suporte · Rafael",
          texto:
            "E em Agenda, no bloco do topo: botao Conectar. Depois de autorizar, os compromissos aparecem nos dois lugares.",
          anexo: null,
          data: "2026-08-12",
        },
      ],
    },
  ];
}

/** Total de respostas nao lidas — alimenta o badge da navegacao. */
export function totalNaoLidas(chamados: Chamado[]): number {
  return chamados.reduce((acc, c) => acc + c.naoLidas, 0);
}

/* -------------------------------------------------------------------------- */
/* Acoes                                                                      */
/* -------------------------------------------------------------------------- */

export type DadosChamado = {
  assunto: string;
  categoria: CategoriaChamado;
  descricao: string;
  anexo: string | null;
};

/** SUBSTITUIR POR: POST /suporte/chamados */
export async function abrirChamado(
  dados: DadosChamado,
): Promise<{ ok: true; chamado: Chamado } | { ok: false; error: string }> {
  await delay(900);

  if (!dados.assunto.trim()) return { ok: false, error: "Informe o assunto." };
  if (dados.descricao.trim().length < 10) {
    return { ok: false, error: "Descreva o problema com um pouco mais de detalhe." };
  }

  const agora = "2026-08-24";
  return {
    ok: true,
    chamado: {
      id: `ch-${Date.now()}`,
      protocolo: `2026-${String(850 + Math.floor(Math.random() * 50))}`,
      assunto: dados.assunto.trim(),
      categoria: dados.categoria,
      status: "aberto",
      abertoEm: agora,
      atualizadoEm: agora,
      naoLidas: 0,
      mensagens: [
        {
          id: `m-${Date.now()}`,
          autor: "cliente",
          autorNome: "Marina Alves",
          texto: dados.descricao.trim(),
          anexo: dados.anexo,
          data: agora,
        },
      ],
    },
  };
}

/** SUBSTITUIR POR: POST /suporte/chamados/:id/mensagens */
export async function responderChamado(
  chamadoId: string,
  texto: string,
  anexo: string | null,
): Promise<{ ok: true; mensagem: MensagemChamado } | { ok: false; error: string }> {
  await delay(700);
  void chamadoId;

  if (!texto.trim()) return { ok: false, error: "Escreva a mensagem." };

  return {
    ok: true,
    mensagem: {
      id: `m-${Date.now()}`,
      autor: "cliente",
      autorNome: "Marina Alves",
      texto: texto.trim(),
      anexo,
      data: "2026-08-24",
    },
  };
}

/** SUBSTITUIR POR: PATCH /suporte/chamados/:id { lido: true } */
export async function marcarLido(chamadoId: string): Promise<{ ok: true }> {
  await delay(250);
  void chamadoId;
  return { ok: true };
}
