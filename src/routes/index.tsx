import { createFileRoute, Link } from "@tanstack/react-router";
import { Kanban, Clock, BarChart3, Star, Instagram, Mail, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PrimeHouse CRM | O CRM que o corretor merece" },
      {
        name: "description",
        content:
          "PrimeHouse CRM: pensado por corretores, para corretores. Gerencie leads, follow-ups e vendas em um só lugar.",
      },
      { property: "og:title", content: "PrimeHouse CRM | O CRM que o corretor merece" },
      {
        property: "og:description",
        content:
          "Pensado por corretores, para corretores. Gerencie leads, follow-ups e vendas em um só lugar.",
      },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: LandingPage,
});

const WHATSAPP_SUPORTE = "5511988955329";

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <style>{`
        @keyframes scanY {
          0%, 100% { transform: translateY(0); opacity: 0.9; }
          50% { transform: translateY(260px); opacity: 1; }
        }
        @keyframes goldPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(201, 168, 76, 0.55), 0 0 24px rgba(201, 168, 76, 0.25); }
          50% { box-shadow: 0 0 0 12px rgba(201, 168, 76, 0), 0 0 36px rgba(201, 168, 76, 0.45); }
        }
        .scan-line { animation: scanY 3.2s ease-in-out infinite; }
        .gold-pulse { animation: goldPulse 2.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .scan-line, .gold-pulse { animation: none; }
        }
      `}</style>

      {/* Header */}
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="font-display text-xl font-bold text-gold">PrimeHouse CRM</div>
          <Link
            to="/login"
            className="rounded-md border border-gold/40 px-4 py-2 text-sm font-medium text-gold transition-colors hover:bg-gold/10"
          >
            Entrar
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:py-24 lg:grid-cols-2 lg:items-center">
        <div>
          <h1 className="font-display text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
            O CRM que o <span className="text-gold">corretor merece</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground md:text-xl">
            Pensado por corretores, para corretores. Gerencie leads, follow-ups e vendas em um só
            lugar — simples, rápido e eficiente.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/login"
              className="gold-pulse inline-flex items-center justify-center rounded-md bg-gold px-6 py-3 font-semibold text-[var(--gold-foreground)] transition-transform hover:scale-[1.02]"
            >
              Acessar o CRM
            </Link>
            <a
              href={`https://wa.me/${WHATSAPP_SUPORTE}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-6 py-3 font-medium text-foreground transition-colors hover:bg-accent"
            >
              <MessageCircle className="h-4 w-4" />
              Falar com suporte
            </a>
          </div>
        </div>

        {/* Blueprint animation */}
        <div className="relative mx-auto w-full max-w-md">
          <div className="relative overflow-hidden rounded-xl border border-gold/30 bg-card p-4 shadow-[var(--shadow-gold)]">
            <svg
              viewBox="0 0 400 320"
              className="h-auto w-full"
              role="img"
              aria-label="Blueprint de apartamento"
            >
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path
                    d="M 20 0 L 0 0 0 20"
                    fill="none"
                    stroke="rgba(201,168,76,0.12)"
                    strokeWidth="0.5"
                  />
                </pattern>
              </defs>
              <rect width="400" height="320" fill="url(#grid)" />
              {/* Outer walls */}
              <rect
                x="20"
                y="20"
                width="360"
                height="280"
                fill="none"
                stroke="#c9a84c"
                strokeWidth="2.5"
              />
              {/* Inner walls */}
              <line x1="180" y1="20" x2="180" y2="160" stroke="#c9a84c" strokeWidth="1.5" />
              <line x1="20" y1="160" x2="260" y2="160" stroke="#c9a84c" strokeWidth="1.5" />
              <line x1="260" y1="160" x2="260" y2="300" stroke="#c9a84c" strokeWidth="1.5" />
              <line x1="180" y1="80" x2="380" y2="80" stroke="#c9a84c" strokeWidth="1.5" />
              {/* Doors (arcs) */}
              <path d="M 110 160 A 30 30 0 0 1 140 130" fill="none" stroke="#c9a84c" strokeWidth="1" />
              <path d="M 260 230 A 25 25 0 0 1 285 255" fill="none" stroke="#c9a84c" strokeWidth="1" />
              {/* Labels */}
              <text x="80" y="95" fill="#c9a84c" fontSize="10" fontFamily="monospace">SALA</text>
              <text x="240" y="55" fill="#c9a84c" fontSize="10" fontFamily="monospace">QUARTO 1</text>
              <text x="240" y="125" fill="#c9a84c" fontSize="10" fontFamily="monospace">SUÍTE</text>
              <text x="80" y="240" fill="#c9a84c" fontSize="10" fontFamily="monospace">COZINHA</text>
              <text x="300" y="240" fill="#c9a84c" fontSize="10" fontFamily="monospace">VARANDA</text>
              {/* Furniture hints */}
              <rect x="40" y="180" width="60" height="30" fill="none" stroke="#c9a84c" strokeWidth="0.8" opacity="0.6" />
              <circle cx="220" cy="220" r="14" fill="none" stroke="#c9a84c" strokeWidth="0.8" opacity="0.6" />
              <rect x="200" y="35" width="50" height="30" fill="none" stroke="#c9a84c" strokeWidth="0.8" opacity="0.6" />
            </svg>
            {/* Scan line overlay */}
            <div className="pointer-events-none absolute inset-x-4 top-4 h-[2px]">
              <div
                className="scan-line h-[2px] w-full"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, #c9a84c, transparent)",
                  boxShadow: "0 0 12px #c9a84c, 0 0 24px rgba(201,168,76,0.6)",
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-center font-display text-3xl font-bold md:text-4xl">
            Feito para <span className="text-gold">corretores</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
            Tudo o que você precisa para vender mais, sem complicação.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Kanban,
                title: "Leads Organizados",
                desc: "Kanban com 6 etapas, do contato ao contrato.",
              },
              {
                icon: Clock,
                title: "Follow-up Automático",
                desc: "Cadências e mensagens automáticas.",
              },
              {
                icon: BarChart3,
                title: "Dashboard em Tempo Real",
                desc: "Metas e ranking ao vivo.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-gold/40"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gold/10 text-gold">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center font-display text-3xl font-bold md:text-4xl">
          Quem usa, <span className="text-gold">recomenda</span>
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            {
              name: "Juliana Moreno",
              role: "Corretora Sênior",
              text: "O PrimeHouse CRM revolucionou meu dia a dia. Consigo visualizar todos os leads e nunca mais perder um follow-up.",
            },
            {
              name: "Rafael Alquimista",
              role: "Corretor de Alto Padrão",
              text: "Cadência automática e Kanban claro. Fechei 3 vendas a mais no primeiro mês usando.",
            },
            {
              name: "Camila Kairos",
              role: "Gestora Comercial",
              text: "Acompanho a equipe em tempo real. Ranking, metas e fila — tudo num lugar só.",
            },
          ].map((t) => (
            <article
              key={t.name}
              className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]"
            >
              <div className="mb-1 flex gap-1 text-gold" aria-label="5 estrelas">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">"{t.text}"</p>
              <div className="mt-5 flex items-center gap-3 border-t border-border/60 pt-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/15 font-semibold text-gold">
                  {t.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60 bg-card/30">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            Pronto para vender mais?
          </h2>
          <p className="mt-3 text-muted-foreground">Acesse o painel agora mesmo.</p>
          <Link
            to="/login"
            className="gold-pulse mt-8 inline-flex items-center justify-center rounded-md bg-gold px-8 py-3 font-semibold text-[var(--gold-foreground)]"
          >
            Acessar o CRM
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-background">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:grid-cols-3">
          <div>
            <div className="font-display text-lg font-bold text-gold">PrimeHouse CRM</div>
            <p className="mt-2 text-sm text-muted-foreground">
              O CRM que o corretor merece.
            </p>
          </div>
          <div className="space-y-2 text-sm">
            <div className="font-semibold">Contato</div>
            <a
              href="mailto:suporte@imobiliariaprimehouse.com.br"
              className="flex items-center gap-2 text-muted-foreground hover:text-gold"
            >
              <Mail className="h-4 w-4" /> suporte@imobiliariaprimehouse.com.br
            </a>
            <a
              href="https://wa.me/5511988955329"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-muted-foreground hover:text-gold"
            >
              <MessageCircle className="h-4 w-4" /> Suporte: (11) 98895-5329
            </a>
            <a
              href="https://wa.me/5511993917744"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-muted-foreground hover:text-gold"
            >
              <MessageCircle className="h-4 w-4" /> Comercial: (11) 99391-7744
            </a>
          </div>
          <div className="space-y-2 text-sm">
            <div className="font-semibold">Redes</div>
            <a
              href="https://www.instagram.com/prime_house_consultoria/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-muted-foreground hover:text-gold"
            >
              <Instagram className="h-4 w-4" /> @prime_house_consultoria
            </a>
          </div>
        </div>
        <div className="border-t border-border/60 py-5 text-center text-xs text-muted-foreground">
          © 2026 PrimeHouse CRM. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
