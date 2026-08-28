/**
 * ============================================================================
 * PONTOS DE INTEGRACAO — MODULO FINANCEIRO
 * ============================================================================
 *
 *  | Funcao                | Endpoint esperado                | Disparo         |
 *  |-----------------------|----------------------------------|-----------------|
 *  | salvarTitulo          | POST/PUT /financeiro/titulos     | submit do form  |
 *  | baixarTitulo          | POST /financeiro/titulos/:id/baixas | confirmar baixa |
 *  | estornarTitulo        | DELETE /financeiro/titulos/:id/baixas/:baixaId | estorno |
 *  | salvarPlanoContas     | POST/PUT /financeiro/planos      | submit          |
 *  | salvarCustoFixo       | POST/PUT /financeiro/custos-fixos| submit          |
 *  | gerarContasDeCustosFixos | POST /financeiro/custos-fixos/gerar | botao      |
 *  | exportar              | GET  /financeiro/titulos/export  | botao exportar  |
 *
 * SOBRE BAIXA E ESTORNO: no backend isto NAO pode ser um UPDATE no titulo.
 * Cada baixa precisa ser um lancamento proprio, com valor, data e autor, e
 * o estorno precisa ser outro lancamento que anula o primeiro — nunca um
 * DELETE. Sem esse historico nao ha como auditar por que um saldo mudou,
 * e conciliacao bancaria sem auditoria e chute.
 */

import { contasPagar, contasReceber, planoContas, custosFixos, bancos, clientes } from "./mock-data";
import type { ContaPagar, ContaReceber, CustoFixo, PlanoContas, StatusTitulo } from "./types";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* -------------------------------------------------------------------------- */
/* Listas para os campos "(T)"                                                */
/* -------------------------------------------------------------------------- */

/** SUBSTITUIR POR: GET /bancos */
export const NOMES_BANCOS = bancos.map((b) => b.nome);

/** SUBSTITUIR POR: GET /financeiro/planos */
export const NOMES_PLANOS = planoContas.map((p) => p.nome);

/** SUBSTITUIR POR: GET /fornecedores */
export const NOMES_FORNECEDORES = [
  ...new Set(contasPagar.map((c) => c.fornecedor)),
].sort();

/** SUBSTITUIR POR: GET /clientes */
export const NOMES_CLIENTES = clientes.map((c) => c.nome);

export const TIPOS_RECEBIMENTO = [
  { valor: "debito", rotulo: "Cartao de debito" },
  { valor: "credito", rotulo: "Cartao de credito" },
  { valor: "pix", rotulo: "Pix" },
  { valor: "carteira", rotulo: "Carteira" },
] as const;

/* -------------------------------------------------------------------------- */
/* Estado das listas                                                          */
/* -------------------------------------------------------------------------- */

/** SUBSTITUIR POR: GET /financeiro/titulos?tipo=pagar */
export function listarContasPagar(): ContaPagar[] {
  return contasPagar.map((c) => ({ ...c }));
}

/** SUBSTITUIR POR: GET /financeiro/titulos?tipo=receber */
export function listarContasReceber(): ContaReceber[] {
  return contasReceber.map((c) => ({ ...c }));
}

/** SUBSTITUIR POR: GET /financeiro/planos */
export function listarPlanos(): PlanoContas[] {
  return planoContas.map((p) => ({ ...p }));
}

/** SUBSTITUIR POR: GET /financeiro/custos-fixos */
export function listarCustosFixos(): CustoFixo[] {
  return custosFixos.map((c) => ({ ...c }));
}

/* -------------------------------------------------------------------------- */
/* Baixa e estorno                                                            */
/* -------------------------------------------------------------------------- */

export type ResultadoBaixa =
  | { ok: true; status: StatusTitulo; valorBaixado: number }
  | { ok: false; error: string };

/**
 * SUBSTITUIR POR: POST /financeiro/titulos/:id/baixas
 *
 * `valor` e o quanto foi pago/recebido agora. Quando for menor que o saldo,
 * o titulo fica "parcial" e o restante continua em aberto.
 */
export async function baixarTitulo(
  id: string,
  valor: number,
  saldo: number,
): Promise<ResultadoBaixa> {
  await delay(800);
  void id;

  if (!Number.isFinite(valor) || valor <= 0) {
    return { ok: false, error: "Informe um valor maior que zero." };
  }

  /* Tolerancia de 1 centavo para nao brigar com arredondamento. */
  if (valor > saldo + 0.01) {
    return { ok: false, error: "O valor da baixa e maior que o saldo em aberto." };
  }

  const quitou = valor >= saldo - 0.01;
  return { ok: true, status: quitou ? "pago" : "parcial", valorBaixado: valor };
}

/** SUBSTITUIR POR: DELETE /financeiro/titulos/:id/baixas/:baixaId */
export async function estornarTitulo(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await delay(700);
  void id;
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Gravacao de titulos                                                        */
/* -------------------------------------------------------------------------- */

export type DadosTituloPagar = {
  banco: string;
  planoContas: string;
  fornecedor: string;
  vencimento: string;
  valor: number;
  descricao: string;
};

export type DadosTituloReceber = {
  banco: string;
  cliente: string;
  emissao: string;
  vencimento: string;
  referente: string;
  tipo: string;
  valor: number;
};

/** SUBSTITUIR POR: POST /financeiro/titulos */
export async function salvarTitulo(
  dados: DadosTituloPagar | DadosTituloReceber,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await delay(800);
  void dados;
  return { ok: true, id: `tit-${Date.now()}` };
}

/* -------------------------------------------------------------------------- */
/* Plano de contas e custos fixos                                             */
/* -------------------------------------------------------------------------- */

/** SUBSTITUIR POR: POST/PUT /financeiro/planos */
export async function salvarPlanoContas(
  nome: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await delay(600);
  if (!nome.trim()) return { ok: false, error: "Informe o nome do plano de conta." };
  return { ok: true, id: `pc-${Date.now()}` };
}

export type DadosCustoFixo = {
  id?: string;
  nome: string;
  diaVencimento: number;
  valor: number;
  planoContasNome: string;
  bancoNome: string;
};

/** SUBSTITUIR POR: POST/PUT /financeiro/custos-fixos */
export async function salvarCustoFixo(
  dados: DadosCustoFixo,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await delay(700);

  if (!dados.nome.trim()) return { ok: false, error: "Informe o nome do custo fixo." };
  if (dados.diaVencimento < 1 || dados.diaVencimento > 31) {
    return { ok: false, error: "O dia do vencimento deve estar entre 1 e 31." };
  }
  if (dados.valor <= 0) return { ok: false, error: "Informe um valor maior que zero." };

  return { ok: true, id: dados.id ?? `cf-${Date.now()}` };
}

/** SUBSTITUIR POR: DELETE /financeiro/custos-fixos/:id */
export async function excluirCustoFixo(id: string): Promise<{ ok: true }> {
  await delay(500);
  void id;
  return { ok: true };
}

/**
 * SUBSTITUIR POR: POST /financeiro/custos-fixos/gerar
 *
 * Gera as contas a pagar do mes a partir dos custos fixos. O servidor
 * precisa ser idempotente por (custo fixo, competencia): rodar duas vezes
 * no mesmo mes nao pode duplicar a conta.
 */
export async function gerarContasDeCustosFixos(
  custos: CustoFixo[],
  competencia: string,
): Promise<{ ok: true; geradas: number; jaExistiam: number }> {
  await delay(1100);
  void competencia;

  /* No exemplo, os que ja tem conta lancada no mes ficam de fora. */
  const jaLancados = new Set(contasPagar.map((c) => c.fornecedor.toLowerCase()));
  const geradas = custos.filter((c) => !jaLancados.has(c.nome.toLowerCase())).length;

  return { ok: true, geradas, jaExistiam: custos.length - geradas };
}

/* -------------------------------------------------------------------------- */
/* Exportacao (previsto, ainda nao implementado)                              */
/* -------------------------------------------------------------------------- */

export type FormatoExportacao = "csv" | "pdf";

/**
 * SUBSTITUIR POR: GET /financeiro/titulos/export?formato=
 *
 * A estrutura ja existe para que a exportacao entre sem mexer nas telas: o
 * botao chama esta funcao e o servidor devolve o arquivo pronto. Gerar CSV
 * no cliente daria pressa, mas PDF nao — e ter dois caminhos diferentes
 * para a mesma acao acaba divergindo.
 */
export async function exportar(
  formato: FormatoExportacao,
): Promise<{ ok: false; error: string }> {
  await delay(400);
  return {
    ok: false,
    error: `Exportacao em ${formato.toUpperCase()} entra quando o backend expuser o endpoint.`,
  };
}

/* -------------------------------------------------------------------------- */
/* Utilitarios de status                                                      */
/* -------------------------------------------------------------------------- */

/** Dias a partir dos quais o titulo entra em "a vencer em breve". */
export const DIAS_A_VENCER = 5;

export type SituacaoVisual = "aberto" | "aVencer" | "vencido" | "quitado" | "parcial";

/**
 * Situacao para efeito de cor, combinando status e proximidade do
 * vencimento — e o que a listagem usa para pintar o badge.
 */
export function situacaoDoTitulo(
  status: StatusTitulo,
  vencimento: string,
  diasAte: number,
): SituacaoVisual {
  if (status === "pago") return "quitado";
  if (status === "vencido" || diasAte < 0) return "vencido";
  if (status === "parcial") return "parcial";
  if (diasAte <= DIAS_A_VENCER) return "aVencer";
  return "aberto";
}

export const ROTULO_SITUACAO: Record<SituacaoVisual, string> = {
  aberto: "Em aberto",
  aVencer: "A vencer",
  vencido: "Vencido",
  quitado: "Quitado",
  parcial: "Baixa parcial",
};
