#!/usr/bin/env node
/**
 * Prepara o ambiente local do zero.
 *
 *   pnpm setup
 *
 * 1. cria .env a partir de .env.example (sem sobrescrever um existente)
 * 2. sobe Postgres e Redis e espera ficarem saudaveis
 * 3. diz o que fazer em seguida
 */
import { execSync } from 'node:child_process'
import { copyFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const c = { r: '\x1b[0m', b: '\x1b[1m', g: '\x1b[32m', y: '\x1b[33m', d: '\x1b[2m' }
const ok = (m) => console.log(`${c.g}✓${c.r} ${m}`)
const warn = (m) => console.log(`${c.y}!${c.r} ${m}`)
const step = (m) => console.log(`\n${c.b}${m}${c.r}`)

step('1/3  Variaveis de ambiente')
const env = join(root, '.env')
if (existsSync(env)) {
  warn('.env ja existe — mantido como esta')
} else {
  copyFileSync(join(root, '.env.example'), env)
  ok('.env criado a partir de .env.example')
}

step('2/3  Infraestrutura local (Postgres + Redis)')
try {
  execSync('docker info', { stdio: 'ignore' })
} catch {
  console.error(`\n${c.y}Docker nao esta rodando.${c.r} Abra o Docker Desktop e rode de novo.`)
  process.exit(1)
}

try {
  execSync('docker compose -f infra/docker-compose.yml up -d --wait', {
    cwd: root,
    stdio: 'inherit',
  })
  ok('Postgres e Redis saudaveis')
} catch {
  console.error(`\n${c.y}Falha ao subir a infraestrutura.${c.r} Veja: pnpm infra:logs`)
  process.exit(1)
}

step('3/3  Pronto')
console.log(`
  ${c.b}pnpm dev${c.r}              sobe api, worker e web
  ${c.b}pnpm test${c.r}             roda os testes
  ${c.b}pnpm infra:psql${c.r}       abre o psql no banco local

  ${c.d}saude da api:  curl localhost:3333/health${c.r}
  ${c.d}documentacao:  docs/engenharia/setup.md${c.r}
`)
