"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  criarVenda,
  totalCarrinho,
  type Desconto,
  type ItemCarrinho,
  type Pagamento,
} from "@/lib/vendas-api";
import { clientes } from "@/lib/mock-data";
import { formatMoney } from "@/lib/format";
import { maskCPF, maskCelular, validateCPF } from "@/lib/validation";
import { Card, EmptyState, PageHeader } from "@/components/ui/UI";
import { Button, ButtonLink } from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";
import { Spinner } from "@/components/auth/Fields";
import { IconCheck, IconPlus, IconSearch, IconUsers } from "@/components/Icons";
import EtapaCatalogo from "./EtapaCatalogo";
import EtapaPagamento from "./EtapaPagamento";
import EtapaFiscal from "./EtapaFiscal";
import styles from "./vendas.module.css";

type Etapa = 1 | 2 | 3 | 4;

const ETAPAS = [
  { id: 1, rotulo: "Cliente" },
  { id: 2, rotulo: "Carrinho" },
  { id: 3, rotulo: "Pagamento" },
  { id: 4, rotulo: "Nota fiscal" },
] as const;

export type ClienteVenda = {
  id: string | null;
  nome: string;
};

/**
 * Fluxo de venda do balcao.
 *
 * O carrinho vive aqui, no topo do fluxo, e nao em cada etapa — voltar
 * para trocar o cliente ou acrescentar um item nao pode custar o que ja
 * foi montado.
 */
export default function PdvWizard() {
  const router = useRouter();

  const [etapa, setEtapa] = useState<Etapa>(1);
  const [cliente, setCliente] = useState<ClienteVenda | null>(null);
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [desconto, setDesconto] = useState<Desconto | null>(null);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);

  const [vendaId, setVendaId] = useState<string | null>(null);
  const [vendaNumero, setVendaNumero] = useState<string | null>(null);
  const [fechando, setFechando] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "error" } | null>(null);

  const total = useMemo(() => totalCarrinho(itens, desconto), [itens, desconto]);

  /** Fecha a venda no servidor antes de entrar na etapa fiscal. */
  const fecharVenda = useCallback(async () => {
    setFechando(true);

    /* SUBSTITUIR POR: POST /vendas — o servidor recalcula preco, imposto
       e taxa; o total do front e so referencia. */
    const r = await criarVenda({
      clienteId: cliente?.id ?? null,
      clienteNome: cliente?.nome ?? "Venda sem cliente",
      itens,
      desconto,
      pagamentos,
    });
    setFechando(false);

    if (!r.ok) {
      setToast({ msg: r.error, tone: "error" });
      return;
    }

    setVendaId(r.id);
    setVendaNumero(r.numero);
    setEtapa(4);
  }, [cliente, itens, desconto, pagamentos]);

  function cancelarVenda() {
    setItens([]);
    setDesconto(null);
    setPagamentos([]);
    setCliente(null);
    setEtapa(1);
    setToast({ msg: "Venda cancelada. O carrinho foi esvaziado.", tone: "success" });
  }

  return (
    <>
      <PageHeader
        title="Nova venda"
        subtitle={
          cliente
            ? `${cliente.nome}${itens.length ? ` · ${itens.length} item(ns) · ${formatMoney(total)}` : ""}`
            : "Balcao"
        }
        actions={
          <ButtonLink href="/app/vendas" variant="secondary">
            Sair do PDV
          </ButtonLink>
        }
      />

      {/* --- Stepper --- */}
      <ol className={styles.stepper} aria-label="Etapas da venda">
        {ETAPAS.map((e) => {
          const feita = e.id < etapa;
          const atual = e.id === etapa;
          return (
            <li
              key={e.id}
              className={`${styles.step} ${feita ? styles.stepFeito : ""} ${atual ? styles.stepAtual : ""}`}
              aria-current={atual ? "step" : undefined}
            >
              <span className={styles.stepMarca}>
                {feita ? <IconCheck size={13} /> : e.id}
              </span>
              <span className={styles.stepRotulo}>{e.rotulo}</span>
            </li>
          );
        })}
      </ol>

      {/* ============ Etapa 1: cliente ============ */}
      {etapa === 1 ? (
        <EtapaCliente
          selecionado={cliente}
          onSelecionar={(c) => {
            setCliente(c);
            setEtapa(2);
          }}
        />
      ) : null}

      {/* ============ Etapa 2: catalogo e carrinho ============ */}
      {etapa === 2 ? (
        <EtapaCatalogo
          itens={itens}
          desconto={desconto}
          onItens={setItens}
          onDesconto={setDesconto}
          clienteNome={cliente?.nome ?? "Venda sem cliente"}
          onVoltar={() => setEtapa(1)}
          onAvancar={() => setEtapa(3)}
          onCancelar={cancelarVenda}
        />
      ) : null}

      {/* ============ Etapa 3: pagamento ============ */}
      {etapa === 3 ? (
        <EtapaPagamento
          total={total}
          pagamentos={pagamentos}
          onPagamentos={setPagamentos}
          onVoltar={() => setEtapa(2)}
          onConcluir={fecharVenda}
          fechando={fechando}
        />
      ) : null}

      {/* ============ Etapa 4: nota fiscal ============ */}
      {etapa === 4 && vendaId ? (
        <EtapaFiscal
          vendaId={vendaId}
          vendaNumero={vendaNumero ?? ""}
          total={total}
          onConcluir={() => router.push("/app/vendas")}
        />
      ) : null}

      {toast ? (
        <Toast message={toast.msg} tone={toast.tone} onClose={() => setToast(null)} />
      ) : null}
    </>
  );
}

/* ================================================================== *
 * Etapa 1 — selecionar cliente
 * ================================================================== */

function EtapaCliente({
  selecionado,
  onSelecionar,
}: {
  selecionado: ClienteVenda | null;
  onSelecionar: (cliente: ClienteVenda) => void;
}) {
  const [busca, setBusca] = useState("");
  const [cadastrando, setCadastrando] = useState(false);

  const encontrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return clientes.slice(0, 6);

    const digitos = termo.replace(/\D/g, "");
    return clientes.filter(
      (c) =>
        c.nome.toLowerCase().includes(termo) ||
        (digitos.length > 0 && c.documento.replace(/\D/g, "").includes(digitos)),
    );
  }, [busca]);

  return (
    <>
      <Card title="Para quem e a venda">
        <label className={styles.busca}>
          <IconSearch size={17} />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou CPF/CNPJ"
            aria-label="Buscar cliente"
            autoFocus
          />
        </label>

        {encontrados.length === 0 ? (
          <EmptyState
            title="Nenhum cliente encontrado"
            description="Cadastre na hora ou siga sem identificar o cliente."
            action={
              <Button onClick={() => setCadastrando(true)}>
                <IconPlus size={16} />
                Cadastrar cliente
              </Button>
            }
          />
        ) : (
          <ul className={styles.clientes}>
            {encontrados.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={`${styles.cliente} ${selecionado?.id === c.id ? styles.clienteAtivo : ""}`}
                  onClick={() => onSelecionar({ id: c.id, nome: c.nome })}
                >
                  <span className={styles.clienteAvatar} aria-hidden="true">
                    {c.nome.slice(0, 2).toUpperCase()}
                  </span>
                  <span className={styles.clientePrincipal}>
                    <strong>{c.nome}</strong>
                    <span>{c.documento}</span>
                  </span>
                  <span className={styles.clienteContato}>
                    ({c.ddd}) {c.celular}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className={styles.clienteAcoes}>
          <Button variant="secondary" onClick={() => setCadastrando(true)}>
            <IconPlus size={16} />
            Cadastrar novo
          </Button>

          {/* Balcao costuma vender sem identificar — o caminho precisa ser
              tao rapido quanto escolher um cliente. */}
          <Button
            variant="ghost"
            onClick={() => onSelecionar({ id: null, nome: "Venda sem cliente" })}
          >
            <IconUsers size={16} />
            Seguir sem identificar
          </Button>
        </div>
      </Card>

      {cadastrando ? (
        <CadastroRapido
          onCriado={(nome) => {
            setCadastrando(false);
            onSelecionar({ id: null, nome });
          }}
          onCancelar={() => setCadastrando(false)}
        />
      ) : null}
    </>
  );
}

/* ================================================================== *
 * Cadastro rapido de cliente, sem sair do fluxo
 * ================================================================== */

function CadastroRapido({
  onCriado,
  onCancelar,
}: {
  onCriado: (nome: string) => void;
  onCancelar: () => void;
}) {
  const [nome, setNome] = useState("");
  const [documento, setDocumento] = useState("");
  const [celular, setCelular] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(event: React.FormEvent) {
    event.preventDefault();

    if (!nome.trim()) {
      setErro("Informe o nome.");
      return;
    }

    /* Documento e opcional no cadastro rapido: exigir CPF no balcao com
       fila atras trava a venda. Quando vier preenchido, e validado. */
    if (documento.trim()) {
      const erroDoc = validateCPF(documento);
      if (erroDoc) {
        setErro(erroDoc);
        return;
      }
    }

    setErro(null);
    setSalvando(true);
    /* SUBSTITUIR POR: POST /clientes */
    await new Promise((r) => setTimeout(r, 700));
    setSalvando(false);

    onCriado(nome.trim());
  }

  return (
    <div className={styles.dialogRoot}>
      <button type="button" className={styles.dialogBackdrop} onClick={onCancelar} aria-label="Fechar" />

      <div className={styles.dialogPainel} role="dialog" aria-modal="true" aria-labelledby="cadastro-rapido">
        <h2 id="cadastro-rapido" className={styles.dialogTitulo}>
          Cadastro rapido
        </h2>
        <p className={styles.dialogTexto}>
          So o essencial para nao segurar a fila. O cadastro completo pode ser
          feito depois em Clientes.
        </p>

        <form onSubmit={salvar} noValidate className={styles.formCampos}>
          <label className={styles.campo}>
            <span>Nome</span>
            <input
              className={styles.input}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoFocus
            />
          </label>

          <label className={styles.campo}>
            <span>CPF (opcional)</span>
            <input
              className={styles.input}
              value={documento}
              onChange={(e) => setDocumento(maskCPF(e.target.value))}
              placeholder="000.000.000-00"
              inputMode="numeric"
            />
          </label>

          <label className={styles.campo}>
            <span>Celular (opcional)</span>
            <input
              className={styles.input}
              value={celular}
              onChange={(e) => setCelular(maskCelular(e.target.value))}
              placeholder="99876-5432"
              inputMode="tel"
            />
          </label>

          {erro ? (
            <p className={styles.erro} role="alert">
              {erro}
            </p>
          ) : null}

          <div className={styles.dialogAcoes}>
            <Button variant="secondary" onClick={onCancelar} disabled={salvando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? (
                <>
                  <Spinner size={15} />
                  Salvando...
                </>
              ) : (
                "Cadastrar e continuar"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
