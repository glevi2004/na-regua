import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "expo-router";
import type { DrawerActionType } from "@react-navigation/native";
import { cores, espaco, fonte, peso } from "@/theme/tokens";

/**
 * Cabecalho das telas do app.
 *
 * Traz o botao que abre a gaveta — sem ele, so o gesto de deslizar
 * abriria o menu, e gesto sozinho e descoberta que muita gente nao faz.
 */
export default function Cabecalho({
  titulo,
  subtitulo,
  acao,
}: {
  titulo: string;
  subtitulo?: string;
  acao?: ReactNode;
}) {
  const navigation = useNavigation();

  function abrirMenu() {
    navigation.dispatch({ type: "OPEN_DRAWER" } as unknown as DrawerActionType);
  }

  return (
    <View style={estilos.cabecalho}>
      <Pressable
        onPress={abrirMenu}
        style={estilos.botaoMenu}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Abrir menu"
      >
        {/* Tres barras desenhadas com View — sem dependencia de icone. */}
        <View style={estilos.barra} />
        <View style={estilos.barra} />
        <View style={estilos.barra} />
      </Pressable>

      <View style={estilos.textos}>
        <Text style={estilos.titulo} numberOfLines={1}>
          {titulo}
        </Text>
        {subtitulo ? (
          <Text style={estilos.subtitulo} numberOfLines={1}>
            {subtitulo}
          </Text>
        ) : null}
      </View>

      {acao}
    </View>
  );
}

const estilos = StyleSheet.create({
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaco.md,
    paddingHorizontal: espaco.lg,
    paddingVertical: espaco.md,
  },
  botaoMenu: {
    width: 40,
    height: 40,
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 8,
  },
  barra: {
    height: 2,
    borderRadius: 1,
    backgroundColor: cores.texto,
  },
  textos: { flex: 1, gap: 1 },
  titulo: { fontSize: fonte.titulo, fontWeight: peso.pesado, color: cores.texto },
  subtitulo: { fontSize: fonte.micro, color: cores.textoFraco },
});
