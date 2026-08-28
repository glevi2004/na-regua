import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Pacotes do workspace exportam TypeScript direto de src/ (padrao "internal
  // packages"): sem passo de build entre editar um pacote e ver no app.
  transpilePackages: ['@na-regua/ui', '@na-regua/contracts', '@na-regua/money'],
}

export default nextConfig
