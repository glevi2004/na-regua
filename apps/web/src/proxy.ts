import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

/**
 * Protecao das rotas de `/app/*`.
 *
 * No Next 16 o antigo Middleware passou a se chamar Proxy — mesma
 * funcionalidade, arquivo `src/proxy.ts`.
 *
 * IMPORTANTE: isto e uma checagem OTIMISTA de navegacao. Ela evita que uma
 * pessoa sem sessao caia numa tela do painel, mas NAO e autorizacao: cada
 * rota de API precisa validar a sessao por conta propria no servidor.
 *
 * QUANDO O BACKEND EXISTIR: trocar a presenca do cookie pela validacao real
 * do token (assinatura e expiracao).
 */
export function proxy(request: NextRequest) {
  const temSessao = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (temSessao) return NextResponse.next();

  /* Guarda o destino para devolver a pessoa a ela apos o login. */
  const login = new URL("/login", request.url);
  const destino = request.nextUrl.pathname + request.nextUrl.search;
  login.searchParams.set("proximo", destino);

  return NextResponse.redirect(login);
}

export const config = {
  matcher: "/app/:path*",
};
