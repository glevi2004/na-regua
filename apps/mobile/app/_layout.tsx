import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { cores } from "@/theme/tokens";

/**
 * Layout raiz.
 *
 * `headerShown: false` porque cada tela desenha o proprio cabecalho —
 * o header nativo do Stack nao acompanha a identidade do app.
 */
export default function LayoutRaiz() {
  return (
    <SafeAreaProvider>
      {/* Texto claro: o app inteiro e tema escuro. */}
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: cores.fundo },
          animation: "slide_from_right",
        }}
      />
    </SafeAreaProvider>
  );
}
