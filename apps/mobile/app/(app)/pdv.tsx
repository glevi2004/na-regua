import { useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  FORMAS,
  paraItemCarrinho,
  produtoPorEan,
  subtotalCarrinho,
  subtotalItem,
  type ItemCarrinho,
} from "@/lib/vendas-api";
import { formatMoney } from "@/lib/format";
import Botao from "@/components/ui/Botao";
import { Vazio } from "@/components/ui/Cartao";
import LeitorCodigo from "@/components/LeitorCodigo";
import { cores, espaco, fonte, peso, raio } from "@/theme/tokens";

/**
 * PDV simplificado.
 *
 * Versao de balcao: bipar, conferir e fechar. Desconto, orcamento em PDF,
 * multiplas formas de pagamento e emissao fiscal ficam no web — no
 * celular, cada passo a mais e um cliente esperando na fila.
 */
export default function Pdv() {
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [lendo, setLendo] = useState(false);
  const [forma, setForma] = useState<string>("dinheiro");

  const total = subtotalCarrinho(itens);
  const quantidade = itens.reduce((acc, i) => acc + i.quantidade, 0);

  function adicionarPorCodigo(codigo: string) {
    const produto = produtoPorEan(codigo);

    if (!produto) {
      Alert.alert("Nao encontrado", `O codigo ${codigo} nao esta no catalogo.`);
      return;
    }

    setItens((atual) => {
      const existe = atual.find((i) => i.produtoId === produto.id);
      if (existe) {
        return atual.map((i) =>
          i.produtoId === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i,
        );
      }
      return [...atual, paraItemCarrinho(produto)];
    });
  }

  function mudarQuantidade(produtoId: string, delta: number) {
    setItens((atual) =>
      atual
        .map((i) =>
          i.produtoId === produtoId
            ? { ...i, quantidade: i.quantidade + delta }
            : i,
        )
        .filter((i) => i.quantidade > 0),
    );
  }

  function cancelar() {
    Alert.alert("Cancelar a venda", "O carrinho sera esvaziado.", [
      { text: "Voltar", style: "cancel" },
      {
        text: "Cancelar venda",
        style: "destructive",
        onPress: () => setItens([]),
      },
    ]);
  }

  function fechar() {
    const rotulo = FORMAS.find((f) => f.valor === forma)?.rotulo ?? forma;

    Alert.alert(
      "Fechar a venda",
      `${quantidade} item(ns) · ${formatMoney(total)}\nPagamento em ${rotulo}.`,
      [
        { text: "Voltar", style: "cancel" },
        {
          text: "Fechar",
          onPress: () => {
            /* SUBSTITUIR POR: POST /vendas — o servidor recalcula preco,
               imposto e taxa. O total daqui e so referencia. */
            setItens([]);
            Alert.alert("Venda registrada", "O carrinho foi esvaziado.");
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={estilos.tela} edges={["top"]}>
      <View style={estilos.cabecalho}>
        <View>
          <Text style={estilos.titulo}>Venda</Text>
          <Text style={estilos.subtitulo}>
            {quantidade === 0 ? "Carrinho vazio" : `${quantidade} item(ns)`}
          </Text>
        </View>
        <Botao onPress={() => setLendo(true)}>Bipar</Botao>
      </View>

      {itens.length === 0 ? (
        <Vazio
          titulo="Nada no carrinho"
          descricao="Bipe o codigo de barras do produto para comecar."
          acao={<Botao onPress={() => setLendo(true)}>Bipar produto</Botao>}
        />
      ) : (
        <FlatList
          data={itens}
          keyExtractor={(i) => i.produtoId}
          contentContainerStyle={estilos.lista}
          renderItem={({ item }) => (
            <View style={estilos.item}>
              <View style={estilos.itemInfo}>
                <Text style={estilos.itemNome} numberOfLines={2}>
                  {item.descricao}
                </Text>
                <Text style={estilos.itemUnitario}>
                  {formatMoney(item.precoUnitario)} un
                </Text>
              </View>

              <View style={estilos.contador}>
                <Pressable
                  onPress={() => mudarQuantidade(item.produtoId, -1)}
                  style={estilos.contadorBotao}
                  accessibilityLabel={`Diminuir ${item.descricao}`}
                >
                  <Text style={estilos.contadorSinal}>−</Text>
                </Pressable>

                <Text style={estilos.contadorValor}>{item.quantidade}</Text>

                <Pressable
                  onPress={() => mudarQuantidade(item.produtoId, 1)}
                  style={estilos.contadorBotao}
                  accessibilityLabel={`Aumentar ${item.descricao}`}
                >
                  <Text style={estilos.contadorSinal}>+</Text>
                </Pressable>
              </View>

              <Text style={estilos.itemSubtotal}>
                {formatMoney(subtotalItem(item))}
              </Text>
            </View>
          )}
        />
      )}

      {itens.length > 0 ? (
        <View style={estilos.rodape}>
          {/* Formas online (Pix, cartao) exigem link de pagamento; no
              balcao com fila, dinheiro e o caminho rapido. As demais
              entram quando o PSP estiver ligado. */}
          <View style={estilos.formas}>
            {FORMAS.filter((f) => !f.online).map((f) => (
              <Pressable
                key={f.valor}
                onPress={() => setForma(f.valor)}
                style={[estilos.forma, forma === f.valor && estilos.formaAtiva]}
              >
                <Text
                  style={[
                    estilos.formaTexto,
                    forma === f.valor && estilos.formaTextoAtivo,
                  ]}
                >
                  {f.rotulo}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={estilos.totalLinha}>
            <Text style={estilos.totalRotulo}>Total</Text>
            <Text style={estilos.totalValor}>{formatMoney(total)}</Text>
          </View>

          <View style={estilos.acoes}>
            <Botao variante="perigo" onPress={cancelar}>
              Cancelar
            </Botao>
            <View style={estilos.acaoPrincipal}>
              <Botao onPress={fechar} largura>
                Fechar venda
              </Botao>
            </View>
          </View>
        </View>
      ) : null}

      <LeitorCodigo
        aberto={lendo}
        onLer={adicionarPorCodigo}
        onFechar={() => setLendo(false)}
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },

  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: espaco.lg,
  },
  titulo: { fontSize: fonte.display, fontWeight: peso.pesado, color: cores.texto },
  subtitulo: { fontSize: fonte.pequeno, color: cores.textoFraco },

  lista: {
    paddingHorizontal: espaco.lg,
    gap: espaco.sm,
    paddingBottom: espaco.lg,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaco.md,
    padding: espaco.md,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.md,
    backgroundColor: cores.superficie,
  },
  itemInfo: { flex: 1, gap: 2 },
  itemNome: { fontSize: fonte.pequeno, fontWeight: peso.forte, color: cores.texto },
  itemUnitario: { fontSize: fonte.micro, color: cores.textoFraco },

  contador: { flexDirection: "row", alignItems: "center", gap: espaco.sm },
  contadorBotao: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.sm,
  },
  contadorSinal: { fontSize: 20, color: cores.texto },
  contadorValor: {
    minWidth: 26,
    textAlign: "center",
    fontSize: fonte.medio,
    fontWeight: peso.forte,
    color: cores.texto,
  },
  itemSubtotal: {
    minWidth: 72,
    textAlign: "right",
    fontSize: fonte.corpo,
    fontWeight: peso.forte,
    color: cores.texto,
  },

  rodape: {
    padding: espaco.lg,
    gap: espaco.md,
    borderTopWidth: 1,
    borderTopColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  formas: { flexDirection: "row", gap: espaco.sm },
  forma: {
    flex: 1,
    paddingVertical: espaco.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.sm,
  },
  formaAtiva: { backgroundColor: cores.sucessoFundo, borderColor: cores.acento },
  formaTexto: { fontSize: fonte.pequeno, color: cores.textoFraco },
  formaTextoAtivo: { color: cores.acento, fontWeight: peso.forte },

  totalLinha: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  totalRotulo: { fontSize: fonte.corpo, color: cores.textoFraco },
  totalValor: { fontSize: 30, fontWeight: peso.pesado, color: cores.texto },

  acoes: { flexDirection: "row", gap: espaco.sm },
  acaoPrincipal: { flex: 1 },
});
