# Requisitos Não Funcionais

Descrevem **como o sistema se comporta** — não o que ele faz (isso é
[RF](requisitos-funcionais.md)).

## Regra deste documento

> **Todo RNF tem um número e uma forma de medir.** "Deve ser rápido" não é
> requisito, é desejo. "p95 ≤ 400 ms medido em produção pelo painel X" é
> requisito.

Um RNF sem métrica não pode ser aceito nem recusado, e por isso nunca é feito.
Se você não consegue escrever como medir, o requisito ainda não está pronto.

| Coluna | Significado |
|---|---|
| **ID** | Permanente, nunca reaproveitado |
| **Requisito** | O comportamento exigido |
| **Como medir** | O método de verificação. Sem isso, o RNF é inválido |
| **Pri** | `M` MUST no MVP · `S` SHOULD · `C` COULD |

> [!IMPORTANT]
> Os alvos numéricos são **hipóteses de engenharia**, calibradas para o
> público-alvo (loja de bairro, celular modesto, internet instável). Devem ser
> revisados com dados reais depois dos primeiros clientes —
> [QST-008](../decisoes/README.md#qst-008).

**Resumo:** 75 requisitos · 58 `MUST` · 17 `SHOULD` · 0 `COULD` — o alto número de `MUST` reflete que segurança, integridade financeira e obrigação fiscal não admitem versão parcial.

---

## 1. Desempenho

| ID | Requisito | Como medir | Pri |
|---|---|---|:--:|
| RNF-001 | Leitura de API responde em p95 ≤ 400 ms e p99 ≤ 1 s | Métrica de latência por rota em produção | M |
| RNF-002 | Escrita de API responde em p95 ≤ 800 ms e p99 ≤ 2 s | Idem | M |
| RNF-003 | Fechamento de venda conclui em ≤ 1,5 s, sem contar a emissão fiscal | Traço da transação, do POST à resposta | M |
| RNF-004 | Emissão fiscal não bloqueia o fechamento da venda — roda de forma assíncrona | Teste de integração: venda fecha com o provedor fiscal lento | M |
| RNF-005 | Leitura de código de barras adiciona o item em ≤ 200 ms percebidos | Medição no dispositivo, do evento de leitura ao item na tela | M |
| RNF-006 | Assistente responde a consulta em ≤ 5 s e a ação com confirmação em ≤ 8 s | Tempo entre webhook recebido e mensagem enviada | M |
| RNF-007 | Relatório de até 12 meses gera em ≤ 3 s; acima disso vai para processamento em segundo plano | Teste de carga com massa de 1 ano | S |
| RNF-008 | App abre e fica utilizável em ≤ 2 s em aparelho de referência (Android médio, 4 GB RAM) | Medição de tempo até interativo em dispositivo real | S |

## 2. Disponibilidade e resiliência

| ID | Requisito | Como medir | Pri |
|---|---|---|:--:|
| RNF-009 | Disponibilidade mensal da API ≥ 99,5% (≈ 3,6 h/mês de indisponibilidade) | Monitor externo de disponibilidade | M |
| RNF-010 | Indisponibilidade de qualquer provedor externo (fiscal, WhatsApp, banco, PSP) não derruba o restante do sistema | Teste de caos: derrubar cada adapter isoladamente | M |
| RNF-011 | Toda chamada a provedor externo tem timeout explícito e política de repetição com espera crescente | Revisão de código + teste com provedor lento | M |
| RNF-012 | Falha em provedor externo abre circuito após limiar, evitando fila de requisições penduradas | Teste de integração com provedor indisponível | S |
| RNF-013 | RPO ≤ 15 min e RTO ≤ 4 h | Exercício de restauração de backup, documentado, a cada trimestre | M |
| RNF-014 | Backup diário do banco, com restauração testada mensalmente | Registro do teste de restauração | M |
| RNF-015 | Janela de manutenção programada fora do horário comercial (22h–6h, horário de Brasília) | Registro de deploys | S |

## 3. Escala e capacidade

| ID | Requisito | Como medir | Pri |
|---|---|---|:--:|
| RNF-016 | Suporta 1.000 empresas ativas sem alteração de arquitetura | Teste de carga com massa sintética | M |
| RNF-017 | Suporta 50.000 vendas/dia agregadas e 500 vendas/dia por empresa | Teste de carga | M |
| RNF-018 | Suporta 100 mensagens/min de WhatsApp agregadas, com fila absorvendo picos | Teste de carga na fila | M |
| RNF-019 | Crescimento de 10× no volume exige apenas escala horizontal, sem reescrita | Revisão de arquitetura; ausência de estado local nos processos | S |

## 4. Segurança

| ID | Requisito | Como medir | Pri |
|---|---|---|:--:|
| RNF-020 | Todo tráfego externo em TLS 1.2+; nenhuma porta de banco ou Redis exposta à internet | Varredura de portas + verificação de configuração | M |
| RNF-021 | Isolamento entre empresas imposto no banco por RLS, não apenas na aplicação | Teste automatizado que tenta ler dados de outro `company_id` e falha | M |
| RNF-022 | Nenhum segredo em código, log ou variável versionada; todos em gerenciador de segredos | Varredura de segredos na CI, bloqueante | M |
| RNF-023 | Senhas com hash forte e específico para senhas (Argon2id ou bcrypt), nunca reversível | Revisão de código | M |
| RNF-024 | Certificado digital A1 armazenado cifrado em repouso, com chave separada do banco | Revisão de arquitetura | M |
| RNF-025 | Autenticação de administrador da plataforma exige segundo fator | Verificação de configuração | M |
| RNF-026 | Limite de requisições por usuário e por IP em rotas de autenticação e de escrita | Teste de carga; verificação de resposta 429 | M |
| RNF-027 | Toda entrada validada por schema antes de chegar à lógica de negócio | Revisão de código; nenhuma rota sem schema Zod | M |
| RNF-028 | Webhooks de terceiros verificam assinatura e rejeitam requisição não autenticada | Teste de integração com assinatura inválida | M |
| RNF-029 | Dependências verificadas contra vulnerabilidades conhecidas a cada PR | Job de auditoria na CI, bloqueante para severidade alta | M |
| RNF-030 | Acesso administrativo a dados de tenant é registrado com justificativa e revisado mensalmente | Auditoria do log de acesso | S |

## 5. Privacidade e LGPD

| ID | Requisito | Como medir | Pri |
|---|---|---|:--:|
| RNF-031 | Base legal definida e documentada para cada categoria de dado pessoal tratado | Registro de tratamento mantido atualizado | M |
| RNF-032 | Mensagem a cliente final só é enviada com consentimento registrado, com data e origem | Teste automatizado; auditoria de envios | M |
| RNF-033 | Pedido de exclusão de dados pessoais atendido em ≤ 15 dias, preservando o que a lei fiscal obriga reter | Registro de pedidos com data de entrada e de conclusão | M |
| RNF-034 | Dados pessoais nunca aparecem em log de aplicação | Varredura automatizada de logs por CPF, telefone e e-mail | M |
| RNF-035 | Conteúdo de conversa do WhatsApp é retido pelo prazo mínimo necessário, com prazo declarado | Rotina de expurgo verificável | M |
| RNF-036 | Subprocessadores (LLM, WhatsApp, fiscal, banco) declarados publicamente na política de privacidade | Revisão da política a cada novo provedor | M |

## 6. Fiscal e legal

| ID | Requisito | Como medir | Pri |
|---|---|---|:--:|
| RNF-037 | XML das notas emitidas guardado por no mínimo 5 anos, íntegro e recuperável | Teste de recuperação de XML antigo | M |
| RNF-038 | Emissão em contingência disponível sempre que a SEFAZ estiver indisponível | Teste com SEFAZ simulada fora do ar | M |
| RNF-039 | Numeração de notas é sequencial, sem lacuna e sem repetição, mesmo com concorrência | Teste de concorrência; verificação de sequência | M |
| RNF-040 | Venda registrada nunca é apagada; correção sempre por cancelamento ou devolução | Ausência de `DELETE` em vendas; teste automatizado | M |
| RNF-041 | Cálculo de imposto é auditável: entrada, regra aplicada e resultado ficam registrados | Registro do cálculo por venda | M |
| RNF-042 | Alteração de regra fiscal é versionada; venda antiga é recalculada com a regra da época | Teste com vigência de regra | S |

## 7. Integridade financeira e de dados

| ID | Requisito | Como medir | Pri |
|---|---|---|:--:|
| RNF-043 | Operações de escrita que envolvem valor são idempotentes por chave de idempotência | Teste que reenvia a mesma requisição e verifica registro único | M |
| RNF-044 | Todo valor monetário é inteiro em centavos; ponto flutuante é proibido em dinheiro | Regra de lint que proíbe `number` em campo monetário; revisão de código | M |
| RNF-045 | Soma de parcelas é sempre exatamente igual ao total, sem perda por arredondamento | Teste de propriedade sobre divisões com dízima | M |
| RNF-046 | Venda, estoque e recebível são atualizados na mesma transação — nunca parcialmente | Teste de falha no meio da operação | M |
| RNF-047 | Toda alteração de dado de negócio gera registro de auditoria imutável | Teste que tenta alterar auditoria e falha | M |
| RNF-048 | Migração de banco é reversível ou acompanhada de plano de reversão documentado | Revisão de PR de migração | M |
| RNF-049 | Nenhuma migração causa indisponibilidade de escrita superior a 30 s | Ensaio em base de tamanho de produção | S |
| RNF-050 | Exportação completa de dados da empresa disponível a qualquer momento, em formato aberto | Teste de exportação ponta a ponta | M |

## 8. Usabilidade e acessibilidade

| ID | Requisito | Como medir | Pri |
|---|---|---|:--:|
| RNF-051 | O PDV opera com internet instável: itens entram no carrinho localmente e sincronizam depois | Teste em modo avião e em rede degradada | M |
| RNF-052 | Nenhuma operação de venda depende de mais de um toque além do essencial | Revisão de fluxo; contagem de toques | S |
| RNF-053 | O app é usável com uma mão: ações principais na metade inferior da tela | Revisão de design | S |
| RNF-054 | Toda mensagem de erro diz o que aconteceu e o que fazer, sem jargão nem código cru | Revisão de texto; nenhuma mensagem exibindo stack ou código de erro isolado | M |
| RNF-055 | Contraste de texto atende WCAG 2.1 AA (4.5:1) | Verificação automatizada de contraste | S |
| RNF-056 | Toda tela tem estado vazio, de carregamento e de erro definidos | Revisão de design; teste visual | S |
| RNF-057 | Interface e mensagens do assistente em português do Brasil, com tom direto e sem formalidade excessiva | Revisão editorial | M |

## 9. Observabilidade e operação

| ID | Requisito | Como medir | Pri |
|---|---|---|:--:|
| RNF-058 | Log estruturado (JSON) com `requestId`, `companyId` e `userId` em toda requisição | Revisão de amostra de logs | M |
| RNF-059 | Erro de integração externa registra requisição, resposta e duração, com dados sensíveis mascarados | Revisão de amostra de logs | M |
| RNF-060 | Rastreamento distribuído cobre o caminho requisição → caso de uso → provedor externo | Verificação no painel de rastreamento | S |
| RNF-061 | Alerta automático para: taxa de erro > 2%, fila com atraso > 5 min, emissão fiscal falhando | Teste dos disparos de alerta | M |
| RNF-062 | Toda fila tem fila de descarte e o descarte é visível e reprocessável | Verificação operacional | M |
| RNF-063 | Painel de saúde mostra latência, taxa de erro, tamanho de fila e consumo de IA por tenant | Existência e uso do painel | S |
| RNF-064 | Todo deploy é rastreável até o commit e reversível em ≤ 10 min | Registro de deploys; ensaio de reversão | M |

## 10. Manutenibilidade e portabilidade

| ID | Requisito | Como medir | Pri |
|---|---|---|:--:|
| RNF-065 | A regra de dependência entre módulos é verificada automaticamente na CI | Job de fronteiras bloqueante — ver [code-style](../engenharia/code-style.md) | M |
| RNF-066 | `packages/domain` não tem nenhuma dependência de I/O, framework ou rede | Verificação automatizada de imports | M |
| RNF-067 | Provedor externo é trocável alterando apenas o respectivo adapter, sem tocar em `core` ou `domain` | Revisão de arquitetura; existência da porta | M |
| RNF-068 | Cobertura de testes ≥ 90% em `domain` e `money`, ≥ 70% em `core` | Relatório de cobertura na CI | M |
| RNF-069 | Toda regra de negócio tem teste unitário sem banco nem rede | Revisão de PR | M |
| RNF-070 | Ambiente local sobe completo com um comando e sem credencial de produção | Teste de onboarding com desenvolvedor novo | M |
| RNF-071 | Nenhum módulo depende de detalhe interno de outro — apenas da API pública declarada | Verificação de imports profundos | S |

## 11. Custo e eficiência

| ID | Requisito | Como medir | Pri |
|---|---|---|:--:|
| RNF-072 | Custo de IA por empresa ativa ≤ 15% da mensalidade | Painel de consumo por tenant — ver [M7](visao.md#métricas-de-sucesso) | M |
| RNF-073 | Consumo de IA por empresa tem teto configurável, com degradação avisada em vez de conta surpresa | Teste de estouro de teto | M |
| RNF-074 | Custo de infraestrutura por empresa ativa ≤ 8% da mensalidade | Rateio mensal de custo | S |
| RNF-075 | Contexto enviado ao modelo é o mínimo necessário, com reuso de cache quando disponível | Revisão de código; medição de tokens por interação | S |

---

## RNFs que mudam a arquitetura

Nem todo RNF é ajuste fino. Estes **determinam** decisões estruturais e devem
ser lidos antes de qualquer escolha de design:

| RNF | Consequência arquitetural |
|---|---|
| RNF-021 isolamento no banco | Obriga RLS em todas as tabelas — [`dados.md`](../arquitetura/dados.md#multi-tenant) |
| RNF-004 emissão assíncrona | Obriga fila entre venda e emissão fiscal — [`fluxos.md`](../arquitetura/fluxos.md#venda-completa) |
| RNF-043 idempotência | Obriga chave de idempotência em toda escrita com valor |
| RNF-044 dinheiro em centavos | Obriga o tipo [`Money`](../../packages/money/README.md) em todo o sistema |
| RNF-046 atomicidade | Obriga que o caso de uso controle a transação, não o repositório |
| RNF-051 PDV com rede instável | Obriga estado local no app e sincronização posterior |
| RNF-065 fronteiras verificadas | Obriga a matriz de dependências na CI — [`principios.md`](../arquitetura/principios.md) |
| RNF-067 provedor trocável | Obriga inversão de dependência nos 4 adapters |
| RNF-072 teto de custo de IA | Obriga medição de consumo por tenant desde o primeiro dia |

## Documentos relacionados

- [Requisitos Funcionais](requisitos-funcionais.md) — o que o sistema faz
- [Segurança](../arquitetura/seguranca.md) — como as seções 4 e 5 são implementadas
- [Testes](../engenharia/testes.md) — como estes requisitos são verificados
- [CI/CD](../engenharia/ci-cd.md) — quais verificações são bloqueantes
