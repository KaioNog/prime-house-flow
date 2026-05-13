import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, TrendingUp, DollarSign, CheckSquare, Trophy, Target } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/lib/supabase";
import { formatBRL, formatDatePtBr, startOfMonthISO, endOfMonthISO, displayFirstName } from "@/lib/format";
import { mapUserRowToAppUser } from "@/lib/userRow";
import { corretorOwnedLeadsOr } from "@/lib/leadScope";
import { cn } from "@/lib/utils";
import type { AppUser } from "@/types/db";

export const Route = createFileRoute("/_app/home")({
  component: HomePage,
});

interface Stats {
  leadsAtivos: number;
  vendasMes: number;
  comissaoMes: number;
  tarefasPendentes: number;
}

const PREVIEW_RANKING: Array<AppUser & { vendas: number }> = [
  {
    id: "preview-gestor",
    nome: "Kairos",
    email: "preview@primehouse.com.br",
    role: "gestor",
    pontuacao: 1840,
    ativo: true,
    posicao_fila: 1,
    vendas: 7,
  },
  {
    id: "preview-corretor-1",
    nome: "Moreno",
    email: "marina@primehouse.com.br",
    role: "corretor",
    pontuacao: 1510,
    ativo: true,
    posicao_fila: 2,
    vendas: 5,
  },
  {
    id: "preview-corretor-2",
    nome: "Alquimista",
    email: "rafael@primehouse.com.br",
    role: "corretor",
    pontuacao: 1220,
    ativo: true,
    posicao_fila: 3,
    vendas: 4,
  },
];

function HomePage() {
  const { user } = useUser();
  const [stats, setStats] = useState<Stats | null>(null);
  const [ranking, setRanking] = useState<Array<AppUser & { vendas: number }> | null>(null);
  const [meta, setMeta] = useState<{ atual: number; alvo: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.id.startsWith("preview-")) {
      if (user.role === "corretor") {
        setStats({ leadsAtivos: 6, vendasMes: 5, comissaoMes: 18400, tarefasPendentes: 3 });
      } else {
        setStats({ leadsAtivos: 18, vendasMes: 7, comissaoMes: 42600, tarefasPendentes: 9 });
      }
      setRanking(PREVIEW_RANKING);
      setMeta({ atual: 16, alvo: 30 });
      return;
    }

    const inicio = startOfMonthISO();
    const fim = endOfMonthISO();

    async function loadStats() {
      const isCorretor = user!.role === "corretor";
      const leadOr = isCorretor ? corretorOwnedLeadsOr(user!.id, user!.nome) : null;

      const leadsAtivosQ = leadOr
        ? supabase
            .from("leads")
            .select("id", { count: "exact", head: true })
            .not("status", "in", "(canetado,perdido)")
            .or(leadOr)
        : supabase
            .from("leads")
            .select("id", { count: "exact", head: true })
            .not("status", "in", "(canetado,perdido)")
            .eq("corretor_id", user!.id);

      const vendasMesQ = leadOr
        ? supabase
            .from("leads")
            .select("id", { count: "exact", head: true })
            .eq("status", "canetado")
            .gte("updated_at", inicio)
            .lt("updated_at", fim)
            .or(leadOr)
        : supabase
            .from("leads")
            .select("id", { count: "exact", head: true })
            .eq("corretor_id", user!.id)
            .eq("status", "canetado")
            .gte("updated_at", inicio)
            .lt("updated_at", fim);

      const [leadsAtivosRes, vendasRes, tarefasRes, clientesRes] = await Promise.all([
        leadsAtivosQ,
        vendasMesQ,
        supabase
          .from("tarefas")
          .select("id", { count: "exact", head: true })
          .eq("corretor_id", user!.id)
          .eq("concluida", false),
        supabase
          .from("clientes")
          .select("comissao_corretor")
          .eq("corretor_id", user!.id)
          .gte("created_at", inicio)
          .lt("created_at", fim),
      ]);

      const comissaoMes = (clientesRes.data ?? []).reduce(
        (sum: number, r: { comissao_corretor: number | null }) => sum + (r.comissao_corretor ?? 0),
        0,
      );

      setStats({
        leadsAtivos: leadsAtivosRes.count ?? 0,
        vendasMes: vendasRes.count ?? 0,
        comissaoMes,
        tarefasPendentes: tarefasRes.count ?? 0,
      });
    }

    async function loadRanking() {
      const { data: users } = await supabase
        .from("users")
        .select("*")
        .eq("role", "corretor")
        .eq("ativo", true)
        .order("pontuacao", { ascending: false });
      if (!users) return;

      const { data: vendas } = await supabase
        .from("leads")
        .select("corretor_id")
        .eq("status", "canetado")
        .gte("updated_at", inicio)
        .lt("updated_at", fim);

      const counts = new Map<string, number>();
      (vendas ?? []).forEach((v: { corretor_id: string | null }) => {
        if (v.corretor_id) counts.set(v.corretor_id, (counts.get(v.corretor_id) ?? 0) + 1);
      });
      setRanking(
        (users ?? []).map((u) => {
          const row = mapUserRowToAppUser(u);
          return { ...row, vendas: counts.get(row.id) ?? 0 };
        }),
      );
    }

    async function loadMeta() {
      const { data: cfg } = await supabase
        .from("config")
        .select("valor")
        .eq("chave", "meta_mensal_vendas")
        .maybeSingle();
      const alvo = Number(cfg?.valor ?? 0) || 0;
      const { count } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("status", "canetado")
        .gte("updated_at", inicio)
        .lt("updated_at", fim);
      setMeta({ atual: count ?? 0, alvo });
    }

    loadStats();
    loadRanking();
    loadMeta();

    const ch = supabase
      .channel("home-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, loadRanking)
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => {
        loadStats();
        loadRanking();
        loadMeta();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  if (!user) return null;
  const today = formatDatePtBr(new Date());
  const pct = meta && meta.alvo > 0 ? Math.min(100, (meta.atual / meta.alvo) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground lg:text-4xl">
            Olá, <span className="text-gold">{displayFirstName(user)}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{today}</p>
        </div>
      </header>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Leads ativos" value={stats?.leadsAtivos} loading={!stats} />
        <StatCard
          icon={TrendingUp}
          label="Vendas no mês"
          value={stats?.vendasMes}
          loading={!stats}
          accent
        />
        <StatCard
          icon={DollarSign}
          label="Comissão do mês"
          value={stats ? formatBRL(stats.comissaoMes) : undefined}
          loading={!stats}
        />
        <StatCard
          icon={CheckSquare}
          label="Tarefas pendentes"
          value={stats?.tarefasPendentes}
          loading={!stats}
        />
      </section>

      {/* Meta da imobiliária */}
      <section className="rounded-xl border border-border bg-card p-6 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-gold">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">
              Meta da imobiliária
            </h2>
            <p className="text-xs text-muted-foreground">Vendas fechadas no mês</p>
          </div>
        </div>
        {meta == null ? (
          <div className="h-3 w-full animate-pulse rounded-full bg-muted" />
        ) : meta.alvo === 0 ? (
          <p className="text-sm text-muted-foreground">
            O gestor ainda não definiu a meta mensal em <span className="text-gold">/config</span>.
          </p>
        ) : (
          <>
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[oklch(0.78_0.14_85)] to-[oklch(0.65_0.13_75)] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{meta.atual}</span> vendas de{" "}
              <span className="font-semibold text-foreground">{meta.alvo}</span> na meta do mês
            </p>
          </>
        )}
      </section>

      {/* Ranking */}
      <section className="rounded-xl border border-border bg-card p-6 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-gold">
            <Trophy className="h-5 w-5" />
          </div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Ranking dos corretores
          </h2>
        </div>
        {!ranking ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : ranking.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum corretor ativo ainda.</p>
        ) : (
          <ol className="space-y-2">
            {ranking.map((c, idx) => {
              const isMe = c.id === user.id;
              const isFirst = idx === 0;
              const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}º`;
              return (
                <li
                  key={c.id}
                  className={cn(
                    "flex items-center gap-4 rounded-lg border px-4 py-3 transition",
                    isFirst ? "border-primary/40 bg-primary/10" : "border-border bg-background/40",
                    isMe && "ring-2 ring-primary/60",
                  )}
                >
                  <div className="w-10 text-center text-lg font-semibold text-foreground">
                    {medal}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">
                      {c.nome} {isMe && <span className="text-xs text-gold">(você)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{c.vendas} venda(s) no mês</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg font-semibold text-gold">{c.pontuacao}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      pontos
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  accent,
}: {
  icon: typeof Users;
  label: string;
  value: number | string | undefined;
  loading: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition hover:border-primary/40",
        accent && "border-primary/30",
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={cn("h-4 w-4", accent ? "text-gold" : "text-muted-foreground")} />
      </div>
      {loading ? (
        <div className="h-8 w-20 animate-pulse rounded bg-muted" />
      ) : (
        <p className="font-display text-3xl font-bold text-foreground">{value ?? 0}</p>
      )}
    </div>
  );
}
