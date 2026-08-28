import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import type { ReactNode } from "react";
import { cores, espaco, fonte, peso, raio } from "@/theme/tokens";

type Variante = "primario" | "secundario" | "fantasma" | "perigo";

/**
 * Botao do app.
 *
 * A altura minima e 48: e o alvo de toque confortavel recomendado, e o
 * uso aqui e em pe, no balcao, muitas vezes com uma mao so.
 */
export default function Botao({
  children,
  onPress,
  variante = "primario",
  carregando = false,
  desabilitado = false,
  largura = false,
}: {
  children: ReactNode;
  onPress?: () => void;
  variante?: Variante;
  carregando?: boolean;
  desabilitado?: boolean;
  /** Ocupa toda a largura disponivel. */
  largura?: boolean;
}) {
  const inativo = desabilitado || carregando;

  return (
    <Pressable
      onPress={onPress}
      disabled={inativo}
      accessibilityRole="button"
      style={({ pressed }) => [
        estilos.base,
        estilos[variante],
        largura && estilos.largura,
        pressed && !inativo && estilos.pressionado,
        inativo && estilos.inativo,
      ]}
    >
      {carregando ? (
        <ActivityIndicator
          size="small"
          color={variante === "primario" ? cores.textoSobreAcento : cores.acento}
        />
      ) : null}
      <Text style={[estilos.texto, estilos[`texto_${variante}`]]}>{children}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: espaco.sm,
    minHeight: 48,
    paddingHorizontal: espaco.xl,
    borderRadius: raio.pill,
    borderWidth: 1,
    borderColor: "transparent",
  },
  largura: { alignSelf: "stretch" },
  pressionado: { opacity: 0.85 },
  inativo: { opacity: 0.45 },

  primario: { backgroundColor: cores.acento },
  secundario: { backgroundColor: cores.campo, borderColor: cores.borda },
  fantasma: { backgroundColor: "transparent" },
  perigo: { backgroundColor: cores.erroFundo, borderColor: cores.erro },

  texto: {
    fontSize: fonte.corpo,
    fontWeight: peso.forte,
  },
  texto_primario: { color: cores.textoSobreAcento },
  texto_secundario: { color: cores.texto },
  texto_fantasma: { color: cores.textoFraco },
  texto_perigo: { color: cores.erro },
});
