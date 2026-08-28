# mobile

App do lojista — Expo + React Native. Todos os modulos do painel web,
adaptados para a tela do celular.

## Escopo

O app cobre **todos os modulos do painel web**, adaptados para a tela do
celular. Sao 14 telas atras de uma gaveta lateral com grupos retrateis,
espelhando a sidebar do web.

A adaptacao nao e encolher o layout: onde o web mostra cartoes lado a
lado, aqui o conteudo vira **sanfonas** (`src/components/ui/Sanfona.tsx`).
Fechada, cada secao mostra um resumo — quanto ha em aberto, quantos itens
— para nao ser preciso abrir so para conferir.

O que ficou de fora, e por que:

| Fora do mobile | Por que |
| --- | --- |
| Criar conta e recuperar senha | Feito uma vez, e o cadastro completo pede teclado de verdade |
| Envio do certificado digital | Arquivo .pfx pelo celular e trabalhoso, e senha de certificado nao deveria ir em teclado de toque |
| Pagamento da mensalidade | Cobrar assinatura dentro do app iOS esbarra na regra de compra da Apple — decisao de produto pendente |
| Importar XML de nota de compra | Depende de `DOMParser`, que o RN nao tem |
| Importar planilha | Selecao de arquivo e mapeamento de colunas nao cabem bem no celular |
| Baixa parcial de titulo | Digitar valor com fila atras e mais risco que ajuda; a baixa total esta aqui |

## Rodar

```bash
npm install
npx expo start
```

Depois: `a` para Android, `w` para o navegador, ou escaneie o QR code com
o app **Expo Go** no celular.

**Para testar o leitor de codigo de barras, use celular fisico.** Emulador
nao tem camera de verdade, e o Simulador do iOS nem camera falsa tem.

## Estrutura

```
app/                      rotas (expo-router, file-based)
├── _layout.tsx           Stack raiz
├── index.tsx             decide entre login e app pela sessao
├── login.tsx
└── (app)/                area logada
    ├── _layout.tsx       abas
    ├── catalogo.tsx
    ├── pdv.tsx
    ├── clientes.tsx
    └── agenda.tsx

src/
├── theme/tokens.ts       paleta e escala — equivalente ao globals.css do web
├── components/ui/        Botao, Campo, Cartao, Icone
├── components/           LeitorCodigo (camera)
└── lib/                  dados e regras (portado do web)
```

## Codigo compartilhado com o web

`src/lib/` foi portado de `apps/web/src/lib/` — `types`, `format`,
`validation`, `mock-data`, `clientes-api`, `produtos-api`, `vendas-api`
sao praticamente identicos porque nao dependem de DOM.

**Hoje sao copias, e copia diverge.** O destino e `packages/` na raiz do
monorepo, com os dois clientes importando da mesma fonte. Enquanto isso
nao existe, mudanca em regra de negocio precisa ser aplicada nos dois
lugares.

O que precisou de versao propria:

- `session.ts` — AsyncStorage em vez de cookie (nao ha servidor no meio)
- `auth-api.ts` — so login; sem cadastro nem cobranca de assinatura
- `produtos-api.ts` — sem o parser de XML

## Pendencias conhecidas

- **Conflito de peer dependency**: `expo-router` puxa
  `react-native-worklets@0.12.1`, enquanto `expo-modules-core` declara
  suporte ate `0.10`. Por isso `@expo/vector-icons` e `react-native-svg`
  nao instalam sem `--legacy-peer-deps`, e os icones foram desenhados com
  `View` (`src/components/ui/Icone.tsx`). Vale resolver antes de crescer.
- **Sessao em AsyncStorage**: para producao, o token deve ir em
  `expo-secure-store` (Keychain / Keystore), nao em texto puro.
- Toda chamada de dados ainda e mock — ver os blocos `SUBSTITUIR POR:` em
  `src/lib/`.
