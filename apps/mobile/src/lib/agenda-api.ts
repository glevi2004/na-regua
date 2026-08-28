/**
 * ============================================================================
 * PONTOS DE INTEGRACAO — AGENDA
 * ============================================================================
 *
 *  | Funcao            | Endpoint esperado              | Disparo            |
 *  |-------------------|--------------------------------|--------------------|
 *  | statusGoogle      | GET  /agenda/google/status     | abertura da tela   |
 *  | conectarGoogle    | GET  /agenda/google/authorize  | botao conectar     |
 *  | desconectarGoogle | DELETE /agenda/google          | botao desconectar  |
 *  | listarEventos     | GET  /agenda/eventos?de=&ate=  | troca de mes       |
 *  | criarEvento       | POST /agenda/eventos           | novo compromisso   |
 *  | excluirEvento     | DELETE /agenda/eventos/:id     | excluir            |
 *
 * SOBRE O OAUTH: o fluxo NAO acontece no navegador com client secret. O
 * botao "Conectar" manda o usuario para /agenda/google/authorize no NOSSO
 * backend, que redireciona ao Google e recebe o callback. O refresh token
 * fica no servidor — nunca chega ao front. O front so pergunta "esta
 * conectado?" e mostra o resultado.
 *
 * SINCRONIZACAO EM DUAS VIAS: o backend precisa guardar o `googleEventId`
 * de cada evento e usar webhook (push notifications da API do Google) para
 * saber quando algo mudou la. Polling a cada carregamento de tela nao da
 * conta e estoura cota.
 *
 * LEMBRETES: o campo `lembreteMinutos` ja existe no modelo porque a
 * comunicacao do produto e por WhatsApp — quando o worker de lembretes
 * entrar, ele le esse campo e nao ha migracao de dado.
 */

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Data de referencia do app (mesma dos demais mocks). */
export const HOJE = "2026-08-24";

/* -------------------------------------------------------------------------- */
/* Conexao com o Google                                                       */
/* -------------------------------------------------------------------------- */

export type StatusGoogle = {
  conectado: boolean;
  conta: string | null;
  ultimaSincronizacao: string | null;
};

/** SUBSTITUIR POR: GET /agenda/google/status */
export async function statusGoogle(): Promise<StatusGoogle> {
  await delay(400);
  return { conectado: false, conta: null, ultimaSincronizacao: null };
}

/**
 * SUBSTITUIR POR: redirecionar para GET /agenda/google/authorize
 *
 * Na versao real esta funcao vira abertura do navegador via `expo-web-browser` no fluxo OAuth
 * e o retorno acontece pelo callback, nao por promessa.
 */
export async function conectarGoogle(): Promise<{ ok: true; status: StatusGoogle }> {
  await delay(1400);
  return {
    ok: true,
    status: {
      conectado: true,
      conta: "marina@solnascente.com.br",
      ultimaSincronizacao: `${HOJE}T09:12:00`,
    },
  };
}

/** SUBSTITUIR POR: DELETE /agenda/google */
export async function desconectarGoogle(): Promise<{ ok: true }> {
  await delay(700);
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Eventos                                                                    */
/* -------------------------------------------------------------------------- */

export type OrigemEvento = "app" | "google";

export type Evento = {
  id: string;
  titulo: string;
  descricao: string;
  /** AAAA-MM-DD */
  data: string;
  horaInicio: string;
  horaFim: string;
  local: string;
  origem: OrigemEvento;
  /** Minutos antes do compromisso para avisar no WhatsApp. */
  lembreteMinutos: number | null;
};

/** SUBSTITUIR POR: GET /agenda/eventos?de=&ate= */
export function listarEventos(): Evento[] {
  return [
    {
      id: "ev-1",
      titulo: "Pagar Torrefacao Aurora",
      descricao: "Pedido 4471 vence hoje.",
      data: "2026-08-24",
      horaInicio: "14:00",
      horaFim: "14:30",
      local: "",
      origem: "app",
      lembreteMinutos: 30,
    },
    {
      id: "ev-2",
      titulo: "Entrega Padaria Sol",
      descricao: "Pedido 8891, levar nota.",
      data: "2026-08-25",
      horaInicio: "08:30",
      horaFim: "09:30",
      local: "Rua Xavier da Silva, 88",
      origem: "app",
      lembreteMinutos: 60,
    },
    {
      id: "ev-3",
      titulo: "Reuniao com contador",
      descricao: "Fechamento de agosto.",
      data: "2026-08-26",
      horaInicio: "16:00",
      horaFim: "17:00",
      local: "https://meet.google.com/exemplo",
      origem: "google",
      lembreteMinutos: 15,
    },
    {
      id: "ev-4",
      titulo: "Aluguel do ponto",
      descricao: "Vencimento do custo fixo.",
      data: "2026-08-27",
      horaInicio: "10:00",
      horaFim: "10:15",
      local: "",
      origem: "app",
      lembreteMinutos: null,
    },
    {
      id: "ev-5",
      titulo: "Almoco com fornecedor",
      descricao: "Importadora Oliva, linha de azeites.",
      data: "2026-08-28",
      horaInicio: "12:00",
      horaFim: "13:30",
      local: "Restaurante Boa Mesa",
      origem: "google",
      lembreteMinutos: 30,
    },
    {
      id: "ev-6",
      titulo: "Contagem de estoque",
      descricao: "Inventario mensal.",
      data: "2026-08-31",
      horaInicio: "18:00",
      horaFim: "20:00",
      local: "Loja",
      origem: "app",
      lembreteMinutos: 60,
    },
  ];
}

export type DadosEvento = {
  titulo: string;
  descricao: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  local: string;
  lembreteMinutos: number | null;
};

/** SUBSTITUIR POR: POST /agenda/eventos */
export async function criarEvento(
  dados: DadosEvento,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await delay(800);

  if (!dados.titulo.trim()) return { ok: false, error: "Informe o titulo." };
  if (!dados.data) return { ok: false, error: "Escolha a data." };
  if (dados.horaFim <= dados.horaInicio) {
    return { ok: false, error: "O horario de fim precisa ser depois do inicio." };
  }

  return { ok: true, id: `ev-${Date.now()}` };
}

/** SUBSTITUIR POR: DELETE /agenda/eventos/:id */
export async function excluirEvento(id: string): Promise<{ ok: true }> {
  await delay(500);
  void id;
  return { ok: true };
}

/** Opcoes de lembrete, em minutos antes do compromisso. */
export const LEMBRETES = [
  { valor: null, rotulo: "Sem lembrete" },
  { valor: 15, rotulo: "15 minutos antes" },
  { valor: 30, rotulo: "30 minutos antes" },
  { valor: 60, rotulo: "1 hora antes" },
  { valor: 1440, rotulo: "1 dia antes" },
];

/* -------------------------------------------------------------------------- */
/* Calendario                                                                 */
/* -------------------------------------------------------------------------- */

export const NOMES_MESES = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

export type DiaCalendario = {
  /** AAAA-MM-DD */
  data: string;
  dia: number;
  doMes: boolean;
  hoje: boolean;
};

/**
 * Monta a grade do mes, completando com os dias vizinhos para as semanas
 * ficarem cheias. Datas sao tratadas como texto AAAA-MM-DD para nao
 * depender do fuso do navegador — em calendario, um dia de diferenca por
 * causa de UTC e um bug que aparece so para alguns usuarios.
 */
export function montarMes(ano: number, mes: number): DiaCalendario[] {
  const primeiro = new Date(Date.UTC(ano, mes, 1));
  const inicioSemana = primeiro.getUTCDay();

  const dias: DiaCalendario[] = [];
  const totalCelulas = 42; /* 6 semanas cobrem qualquer mes */

  for (let i = 0; i < totalCelulas; i++) {
    const d = new Date(Date.UTC(ano, mes, 1 - inicioSemana + i));
    const iso = d.toISOString().slice(0, 10);

    dias.push({
      data: iso,
      dia: d.getUTCDate(),
      doMes: d.getUTCMonth() === mes,
      hoje: iso === HOJE,
    });
  }

  /* Corta a ultima semana se ela for toda do mes seguinte. */
  const ultimaSemana = dias.slice(35);
  return ultimaSemana.every((d) => !d.doMes) ? dias.slice(0, 35) : dias;
}
