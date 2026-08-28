"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { signIn } from "@/lib/auth-api";
import { startSession } from "@/lib/session";
import { saveSubscriptionStatus } from "@/lib/subscription-store";
import {
  validateCredential,
  validateLoginPassword,
  type FieldError,
} from "@/lib/validation";
import {
  Alert,
  FormFooter,
  FormHeader,
  PasswordField,
  SubmitButton,
  TextField,
} from "./Fields";
import loginStyles from "./login.module.css";

export default function LoginForm() {
  const router = useRouter();

  const [credential, setCredential] = useState("");
  const [password, setPassword] = useState("");

  const [credentialError, setCredentialError] = useState<FieldError>(null);
  const [passwordError, setPasswordError] = useState<FieldError>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    /* Validacao inline antes de qualquer chamada. */
    const credErr = validateCredential(credential);
    const passErr = validateLoginPassword(password);
    setCredentialError(credErr);
    setPasswordError(passErr);
    if (credErr || passErr) return;

    setFormError(null);
    setLoading(true);

    /* 1) Autentica. SUBSTITUIR POR: POST /auth/login */
    const result = await signIn(credential, password);

    if (!result.ok) {
      setFormError(result.error);
      setLoading(false);
      return;
    }

    /* 2) O status da assinatura vem junto do login. Se o backend expuser
       em endpoint separado, chamar GET /billing/subscription aqui.
       O acesso NAO e bloqueado quando ha pendencia — o painel apenas
       entra em modo restrito. */
    saveSubscriptionStatus(result.subscription.status);

    /* 3) Abre a sessao. O cookie e o que o proxy.ts enxerga para liberar
       /app/*; sem ele a navegacao volta para ca. */
    startSession({
      nome: result.user.nome,
      email: result.user.email,
      empresa: result.user.empresa,
    });

    /* Se o proxy guardou um destino (?proximo=), devolve a pessoa para la.
       Lido de window e nao de useSearchParams para nao exigir Suspense
       numa pagina estatica. */
    const proximo = new URLSearchParams(window.location.search).get("proximo");
    router.push(proximo && proximo.startsWith("/app") ? proximo : "/app");
  }

  return (
    <>
      <FormHeader
        title="Entrar"
        subtitle="Acesse o painel do seu negocio."
      />

      {formError ? <Alert tone="error">{formError}</Alert> : null}

      <form onSubmit={handleSubmit} noValidate>
        <TextField
          label="E-mail ou telefone"
          value={credential}
          onChange={(v) => {
            setCredential(v);
            if (credentialError) setCredentialError(validateCredential(v));
          }}
          onBlur={() => setCredentialError(validateCredential(credential))}
          error={credentialError}
          type="text"
          placeholder="voce@empresa.com.br"
          autoComplete="username"
          disabled={loading}
        />

        <PasswordField
          label="Senha"
          value={password}
          onChange={(v) => {
            setPassword(v);
            if (passwordError) setPasswordError(validateLoginPassword(v));
          }}
          onBlur={() => setPasswordError(validateLoginPassword(password))}
          error={passwordError}
          autoComplete="current-password"
          disabled={loading}
        />

        <div className={loginStyles.forgotRow}>
          <Link href="/recuperar-senha" className={loginStyles.forgot}>
            Esqueci minha senha
          </Link>
        </div>

        <SubmitButton loading={loading} loadingLabel="Entrando...">
          Entrar
        </SubmitButton>
      </form>

      <FormFooter>
        Nao tem conta? <Link href="/criar-conta">Criar conta</Link>
      </FormFooter>

      {/* ------------------------------------------------------------------
          APOIO A DEMONSTRACAO — remover quando o backend estiver ligado.
          Sem API real nao ha como cair no estado de inadimplencia, entao
          este atalho existe so para o time conseguir ver as duas telas.
         ------------------------------------------------------------------ */}
      <div className={loginStyles.demoBox}>
        <strong className={loginStyles.demoTitle}>Modo demonstracao</strong>
        <p className={loginStyles.demoText}>
          Qualquer e-mail com senha de 6+ caracteres entra. Para ver o painel
          com <em>pagamento pendente</em>, use um e-mail que contenha a palavra
          &ldquo;pendente&rdquo; — por exemplo{" "}
          <code className={loginStyles.demoCode}>pendente@teste.com</code>.
        </p>
      </div>
    </>
  );
}
