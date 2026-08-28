'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Image from 'next/image'
import {
  buscarEan,
  buscarNcm,
  calcularMargem,
  CATEGORIAS_INICIAIS,
  FORNECEDORES_INICIAIS,
  salvarProduto,
  type SugestaoNcm,
} from '@/lib/produtos-api'
import { formatMoney, formatPercent } from '@/lib/format'
import { validateRequired, type FieldError } from '@/lib/validation'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card, Field, FormGrid, Input, PageHeader } from '@/components/ui/UI'
import Toast from '@/components/ui/Toast'
import { Spinner } from '@/components/auth/Fields'
import { IconBarcode, IconSearch, IconTrash } from '@/components/Icons'
import LeitorCodigoBarras from '@/components/app/LeitorCodigoBarras'
import CampoTag from '@/components/app/CampoTag'
import styles from './produtoForm.module.css'

/** Converte "12,90" ou "12.90" em numero. */
function paraNumero(valor: string): number {
  const limpo = valor.replace(/\./g, '').replace(',', '.')
  const n = Number(limpo)
  return Number.isFinite(n) ? n : 0
}

export default function ProdutoForm() {
  const router = useRouter()

  const [codigo, setCodigo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [ean, setEan] = useState('')
  const [ncm, setNcm] = useState('')
  const [categoria, setCategoria] = useState('')
  const [fornecedor, setFornecedor] = useState('')
  const [precoCusto, setPrecoCusto] = useState('')
  const [precoVenda, setPrecoVenda] = useState('')
  const [estoque, setEstoque] = useState('0')
  const [estoqueMinimo, setEstoqueMinimo] = useState('0')
  const [motivoAjuste, setMotivoAjuste] = useState('')
  const [imagem, setImagem] = useState<string | null>(null)

  const [categorias, setCategorias] = useState(CATEGORIAS_INICIAIS)
  const [fornecedores, setFornecedores] = useState(FORNECEDORES_INICIAIS)

  const [erros, setErros] = useState<Record<string, FieldError>>({})
  const [buscandoEan, setBuscandoEan] = useState(false)
  const [avisoEan, setAvisoEan] = useState<string | null>(null)
  const [lendoCodigo, setLendoCodigo] = useState(false)

  const [termoNcm, setTermoNcm] = useState('')
  const [sugestoesNcm, setSugestoesNcm] = useState<SugestaoNcm[]>([])
  const [buscandoNcm, setBuscandoNcm] = useState(false)

  const [salvando, setSalvando] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null)

  const custo = paraNumero(precoCusto)
  const venda = paraNumero(precoVenda)
  const margem = calcularMargem(custo, venda)
  const lucro = venda - custo

  /* ---------------------------------------------------------------- *
   * EAN
   * ---------------------------------------------------------------- */

  async function consultarEan(codigoBarras?: string) {
    const alvo = (codigoBarras ?? ean).trim()
    if (!alvo) {
      setAvisoEan('Informe o codigo de barras.')
      return
    }

    setEan(alvo)
    setAvisoEan(null)
    setBuscandoEan(true)

    /* SUBSTITUIR POR: GET /catalogo/ean/:ean */
    const r = await buscarEan(alvo)
    setBuscandoEan(false)

    if (!r.ok) {
      setAvisoEan(r.error)
      return
    }

    setDescricao(r.dados.descricao)
    setNcm(r.dados.ncm)
    if (!categoria) setCategoria(r.dados.categoria)
    setToast({ msg: 'Dados preenchidos pelo codigo de barras.', tone: 'success' })
  }

  /* ---------------------------------------------------------------- *
   * NCM assistido
   * ---------------------------------------------------------------- */

  async function consultarNcm() {
    const termo = termoNcm.trim() || descricao.trim()
    if (termo.length < 3) {
      setSugestoesNcm([])
      return
    }

    setBuscandoNcm(true)
    /* SUBSTITUIR POR: GET /fiscal/ncm?q= */
    const r = await buscarNcm(termo)
    setBuscandoNcm(false)
    setSugestoesNcm(r)
  }

  /* ---------------------------------------------------------------- *
   * Imagem
   * ---------------------------------------------------------------- */

  function receberImagem(arquivo: File) {
    if (!arquivo.type.startsWith('image/')) {
      setToast({ msg: 'Envie um arquivo de imagem.', tone: 'error' })
      return
    }

    /* Previa local via data URL. No envio real o arquivo vai para o
       storage e o cadastro guarda so a URL. */
    const reader = new FileReader()
    reader.onload = () => setImagem(String(reader.result))
    reader.readAsDataURL(arquivo)
  }

  /* ---------------------------------------------------------------- *
   * Gravacao
   * ---------------------------------------------------------------- */

  async function salvar(event: React.FormEvent) {
    event.preventDefault()

    const novos: Record<string, FieldError> = {
      codigo: validateRequired(codigo, 'o codigo'),
      descricao: validateRequired(descricao, 'a descricao'),
      categoria: validateRequired(categoria, 'a categoria'),
      precoVenda: venda > 0 ? null : 'Informe um preco de venda maior que zero.',
    }

    setErros(novos)
    if (Object.values(novos).some(Boolean)) {
      setToast({ msg: 'Confira os campos destacados antes de salvar.', tone: 'error' })
      return
    }

    setSalvando(true)

    /* SUBSTITUIR POR: POST /produtos */
    const r = await salvarProduto({
      codigo,
      descricao,
      ean,
      ncm,
      categoria,
      fornecedor,
      precoCusto: custo,
      precoVenda: venda,
      estoque: Number(estoque) || 0,
      estoqueMinimo: Number(estoqueMinimo) || 0,
      imagem,
    })
    setSalvando(false)

    if (!r.ok) {
      setToast({ msg: r.error, tone: 'error' })
      return
    }

    setToast({ msg: 'Produto cadastrado.', tone: 'success' })
    router.push('/app/produtos')
  }

  const erroDe = (campo: string) =>
    erros[campo] ? (
      <span className={styles.erro} role="alert">
        {erros[campo]}
      </span>
    ) : null

  return (
    <>
      <PageHeader
        title="Novo produto"
        subtitle="Cadastro, preco e estoque"
        actions={
          <ButtonLink href="/app/produtos" variant="secondary">
            Cancelar
          </ButtonLink>
        }
      />

      <form onSubmit={salvar} noValidate className={styles.form}>
        {/* ---------------- Identificacao ---------------- */}
        <Card title="Identificacao">
          <FormGrid>
            <Field label="Codigo de barras (EAN)" span={6}>
              <div className={styles.inline}>
                <Input
                  value={ean}
                  onChange={(e) => {
                    setEan(e.target.value.replace(/\D/g, ''))
                    setAvisoEan(null)
                  }}
                  placeholder="7891000000000"
                  inputMode="numeric"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setLendoCodigo(true)}
                  aria-label="Ler com a camera"
                >
                  <IconBarcode size={16} />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => consultarEan()}
                  disabled={buscandoEan}
                >
                  {buscandoEan ? <Spinner size={14} /> : <IconSearch size={15} />}
                  Buscar
                </Button>
              </div>
              {avisoEan ? (
                <span className={styles.aviso} role="status">
                  {avisoEan}
                </span>
              ) : null}
            </Field>

            <Field label="Codigo interno" span={6}>
              <Input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="CAF500"
                aria-invalid={Boolean(erros.codigo)}
              />
              {erroDe('codigo')}
            </Field>

            <Field label="Descricao" span={12}>
              <Input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Cafe torrado e moido 500g"
                aria-invalid={Boolean(erros.descricao)}
              />
              {erroDe('descricao')}
            </Field>

            <Field label="Categoria" span={6}>
              <CampoTag
                valor={categoria}
                opcoes={categorias}
                onChange={setCategoria}
                onCriar={(nova) => setCategorias((c) => [...c, nova])}
                placeholder="Buscar ou criar categoria"
                ariaLabel="Categoria"
              />
              {erroDe('categoria')}
            </Field>

            <Field label="Fornecedor" span={6}>
              <CampoTag
                valor={fornecedor}
                opcoes={fornecedores}
                onChange={setFornecedor}
                onCriar={(novo) => setFornecedores((f) => [...f, novo])}
                placeholder="Buscar ou criar fornecedor"
                ariaLabel="Fornecedor"
              />
            </Field>
          </FormGrid>
        </Card>

        {/* ---------------- NCM ---------------- */}
        <Card title="Classificacao fiscal (NCM)">
          <FormGrid>
            <Field label="NCM" span={4}>
              <Input
                value={ncm}
                onChange={(e) => setNcm(e.target.value)}
                placeholder="0000.00.00"
              />
            </Field>

            <Field label="Nao sabe o NCM?" span={8} hint="Descreva o produto e escolha na lista.">
              <div className={styles.inline}>
                <Input
                  value={termoNcm}
                  onChange={(e) => setTermoNcm(e.target.value)}
                  placeholder={descricao || 'cafe torrado'}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={consultarNcm}
                  disabled={buscandoNcm}
                >
                  {buscandoNcm ? <Spinner size={14} /> : <IconSearch size={15} />}
                  Buscar
                </Button>
              </div>
            </Field>
          </FormGrid>

          {sugestoesNcm.length > 0 ? (
            <ul className={styles.sugestoes}>
              {sugestoesNcm.map((s) => (
                <li key={s.codigo}>
                  <button
                    type="button"
                    className={`${styles.sugestao} ${ncm === s.codigo ? styles.sugestaoAtiva : ''}`}
                    onClick={() => setNcm(s.codigo)}
                  >
                    <strong>{s.codigo}</strong>
                    <span>{s.descricao}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>

        {/* ---------------- Precos ---------------- */}
        <Card title="Precos">
          <FormGrid>
            <Field label="Preco de custo" span={4}>
              <Input
                value={precoCusto}
                onChange={(e) => setPrecoCusto(e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
              />
            </Field>

            <Field label="Preco de venda" span={4}>
              <Input
                value={precoVenda}
                onChange={(e) => setPrecoVenda(e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
                aria-invalid={Boolean(erros.precoVenda)}
              />
              {erroDe('precoVenda')}
            </Field>

            <Field label="Margem" span={4}>
              {/* Calculada, nao editavel: e resultado dos dois campos acima */}
              <div
                className={`${styles.margemBox} ${
                  margem !== null && margem < 0 ? styles.margemNegativa : ''
                }`}
                aria-live="polite"
              >
                {margem === null ? (
                  <span className={styles.margemVazia}>informe o preco de venda</span>
                ) : (
                  <>
                    <strong>{formatPercent(margem)}</strong>
                    <span>
                      {lucro >= 0 ? 'lucro de ' : 'prejuizo de '}
                      {formatMoney(Math.abs(lucro))} por unidade
                    </span>
                  </>
                )}
              </div>
            </Field>
          </FormGrid>
        </Card>

        {/* ---------------- Estoque ---------------- */}
        <Card title="Estoque">
          <FormGrid>
            <Field label="Quantidade atual" span={4}>
              <Input
                value={estoque}
                onChange={(e) => setEstoque(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
              />
            </Field>

            <Field
              label="Estoque minimo"
              span={4}
              hint="Abaixo disso, entra no alerta de reposicao."
            >
              <Input
                value={estoqueMinimo}
                onChange={(e) => setEstoqueMinimo(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
              />
            </Field>

            <Field
              label="Motivo do ajuste"
              span={4}
              hint="Obrigatorio ao corrigir a quantidade de um produto ja cadastrado."
            >
              <Input
                value={motivoAjuste}
                onChange={(e) => setMotivoAjuste(e.target.value)}
                placeholder="Contagem, avaria, perda..."
              />
            </Field>
          </FormGrid>
        </Card>

        {/* ---------------- Imagem ---------------- */}
        <Card title="Imagem do produto">
          <div className={styles.imagemBloco}>
            {imagem ? (
              <div className={styles.previaWrap}>
                {/* unoptimized: e um data URL local, nao passa pelo otimizador */}
                <Image
                  src={imagem}
                  alt="Previa da imagem do produto"
                  className={styles.previa}
                  width={160}
                  height={160}
                  unoptimized
                />
                <Button variant="secondary" size="sm" onClick={() => setImagem(null)}>
                  <IconTrash size={15} />
                  Remover
                </Button>
              </div>
            ) : (
              <label className={styles.imagemUpload}>
                <strong>Escolher imagem</strong>
                <span>JPG ou PNG</span>
                <input
                  type="file"
                  accept="image/*"
                  className={styles.imagemInput}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) receberImagem(f)
                  }}
                />
              </label>
            )}
          </div>
        </Card>

        <div className={styles.rodape}>
          <ButtonLink href="/app/produtos" variant="secondary">
            Cancelar
          </ButtonLink>
          <Button type="submit" disabled={salvando}>
            {salvando ? (
              <>
                <Spinner size={15} />
                Salvando...
              </>
            ) : (
              'Cadastrar produto'
            )}
          </Button>
        </div>
      </form>

      {lendoCodigo ? (
        <LeitorCodigoBarras
          onDetectar={(codigoLido) => void consultarEan(codigoLido)}
          onClose={() => setLendoCodigo(false)}
        />
      ) : null}

      {toast ? (
        <Toast message={toast.msg} tone={toast.tone} onClose={() => setToast(null)} />
      ) : null}
    </>
  )
}
