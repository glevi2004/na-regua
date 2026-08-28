import { Tabs } from "expo-router";
import Icone, { type NomeIcone } from "@/components/ui/Icone";
import { cores, fonte, peso } from "@/theme/tokens";

/**
 * Abas do app.
 *
 * Quatro abas, nao dez: o mobile e o balcao. Financeiro, relatorio e
 * configuracao ficam no web, onde ha tela grande e tempo para conferir.
 */
export default function LayoutApp() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: cores.acento,
        tabBarInactiveTintColor: cores.textoFraco,
        tabBarStyle: {
          backgroundColor: cores.superficie,
          borderTopColor: cores.borda,
          /* Altura folgada: alvo de toque confortavel em pe. */
          height: 62,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: fonte.micro,
          fontWeight: peso.medio,
        },
        sceneStyle: { backgroundColor: cores.fundo },
      }}
    >
      {(
        [
          ["catalogo", "Catalogo"],
          ["pdv", "Venda"],
          ["clientes", "Clientes"],
          ["agenda", "Agenda"],
        ] as [NomeIcone, string][]
      ).map(([nome, titulo]) => (
        <Tabs.Screen
          key={nome}
          name={nome}
          options={{
            title: titulo,
            tabBarIcon: ({ focused }) => <Icone nome={nome} ativo={focused} />,
          }}
        />
      ))}
    </Tabs>
  );
}
