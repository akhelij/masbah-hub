import type { Metadata } from "next";
import { Waves } from "lucide-react";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-brand lg:block">
        <div
          className="absolute inset-0 opacity-90"
          style={{ background: "linear-gradient(150deg,#1e40af 0%,#0d9488 78%)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2.5">
            <Waves className="h-6 w-6" />
            <span className="text-lg font-semibold tracking-tight">Masbah.ma</span>
          </div>
          <div className="max-w-md">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight">
              Le centre de commande de vos opérations.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-white/80">
              Prospection, CRM, messages personnalisés et contenu — tout au même endroit,
              pour transformer chaque piscine privée du Maroc en revenu récurrent.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/20 pt-6">
              {[
                ["CRM", "Pipeline complet"],
                ["IA", "Messages & contenu"],
                ["n8n", "Webhooks prêts"],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-sm font-semibold">{k}</p>
                  <p className="text-xs text-white/70">{v}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-white/60">© {new Date().getFullYear()} Masbah.ma</p>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Waves className="h-6 w-6 text-brand" />
            <span className="text-lg font-semibold tracking-tight">Masbah.ma</span>
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-ink">Bon retour 👋</h2>
          <p className="mt-1.5 text-sm text-muted">Connectez-vous pour accéder au hub.</p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
