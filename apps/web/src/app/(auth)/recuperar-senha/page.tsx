import type { Metadata } from 'next'
import { BRAND } from '@/content/site'
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'

export const metadata: Metadata = {
  title: `Recuperar senha — ${BRAND}`,
}

export default function RecuperarSenhaPage() {
  return <ForgotPasswordForm />
}
