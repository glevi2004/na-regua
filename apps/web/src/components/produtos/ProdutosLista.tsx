"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { produtos as todosProdutos } from "@/lib/mock-data";
import {
  calcularMargem,
  confirmarImportacaoProdutos,
  nivelEstoque,
} from "@/lib/produtos-api";
import { formatMoney, formatPercent } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader, Stat } from "@/components/ui/UI";
import { Button, ButtonLink } from "@/components/ui/Button";
import { IconBox, IconPlus, IconSearch, IconUpload } from "@/components/Icons";
import { COMANDOS_PRODUTOS } from "@/lib/comandos";
import ComandosWhatsApp from "@/components/app/ComandosWhatsApp";
import ImportarPlanilha from "@/components/app/ImportarPlanilha";
import ImportarXml from "./ImportarXml";
import styles from "./produtos.module.css";


/** Campos que a planilha de produtos pode alimentar. */
const CAMPOS_PLANILHA = [
  {
    key: "codigo",
    label: "Codigo",
    obrigatorio: true,
    reconhece: (c: string) => c.includes("codigo") || c === "cod" || c.includes("sku"),
  },
  {
    key: "descricao",
    label: "Descricao",
    obrigatorio: true,
    reconhece: (c: string) => c.includes("descri") || c.includes("produto") || c.includes("nome"),
  },
  {
    key: "precoVenda",
    label: "Preco de venda",
    obrigatorio: true,
    reconhece: (c: string) => c.includes("venda") || c.includes("preco"),
  },
  {
    key: "precoCusto",
    label: "Preco de custo",
    obrigatorio: false,
    reconhece: (c: string) => c.includes("custo"),
  },
  {
    key: "ean",
    label: "EAN",
    obrigatorio: false,
    reconhece: (c: string) => c.includes("ean") || c.includes("barras") || c.includes("gtin"),
  },
  {
    key: "ncm",
    label: "NCM",
    obrigatorio: false,
    reconhece: (c: string) => c.includes("ncm"),
  },
  {
    key: "categoria",
    label: "Categoria",
    obrigatorio: false,
    reconhece: (c: string) => c.includes("categoria") || c.includes("grupo"),
  },
  {
    key: "estoque",
    label: "Estoque",
    obrigatorio: false,
    reconhece: (c: string) => c.includes("estoque") || c.includes("quantidade") || c.includes("qtd"),
  },
];

type FiltroEstoque = "todos" | "baixo" | "esgotado";

export default function ProdutosLista() {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [filtroEstoque, setFiltroEstoque] = useState<FiltroEstoque>("todos");
  const [importandoPlanilha, setImportandoPlanilha] = useState(false);
  const [importandoXml, setImportandoXml] = useState(false);

  /* Listas de filtro montadas a partir do proprio catalogo. */
  const categorias = useMemo(
    () => [...new Set(todosProdutos.map((p) => p.categoria))].sort(),
    [],
  );
  const fornecedores = useMemo(
    () => [...new Set(todosProdutos.map((p) => p.fornecedor))].sort(),
    [],
  );

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return todosProdutos.filter((p) => {
      if (termo) {
        const casa =
          p.descricao.toLowerCase().includes(termo) ||
          p.codigo.toLowerCase().includes(termo) ||
          p.categoria.toLowerCase().includes(termo) ||
          p.ean.includes(termo.replace(/\D/g, ""));
        if (!casa) return false;
      }

      if (categoria && p.categoria !== categoria) return false;
      if (fornecedor && p.fornecedor !== fornecedor) return false;

      if (filtroEstoque !== "todos" && nivelEstoque(p) !== filtroEstoque) {
        return false;
      }

      return true;
    });
  }, [busca, categoria, fornecedor, filtroEstoque]);

  const precisamReposicao = todosProdutos.filter(
    (p) => nivelEstoque(p) !== "normal",
  );
  const valorEstoque = todosProdutos.reduce(
    (acc, p) => acc + p.estoque * p.precoCusto,
    0,
  );

  const limparFiltros = () => {
    setBusca("");
    setCategoria("");
    setFornecedor("");
    setFiltroEstoque("todos");
  };

  return (
    <>
      <PageHeader
        title="Produtos"
        subtitle="Catalogo, precos e estoque"
        actions={
          <>
            <Button variant="secondary" onClick={() => setImportandoXml(true)}>
              <IconUpload size={17} />
              Importar XML
            </Button>
            <Button variant="secondary" onClick={() => setImportandoPlanilha(true)}>
              <IconUpload size={17} />
              Importar planilha
            </Button>
            <ButtonLink href="/app/produtos/novo">
              <IconPlus size={17} />
              Novo produto
            </ButtonLink>
          </>
        }
      />

      <div className="statRow">
        <Stat label="Produtos no catalogo" value={String(todosProdutos.length)} />
        <Stat
          label="Precisam de reposicao"
          value={String(precisamReposicao.length)}
          hint={precisamReposicao.length ? "abaixo do minimo" : "tudo em ordem"}
          tone={precisamReposicao.length ? "warning" : "positive"}
        />
        <Stat label="Valor em estoque" value={formatMoney(valorEstoque)} hint="a preco de custo" />
      </div>

      <Card>
        {/* --- Busca e filtros --- */}
        <div className={styles.toolbar}>
          <label className={styles.busca}>
            <IconSearch size={17} />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por codigo, descricao ou categoria"
              aria-label="Buscar produto"
            />
          </label>

          <div className={styles.selects}>
            <select
              className={styles.select}
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              aria-label="Filtrar por categoria"
            >
              <option value="">Todas as categorias</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              className={styles.select}
              value={fornecedor}
              onChange={(e) => setFornecedor(e.target.value)}
              aria-label="Filtrar por fornecedor"
            >
              <option value="">Todos os fornecedores</option>
              {fornecedores.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.filtros} role="group" aria-label="Filtro de estoque">
          {(
            [
              ["todos", "Todos"],
              ["baixo", "Estoque baixo"],
              ["esgotado", "Esgotados"],
            ] as const
          ).map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              className={`${styles.filtro} ${filtroEstoque === valor ? styles.filtroAtivo : ""}`}
              onClick={() => setFiltroEstoque(valor)}
              aria-pressed={filtroEstoque === valor}
            >
              {rotulo}
            </button>
          ))}
        </div>

        {/* --- Grid --- */}
        {lista.length === 0 ? (
          todosProdutos.length === 0 ? (
            <EmptyState
              title="Nenhum produto cadastrado"
              description="Cadastre o primeiro produto, traga o catalogo de uma planilha ou importe o XML de uma nota de compra."
              action={
                <div className={styles.emptyAcoes}>
                  <ButtonLink href="/app/produtos/novo">
                    <IconPlus size={17} />
                    Cadastrar o primeiro
                  </ButtonLink>
                  <Button variant="secondary" onClick={() => setImportandoPlanilha(true)}>
                    Importar planilha
                  </Button>
                  <Button variant="secondary" onClick={() => setImportandoXml(true)}>
                    Importar XML
                  </Button>
                </div>
              }
            />
          ) : (
            <EmptyState
              title="Nenhum produto encontrado"
              description="Nenhum resultado para esta busca ou filtro."
              action={
                <Button variant="secondary" onClick={limparFiltros}>
                  Limpar filtros
                </Button>
              }
            />
          )
        ) : (
          <ul className={styles.grid}>
            {lista.map((produto) => {
              const nivel = nivelEstoque(produto);
              const margem = calcularMargem(produto.precoCusto, produto.precoVenda);

              return (
                <li key={produto.id}>
                  <Link href={`/app/produtos/${produto.id}`} className={styles.card}>
                    {/* Sem imagem cadastrada, mostra a inicial em vez de um
                        quadrado vazio */}
                    <span className={styles.imagem} aria-hidden="true">
                      <IconBox size={22} />
                    </span>

                    <span className={styles.info}>
                      <span className={styles.codigo}>{produto.codigo}</span>
                      <strong className={styles.descricao}>{produto.descricao}</strong>
                      <span className={styles.categoria}>{produto.categoria}</span>
                    </span>

                    <span className={styles.numeros}>
                      <strong className={styles.preco}>
                        {formatMoney(produto.precoVenda)}
                      </strong>
                      {margem !== null ? (
                        <span className={styles.margem}>
                          margem {formatPercent(margem)}
                        </span>
                      ) : null}
                    </span>

                    <span className={styles.estoque}>
                      {nivel === "esgotado" ? (
                        <Badge tone="danger">Esgotado</Badge>
                      ) : nivel === "baixo" ? (
                        <Badge tone="warning">{produto.estoque} un · baixo</Badge>
                      ) : (
                        <Badge tone="success">{produto.estoque} un</Badge>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <div className={styles.comandosWrap}>
        <ComandosWhatsApp comandos={COMANDOS_PRODUTOS} />
      </div>

      {importandoPlanilha ? (
        <ImportarPlanilha
          titulo="Importar produtos"
          campos={CAMPOS_PLANILHA}
          chavesExistentes={todosProdutos.map((p) => p.codigo.toUpperCase())}
          chaveDuplicidade={(v) => (v.codigo ?? "").trim().toUpperCase()}
          validar={(v) => {
            if (!v.codigo?.trim()) return "Codigo vazio";
            if (!v.descricao?.trim()) return "Descricao vazia";
            const preco = Number(String(v.precoVenda ?? "").replace(",", "."));
            if (!Number.isFinite(preco) || preco <= 0) return "Preco de venda invalido";
            return null;
          }}
          onConfirmar={confirmarImportacaoProdutos}
          onClose={() => setImportandoPlanilha(false)}
        />
      ) : null}

      {importandoXml ? <ImportarXml onClose={() => setImportandoXml(false)} /> : null}
    </>
  );
}
