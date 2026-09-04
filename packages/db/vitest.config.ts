import { defineConfig } from 'vitest/config'

/**
 * As suites de `db` rodam contra um Postgres COMPARTILHADO, uma por vez.
 *
 * O padrao do Vitest e rodar arquivos em paralelo, e aqui isso quebrou de um
 * jeito instrutivo: os tres arquivos chamaram `migrate()` juntos e o Postgres
 * respondeu `duplicate key value violates unique constraint
 * "pg_type_typname_nsp_index"` — dois `CREATE TABLE` da mesma tabela em
 * sessoes diferentes colidem no catalogo.
 *
 * A trava de aplicacao em `migrate.ts` resolve aquela corrida (e resolve a de
 * producao, com duas instancias subindo juntas). Este arquivo resolve outra
 * coisa: teste de integracao sobre banco compartilhado que roda em paralelo
 * fica instavel por natureza — as suites criam empresa, produto e venda nas
 * mesmas tabelas, e uma falha intermitente em integracao custa mais tempo de
 * investigacao do que economiza de execucao.
 *
 * Sem piso de cobertura: `db` e "testado atraves de core + testes de RLS"
 * (docs/engenharia/testes.md), e cobertura de linha nao mede o que estas
 * suites verificam — quem escapa da politica e quem nao escapa.
 */
export default defineConfig({
  test: {
    fileParallelism: false,

    /*
     * Fuso NEGATIVO de proposito, e nao o da maquina.
     *
     * O postgres.js devolve coluna `date` como meia-noite UTC. Em UTC, ler os
     * campos locais ou os UTC de um `Date` da o mesmo dia — entao a CI, que
     * roda em UTC, aprovava um `paraDia` que lia campo local e devolvia o dia
     * ANTERIOR em qualquer servidor brasileiro. Tres repositorios tinham o
     * defeito e nenhum teste o via; ele apareceu ao subir um Postgres numa
     * maquina em America/Sao_Paulo.
     *
     * Fixando o fuso aqui, a suite passa a rodar sempre na condicao que expoe
     * o problema — inclusive no runner. O que era ponto cego da CI virou
     * garantia dela, e o valor nao depende de onde o teste roda.
     */
    env: { TZ: 'America/Sao_Paulo' },
  },
})
