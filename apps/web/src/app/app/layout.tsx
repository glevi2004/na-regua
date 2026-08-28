import AppShell from "@/components/app/AppShell";
import ModuleGuard from "@/components/billing/ModuleGuard";
import { SubscriptionProvider } from "@/components/billing/SubscriptionProvider";

export default function PainelLayout({ children }: LayoutProps<"/app">) {
  return (
    /* O status da assinatura envolve todo o painel: o shell usa para o banner
       e os cadeados, e o ModuleGuard para bloquear as rotas restritas. */
    <SubscriptionProvider>
      <AppShell>
        <ModuleGuard>{children}</ModuleGuard>
      </AppShell>
    </SubscriptionProvider>
  );
}
