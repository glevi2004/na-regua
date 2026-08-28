"use client";

import Link from "next/link";
import { useState } from "react";
import {
  comprasDoCliente,
  contatosDoCliente,
  pendenciasDoCliente,
  type ContatoCliente,
} from "@/lib/clientes-api";
import type { Cliente } from "@/lib/types";
import { describeDueDate, formatDate, formatMoney } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader, Stat } from "@/components/ui/UI";
import { Button } from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";
import {
  IconArrowRight,
  IconCalendar,
  IconPlus,
  IconReceipt,
} from "@/components/Icons";
import styles from "./detalhe.module.css";

const TIPO_CONTATO: Record<ContatoCliente["tipo"], string> = {
  ligacao: "Ligacao",
  whatsapp: "WhatsApp",
  visita: "Visita",
  observacao: "Observacao",
};

export default function ClienteDetalhe({ cliente }: { cliente: Cliente }) {
  const [toast, setToast] = useState<string | null>(null);

  const compras = comprasDoCliente(cliente.id);
  const pendencias = pendenciasDoCliente(cliente.id);
  const contatos = contatosDoCliente(cliente.id);

  const totalPendente = pendencias.reduce((acc, p) => acc + p.valor, 0);
  const totalComprado = compras.reduce((acc, c) => acc + c.valor, 0);

  const whatsapp = `https://wa.me/55${cliente.ddd}${cliente.celular.replace(/\D/g, "")}`;

  return (
    <>
      <PageHeader
        title={cliente.nome}
        subtitle={`${cliente.documento} · (${cliente.ddd}) ${cliente.celular}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setToast("Lancamento de pendencia entra com o modulo de Contas a Receber.")}>
              <IconReceipt size={16} />
              Lancar pendencia
            </Button>
            <Button variant="secondary" onClick={() => setToast("Lancamento de contato entra com o modulo de CRM.")}>
              <IconCalendar size={16} />
              Lancar contato
            </Button>
            {/* Link direto para o WhatsApp do cliente — abre o app instalado */}
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer noopener"
              className={styles.whatsBotao}
            >
              Enviar WhatsApp
              <IconArrowRight size={15} />
            </a>
          </>
        }
      />

      <div className="statRow">
        <Stat label="Compras" value={String(cliente.totalCompras)} hint={formatMoney(totalComprado)} />
        <Stat
          label="Em aberto"
          value={formatMoney(totalPendente)}
          hint={pendencias.length ? `${pendencias.length} titulo(s)` : "nada pendente"}
          tone={totalPendente > 0 ? "warning" : "positive"}
        />
        <Stat
          label="Ultima compra"
          value={cliente.ultimaCompra ? formatDate(cliente.ultimaCompra) : "—"}
        />
      </div>

      <div className={styles.grid}>
        {/* --- Dados cadastrais --- */}
        <Card title="Dados cadastrais">
          <dl className={styles.dados}>
            <div>
              <dt>Documento</dt>
              <dd>{cliente.documento}</dd>
            </div>
            <div>
              <dt>Tipo</dt>
              <dd>{cliente.tipoPessoa === "fisica" ? "Pessoa fisica" : "Pessoa juridica"}</dd>
            </div>
            <div>
              <dt>Celular</dt>
              <dd>
                ({cliente.ddd}) {cliente.celular}
              </dd>
            </div>
            <div>
              <dt>E-mail</dt>
              <dd>{cliente.email ?? "—"}</dd>
            </div>
            <div className={styles.dadosLargo}>
              <dt>Endereco</dt>
              <dd>
                {cliente.endereco.logradouro}, {cliente.endereco.numero}
                {cliente.endereco.complemento ? ` · ${cliente.endereco.complemento}` : ""}
                <br />
                {cliente.endereco.bairro} · {cliente.endereco.cidade}/
                {cliente.endereco.uf} · CEP {cliente.endereco.cep}
              </dd>
            </div>
          </dl>
        </Card>

        {/* --- Pendencias financeiras --- */}
        <Card
          title="Pendencias financeiras"
          action={
            <Link href="/app/financeiro/contas-a-receber" className={styles.verMais}>
              Contas a receber
              <IconArrowRight size={14} />
            </Link>
          }
        >
          {pendencias.length === 0 ? (
            <EmptyState
              title="Nada em aberto"
              description="Este cliente nao tem titulos pendentes."
            />
          ) : (
            <ul className={styles.linhas}>
              {pendencias.map((p) => (
                <li key={p.id} className={styles.linha}>
                  <span className={styles.linhaPrincipal}>
                    <strong>{p.referente}</strong>
                    <span>{describeDueDate(p.vencimento)}</span>
                  </span>
                  {p.status === "vencido" ? (
                    <Badge tone="warning">Vencido</Badge>
                  ) : p.status === "parcial" ? (
                    <Badge tone="info">Parcial</Badge>
                  ) : (
                    <Badge>Em aberto</Badge>
                  )}
                  <span className={styles.linhaValor}>{formatMoney(p.valor)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* --- Historico de compras --- */}
        <Card
          title="Historico de compras"
          className={styles.largo}
          action={
            <Link href="/app/vendas" className={styles.verMais}>
              Todas as vendas
              <IconArrowRight size={14} />
            </Link>
          }
        >
          {compras.length === 0 ? (
            <EmptyState
              title="Nenhuma compra registrada"
              description="Quando este cliente comprar, o historico aparece aqui."
            />
          ) : (
            <ul className={styles.linhas}>
              {compras.map((c) => (
                <li key={c.id} className={styles.linha}>
                  <span className={styles.linhaId}>#{c.numero}</span>
                  <span className={styles.linhaPrincipal}>
                    <strong>{formatDate(c.data)}</strong>
                    <span>
                      {c.itens} {c.itens === 1 ? "item" : "itens"} · {c.formaPagamento}
                    </span>
                  </span>
                  <span className={styles.linhaValor}>{formatMoney(c.valor)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* --- Contatos e pendencias lancadas (CRM) --- */}
        <Card
          title="Historico de contatos"
          className={styles.largo}
          action={
            <Button variant="ghost" size="sm" onClick={() => setToast("Lancamento de contato entra com o modulo de CRM.")}>
              <IconPlus size={14} />
              Novo contato
            </Button>
          }
        >
          {contatos.length === 0 ? (
            <EmptyState
              title="Nenhum contato registrado"
              description="Registre ligacoes, visitas e combinados para nao depender da memoria."
            />
          ) : (
            <ul className={styles.linhas}>
              {contatos.map((c) => (
                <li key={c.id} className={styles.linha}>
                  <span className={styles.linhaData}>{formatDate(c.data)}</span>
                  <span className={styles.linhaPrincipal}>
                    <strong>{c.descricao}</strong>
                    <span>{TIPO_CONTATO[c.tipo]}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {toast ? (
        <Toast message={toast} tone="success" onClose={() => setToast(null)} />
      ) : null}
    </>
  );
}
