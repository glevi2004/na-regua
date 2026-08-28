import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Cabecalho from "@/components/Cabecalho";
import { produtos } from "@/lib/mock-data";
import { nivelEstoque } from "@/lib/produtos-api";
import { produtoPorEan } from "@/lib/vendas-api";
import { formatMoney } from "@/lib/format";
import type { Produto } from "@/lib/types";
import Botao from "@/components/ui/Botao";
import { Etiqueta, Vazio } from "@/components/ui/Cartao";
import LeitorCodigo from "@/components/LeitorCodigo";
import { cores, espaco, fonte, peso, raio } from "@/theme/tokens";

export default function Catalogo() {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [lendo, setLendo] = useState(false);
  const [encontrado, setEncontrado] = useState<Produto | null>(null);

  const categorias = useMemo(
    () => [...new Set(produtos.map((p) => p.categoria))].sort(),
    [],
  );

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return produtos.filter((p) => {
      if (categoria && p.categoria !== categoria) return false;
      if (!termo) return true;
      return (
        p.descricao.toLowerCase().includes(termo) ||
        p.codigo.toLowerCase().includes(termo) ||
        p.ean.includes(termo.replace(/\D/g, ""))
      );
    });
  }, [busca, categoria]);

  function aoLerCodigo(codigo: string) {
    const produto = produtoPorEan(codigo);
    setEncontrado(produto);
    setLendo(false);

    /* Achou: joga na busca para a pessoa ver o item na lista tambem. */
    if (produto) setBusca(produto.descricao);
  }

  return (
    <SafeAreaView style={estilos.tela} edges={["top"]}>
      <Cabecalho titulo="Catalogo" subtitulo={`${produtos.length} produtos`} />

      <View style={estilos.barra}>
        <TextInput
          style={estilos.busca}
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar produto"
          placeholderTextColor={cores.textoFraco}
          accessibilityLabel="Buscar produto"
        />
        <Botao onPress={() => setLendo(true)}>Bipar</Botao>
      </View>

      {/* Categorias em faixa horizontal: no celular nao cabe empilhado. */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        style={estilos.categorias}
        contentContainerStyle={estilos.categoriasConteudo}
        data={["", ...categorias]}
        keyExtractor={(c) => c || "todas"}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setCategoria(item)}
            style={[estilos.chip, categoria === item && estilos.chipAtivo]}
          >
            <Text
              style={[
                estilos.chipTexto,
                categoria === item && estilos.chipTextoAtivo,
              ]}
            >
              {item || "Todas"}
            </Text>
          </Pressable>
        )}
      />

      {encontrado === null && busca.trim() && lista.length === 0 ? (
        <Vazio
          titulo="Produto nao encontrado"
          descricao="Nenhum item com esse termo ou codigo."
          acao={
            <Botao variante="secundario" onPress={() => setBusca("")}>
              Limpar busca
            </Botao>
          }
        />
      ) : (
        <FlatList
          data={lista}
          keyExtractor={(p) => p.id}
          contentContainerStyle={estilos.lista}
          renderItem={({ item }) => <LinhaProduto produto={item} />}
          ListEmptyComponent={
            <Vazio
              titulo="Nada por aqui"
              descricao="Nenhum produto nesta categoria."
            />
          }
        />
      )}

      <LeitorCodigo
        aberto={lendo}
        onLer={aoLerCodigo}
        onFechar={() => setLendo(false)}
      />
    </SafeAreaView>
  );
}

function LinhaProduto({ produto }: { produto: Produto }) {
  const nivel = nivelEstoque(produto);

  return (
    <View style={estilos.produto}>
      <View style={estilos.produtoInfo}>
        <Text style={estilos.produtoCodigo}>{produto.codigo}</Text>
        <Text style={estilos.produtoNome} numberOfLines={2}>
          {produto.descricao}
        </Text>
        <Text style={estilos.produtoCategoria}>{produto.categoria}</Text>
      </View>

      <View style={estilos.produtoNumeros}>
        <Text style={estilos.produtoPreco}>{formatMoney(produto.precoVenda)}</Text>
        {nivel === "esgotado" ? (
          <Etiqueta tom="erro">Esgotado</Etiqueta>
        ) : nivel === "baixo" ? (
          <Etiqueta tom="atencao">{produto.estoque} un</Etiqueta>
        ) : (
          <Etiqueta tom="sucesso">{produto.estoque} un</Etiqueta>
        )}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },

  cabecalho: { paddingHorizontal: espaco.lg, paddingTop: espaco.md, gap: 2 },
  titulo: { fontSize: fonte.display, fontWeight: peso.pesado, color: cores.texto },
  subtitulo: { fontSize: fonte.pequeno, color: cores.textoFraco },

  barra: {
    flexDirection: "row",
    gap: espaco.sm,
    padding: espaco.lg,
    alignItems: "center",
  },
  busca: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: espaco.lg,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.pill,
    backgroundColor: cores.campo,
    color: cores.texto,
    fontSize: fonte.corpo,
  },

  categorias: { flexGrow: 0 },
  categoriasConteudo: { paddingHorizontal: espaco.lg, gap: espaco.sm },
  chip: {
    paddingHorizontal: espaco.lg,
    paddingVertical: espaco.sm,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.pill,
  },
  chipAtivo: { backgroundColor: cores.sucessoFundo, borderColor: cores.acento },
  chipTexto: { fontSize: fonte.pequeno, color: cores.textoFraco },
  chipTextoAtivo: { color: cores.acento, fontWeight: peso.forte },

  lista: { padding: espaco.lg, gap: espaco.sm },
  produto: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaco.md,
    padding: espaco.lg,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.md,
    backgroundColor: cores.superficie,
  },
  produtoInfo: { flex: 1, gap: 2 },
  produtoCodigo: {
    fontSize: fonte.micro,
    fontWeight: peso.forte,
    color: cores.acento,
  },
  produtoNome: { fontSize: fonte.corpo, fontWeight: peso.forte, color: cores.texto },
  produtoCategoria: { fontSize: fonte.micro, color: cores.textoFraco },
  produtoNumeros: { alignItems: "flex-end", gap: espaco.sm },
  produtoPreco: { fontSize: fonte.medio, fontWeight: peso.forte, color: cores.texto },
});
