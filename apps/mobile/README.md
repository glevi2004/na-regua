# mobile

App do lojista — Expo + React Native. O balcao: bipar produto, fechar
venda, consultar cliente e ver a agenda do dia.

## Escopo: por que nao tem tudo que o web tem

Este app **nao** e uma copia do painel web. Financeiro, relatorio, CRM,
emissao fiscal, cadastro completo e assinatura ficam no web, onde ha tela
grande e tempo para conferir. Aqui esta o que se faz em pe, com o celular
na mao e um cliente esperando.

O que ficou de fora, de proposito:

| Fora do mobile | Por que |
| --- | --- |
| Criar conta, assinatura, pagamento do plano | Tarefa de retaguarda, feita uma vez |
| Financeiro (a pagar / a receber / plano de contas) | Conferencia de valor pede tela grande |
| Importar XML de nota de compra | Depende de `DOMParser`, que o RN nao tem — e e entrada de mercadoria, nao balcao |
| Emissao de NFC-e / NFS-e | Depende do certificado digital cadastrado no web |
| Cadastro e edicao de cliente/produto | Consulta sim, digitacao longa no celular nao |

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
