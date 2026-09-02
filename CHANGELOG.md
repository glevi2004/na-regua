# Changelog

Gerado dos [Conventional Commits](https://www.conventionalcommits.org) por
`pnpm changelog`. **Não edite à mão** — a próxima geração sobrescreve.

O que não aparece aqui está no `git log`: commits de estilo ficam de fora
porque quem lê um changelog quer saber o que mudou no produto.

## Não lançado

### Novidades

- **api**: correlacionar log por requisicao e mascarar o sensivel (NR-030) — `1080159`
- **api**: padronizar erro, contexto e validacao na borda HTTP (NR-009) — `f769e49`
- **api**: consumir a configuracao tipada na api e no worker (NR-006) — `0ccd2bf`
- **contracts**: definir os schemas base do sistema (NR-005) — `3721f54`
- **core**: declarar o contexto de execucao e o erro de aplicacao (NR-009) — `a62942a`
- **domain**: aplicar desconto com limite por papel e calcular troco (NR-024) — `27beb16`
- **domain**: calcular totais de venda com imposto e parcelas (NR-004) — `0665667`
- **mobile**: consumir os tokens de @na-regua/ui (NR-011) — `a769809`
- **mobile**: usar o Buddy na marca da gaveta — `b54d32a`
- **mobile**: animar as sanfonas com Reanimated — `3f5032d`
- **repo**: validar variaveis de ambiente na inicializacao (NR-006) — `3098cf3`
- **ui**: implementar os tokens de design compartilhados (NR-011) — `088e114`
- **web**: substituir o conteudo ficticio da landing pelo produto real (NR-079) — `b5dfb74`
- **web**: dar lugar ao Buddy na marca e no fecho da landing — `856bf2f`

### Correções

- **mobile**: declarar @react-navigation/native e alinhar expo-constants — `2b01f31`
- **repo**: tirar image-size do grafo prendendo o metro-config — `3549d6d`
- **web**: voltar ao topo pela marca e ao recarregar a pagina (NR-079) — `b7b8a9a`
- **web**: corrigir o contraste de --text-muted e guardar a deriva (NR-011) — `87690b3`
- **web**: tornar o script dev portavel — `cbafb4a`
- **web**: ignorar a saida de build no eslint — `f1e417f`
- **worker**: parar de logar a URL do Redis com credencial (NR-030) — `69b87b5`

### Documentação

- **repo**: registrar a atualizacao de conteudo da landing (NR-079) — `0885715`
- **repo**: base de documentacao, workspace pnpm e CI (NR-002) — `504e0dd`

### Testes

- **repo**: cobrir os caminhos de erro de money e core (NR-010) — `e04e28f`

### Integração contínua

- **repo**: impor o piso de cobertura da RNF-068 (NR-010) — `015f96a`
- **repo**: ligar o lint com type-checking (NR-010) — `62409ea`

### Manutenção

- **repo**: ignorar o commit de Prettier no git blame — `bace0b8`
