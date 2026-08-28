# mobile

Expo / React Native — o PDV do lojista.

**Estado:** 🟢 front-end completo sobre dados mock · `NR-012`, `NR-070`, `NR-071`, `NR-073`

## Responsabilidade

O aplicativo que a lojista e o funcionário usam **no balcão**: leitor de código
de barras, carrinho, venda, consulta rápida.

**O que não faz:** regra de negócio. Fala com a API por HTTP.

## Fronteiras

|                       |                                             |
| --------------------- | ------------------------------------------- |
| **Depende de**        | `ui`, `contracts`, `money` + a API por HTTP |
| **Proibido importar** | `core`, `db`, `domain`                      |

A regra `cliente-nao-importa-nucleo` da CI barra a violação. Cálculo feito aqui
é cálculo que o WhatsApp não faz igual.

## O contexto de uso manda no design

A persona [P1](../../docs/produto/personas.md#p1--cláudia-a-lojista) usa o
aplicativo **em pé, atrás do balcão, com cliente esperando, em celular modesto e
internet instável.** Isso não é detalhe de UX; é restrição de arquitetura:

| Restrição                                         | Requisito                                                                           |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Item entra no carrinho em ≤ 200 ms percebidos     | [RNF-005](../../docs/produto/requisitos-nao-funcionais.md)                          |
| **Carrinho é local; sincroniza depois**           | [RNF-051](../../docs/produto/requisitos-nao-funcionais.md)                          |
| App utilizável em ≤ 2 s, em Android médio de 4 GB | [RNF-008](../../docs/produto/requisitos-nao-funcionais.md)                          |
| Ações principais na metade inferior — uma mão     | [RNF-053](../../docs/produto/requisitos-nao-funcionais.md)                          |
| Fechar venda é idempotente                        | [RNF-043](../../docs/produto/requisitos-nao-funcionais.md) — rede ruim gera reenvio |

O carrinho local é a decisão mais importante: se cada leitura de código de
barras esperasse a rede, o PDV seria inutilizável na loja real.

## O que o `staff` não pode ver

Custo, margem, imposto e relatório financeiro são filtrados **no servidor**,
não escondidos na tela. Dado que chega ao aplicativo é dado que vazou —
[RF-012](../../docs/produto/requisitos-funcionais.md),
[RF-042](../../docs/produto/requisitos-funcionais.md).

## Escopo da interface

O app cobre **todos os módulos do painel web**, adaptados para a tela do
celular: 14 telas atrás de uma gaveta lateral com grupos retráteis, espelhando
a sidebar do web.

A adaptação não é encolher o layout: onde o web mostra cartões lado a lado,
aqui o conteúdo vira **sanfonas** (`src/components/ui/Sanfona.tsx`). Fechada,
cada seção mostra um resumo — quanto há em aberto, quantos itens — para não ser
preciso abrir só para conferir.

O que ficou de fora, e por quê:

| Fora do mobile                | Por quê                                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------------------------------- |
| Criar conta e recuperar senha | Feito uma vez, e o cadastro completo pede teclado de verdade                                          |
| Envio do certificado digital  | Arquivo `.pfx` pelo celular é trabalhoso, e senha de certificado não deveria ir em teclado de toque   |
| Pagamento da mensalidade      | Cobrar assinatura dentro do app iOS esbarra na regra de compra da Apple — decisão de produto pendente |
| Importar XML de nota          | Depende de `DOMParser`, que o RN não tem                                                              |
| Importar planilha             | Seleção de arquivo e mapeamento de colunas não cabem bem no celular                                   |
| Baixa parcial de título       | Digitar valor com fila atrás é mais risco que ajuda; a baixa total está aqui                          |

## pnpm e Metro

O [`.npmrc`](../../.npmrc) fixa `node-linker=hoisted`. **Não é preferência:** o
Metro não resolve o store simbólico do pnpm, e sem essa linha o app quebra ao
importar qualquer pacote do workspace. Validado — `expo config` resolve
corretamente com essa configuração.

## babel.config.js não é opcional

Sem [`babel.config.js`](babel.config.js) o Metro compila o JSX, mas não aplica o
`babel-preset-expo` — e é ele que injeta o plugin do `react-native-worklets`, do
qual o Reanimated depende. Sem esse plugin o Reanimated quebra ao carregar, e
como o `@react-navigation/drawer` importa Reanimated em tempo de módulo, o
`import { Drawer } from "expo-router/drawer"` estoura na primeira linha com um
`TypeError: undefined is not a function` que não aponta para a causa.

## Variáveis de ambiente

`API_URL`. Nunca coloque segredo aqui: tudo que vai para o aplicativo é público
para quem tiver o aparelho.

## Desenvolvimento

```bash
pnpm --filter @na-regua/mobile dev    # Expo; 'i' simulador iOS, 'a' Android
```

Depois: `a` para Android, `w` para o navegador, ou escaneie o QR code com o app
**Expo Go** no celular.

**Para testar o leitor de código de barras, use celular físico.** Emulador não
tem câmera de verdade, e o Simulador do iOS nem câmera falsa tem.

## Estrutura

```
app/                      rotas (expo-router, file-based)
├── _layout.tsx           Stack raiz
├── index.tsx             decide entre login e app pela sessão
├── login.tsx
└── (app)/                área logada
    ├── _layout.tsx       gaveta lateral (Drawer)
    ├── inicio.tsx        pdv.tsx        vendas.tsx     agenda.tsx
    ├── clientes.tsx      catalogo.tsx   empresa.tsx
    ├── contas-a-pagar.tsx  contas-a-receber.tsx  plano-de-contas.tsx
    └── crm.tsx           assistente.tsx assinatura.tsx suporte.tsx

src/
├── theme/tokens.ts       paleta e escala — equivalente ao globals.css do web
├── components/ui/        Sanfona, Botao, Campo, Cartao, Icone
├── components/           MenuLateral, Cabecalho, LeitorCodigo, ContasView
└── lib/                  dados e regras (portado do web)
```

## Código compartilhado com o web

`src/lib/` foi portado de `apps/web/src/lib/` — `types`, `format`, `validation`,
`mock-data`, `clientes-api`, `produtos-api`, `vendas-api` são praticamente
idênticos porque não dependem de DOM.

**Hoje são cópias, e cópia diverge.** O destino é `packages/` na raiz do
monorepo — que agora existe. Enquanto a extração não acontece, mudança em regra
de negócio precisa ser aplicada nos dois lugares.

O que precisou de versão própria:

- `session.ts` — AsyncStorage em vez de cookie (não há servidor no meio)
- `auth-api.ts` — só login; sem cadastro nem cobrança de assinatura
- `produtos-api.ts` — sem o parser de XML

## Pendências conhecidas

- **Sessão em AsyncStorage**: para produção, o token deve ir em
  `expo-secure-store` (Keychain / Keystore), não em texto puro.
- **Ícones desenhados com `View`** (`src/components/ui/Icone.tsx`): foram feitos
  assim por causa de um conflito de peer dependency com `react-native-worklets`,
  já resolvido ao alinhar as versões da SDK. `@expo/vector-icons` e
  `react-native-svg` estão declarados e podem substituí-los.
- Toda chamada de dados ainda é mock — ver os blocos `SUBSTITUIR POR:` em
  `src/lib/`.
