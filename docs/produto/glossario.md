# Glossário — linguagem ubíqua

Este documento é a ponte entre as duas convenções de idioma do projeto:
**documentação em PT-BR, código em inglês**.

**Regra:** um termo de negócio tem exatamente **um** identificador em inglês.
Se você precisa nomear algo que não está nesta tabela, adicione aqui no mesmo PR.
Se você encontrar dois nomes para a mesma coisa no código, é bug de nomenclatura
e deve ser corrigido.

Aplica-se a: nomes de tipo, função, arquivo, pasta, tabela, coluna, endpoint,
evento, fila e chave de tradução.

---

## Cadastros

| PT-BR                     | Código (inglês)  | Observações                                                                               |
| ------------------------- | ---------------- | ----------------------------------------------------------------------------------------- |
| Empresa / Loja (o tenant) | `Company`        | Unidade de isolamento multi-tenant. Nunca `Store`, `Tenant` nem `Organization` no domínio |
| Usuário                   | `User`           | Pessoa que faz login                                                                      |
| Papel / Perfil de acesso  | `Role`           | `owner`, `staff` (roadmap), `platform_admin`. Sem `accountant` no produto                 |
| Cliente                   | `Customer`       | Cliente da loja. Nunca `Client` (reservado para clientes HTTP)                            |
| Fornecedor                | `Supplier`       |                                                                                           |
| Produto                   | `Product`        |                                                                                           |
| Variação (tamanho, cor)   | `ProductVariant` | **Fora do primeiro recorte**                                                              |
| Código de barras          | `barcode`        | EAN/GTIN                                                                                  |
| Categoria                 | `Category`       |                                                                                           |
| Unidade de medida         | `UnitOfMeasure`  | `un`, `kg`, `m`, `cx`                                                                     |
| Estoque                   | `Inventory`      | Saldo. Movimentação é `InventoryMovement`                                                 |

## Vendas

| PT-BR              | Código (inglês)    | Observações                                                 |
| ------------------ | ------------------ | ----------------------------------------------------------- |
| Venda              | `Sale`             | Documento fechado. Nunca `Order` no MVP                     |
| Item da venda      | `SaleItem`         |                                                             |
| Carrinho           | `Cart`             | Venda ainda em montagem, antes de fechar                    |
| Desconto           | `Discount`         |                                                             |
| Acréscimo          | `Surcharge`        |                                                             |
| Devolução          | `SaleReturn`       |                                                             |
| Cancelamento       | `SaleCancellation` | Distinto de devolução: cancela antes da liquidação          |
| Forma de pagamento | `PaymentMethod`    | `debit`, `credit`, `pix`, `boleto`, `cash`, `wallet`        |
| Pagamento          | `Payment`          | Um `Sale` pode ter vários (venda dividida)                  |
| Parcela            | `Installment`      |                                                             |
| Plano de parcelas  | `InstallmentPlan`  | Valor, tarifa, líquido e vencimento de cada quota           |
| Bandeira do cartão | `CardBrand`        | `visa`, `mastercard`, `elo`, `amex`, `hipercard`, `unknown` |
| Tabela de tarifas  | `CardFeeTable`     | Lookup por bandeira e número de parcelas                    |
| Totais da venda    | `SaleTotals`       | Bruto, custo, imposto, tarifa, líquido, margem              |
| Carteira / fiado   | `wallet`           | Crédito do cliente na loja                                  |
| Tarifa de cartão   | `CardFee`          | O que a adquirente retém                                    |
| Valor líquido      | `netAmount`        | Bruto − imposto − tarifa. O que de fato entra               |
| Valor bruto        | `grossAmount`      |                                                             |
| Custo              | `costAmount`       |                                                             |
| Margem em valor    | `marginAmount`     | Líquido − custo                                             |
| Margem percentual  | `marginRate`       | Sobre o bruto, em pontos por cem                            |

## Financeiro

| PT-BR                  | Código (inglês)   | Observações                              |
| ---------------------- | ----------------- | ---------------------------------------- |
| Contas a receber       | `Receivable`      |                                          |
| Contas a pagar         | `Payable`         |                                          |
| Vencimento             | `dueDate`         |                                          |
| Liquidação / baixa     | `Settlement`      | Ato de marcar como pago. Verbo: `settle` |
| Inadimplência          | `overdue`         | Estado, não entidade                     |
| Banco / conta bancária | `BankAccount`     | **Fora do recorte** (DEC-005)            |
| Transação bancária     | `BankTransaction` | **Fora do recorte**                      |
| Extrato                | `BankStatement`   | **Fora do recorte**                      |
| Conciliação bancária   | `Reconciliation`  | **Fora do recorte**                      |
| Plano de contas        | `ChartOfAccounts` |                                          |
| Conta contábil         | `LedgerAccount`   |                                          |
| Centro de custo        | `CostCenter`      |                                          |
| Lançamento             | `Entry`           |                                          |
| Fluxo de caixa         | `CashFlow`        |                                          |

## Fiscal

| PT-BR                             | Código (inglês)               | Observações                                                                 |
| --------------------------------- | ----------------------------- | --------------------------------------------------------------------------- |
| Nota fiscal                       | `Invoice`                     | Genérico                                                                    |
| NFC-e (consumidor)                | `ConsumerInvoice`             | Mantém a sigla `nfce` em campos técnicos                                    |
| NFS-e (serviço)                   | `ServiceInvoice`              | Sigla `nfse` em campos técnicos; emissão = NFS-e Nacional                   |
| Emissão                           | `issue`                       | `issueInvoice()`                                                            |
| Cancelamento de nota              | `cancelInvoice`               | Prazo legal distinto do cancelamento de venda                               |
| Contingência                      | `contingency`                 | Emissão offline via Focus quando a autorização falha                        |
| Chave de acesso                   | `accessKey`                   | 44 dígitos                                                                  |
| DANFE                             | `danfe`                       | Representação impressa da NFC-e                                             |
| DANFSe                            | `danfse`                      | Representação impressa da NFS-e                                             |
| Regime tributário                 | `TaxRegime`                   | `mei`, `simples_nacional`, `lucro_presumido`, `lucro_real`                  |
| Híbrido (reforma 2027)            | `optedReformaHibrida`         | Autodeclaração: IBS/CBS fora do DAS (LC 214/2025). True = ERP ok, sem Focus |
| Elegível para emitir              | `isEligibleForFiscalEmission` | `mei` ou `simples_nacional` e não híbrido                                   |
| NCM                               | `ncm`                         |                                                                             |
| CFOP                              | `cfop`                        | Padrão do adapter Focus (MEI/Simples); **não** coluna de produto            |
| CST / CSOSN                       | `cst` / `csosn`               | Idem CFOP                                                                   |
| Imposto                           | `Tax`                         |                                                                             |
| Alíquota                          | `taxRate`                     |                                                                             |
| Código de tributação nacional ISS | `codigoTributacaoNacionalIss` | Payload NFS-e Nacional Focus `codigo_tributacao_nacional_iss`               |
| NBS                               | `codigoNbs`                   | Nomenclatura Brasileira de Serviços; DPS nacional quando o município exigir |

## Assistente / IA

| PT-BR                  | Código (inglês)       | Observações                            |
| ---------------------- | --------------------- | -------------------------------------- |
| Assistente             | `Agent`               | Nunca `Bot`, `Chatbot` nem `Assistant` |
| Conversa               | `Conversation`        | Fio de mensagens com um número         |
| Mensagem               | `Message`             |                                        |
| Intenção               | `Intent`              |                                        |
| Ferramenta (do agente) | `Tool`                | Caso de uso exposto ao agente          |
| Chamada de ferramenta  | `ToolCall`            |                                        |
| Confirmação            | `Confirmation`        | Aprovação explícita para ação sensível |
| Memória / contexto     | `ConversationContext` |                                        |
| Modelo (LLM)           | `Model`               |                                        |

## Plataforma

| PT-BR                      | Código (inglês)   | Observações                            |
| -------------------------- | ----------------- | -------------------------------------- |
| Assinatura                 | `Subscription`    |                                        |
| Plano                      | `Plan`            |                                        |
| Mensalidade                | `subscriptionFee` |                                        |
| Cupom                      | `Coupon`          |                                        |
| Bloqueio por inadimplência | `suspension`      | Estado da `Subscription`               |
| Período de teste           | `trial`           |                                        |
| Agenda                     | `Schedule`        |                                        |
| Chamado de suporte         | `SupportTicket`   | Jornada I                              |
| Card de CRM                | `CrmCard`         | Quadro a fazer / andamento / concluído |
| Compromisso                | `Appointment`     |                                        |
| Auditoria                  | `AuditLog`        |                                        |
| Anexo                      | `Attachment`      |                                        |
| Webhook                    | `Webhook`         | Mantém em inglês também em PT-BR       |
| Fila                       | `Queue`           |                                        |
| Job agendado               | `ScheduledJob`    |                                        |

---

## Convenções de nomenclatura

| Elemento                        | Convenção                           | Exemplo                                              |
| ------------------------------- | ----------------------------------- | ---------------------------------------------------- |
| Tipo / classe / schema Zod      | `PascalCase`                        | `SaleItem`, `CreateSaleInput`                        |
| Função / variável / propriedade | `camelCase`                         | `netAmount`, `issueInvoice()`                        |
| Arquivo e pasta                 | `kebab-case`                        | `sale-item.ts`, `chart-of-accounts/`                 |
| Tabela e coluna no banco        | `snake_case`, tabela no **plural**  | `sale_items`, `net_amount`                           |
| Variável de ambiente            | `SCREAMING_SNAKE_CASE`              | `DATABASE_URL`, `WHATSAPP_API_TOKEN`                 |
| Endpoint HTTP                   | `kebab-case`, recurso no **plural** | `POST /v1/sales` (sem `bank-accounts` neste recorte) |
| Fila / job                      | `kebab-case`, `<domínio>-<ação>`    | `invoice-issue`, `whatsapp-send`                     |
| Evento de domínio               | `PascalCase` no passado             | `SaleRegistered`, `InvoiceIssued`                    |
| Constante                       | `SCREAMING_SNAKE_CASE`              | `MAX_DISCOUNT_RATE`                                  |
| Booleano                        | prefixo `is` / `has` / `can`        | `isOverdue`, `hasInventory`                          |

## Termos proibidos no código

Nomes que geram ambiguidade e não devem aparecer:

| Não use                                     | Use                             | Por quê                                    |
| ------------------------------------------- | ------------------------------- | ------------------------------------------ |
| `Client` para cliente da loja               | `Customer`                      | `Client` é cliente HTTP/SDK                |
| `Order`                                     | `Sale`                          | Não existe pedido separado de venda no MVP |
| `Bot`, `Chatbot`                            | `Agent`                         | O produto não é um bot de atendimento      |
| `Tenant`, `Organization`                    | `Company`                       | Um nome só para a mesma coisa              |
| `price` sem qualificador                    | `salePrice`, `costPrice`        | Ambíguo entre custo e venda                |
| `amount` sem qualificador em dinheiro       | `grossAmount`, `netAmount`, ... | Ambíguo sobre o que está incluso           |
| `date` para data com hora                   | `...At` (`createdAt`)           | `date` implica dia sem hora                |
| `data`, `info`, `manager`, `helper`, `util` | nome do que a coisa é           | Não significam nada                        |

## Regras que valem em todo o código

- **Dinheiro é sempre `Money`** (inteiro em centavos), nunca `number` com casa
  decimal. Ver [`packages/money`](../../packages/money/README.md).
- **Toda data/hora é UTC no armazenamento**, com sufixo `At` e conversão para
  `America/Sao_Paulo` só na apresentação.
- **Documento fiscal brasileiro mantém a sigla original** (`cnpj`, `cpf`, `ncm`,
  `cfop`, `nfce`) — traduzir seria pior.
- **Toda tabela de negócio tem `company_id`** — ver
  [`dados.md`](../arquitetura/dados.md#multi-tenant).
- **Nome de fila nunca usa `:`** — o BullMQ reserva o caractere como separador
  de chave no Redis e recusa o nome em tempo de execução.
