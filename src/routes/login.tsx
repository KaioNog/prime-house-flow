import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { refresh, enterPreview } = useUser();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  function handlePreviewAccess(role: "gestor" | "corretor") {
    enterPreview(role);
    toast.success(`Visualizando como ${role === "gestor" ? "gestor" : "corretor"}.`);
    navigate({ to: "/home" });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !senha) {
      toast.error("Preencha email e senha.");
      return;
    }
    if (!supabaseConfigured) {
      toast.error("Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      toast.error("Não foi possível entrar. Verifique suas credenciais.");
      setLoading(false);
      return;
    }
    await refresh();
    toast.success("Bem-vindo!");
    navigate({ to: "/home" });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(circle at 20% 10%, rgba(201,168,76,0.18), transparent 40%), radial-gradient(circle at 80% 90%, rgba(201,168,76,0.12), transparent 40%)",
        }}
      />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-display text-5xl font-bold text-gold tracking-tight">Prime House</h1>
          <p className="mt-2 text-sm uppercase tracking-[0.3em] text-muted-foreground">
            CRM Imobiliário
          </p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-border bg-card p-8 shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full rounded-lg border border-border bg-input/40 px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="voce@primehouse.com.br"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Senha</label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-lg border border-border bg-input/40 px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_0_24px_rgba(201,168,76,0.25)] transition hover:bg-[oklch(0.78_0.14_85)] disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Entrar
            </button>
            <button
              type="button"
              onClick={handlePreviewAccess}
              className="inline-flex w-full items-center justify-center rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition hover:bg-accent"
            >
              Ver dashboard agora
            </button>
          </div>
        </form>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Acesso restrito. Solicite credenciais ao gestor.
        </p>
      </div>
    </div>
  );
}

// Avoid unused import warning
void redirect;
