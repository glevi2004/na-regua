/** Validadores dos formularios de autenticacao (mensagens em pt-BR). */

export type FieldError = string | null;

export function validateCredential(value: string): FieldError {
  const trimmed = value.trim();
  if (!trimmed) return "Informe seu e-mail ou telefone.";

  const isEmail = trimmed.includes("@");
  if (isEmail) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)
      ? null
      : "E-mail invalido.";
  }

  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 11
    ? null
    : "Telefone invalido. Use DDD + numero.";
}

export function validateEmail(value: string): FieldError {
  const trimmed = value.trim();
  if (!trimmed) return "Informe seu e-mail.";
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed) ? null : "E-mail invalido.";
}

export function validateName(value: string): FieldError {
  const trimmed = value.trim();
  if (!trimmed) return "Informe seu nome completo.";
  if (trimmed.length < 3) return "Nome muito curto.";
  if (!trimmed.includes(" ")) return "Informe nome e sobrenome.";
  return null;
}

export function validatePhone(value: string): FieldError {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "Informe seu telefone.";
  return digits.length >= 10 && digits.length <= 11
    ? null
    : "Telefone invalido. Use DDD + numero.";
}

export function validatePassword(value: string): FieldError {
  if (!value) return "Crie uma senha.";
  if (value.length < 8) return "A senha precisa ter ao menos 8 caracteres.";
  if (!/[a-zA-Z]/.test(value) || !/\d/.test(value)) {
    return "Use letras e numeros.";
  }
  return null;
}

export function validateLoginPassword(value: string): FieldError {
  if (!value) return "Informe sua senha.";
  return null;
}

export function validatePasswordConfirm(
  password: string,
  confirm: string,
): FieldError {
  if (!confirm) return "Repita a senha.";
  return password === confirm ? null : "As senhas nao conferem.";
}

/** Forca da senha, usada apenas como feedback visual. */
export function passwordStrength(value: string): {
  score: 0 | 1 | 2 | 3;
  label: string;
} {
  if (value.length < 8) return { score: 0, label: "Muito curta" };

  let score = 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value) && /[^a-zA-Z0-9]/.test(value)) score++;

  const labels = ["Muito curta", "Fraca", "Boa", "Forte"] as const;
  return { score: score as 1 | 2 | 3, label: labels[score] };
}

/** Mascara progressiva de telefone: (41) 99876-5432 */
export function maskPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
