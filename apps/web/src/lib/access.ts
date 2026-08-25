/**
 * Regra de acesso quando o pagamento esta pendente.
 *
 * A decisao de produto e: NAO bloquear o login e NAO esconder os modulos —
 * o lojista continua vendo tudo que tem, mas so consegue LER. Qualquer acao
 * que gere novo dado fica bloqueada ate regularizar.
 *
 * O backend deve aplicar a MESMA regra no servidor: esta lista existe para a
 * UI antecipar o bloqueio, nunca como unica barreira.
 */

/** Rotas que continuam liberadas mesmo com pagamento em atraso. */
export const ROTAS_LIBERADAS = [
  "/painel", // visao geral, somente leitura
  "/painel/assinatura", // area de pagamento e faturas
  "/painel/suporte", // canal de atendimento
] as const;

/** Modulos bloqueados: visiveis na navegacao, porem com cadeado. */
export const MODULOS_BLOQUEADOS = [
  "/painel/vendas",
  "/painel/clientes",
  "/painel/produtos",
  "/painel/contas-a-pagar",
  "/painel/contas-a-receber",
  "/painel/bancos",
  "/painel/plano-de-contas",
  "/painel/agenda",
  "/painel/empresa",
] as const;

/**
 * O que continua funcionando com pagamento pendente — usado como texto do
 * modal de bloqueio, para o usuario entender o que ainda pode fazer.
 */
export const ACOES_LIBERADAS = [
  "Consultar os dados que voce ja cadastrou",
  "Acessar faturas e regularizar o pagamento",
  "Falar com o suporte",
];

export const ACOES_BLOQUEADAS = [
  "Registrar novas vendas e emitir nota fiscal",
  "Cadastrar ou editar clientes e produtos",
  "Lancar e dar baixa em contas",
  "Usar o assistente e gerar relatorios",
];

export function isRotaBloqueada(pathname: string): boolean {
  return MODULOS_BLOQUEADOS.some(
    (rota) => pathname === rota || pathname.startsWith(`${rota}/`),
  );
}
