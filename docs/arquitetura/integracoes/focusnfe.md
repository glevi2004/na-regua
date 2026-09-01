Introdução

---

updatedAt: 2026-07-08T16:20:49.000Z
---

Fetch the complete documentation index at: https://doc.focusnfe.com.br/llms.txt. Use this file to discover all available pages before exploring further. Append .md to any documentation page URL to get its markdown version.

# Introdução

A API Focus NFe permite emitir e consultar documentos fiscais eletrônicos a partir do seu sistema, em qualquer stack. Você envia os dados em formato estruturado (JSON); a API cuida da assinatura digital e da comunicação com a SEFAZ (estados), prefeituras (NFSe) ou demais órgãos competentes, conforme o documento.

Antes de integrar, confira as URLs por ambiente em [Ambiente](/reference/ambiente), o uso do token em [Autenticação](/reference/autenticacao) e o identificador de emissão em [Referência (ref)](/reference/referencia).

Documentos fiscais disponíveis:

- [CTe / CTe OS / CTe Simplificado](/reference/ctecteos)
- [MDFe](/reference/mdfe)
- [NFe](/reference/nfe)
- [NFCe](/reference/nfce)
- [NFCom](/reference/nfcom)
- [NFSe](/reference/nfse)
- [NFSe nacional](/reference/nfse-nacional)

Documentos recebidos (emitidos contra o seu CNPJ):

- [CTe recebidas](/reference/cte-recebidas)
- [NFe recebidas](/reference/nfe-recebidas)
- [NFSe nacional recebidas](/reference/nfsen-recebidas)

> Mais adiante nesta página há uma seção com mais informações.

Use esta documentação como guia principal da integração. Para explicações complementares, consulte os [Guides da Focus NFe](https://focusnfe.com.br/guides). Se ainda restar dúvida, entre em contato com o suporte em <suporte@focusnfe.com.br>.

## Como navegar nesta documentação

Comece por essa introdução (ambiente, autenticação e referência no início desta página) e, em seguida, abra a referência do que você vai emitir ou das notas recebidas que precisa acompanhar (veja as listas acima).

### Guarde e recupere os XMLs — backups sem depender só do seu servidor

Se o seu sistema cair, alguém apagar arquivo sem querer ou você precisar provar o histórico fiscal, ter **cópia dos XMLs** fora do dia a dia da aplicação evita dor de cabeça. A Focus NFe oferece **backups** dos documentos emitidos para você **listar, baixar e manter arquivo** com segurança. Hoje a API de backups cobre **NFe, NFCe, NFCom, CTe e MDFe**.

Para saber mais, leia a referência de [backups](/reference/backups).

### Seja notificado quando um documento for autorizado

Depois de enviar um documento, é comum precisar saber quando ele foi autorizado ou se houve erro. Resolver isso só com **consultas repetidas à API (vários GETs em sequência)** aumenta tráfego, pode bater em limites e atrasa a reação do seu sistema.

Para saber mais, leia a referência de [gatilhos e webhooks](/reference/webhooks).

### Terceiros emitindo contra seu CNPJ? Veja, arquive e responda à Receita quando couber

Quando **NFe, CTe ou NFSe nacional** são emitidos contra o seu CNPJ, acompanhar pela API evita surpresa na escrituração: você **sabe o que foi lançado em nome da empresa**, **baixa comprovantes** (XML, DANFE, DACTe, DANFSe em HTML ou PDF) e usa o que a Focus **guarda** dos documentos distribuídos.

Para saber mais, leia a referência de [NFe recebidas](/reference/nfe-recebidas), [CTe recebidas](/reference/cte-recebidas) e [NFSe nacional recebidas](/reference/nfsen-recebidas).

### Vários clientes emitindo por uma única integração?

Se você **centraliza vários CNPJs** (ERP, contabilidade ou SaaS), a **API de empresas** permite **cadastrar, listar, consultar, atualizar e excluir** cada empresa na Focus NFe. Tudo via integração, sem depender só do painel.

Para saber mais, leia a referência de [empresas](/reference/empresas).

### Precisa de consultas auxiliares (endereço, classificação fiscal, cadastro, municípios)?

Use as **APIs acessórias**:

- [CEPs](/reference/ceps)
- [CFOP](/reference/cfop)
- [CNAE](/reference/cnae)
- [CNPJ](/reference/cnpj)
- [Municípios](/reference/municipios)
- [NCM](/reference/ncm).

Ambiente

---

updatedAt: 2026-04-08T19:36:29.000Z
---

Fetch the complete documentation index at: https://doc.focusnfe.com.br/llms.txt. Use this file to discover all available pages before exploring further. Append .md to any documentation page URL to get its markdown version.

# Ambiente

A API Focus NFe oferece **dois ambientes**: **homologação** e **produção**. A autenticação é a mesma nos dois; o que muda é a **URL base** e o **efeito fiscal** das operações.

## Homologação

O ambiente de **homologação** destina-se a **testes de integração** e emissões experimentais. Os documentos emitidos ali **não têm validade fiscal nem tributária**.

## Produção

O ambiente de **produção** é o que gera documentos com **validade fiscal e tributária**. **Por isso**, use-o somente quando estiver pronto para operar com notas válidas em nome dos seus clientes ou da sua empresa.

## Endereços dos servidores

| Ambiente    | URL base                              |
| ----------- | ------------------------------------- |
| Homologação | `https://homologacao.focusnfe.com.br` |
| Produção    | `https://api.focusnfe.com.br`         |

As rotas REST documentadas neste portal usam o prefixo **`/v2`**. Exemplo: `https://api.focusnfe.com.br/v2/nfe`.

## SSL / TLS

Confira na sua linguagem ou runtime se é preciso **alguma configuração extra** para HTTPS (versão mínima de TLS, trust store, etc.). Em alguns casos é necessário **confiar explicitamente** na cadeia da autoridade certificadora que emitiu o certificado do nosso servidor. Em **Java**, em especial, costuma ser preciso importar **toda a cadeia** (intermediárias e raiz) no truststore.

Para inspecionar e salvar os certificados apresentados pelo servidor de produção, você pode usar no Linux (ou macOS):

```bash
openssl s_client -showcerts -connect api.focusnfe.com.br:443
```

Copie cada bloco entre `-----BEGIN CERTIFICATE-----` e `-----END CERTIFICATE-----` para arquivos separados e importe-os na ferramenta ou keystore que sua aplicação utiliza. Para homologação, repita o comando apontando para `homologacao.focusnfe.com.br:443` se necessário.

Se algo falhar nesse processo, fale com o suporte em <suporte@focusnfe.com.br>.

Autenticação

---

updatedAt: 2026-07-30T12:42:45.000Z
---

Fetch the complete documentation index at: https://doc.focusnfe.com.br/llms.txt. Use this file to discover all available pages before exploring further. Append .md to any documentation page URL to get its markdown version.

# Autenticação

Todas as chamadas à API Focus NFe exigem **autenticação HTTP Basic** (RFC 7617). Não há cabeçalho de API key separado: o **token da empresa** é enviado como **usuário** do Basic Auth e a **senha fica em branco**.

## Como funciona

1. O cliente monta o par **usuário** = token alfanumérico gerado no cadastro da empresa (painel Focus NFe).
2. A **senha** do Basic deve ser **vazia** (string vazia, não omita o esquema Basic).
3. O cabeçalho `Authorization` enviado pelo cliente é equivalente a `Basic` + Base64(`token:`) — note os dois pontos e nada depois deles.

O mesmo esquema vale para **homologação** e **produção**; muda apenas a URL base do servidor e o token.

## Exemplo com cURL

```bash
curl -u 'SEU_TOKEN_AQUI:' \
  https://api.focusnfe.com.br/v2/empresas
```

O caractere após os dois pontos é intencional: senha vazia. Sem aspas, alguns shells podem exigir escapar caracteres especiais do token.

Referência

---

updatedAt: 2026-04-09T12:06:21.000Z
---

Fetch the complete documentation index at: https://doc.focusnfe.com.br/llms.txt. Use this file to discover all available pages before exploring further. Append .md to any documentation page URL to get its markdown version.

# Referência

A **referência** (`ref`) é o identificador que você envia para **marcar uma emissão** na API Focus NFe. Ela precisa ser **única dentro do escopo do token** (cada empresa/token tem o seu próprio conjunto de referências).

## Formato e uso

- Pode ser **alfanumérica**.
- **Não** use caracteres especiais (acentos, espaços, `@`, `/`, etc.); fique em **letras e números**, conforme a validação da API.
- É comum usar o **ID interno** do seu sistema — por exemplo, a chave da tabela onde a nota é armazenada antes da autorização.

## Reutilização

- Se a **autorização falhar** (nota rejeitada ou erro antes de autorizar), em geral você **pode reenviar** usando a **mesma referência** após corrigir o payload.
- Depois que a nota for **autorizada** (mesmo que depois seja **cancelada**), aquela referência **não pode** ser usada de novo para uma **nova** emissão: ela fica vinculada àquele documento.

NFCe

---

updatedAt: 2026-04-08T19:36:29.000Z
---

Fetch the complete documentation index at: https://doc.focusnfe.com.br/llms.txt. Use this file to discover all available pages before exploring further. Append .md to any documentation page URL to get its markdown version.

# FocusNFe Documentation

> Documentation for FocusNFe

Append .md to any documentation page URL to get its markdown version.

## API Reference

- [Introdução](https://doc.focusnfe.com.br/reference/introducao.md)
- [Ambiente](https://doc.focusnfe.com.br/reference/ambiente.md)
- [Autenticação](https://doc.focusnfe.com.br/reference/autenticacao.md)
- [Referência](https://doc.focusnfe.com.br/reference/referencia.md)
- [CTe/CTeOs](https://doc.focusnfe.com.br/reference/ctecteos.md)
- [Emitir CTe](https://doc.focusnfe.com.br/reference/emitir_cte.md): Quando um CT-e é enviado para processamento, é realizada uma pré-validação, caso ocorra algum problema como: ausência de campos essenciais, formato de dados incorreto ou problemas com o cadastro do emitente em nossa base, o CT-e não será aceito e você receberá uma mensagem de erro de forma **síncrona**. Caso o CT-e seja aceito para processamento, ele será enviado para uma fila e será processado de forma **assíncrona**. Com isto, o CT-e poderá ser autorizado ou retornar um erro, de acordo com a validação da SEFAZ. Para verificar se o CT-e já foi autorizado, você terá que efetuar uma consulta ou se utilizar de webhooks (gatilhos). Abaixo você poderá verificar uma listagem dos principais campos disponíveis. Para verificar a listagem completa de campos veja o link a seguir. [Documentação completa dos campos do CT-e](https://campos.focusnfe.com.br/cte_cteos/ConhecimentoTransporteXML.html) Além dos campos básicos todo CT-e deverá possuir um modal, que indica a forma de transporte da carga. Veja a seguir os modais existentes e seus respectivos campos: * [modal\_rodoviario](https://campos.focusnfe.com.br/cte_cteos/TransporteRodoviarioXML.html) * [modal\_aereo](https://campos.focusnfe.com.br/cte_cteos/TransporteAereoXML.html) * [modal\_aquaviario](https://campos.focusnfe.com.br/cte_cteos/TransporteAquaviarioXML.html) * [modal\_ferroviario](https://campos.focusnfe.com.br/cte_cteos/TransporteFerroviarioXML.html) * [modal\_dutoviario](https://campos.focusnfe.com.br/cte_cteos/TransporteDutoviarioXML.html) * [modal\_multimodal](https://campos.focusnfe.com.br/cte_cteos/TransporteMultimodalXML.html)
- [Emitir CT-e OS](https://doc.focusnfe.com.br/reference/emitir_cte_os.md): Diferente do CT-e, o CT-es OS (CT-e para outros serviços) possui processamento **síncrono**. Abaixo você poderá verificar uma listagem dos principais campos disponíveis. Para verificar a listagem completa de campos veja o link a seguir. [Documentação completa dos campos do CT-e OS](https://focusnfe.com.br/doc/#cte-e-cte-os_campos-de-um-cte) Para o CT-e OS é necessário informar do modal apenas quando este for rodoviário. Nos outros casos não é necessário. O link a seguir destaca todos os campos do modal rodoviário. * [modal\_rodoviario](https://campos.focusnfe.com.br/cte_cteos/TransporteRodoviarioOsXML.html)
- [Emitir CT-e Simplificado](https://doc.focusnfe.com.br/reference/emitir_cte_simp.md): O CT-e Simplificado possui processamento **síncrono**, de forma análoga ao CT-e OS. A resposta da requisição já poderá conter o status final de autorização ou erro. A consulta, o cancelamento e a carta de correção utilizam os mesmos endpoints do CT-e (`/cte/{referencia}`). Abaixo você poderá verificar uma listagem dos principais campos disponíveis. Para verificar a listagem completa de campos veja o link a seguir. [Documentação completa dos campos do CT-e Simplificado](https://campos.focusnfe.com.br/cte_cteos/ConhecimentoTransporteSimpXML.html) O CT-e Simplificado utiliza o array `detalhes` para informar as entregas/prestações. Veja a documentação dos itens de detalhe: * [detalhes](https://campos.focusnfe.com.br/cte_cteos/DetalheEntregaSimpXML.html) É obrigatório informar o modal. Os modais disponíveis e seus respectivos campos são: * [modal\_rodoviario](https://campos.focusnfe.com.br/cte_cteos/TransporteRodoviarioXML.html) * [modal\_aereo](https://campos.focusnfe.com.br/cte_cteos/TransporteAereoXML.html) * [modal\_aquaviario](https://campos.focusnfe.com.br/cte_cteos/TransporteAquaviarioXML.html)
- [Consultar](https://doc.focusnfe.com.br/reference/consultar_cte_cte_os.md): Após enviar um CT-e, CT-e OS ou CT-e Simplificado, você poderá usar a operação de consulta para verificar se ele está em processamento ou se já foi processado. Como retorno você receberá os campos descritos nos exemplos abaixo, de acordo com o status do CT-e.
- [Cancelar](https://doc.focusnfe.com.br/reference/cancelar_cte_cte_os.md): Apenas CT-es, CT-e OS e CT-e Simplificado com status "autorizado" podem ser cancelados. O cancelamento é definitivo e não pode ser desfeito. Este endpoint possui retorno **síncrono**. Como resposta você poderá receber os campos descritos abaixo. Os exemplos de resposta mostram os campos retornados de acordo com o status do CT-e/CT-e OS/CT-e Simplificado.
- [Carta de correção](https://doc.focusnfe.com.br/reference/carta_correcao_cte_cte_os.md): Uma Carta de Correção eletrônica (CCe) pode ser utilizada para corrigir eventuais erros na CTe. As seguintes informações não podem ser corrigidas: * As variáveis que determinam o valor do imposto tais como: base de cálculo, alíquota, diferença de preço, quantidade e etc... * A correção de dados cadastrais que implique mudança do remetente ou do destinatário. * A data de emissão ou de saída. Não existe prazo especificado para emissão de cartas de correção. É possível enviar até 20 correções diferentes, sendo que será válido somente a última correção enviada. Este endpoint possui retorno **síncrono**. Na carta de correção para CT-e é obrigatório informar o campo que será alterado. Você pode utilizar os próprios nomes dos campos da API. Veja abaixo os campos que podem ser enviados na requisição.
- [Solicitar reenvio de notificação](https://doc.focusnfe.com.br/reference/reenviar_hook_cte_cte_os.md): Para efeitos de teste ou para recuperar notificações perdidas é possível solicitar à API o reenvio desta notificação para todos os gatilhos cadastrados.
- [DCe](https://doc.focusnfe.com.br/reference/dce.md)
- [Emitir](https://doc.focusnfe.com.br/reference/emitir_dce.md): Quando uma DCe é enviada para processamento, é realizada uma pré-validação, caso ocorra algum problema como: ausência de campos essenciais, formato de dados incorreto ou problemas com o cadastro do emitente em nossa base, a DCe não será aceita e você receberá uma mensagem de erro de forma **síncrona**. Caso a DCe seja aceita para processamento, ela será enviada para uma fila e será processada de forma **assíncrona**. Com isto, a DCe poderá ser autorizada ou retornar um erro, de acordo com a validação do autorizador nacional. Para verificar se a DCe já foi autorizada, você terá que efetuar uma consulta ou se utilizar de webhooks (gatilhos). Abaixo você poderá verificar uma listagem dos principais campos disponíveis. Para verificar a listagem completa de campos veja o link a seguir. [Documentação completa de campos da DCe](https://campos.focusnfe.com.br/dce/DeclaracaoConteudoXML.html)
- [Consultar](https://doc.focusnfe.com.br/reference/consultar_dce.md): Após enviar uma DCe, você poderá usar a operação de consulta para verificar se ela está em processamento ou se já foi processada. Como retorno você receberá os campos descritos abaixo, de acordo com o status da declaração.
- [Cancelar](https://doc.focusnfe.com.br/reference/cancelar_dce.md): Apenas DCe com status "autorizado" podem ser canceladas. O cancelamento é definitivo e não pode ser desfeito. Este endpoint possui retorno **síncrono**. Como resposta você poderá receber os campos descritos abaixo. Os exemplos de resposta mostram os campos retornados de acordo com o status da DCe.
- [Solicitar reenvio de notificação](https://doc.focusnfe.com.br/reference/reenviar_hook_dce.md): Para efeitos de teste ou para recuperar notificações perdidas é possível solicitar à API o reenvio desta notificação para todos os gatilhos cadastrados.
- [MDFe](https://doc.focusnfe.com.br/reference/mdfe.md)
- [Emitir](https://doc.focusnfe.com.br/reference/emitir_mdfe.md): Quando um MDF-e é enviado para processamento, é realizada uma pré-validação, caso ocorra algum problema como: ausência de campos essenciais, formato de dados incorreto ou problemas com o cadastro do emitente em nossa base, o MDF-e não será aceito e você receberá uma mensagem de erro de forma **síncrona**. Caso o MDF-e seja aceito para processamento, ele será enviado para uma fila e será processado de forma **assíncrona**. Com isto, o MDF-e poderá ser autorizado ou retornar um erro, de acordo com a validação da SEFAZ. Para verificar se o MDF-e já foi autorizado, você terá que efetuar uma consulta ou se utilizar de webhooks (gatilhos). Se você desejar, é possível configurar a empresa para emissão em modo síncrono. Abaixo você poderá verificar uma listagem dos principais campos disponíveis. Para verificar a listagem completa de campos veja o link a seguir. [Documentação completa de campos do MDF-e](https://campos.focusnfe.com.br/mdfe/MDFeXML.html) Além dos campos básicos todo CT-e deverá possuir um modal, que indica a forma de transporte da carga. Veja a seguir os modais existentes e seus respectivos campos: * [modal\_rodoviario](https://campos.focusnfe.com.br/mdfe/TransporteRodoviarioXML.html) * [modal\_aereo](https://campos.focusnfe.com.br/mdfe/TransporteAereoXML.html) * [moda\_aquaviario](https://campos.focusnfe.com.br/mdfe/TransporteAquaviarioXML.html) * [modal\_ferroviario](https://campos.focusnfe.com.br/mdfe/TransporteFerroviarioXML.html)
- [Consultar](https://doc.focusnfe.com.br/reference/consultar_mdfe.md): Após enviar um MDF-e, você poderá usar a operação de consulta para verificar se ele está em processamento ou se já foi processado. Como retorno você receberá os campos descritos nos exemplos abaixo, de acordo com o status do MDF-e.
- [Cancelar](https://doc.focusnfe.com.br/reference/cancelar_mdfe.md): Apenas MDF-es com status "autorizado" podem ser cancelados. O cancelamento é definitivo e não pode ser desfeito. Este endpoint possui retorno **síncrono**. Como resposta você poderá receber os campos descritos abaixo. Os exemplos de resposta mostram os campos retornados de acordo com o status do MDF-e.
- [Incluir um condutor](https://doc.focusnfe.com.br/reference/incluir_condutor_mdfe.md): É possível incluir um condutor adicional em um MDF-e. Este endpoint possui retorno **síncrono**. Veja abaixo os campos que podem ser enviados na requisição.
- [Incluir um DFe](https://doc.focusnfe.com.br/reference/incluir_dfe_mdfe.md): É possível incluir um DF-e (documento fiscal eletrônico) adicional em um MDF-e autorizado (com indicativo de carregamento posterior). Este endpoint possui retorno **síncrono**. Veja abaixo os campos que podem ser enviados na requisição.
- [Encerrar](https://doc.focusnfe.com.br/reference/encerrar_mdfe.md): Após o término da operação, o MDF-e deverá ser obrigatoriamente encerrado. O evento de encerramento possui uma função diferente do evento de cancelamento. O encerramento indica que a operação foi concluída, já o cancelamento indica que a operação foi finalizada antes mesmo de iniciar. Este endpoint possui retorno **síncrono**. Veja abaixo os campos que podem ser enviados na requisição.
- [Solicitar reenvio de notificação](https://doc.focusnfe.com.br/reference/reenviar_hook_mdfe.md): Para efeitos de teste ou para recuperar notificações perdidas é possível solicitar à API o reenvio desta notificação para todos os gatilhos cadastrados.
- [NFCom](https://doc.focusnfe.com.br/reference/nfcom.md)
- [Emitir](https://doc.focusnfe.com.br/reference/emitir_nfcom.md): Quando uma NFCom é enviada para processamento, é realizada uma pré-validação, caso ocorra algum problema como: ausência de campos essenciais, formato de dados incorreto ou problemas com o cadastro do emitente em nossa base, a NFCom não será aceita e você receberá uma mensagem de erro de forma **síncrona**. Caso a NFCom seja aceita para processamento, ela será enviada para uma fila e será processada de forma **assíncrona**. Com isto, a NFCom poderá ser autorizada ou retornar um erro, de acordo com a validação da SEFAZ. Para verificar se a NFCom já foi autorizada, você terá que efetuar uma consulta ou se utilizar de webhooks (gatilhos). Abaixo você poderá verificar uma listagem dos principais campos disponíveis. Para verificar a listagem completa de campos veja o link a seguir. [Documentação completa de campos da NFCom](https://campos.focusnfe.com.br/nfcom/NotaFiscalComunicacaoXML.html)
- [Consultar](https://doc.focusnfe.com.br/reference/consultar_nfcom.md): Após enviar uma NFCom, você poderá usar a operação de consulta para verificar se ele está em processamento ou se já foi processada. Como retorno você receberá os campos descritos abaixo, de acordo com o status da nota.
- [Cancelar](https://doc.focusnfe.com.br/reference/cancelar_nfcom.md): Apenas NFCom com status "autorizado" podem ser canceladas. O cancelamento é definitivo e não pode ser desfeito. Este endpoint possui retorno **síncrono**. Como resposta você poderá receber os campos descritos abaixo. Os exemplos de resposta mostram os campos retornados de acordo com o status da NFCom.
- [Solicitar reenvio de notificação](https://doc.focusnfe.com.br/reference/reenviar_hook_nfcom.md): Para efeitos de teste ou para recuperar notificações perdidas é possível solicitar à API o reenvio desta notificação para todos os gatilhos cadastrados.
- [NFCe](https://doc.focusnfe.com.br/reference/nfce.md)
- [Emitir](https://doc.focusnfe.com.br/reference/emitir_nfce.md): Cria uma NFC-e e a envia para processamento. O envio é **síncrono**: a nota é autorizada ou rejeitada na mesma requisição. A resposta contém o mesmo formato da operação de consulta. A numeração (número e série) pode ser definida automaticamente pela API. Para controlar manualmente, informe os campos **numero** e **serie** no corpo. Opcionalmente use o parâmetro **forma_emissao=offline** para emissão manual em contingência.
- [Consultar](https://doc.focusnfe.com.br/reference/consultar_nfce.md): Consulta o status de uma NFC-e emitida. Retorna informações sobre o processamento da nota, incluindo status de autorização, caminhos para download do XML e DANFCe, QR Code e dados de eventos.
- [Cancelar](https://doc.focusnfe.com.br/reference/cancelar_nfce.md): Cancela uma NFC-e já autorizada. Este método é **síncrono**. A NFC-e pode ser cancelada em até **30 minutos** após a emissão.
- [Enviar NFC-e por email](https://doc.focusnfe.com.br/reference/enviar_nfce_email.md): Envia uma cópia da NFC-e por email para os destinatários informados. Limitado a 10 emails por requisição. Os emails são enviados em segundo plano.
- [Inutilizar numeração](https://doc.focusnfe.com.br/reference/inutilizar_numeracao_nfce.md): Inutiliza uma faixa de numeração de NFC-e perante a SEFAZ. Em situação normal a API controla a numeração automaticamente. Este método é **síncrono**.
- [Consultar inutilizações](https://doc.focusnfe.com.br/reference/consultar_inutilizacoes_nfce.md): Consulta XMLs de numerações inutilizadas de NFC-e. Permite filtrar por CNPJ/CPF, data de recebimento e faixa de números.
- [Registrar Conciliação Financeira (ECONF)](https://doc.focusnfe.com.br/reference/registrar_econf_nfce.md): Registra um evento de Conciliação Financeira (ECONF) para uma NFC-e autorizada. Uso facultativo para demonstrar conformidade entre informações financeiras e documentos fiscais. Este método é **síncrono**.
- [Consultar ECONF](https://doc.focusnfe.com.br/reference/consultar_econf_nfce.md): Consulta um evento de Conciliação Financeira (ECONF) pelo número do protocolo.
- [Cancelar ECONF](https://doc.focusnfe.com.br/reference/cancelar_econf_nfce.md): Cancela um evento de Conciliação Financeira (ECONF). O cancelamento deve ser feito na ordem dos envios (do mais antigo ao mais recente).
- [NFe](https://doc.focusnfe.com.br/reference/nfe.md)
- [Emitir](https://doc.focusnfe.com.br/reference/emitir_nfe.md): Recebe o payload da NF-e e inicia o envio para autorização na SEFAZ. Por padrão, o fluxo é **assíncrono**: a API confirma o recebimento da requisição e a nota segue em fila até o processamento. Quando permitido pelo estado e pela configuração da conta, a emissão pode ocorrer de forma **síncrona**, com o resultado retornado na mesma requisição. Para acompanhar o status até a autorização, use a consulta da nota ou os webhooks. A NF-e na versão 4.00 admite muitos campos. A referência completa dos campos aceitos pela API, com a correspondência às tags XML, está no link abaixo. [Documentação completa dos campos da NF-e (versão 4.00)](https://campos.focusnfe.com.br/nfe/NotaFiscalXML.html)
- [Consultar](https://doc.focusnfe.com.br/reference/consultar_nfe.md): Consulta o status de uma NFe emitida. Retorna informações sobre o processamento da nota, incluindo status de autorização, caminhos para download do XML e DANFe, e dados de eventos associados.
- [Cancelar](https://doc.focusnfe.com.br/reference/cancelar_nfe.md): Cancela uma NFe já autorizada. Este método é **síncrono**, ou seja, a comunicação com a SEFAZ será feita imediatamente. A NFe poderá ser cancelada em até 24 horas após a emissão. No entanto, alguns estados podem permitir um prazo maior para o cancelamento.
- [Emitir Carta de Correção](https://doc.focusnfe.com.br/reference/emitir_carta_correcao.md): Emite uma Carta de Correção Eletrônica (CCe) para uma NFe autorizada. Este método é **síncrono**, ou seja, a comunicação com a SEFAZ será feita imediatamente. A CCe pode ser utilizada para corrigir eventuais erros na NFe. As seguintes informações **não podem ser corrigidas**: - As variáveis que determinam o valor do imposto (base de cálculo, alíquota, etc.) - A correção de dados cadastrais que implique mudança do remetente ou do destinatário - A data de emissão ou de saída É possível enviar até 20 correções diferentes, sendo que será válido sempre a última correção enviada.
- [Registrar Ator Interessado](https://doc.focusnfe.com.br/reference/emitir_evento_ator_interessado.md): Registra um ator interessado para uma NFe autorizada. O objetivo do evento **Ator Interessado** é permitir que o emitente informe a identificação do transportador (ou outra pessoa interessada) a qualquer momento, como uma das pessoas autorizadas a acessar o XML da NF-e. Este método é **síncrono**. Este evento somente pode ser gerado no prazo de 6 meses após a data de autorização da NF-e.
- [Registrar Insucesso na Entrega](https://doc.focusnfe.com.br/reference/emitir_evento_insucesso_entrega.md): Registra um evento de insucesso na entrega da NFe. O objetivo do evento é permitir ao remetente registrar, por meio de um evento fiscal, na respectiva nota fiscal eletrônica que acoberta a entrega da mercadoria os motivos que impediram a entrega. Este método é **síncrono**.
- [Cancelar Insucesso na Entrega](https://doc.focusnfe.com.br/reference/cancelar_evento_insucesso_entrega.md): Cancela o evento de insucesso na entrega registrado para uma NFe. Este método é **síncrono**.
- [Enviar NFe por Email](https://doc.focusnfe.com.br/reference/enviar_email_nfe.md): Envia a NFe por email para os destinatários informados. A API imediatamente devolve a requisição com a confirmação dos emails. Os emails serão enviados em segundo plano, por isso pode levar alguns minutos até que eles cheguem à caixa postal.
- [Inutilizar Numeração](https://doc.focusnfe.com.br/reference/inutilizar_numeracao.md): Inutiliza uma faixa de numeração de NFe. Em uma situação normal você não precisará informar ao SEFAZ a inutilização de um número da NFe, pois a API controla automaticamente a numeração das notas. Porém, se por alguma situação específica for necessário a inutilização de alguma faixa de números você poderá usar este endpoint. Este método é **síncrono**.
- [Consultar Inutilizações](https://doc.focusnfe.com.br/reference/consultar_inutilizacoes.md): Consulta XMLs de numerações inutilizadas. Permite consultar as faixas de numeração de notas fiscais eletrônicas (NF-e) declaradas como não utilizadas.
- [Importar NFe](https://doc.focusnfe.com.br/reference/importar_nfe.md): Importa uma NFe a partir de seu XML. Na importação é feita apenas a validação da empresa emitente, esta empresa deve estar cadastrada previamente para aceitar as importações. Não há necessidade de ter um certificado digital instalado para aceitar a importação. Caso a nota seja validada corretamente, a nota será importada e estará disponível para receber outras operações como cancelamento ou carta de correção.
- [Pré-visualização de DANFe](https://doc.focusnfe.com.br/reference/previsualizar_danfe.md): Gera uma DANFe de preview para visualização. A DANFe gerada por este endpoint é apenas para fins de visualização e **não possui valor fiscal**. Para a emissão de uma NFe com valor fiscal, utilize o processo de emissão padrão.
- [Criação DANFe Etiqueta](https://doc.focusnfe.com.br/reference/danfe_etiqueta.md): Gera um DANFe Etiqueta para o documento.
- [Registrar Conciliação Financeira (ECONF)](https://doc.focusnfe.com.br/reference/emitir_evento_econf.md): Registra um evento de Conciliação Financeira (ECONF) para uma NFe. A utilização do Evento de Conciliação Financeira é facultativa e tem o objetivo de auxiliar as empresas que buscam demonstrar a existência de conformidade fiscal entre as informações financeiras e de meios de pagamentos e os documentos fiscais emitidos. Este método é **síncrono**.
- [Consultar Conciliação Financeira (ECONF)](https://doc.focusnfe.com.br/reference/consultar_evento_econf.md): Consulta um evento de Conciliação Financeira (ECONF) pelo número do protocolo.
- [Cancelar Conciliação Financeira (ECONF)](https://doc.focusnfe.com.br/reference/cancelar_evento_econf.md): Cancela um evento de Conciliação Financeira (ECONF). Quando houver mais de uma conciliação financeira vinculada a mesma NFe, o cancelamento dos eventos deve ser feito na mesma ordem dos envios, ou seja, do evento mais antigo para o mais recente.
- [Emitir Evento](https://doc.focusnfe.com.br/reference/emitir_evento_nfe.md): Com os eventos é possível vincular a uma NF-e qualquer ato, realizado por agente envolvido ou relacionado com a operação acobertada pela NF-e. Este endpoint possui retorno **síncrono**. Veja abaixo os campos que podem ser enviados na requisição.
- [Cancelar evento](https://doc.focusnfe.com.br/reference/cancelar_evento_nfe.md): Alguns eventos tem a possibilidade de serem cancelados
- [Solicitar reenvio de notificação de NFe](https://doc.focusnfe.com.br/reference/reenviar_hook_nfe.md): Para efeitos de teste ou para recuperar notificações perdidas é possível solicitar à API o reenvio desta notificação para todos os gatilhos cadastrados.
- [NFGás (Beta)](https://doc.focusnfe.com.br/reference/nfgas.md)
- [Emitir](https://doc.focusnfe.com.br/reference/emitir_nfgas.md): Quando uma NFGás é enviada para processamento, é realizada uma pré-validação, caso ocorra algum problema como: ausência de campos essenciais, formato de dados incorreto ou problemas com o cadastro do emitente em nossa base, a NFGás não será aceita e você receberá uma mensagem de erro de forma **síncrona**. Caso a NFGás seja aceita para processamento, ela será enviada para uma fila e será processada de forma **assíncrona**. Com isto, a NFGás poderá ser autorizada ou retornar um erro, de acordo com a validação da SEFAZ. Para verificar se a NFGás já foi autorizada, você terá que efetuar uma consulta ou se utilizar de webhooks (gatilhos). Abaixo você poderá verificar uma listagem dos principais campos disponíveis. Para acompanhar publicações técnicas oficiais consulte o portal da NFGás. [Documentação completa de campos da NFGás](https://campos.focusnfe.com.br/nfgas/NotaFiscalGasXML.html)
- [Consultar](https://doc.focusnfe.com.br/reference/consultar_nfgas.md): Após enviar uma NFGás, você poderá usar a operação de consulta para verificar se ela está em processamento ou se já foi processada. Como retorno você receberá os campos descritos abaixo, de acordo com o status da nota.
- [Cancelar](https://doc.focusnfe.com.br/reference/cancelar_nfgas.md): Apenas NFGás com status "autorizada" podem ser canceladas. O cancelamento é definitivo e não pode ser desfeito. Este endpoint possui retorno **síncrono**. Como resposta você poderá receber os campos descritos abaixo. Os exemplos de resposta mostram os campos retornados de acordo com o status da NFGás.
- [Solicitar reenvio de notificação](https://doc.focusnfe.com.br/reference/reenviar_hook_nfgas.md): Para efeitos de teste ou para recuperar notificações perdidas é possível solicitar a API o reenvio desta notificação para todos os gatilhos cadastrados.
- [NFSe](https://doc.focusnfe.com.br/reference/nfse.md)
- [Emitir](https://doc.focusnfe.com.br/reference/emitir_nfse.md): Quando uma NFS-e é enviada para processamento, é realizada uma pré-validação, caso ocorra algum problema como: ausência de campos essenciais, formato de dados incorreto ou problemas com o cadastro do prestador em nossa base, a nota não será aceita e você receberá uma mensagem de erro de forma **síncrona**. Caso a nota seja aceita para processamento, ela será enviada para uma fila e será processada de forma **assíncrona**. Com isto, a nota poderá ser autorizada ou retornar um erro, de acordo com a validação da prefeitura. Para verificar se a nota já foi autorizada, você terá que efetuar uma [consulta](/reference/consultar_nfse) ou se utilizar de webhooks (gatilhos). ⚠ **Reforma Tributária** * Abaixo, campos novos da API de NFSe são denotados com <sup>(RT)</sup> e destacados em _itálico_. Durante a transição, alguns municípios podem não aceitar ou não interpretar estes campos. * Muitos municípios estão migrando para o novo padrão da <a href="/reference/emitir_dps_nacional">API de NFSe Nacional</a>, verifique em nosso <a href="https://focusnfe.com.br/guides/reforma-tributaria/">Guia da Reforma Tributária</a>. ⚠ **ATENÇÃO** Alguns municípios podem ter campos adicionais ou regras específicas para preenchimento de campos. Estas exceções tem se mostrado frequentes em função da **Reforma Tributária**. Consulte nossa lista de [Municípios Integrados](https://focusnfe.com.br/cidades-integradas-nfse/) para orientações sobre especificidades de seu município. Abaixo você poderá verificar uma listagem dos principais campos disponíveis.
- [Consultar](https://doc.focusnfe.com.br/reference/consultar_nfse.md): Após enviar uma nota, você poderá usar a operação de consulta para verificar se a nota está em processamento ou se já foi processada. Como retorno você receberá os campos descritos nos exemplos abaixo, de acordo com o status da nota.
- [Cancelar](https://doc.focusnfe.com.br/reference/cancelar_nfse.md): Apenas notas com status "autorizado" podem ser canceladas. O cancelamento é definitivo e não pode ser desfeito. Este endpoint possui retorno **síncrono**. Como resposta você poderá receber os campos descritos abaixo. Os exemplos de resposta mostram os campos retornados de acordo com o status da nota. Algumas prefeituras não permitem o cancelamento notas por webservice. Recomendamos que você consulte nossa [lista de municípios atendidos](https://focusnfe.com.br/guides/nfse/municipios-integrados/) e verifique como sua cidade trata deste tema.
- [Reenviar email](https://doc.focusnfe.com.br/reference/reenviar_email_nfse.md): É possível enviar a nota para um email diferente do que foi informado nos dados de emissão. A confirmação do recebimento desta solicitação é retornada de forma **síncrona**. Contudo, os emails são enviados em segundo plano, podendo levar alguns minutos até que cheguem ao destinatário. Veja abaixo os campos que podem ser enviados na requisição.
- [Solicitar reenvio de notificação](https://doc.focusnfe.com.br/reference/reenviar_hook_nfse.md): Para efeitos de teste ou para recuperar notificações perdidas é possível solicitar à API o reenvio desta notificação para todos os gatilhos cadastrados.
- [NFSe Nacional](https://doc.focusnfe.com.br/reference/nfse-nacional.md)
- [Emitir](https://doc.focusnfe.com.br/reference/emitir_dps_nacional.md): Quando uma NFS-e é enviada para processamento, é realizada uma pré-validação, caso ocorra algum problema como: ausência de campos essenciais, formato de dados incorreto ou problemas com o cadastro do prestador em nossa base, a nota não será aceita e você receberá uma mensagem de erro de forma **síncrona**. Caso a nota seja aceita para processamento, ela será enviada para uma fila e será processada de forma **assíncrona**. Com isto, a nota poderá ser autorizada ou retornar um erro, de acordo com a validação do ambiente nacional. Para verificar se a nota já foi autorizada, você terá que efetuar uma [consulta](/reference/consultar_nfse_nacional) ou se utilizar de webhooks (gatilhos). Abaixo você poderá verificar uma listagem dos principais campos disponíveis. Para verificar a listagem completa de campos veja o link a seguir. [Documentação completa dos campos da NFS-e nacional](https://campos.focusnfe.com.br/nfse_nacional/EmissaoDPSXml.html)
- [Consultar](https://doc.focusnfe.com.br/reference/consultar_nfse_nacional.md): Após enviar uma nota, você poderá usar a operação de consulta para verificar se a nota está em processamento ou se já foi processada. Como retorno você receberá os campos descritos nos exemplos abaixo, de acordo com o status da nota.
- [Cancelar](https://doc.focusnfe.com.br/reference/cancelar_nfse_nacional.md): Apenas notas com status "autorizado" podem ser canceladas. O cancelamento é definitivo e não pode ser desfeito. Este endpoint possui retorno **síncrono**. Como resposta você poderá receber os campos descritos abaixo. Os exemplos de resposta mostram os campos retornados de acordo com o status da nota.
- [Reenviar email](https://doc.focusnfe.com.br/reference/reenviar_email_nfsen.md): É possível enviar a nota para um email diferente do que foi informado nos dados de emissão. A confirmação do recebimento desta solicitação é retornada de forma **síncrona**. Contudo, os emails são enviados em segundo plano, podendo levar alguns minutos até que cheguem ao destinatário. Veja abaixo os campos que podem ser enviados na requisição.
- [Solicitar reenvio de notificação](https://doc.focusnfe.com.br/reference/reenviar_hook_nfsen.md): Para efeitos de teste ou para recuperar notificações perdidas é possível solicitar à API o reenvio desta notificação para todos os gatilhos cadastrados.
- [CTe Recebidas](https://doc.focusnfe.com.br/reference/cte-recebidas.md)
- [Consultar](https://doc.focusnfe.com.br/reference/consultar_ctes_recebidas.md): Quando a receita informa que um CT-e foi emitido contra a empresa, recebemos o XML completo deste CT-e e a receita poderá posteriormente notificar quando o CT-e recebe uma carta de correção ou quando ele for cancelado. Por isso, os CT-es recebidos possuem um campo chamado **versao** que é único entre todos os documentos do mesmo CNPJ e que é atualizado a cada alteração neste CT-e. Isto facilita a busca apenas dos documentos que seu sistema ainda não conhece, sendo necessário que você armazene apenas um número por CNPJ. **Exemplo**: Se você recebe um conhecimento de transporte, com versao = 60, e ele posteriormente receber uma carta de correção ou for cancelado, sua versão será atualizada para algum número maior que 60. **Este endpoint retorna os 100 primeiros CT-es encontrados**. Para recuperar os demais CT-es você deverá fazer uma nova requisição alterando o parâmetro versao. Para auxiliar o processo de consultar a API irá devolver os seguintes cabeçalhos HTTP: * **X-Total-Count**: O número total de registros (incluindo aqueles que não foram devolvidos pelo limite de 100 registros) * **X-Max-Version**: Valor máximo da versão dos documentos devolvidos. Utilize este cabeçalho para utilizar na próxima busca de versão, caso seja necessário. Como retorno você receberá os campos descritos nos exemplos abaixo, de acordo com o status do CT-e.
- [Consultar por chave](https://doc.focusnfe.com.br/reference/consultar_cte_recebida_individual.md): Este endpoint possibilita a consulta individual de conhecimentos de transporte já recebidos, informando sua chave de acesso. Como retorno você receberá os campos descritos nos exemplos abaixo, de acordo com o status do CT-e.
- [Consulta em formato JSON](https://doc.focusnfe.com.br/reference/consultar_cte_recebida_individual_json.md): Este endpoint retorna os dados de um conhecimento de transporte específico em formato json. Como retorno você receberá os campos descritos nos exemplos abaixo, de acordo com o status do CT-e.
- [Baixar o XML](https://doc.focusnfe.com.br/reference/consultar_cte_recebida_individual_xml.md): Este endpoint retorna os dados de um conhecimento de transporte específico em formato xml. Como retorno você receberá os dados da nota em formato xml.
- [Baixar o DACTe](https://doc.focusnfe.com.br/reference/consultar_cte_recebida_individual_pdf.md): Este endpoint retorna o DACTe de um conhecimento específico. Esta requisição irá redirecionar para o endereço onde é salvo o PDF. Caso a sua biblioteca HTTP não consiga seguir requisições de redirecionamento você pode capturar a URL completa no cabeçalho "**Location**" devolvido pela API.
- [Baixar o XML de cancelamento](https://doc.focusnfe.com.br/reference/consultar_cte_recebida_cancelamento_xml.md): Este endpoint o xml de cancelamento do conhecimento de transporte consultado. Como retorno você receberá os dados do cancelamento em formato xml.
- [Baixar o XML de carta de correção](https://doc.focusnfe.com.br/reference/consultar_cte_recebida_carta_correcao_xml.md): Este endpoint o xml da última carta de correção recebida para conhecimento de transporte consultado. Como retorno você receberá os dados da carta de correção em formato xml.
- [Informar desacordo](https://doc.focusnfe.com.br/reference/informar_desacordo_cte_recebida.md): Você pode realizar a operação de desacordo em um conhecimento de transporte recebido. **IMPORTANTE**: Conforme definido pela SEFAZ na NT 2022.001 do CT-e, se o tomador/destinatário for pessoa física (CPF cadastrado em nossa API paro CT-e recebidas) não poderá registrar o evento de desacordo desse tipo de documento via webservice. Essa ação deve ser realizada exclusivamente através da plataforma gov.br. Este endpoint possui retorno **síncrono**. Veja abaixo os campos que podem ser enviados na requisição.
- [Consultar desacordo](https://doc.focusnfe.com.br/reference/consultar_desacordo_cte.md): Consulta o último desacordo válido para o CT-e informado. Retorna os mesmos dados da operação de desacordo.
- [Solicitar reenvio de notificação](https://doc.focusnfe.com.br/reference/reenviar_hook_cte_recebida.md): Para efeitos de teste ou para recuperar notificações perdidas é possível solicitar à API o reenvio desta notificação para todos os gatilhos cadastrados.
- [NFe Recebidas](https://doc.focusnfe.com.br/reference/nfe-recebidas.md)
- [Consultar](https://doc.focusnfe.com.br/reference/consultar_nfes_recebidas.md): Quando a receita informa que uma nota fiscal foi emitida contra a empresa, recebemos apenas um resumo do xml da nota fiscal com os dados mais importantes. Caso a nota seja [manifestada](/reference/manifestar_nfe_recebida), recebemos um xml com todos os dados da nota. Da mesma forma, a receita poderá notificar quando a nota recebe uma carta de correção ou quando ela é cancelada. Por isso as notas fiscais recebidas possuem um campo chamado "**versao**" que é único entre todos os documentos do mesmo CNPJ e que é atualizado a cada alteração nesta nota fiscal. Isto facilita a busca apenas dos documentos que seu sistema ainda não conhece, sendo necessário que você armazene apenas um número por CNPJ. **Exemplo**: Se você recebe uma nota fiscal, com versao = 60, e ela posteriormente receber uma carta de correção ou for cancelada, sua versão será atualizada para algum número maior que 60. **Este endpoint retorna as 100 primeiras notas encontradas**. Para recuperar as demais notas você deverá fazer uma nova requisição alterando o parâmetro versao. Para auxiliar o processo de consultar a API irá devolver os seguintes cabeçalhos HTTP: * **X-Total-Count**: O número total de registros (incluindo aqueles que não foram devolvidos pelo limite de 100 registros) * **X-Max-Version**: Valor máximo da versão dos documentos devolvidos. Utilize este cabeçalho para utilizar na próxima busca de versão, caso seja necessário. Como retorno você receberá os campos descritos nos exemplos abaixo, de acordo com o status da nota.
- [Consultar por chave](https://doc.focusnfe.com.br/reference/consultar_nfe_recebida_individual.md): Este endpoint possibilita a consulta individual de notas já recebidas, informando sua chave de acesso. Como retorno você receberá os campos descritos nos exemplos abaixo, de acordo com o status da nota.
- [Consulta em formato JSON](https://doc.focusnfe.com.br/reference/consultar_nfe_recebida_individual_json.md): Este endpoint retorna os dados de uma nota fiscal específica em formato json. Como retorno você receberá os campos descritos nos exemplos abaixo, de acordo com o status da nota.
- [Baixar o XML](https://doc.focusnfe.com.br/reference/consultar_nfe_recebida_individual_xml.md): Este endpoint retorna os dados de uma nota fiscal específica em formato xml. Como retorno você receberá os dados da nota em formato xml.
- [Baixar o DANFe](https://doc.focusnfe.com.br/reference/consultar_nfe_recebida_individual_pdf.md): O PDF do DANFe **não é retornado no corpo** desta rota. A API responde com **HTTP 302 Found** e envia a URL do arquivo no cabeçalho **Location** (em geral URL **pré-assinada**). Com um cliente que **segue redirecionamentos**, o download do PDF ocorre de forma transparente. Se o cliente **não** seguir, faça um novo **GET** usando apenas a URL de **Location** e **omitindo** o cabeçalho **Authorization** da Focus NFe — a URL já autoriza o acesso ao arquivo. **Documentação interativa (ReadMe):** o “Try it” pode falhar, porque o servidor de destino do redirecionamento em geral **não aceita** o cabeçalho de autenticação da API. Para validar a integração, use **curl** ou outro cliente HTTP no seu ambiente.
- [Baixar o XML de cancelamento](https://doc.focusnfe.com.br/reference/consultar_nfe_recebida_cancelamento_xml.md): Este endpoint o xml de cancelamento da NF-e consultada. Como retorno você receberá os dados do cancelamento em formato xml.
- [Baixar o XML de carta de correção](https://doc.focusnfe.com.br/reference/consultar_nfe_recebida_carta_correcao_xml.md): Este endpoint o xml da última carta de correção recebida para NF-e consultada. Como retorno você receberá os dados da carta de correção em formato xml.
- [Manifestar](https://doc.focusnfe.com.br/reference/manifestar_nfe_recebida.md): Você pode realizar as seguintes operações de manifestação em uma NFe recebida: * **Ciência da operação**: Significa que a operação é conhecida pela empresa, mas ainda não há informações suficientes para saber se ela foi concluída ou não. * **Desconhecimento da operação**: Significa que a empresa não reconhece a nota fiscal emitida. * **Operação realizada (confirmação)**: Significa que a operação é conhecida e foi realizada com sucesso. * **Operação não realizada**: Significa que a operação é conhecida e por algum motivo não foi realizada. Esta manifestação requer o envio de uma justificativa. Para mais detalhes sobre manifestação do destinatário, veja [este artigo](https://focusnfe.com.br/blog/manifestacao-do-destinatario/) em nosso blog. Este endpoint possui retorno **síncrono**. Veja abaixo os campos que podem ser enviados na requisição.
- [Solicitar reenvio de notificação](https://doc.focusnfe.com.br/reference/reenviar_hook_nfe_recebida.md): Para efeitos de teste ou para recuperar notificações perdidas é possível solicitar à API o reenvio desta notificação para todos os gatilhos cadastrados.
- [Evento](https://doc.focusnfe.com.br/reference/emitir_evento_nfes_recebidas.md): Com os eventos é possível vincular a uma NF-e qualquer ato, realizado por agente envolvido ou relacionado com a operação acobertada pela NF-e. Este endpoint possui retorno **síncrono**. Veja abaixo os campos que podem ser enviados na requisição.
- [Cancelar evento](https://doc.focusnfe.com.br/reference/cancelar_evento_nfes_recebidas.md): Alguns eventos tem a possibilidade de serem cancelados
- [NFSe Nacional Recebidas](https://doc.focusnfe.com.br/reference/nfsen-recebidas.md)
- [Consultar](https://doc.focusnfe.com.br/reference/consultar_nfsen_recebidas.md): Quando a receita informa que uma nota fiscal foi emitida contra a empresa, recebemos o xml completo da nota fiscal. As notas fiscais recebidas possuem um campo chamado "**versao**" que é único entre todos os documentos do mesmo CNPJ. Isto facilita a busca apenas dos documentos que seu sistema ainda não conhece, sendo necessário que você armazene apenas um número por CNPJ. **Este endpoint retorna as 100 primeiras notas encontradas**. Para recuperar as demais notas você deverá fazer uma nova requisição alterando o parâmetro versao. Para auxiliar o processo de consultar a API irá devolver os seguintes cabeçalhos HTTP: * **X-Total-Count**: O número total de registros (incluindo aqueles que não foram devolvidos pelo limite de 100 registros) * **X-Max-Version**: Valor máximo da versão dos documentos devolvidos. Utilize este cabeçalho para utilizar na próxima busca de versão, caso seja necessário. Como retorno você receberá os campos descritos nos exemplos abaixo, de acordo com o status da nota.
- [Consulta em formato JSON](https://doc.focusnfe.com.br/reference/consultar_nfsen_recebida_individual_json.md): Este endpoint retorna os dados de uma nota fiscal específica em formato json. Como retorno você receberá os campos descritos nos exemplos, de acordo com o status da nota.
- [Consultar em formato XML](https://doc.focusnfe.com.br/reference/consultar_nfsen_recebida_individual_xml.md): Este endpoint retorna os dados de uma nota fiscal específica em formato xml.
- [Visualizar/Baixar o PDF da DANFSe](https://doc.focusnfe.com.br/reference/consultar_nfsen_recebida_individual_pdf.md): Este endpoint retorna o DANFSe de uma nota específica. Esta requisição irá redirecionar para o endereço onde é salvo o PDF. Caso a sua biblioteca HTTP não consiga seguir requisições de redirecionamento você pode capturar a URL completa no cabeçalho "**Location**" devolvido pela API.
- [DANFSe HTML](https://doc.focusnfe.com.br/reference/consultar_nfsen_recebida_individual_html.md): Este endpoint retorna o DANFSe HTML no padrão Nacional de uma nota específica.
- [Solicitar reenvio de notificação](https://doc.focusnfe.com.br/reference/reenviar_hook_nfsen_recebida.md): Para efeitos de teste ou para recuperar notificações perdidas é possível solicitar à API o reenvio desta notificação para todos os gatilhos cadastrados.
- [Empresas](https://doc.focusnfe.com.br/reference/empresas.md)
- [Criar](https://doc.focusnfe.com.br/reference/criar_empresa.md): Cria uma nova empresa. Utilize `dry_run=1` para simular a criação sem efetivar no banco de dados.
- [Listar](https://doc.focusnfe.com.br/reference/listar_empresas.md): Lista empresas com suporte a filtros e paginação. Cada página retorna até 50 registros.
- [Consultar por ID](https://doc.focusnfe.com.br/reference/consultar_empresa_por_id.md): Retorna os dados de uma empresa.
- [Atualizar](https://doc.focusnfe.com.br/reference/atualizar_empresa.md): Altera os dados de uma empresa. Utilize `dry_run=1` para simular a alteração sem efetivar no banco de dados.
- [Excluir](https://doc.focusnfe.com.br/reference/excluir_empresa.md): Exclui uma empresa e retorna seus dados. Esta operação não é reversível.
- [Backups](https://doc.focusnfe.com.br/reference/backups.md)
- [Consultar por CNPJ](https://doc.focusnfe.com.br/reference/consultar_backups_por_cnpj.md): Retorna a lista de arquivos de backup mensais disponíveis para o CNPJ informado. Cada item contém os caminhos para baixar os arquivos ZIP de DANFEs (NFe) e XMLs (NFe, NFCe, CTe e MDFe).
- [Emails Bloqueados](https://doc.focusnfe.com.br/reference/emails-bloqueados.md)
- [Consultar](https://doc.focusnfe.com.br/reference/consultar_email_bloqueado.md): Consulta se um endereço de email está bloqueado para envio.
- [Solicitar exclusão](https://doc.focusnfe.com.br/reference/excluir_email_bloqueado.md): Solicita a exclusão de um email da lista de bloqueios. Nem todos os bloqueios podem ser removidos (por exemplo, reclamações de spam).
- [Webhooks](https://doc.focusnfe.com.br/reference/webhooks.md)
- [Criar](https://doc.focusnfe.com.br/reference/criar_webhook.md): Cria um novo gatilho para receber notificações de eventos.
- [Listar](https://doc.focusnfe.com.br/reference/listar_webhooks.md): Lista todos os gatilhos cadastrados para o token.
- [Consultar por ID](https://doc.focusnfe.com.br/reference/consultar_webhook.md)
- [Excluir](https://doc.focusnfe.com.br/reference/excluir_webhook.md)
- [Comunicador Offline](https://doc.focusnfe.com.br/reference/comunicador.md)
- [Emitir NFCe](https://doc.focusnfe.com.br/reference/emitir_nfce_local.md): Emite uma NFCe pela API local do Comunicador Offline. O corpo da requisição segue o mesmo padrão usado no arquivo `.nfce`. O Comunicador Offline Focus NFe utiliza a descrição do arquivo no formato `.nfce` para realizar a emissão da Nota Fiscal de Consumidor. Essa descrição nós chamamos de referência ou REF, você pode ler mais sobre ela em [Referência (ref)](/reference/referencia). É importante observar que o Comunicador Offline Focus NFe não aceita duplicidade de referências, por isso, seu sistema deve garantir a criação das REF's, de modo que nunca seja criado uma mesma referência para o mesmo emitente. Se isso acontecer, você receberá um retorno informando que a referência já foi utilizada. Atualmente nosso Comunicador offline Focus NFe não faz os cálculos dos impostos apróximados da Lei da Transparência, mas você pode informá-lo através do campo **valor_total_tributos** nos totais da nota.
- [Cancelar NFCe](https://doc.focusnfe.com.br/reference/cancelar_nfce_local.md): Cancela uma NFCe pela referência. O conteúdo do cancelamento deve informar a justificativa com 15 a 200 caracteres. Utilizamos a mesma referência de emissão para o cancelamento, contudo, sua extensão é alterada para **.canc** e, em seu conteúdo, deve ser enviado a justificativa do cancelamento da nota contendo de 15 à 200 caracteres. Após processado o cancelamento um arquivo com nome formado por 'referencia + _canc_ + timestamp' será gravado no diretório "retornos" contendo um JSON simples com o resultado da operação indicando se houve sucesso ou erro.
- [Consultar NFCe](https://doc.focusnfe.com.br/reference/consultar_nfce_local.md): Retorna os dados da NFCe associada à referência informada.
- [Gerar espelho PDF da NFCe](https://doc.focusnfe.com.br/reference/gerar_pdf_nfce_local.md): Gera o espelho da NFCe em PDF.
- [Gerar XML autorizado da NFCe](https://doc.focusnfe.com.br/reference/gerar_xml_nfce_local.md): Retorna o XML autorizado da NFCe.
- [Gerar XML cancelado da NFCe](https://doc.focusnfe.com.br/reference/gerar_xml_cancelado_nfce_local.md): Retorna o XML de cancelamento da NFCe.
- [Listar NFCes pendentes de efetivação](https://doc.focusnfe.com.br/reference/listar_nfces_pendentes_local.md): Lista as NFCes emitidas em contingência que ainda não foram efetivadas.
- [Efetivar NFCe em contingência](https://doc.focusnfe.com.br/reference/efetivar_nfce_contingencia_local.md): Tenta efetivar manualmente uma NFCe emitida em contingência offline.
- [CEPs](https://doc.focusnfe.com.br/reference/ceps.md)
- [Consultar](https://doc.focusnfe.com.br/reference/consultar_ceps.md): Esta operação permite consultar CEPs utilizando os seguintes critérios de pesquisa: * **codigo_ibge**: Pesquisa pelo CEP referente a uma localidade, conforme o código IBGE do município * **uf**: Pesquisa utilizando os dois caracteres referentes à Unidade da Federação. Ex: 'PR'. * **logradouro**: Pesquisa pelo logradouro completo ou por parte dele. Mínimo de 3 caracteres. * **localidade**: Pesquisa pelo nome completo da localidade ou por parte dele. É necessário informar ao menos dois parâmetros para consulta. No caso especial de municípios que possuem um único CEP (não dividido em logradouros), é possível realizar a consulta informando apenas o parâmetro **codigo_ibge**. A API devolve apenas 50 registros por vez. Para buscar os demais registros, utilize o parâmetro **offset**. O cabeçalho HTTP _X-Total-Count_ representa o número total de ocorrências da pesquisa.
- [Consultar por número](https://doc.focusnfe.com.br/reference/consultar_cep_por_codigo.md): Consulta um CEP específico pelo código exato (8 dígitos, apenas números).
- [CFOP](https://doc.focusnfe.com.br/reference/cfop.md)
- [Consultar](https://doc.focusnfe.com.br/reference/consultar_cfops.md): Esta operação permite consultar códigos CFOP utilizando diversos critérios de pesquisa. Você pode pesquisar por: * **codigo**: Pesquise pela parte inicial do código CFOP * **descricao**: Pesquisa por parte da descrição do código CFOP A API devolve apenas 50 registros por vez. Para buscar os demais registros, utilize o parâmetro **offset**. O cabeçalho HTTP _X-Total-Count_ representa o número total de ocorrências da pesquisa.
- [Consultar por código](https://doc.focusnfe.com.br/reference/consultar_cfop_especifico.md): Consulta um código CFOP específico pelo código exato. Esta operação retorna apenas um resultado, caso o código seja encontrado.
- [CNAE](https://doc.focusnfe.com.br/reference/cnae.md)
- [Consultar](https://doc.focusnfe.com.br/reference/listar_codigos_cnae.md): Permite buscar todos os códigos CNAE ou filtrá-los por parâmetros de pesquisa. A resposta é paginada com até 50 registros por requisição. Para obter o total de registros da pesquisa, utilize o cabeçalho HTTP "X-Total-Count" retornado na resposta e o parâmetro de consulta "offset" para navegar pelas próximas páginas.
- [Consultar por código](https://doc.focusnfe.com.br/reference/consultar_codigo_cnae.md): Busca um código CNAE específico.
- [CNPJ](https://doc.focusnfe.com.br/reference/cnpj.md)
- [Consultar](https://doc.focusnfe.com.br/reference/consultar_cnpj.md): Consulta cadastro de uma empresa pelo número de inscrição no CNPJ (14 dígitos). Informe apenas números, sem pontuação. Exemplo: 12345678000123.
- [Municípios](https://doc.focusnfe.com.br/reference/municipios.md)
- [Listar ou filtrar municípios](https://doc.focusnfe.com.br/reference/listar_municipios.md): Retorna municípios conforme filtros.
- [Consultar município por código IBGE](https://doc.focusnfe.com.br/reference/consultar_municipio.md): Busca um município pelo código IBGE de sete dígitos.
- [Listar itens da lista de serviço do município](https://doc.focusnfe.com.br/reference/listar_itens_lista_servico_municipio.md): Retorna itens da lista de serviço do município, com filtros opcionais.
- [Consultar item da lista de serviço por código](https://doc.focusnfe.com.br/reference/consultar_item_lista_servico_municipio.md): Retorna um item da lista de serviço pelo código no município.
- [Listar códigos tributários municipais](https://doc.focusnfe.com.br/reference/listar_codigos_tributarios_municipio.md): Retorna códigos tributários do município, com filtros opcionais. O **formato dos códigos** retornados depende do padrão que cada município utiliza: alguns seguem o padrão de **item da lista de serviço**, outros o de **código CNAE**, e há municípios com **padrão próprio**.
- [Consultar código tributário municipal por código](https://doc.focusnfe.com.br/reference/consultar_codigo_tributario_municipio.md): Retorna um código tributário municipal pelo identificador.
- [Consultar o JSON de exemplo do município pelo código IBGE](https://doc.focusnfe.com.br/reference/consultar_json_municipio.md): Busca o JSON de exemplo de um município pelo código IBGE de sete dígitos
- [NCM](https://doc.focusnfe.com.br/reference/ncm.md)
- [Consultar](https://doc.focusnfe.com.br/reference/consultar_ncms.md): Esta operação permite consultar códigos NCM utilizando diversos critérios de pesquisa. Você pode pesquisar por: * **codigo**: Pesquise pela parte inicial do código NCM * **descricao**: Pesquisa por parte da descrição do código NCM * **capitulo**, **posicao**, **subposicao1**, **subposicao2**, **item1** e **item2**: Pesquisa exata informando qualquer uma das partes do código NCM A API devolve apenas 50 registros por vez. Para buscar os demais registros, utilize o parâmetro **offset**. O cabeçalho HTTP _X-Total-Count_ representa o número total de ocorrências da pesquisa.
- [Consultar por código](https://doc.focusnfe.com.br/reference/consultar_ncm_especifico.md): Consulta um código NCM específico pelo código exato. Esta operação retorna apenas um resultado, caso o código seja encontrado.
