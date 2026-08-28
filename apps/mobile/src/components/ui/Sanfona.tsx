import { useState, type ReactNode } from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { cores, espaco, fonte, peso, raio } from "@/theme/tokens";

/* LayoutAnimation precisa ser ligada explicitamente no Android antigo.
   Sem isto a sanfona abre sem transicao naquele sistema. */
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Secao retratil.
 *
 * O painel web mostra tudo de uma vez porque tem tela larga. No celular
 * isso vira rolagem infinita: a sanfona deixa a pessoa abrir so a parte
 * que interessa e manter o resto fora do caminho.
 *
 * O resumo no cabecalho (`resumo`) existe para nao ser preciso abrir a
 * secao so para saber se ha algo relevante dentro dela.
 */
export default function Sanfona({
  titulo,
  resumo,
  etiqueta,
  inicialAberta = false,
  children,
}: {
  titulo: string;
  /** Numero ou valor mostrado fechado — evita abrir so para conferir. */
  resumo?: string;
  etiqueta?: ReactNode;
  inicialAberta?: boolean;
  children: ReactNode;
}) {
  const [aberta, setAberta] = useState(inicialAberta);

  function alternar() {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        180,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity,
      ),
    );
    setAberta((v) => !v);
  }

  return (
    <View style={estilos.bloco}>
      <Pressable
        onPress={alternar}
        style={estilos.cabecalho}
        accessibilityRole="button"
        accessibilityState={{ expanded: aberta }}
        accessibilityLabel={titulo}
      >
        <View style={estilos.cabecalhoTexto}>
          <Text style={estilos.titulo}>{titulo}</Text>
          {resumo && !aberta ? (
            <Text style={estilos.resumo}>{resumo}</Text>
          ) : null}
        </View>

        {etiqueta}

        {/* Seta em texto: sem dependencia de icone, e a rotacao e clara. */}
        <Text style={[estilos.seta, aberta && estilos.setaAberta]}>⌄</Text>
      </Pressable>

      {aberta ? <View style={estilos.conteudo}>{children}</View> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  bloco: {
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.md,
    backgroundColor: cores.superficie,
    overflow: "hidden",
  },
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaco.md,
    padding: espaco.lg,
    /* Alvo de toque confortavel — a sanfona e tocada o tempo todo. */
    minHeight: 56,
  },
  cabecalhoTexto: { flex: 1, gap: 2 },
  titulo: { fontSize: fonte.corpo, fontWeight: peso.forte, color: cores.texto },
  resumo: { fontSize: fonte.micro, color: cores.textoFraco },
  seta: {
    fontSize: 18,
    color: cores.textoFraco,
    /* Fechada aponta para baixo; aberta gira para cima. */
    transform: [{ rotate: "0deg" }],
  },
  setaAberta: { transform: [{ rotate: "180deg" }], color: cores.acento },
  conteudo: {
    padding: espaco.lg,
    paddingTop: 0,
    gap: espaco.md,
  },
});
