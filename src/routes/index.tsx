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
        @keyframes goldPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(201, 168, 76, 0.55), 0 0 24px rgba(201, 168, 76, 0.25); }
          50% { box-shadow: 0 0 0 12px rgba(201, 168, 76, 0), 0 0 36px rgba(201, 168, 76, 0.45); }
        }
        .gold-pulse { animation: goldPulse 2.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .gold-pulse { animation: none; }
          .blueprint-svg * { animation: none !important; }
        }
        .skip-link {
          position: absolute; left: -9999px; top: 0; z-index: 100;
          background: var(--color-gold); color: var(--color-gold-foreground);
          padding: 0.75rem 1rem; border-radius: 0 0 0.5rem 0;
          font-weight: 600;
        }
        .skip-link:focus { left: 0; }
      `}</style>

      <a href="#main-content" className="skip-link">Pular para o conteúdo</a>

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

      <main id="main-content">
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:py-24 lg:grid-cols-2 lg:items-center">
        <div>
          <h1 className="font-display text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
            O CRM que o <span className="text-gold">corretor merece</span>
          </h1>
          <p className="mt-6 text-lg text-foreground/80 md:text-xl">
            Pensado por corretores, para corretores. Gerencie leads, follow-ups e vendas em um só
            lugar — simples, rápido e eficiente.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/login"
              className="gold-pulse inline-flex min-h-11 items-center justify-center rounded-md bg-gold px-6 py-3 font-semibold text-[var(--gold-foreground)] transition-transform hover:scale-[1.02]"
              aria-label="Acessar o painel do PrimeHouse CRM"
            >
              Acessar o CRM
            </Link>
            <a
              href={`https://wa.me/${WHATSAPP_SUPORTE}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-card px-6 py-3 font-medium text-foreground transition-colors hover:bg-accent"
              aria-label="Falar com o suporte pelo WhatsApp (abre em nova aba)"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Falar com suporte
            </a>
          </div>
        </div>

        {/* Blueprint animation: scanner sobe revelando detalhes da planta */}
        <div className="relative mx-auto w-full max-w-md">
          <div className="relative overflow-hidden rounded-xl border border-gold/30 bg-card p-4 shadow-[var(--shadow-gold)]">
            <svg
              viewBox="0 0 400 320"
              className="blueprint-svg h-auto w-full"
              role="img"
              aria-label="Planta animada de um apartamento sendo revelada por um scanner"
            >
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(201,168,76,0.12)" strokeWidth="0.5" />
                </pattern>
                <filter id="scanGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                {/* Mask: white = visible. Sweeps from bottom to top revealing details. */}
                <mask id="revealMask" maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="320">
                  <rect x="0" y="0" width="400" height="320" fill="black" />
                  <rect x="0" y="320" width="400" height="0" fill="white">
                    <animate attributeName="y" values="320;0;0;320" keyTimes="0;0.45;0.55;1" dur="5s" repeatCount="indefinite" />
                    <animate attributeName="height" values="0;320;320;0" keyTimes="0;0.45;0.55;1" dur="5s" repeatCount="indefinite" />
                  </rect>
                </mask>
              </defs>

              <rect width="400" height="320" fill="url(#grid)" />

              {/* Base layer: walls always faintly visible */}
              <g stroke="#c9a84c" fill="none" opacity="0.45">
                <rect x="20" y="20" width="360" height="280" strokeWidth="2.5" />
                <line x1="180" y1="20" x2="180" y2="160" strokeWidth="1.5" />
                <line x1="20" y1="160" x2="260" y2="160" strokeWidth="1.5" />
                <line x1="260" y1="160" x2="260" y2="300" strokeWidth="1.5" />
                <line x1="180" y1="80" x2="380" y2="80" strokeWidth="1.5" />
              </g>

              {/* Detail layer: revealed by scanner */}
              <g mask="url(#revealMask)">
                <g stroke="#e8c97a" fill="none">
                  <rect x="20" y="20" width="360" height="280" strokeWidth="2.5" />
                  <line x1="180" y1="20" x2="180" y2="160" strokeWidth="1.5" />
                  <line x1="20" y1="160" x2="260" y2="160" strokeWidth="1.5" />
                  <line x1="260" y1="160" x2="260" y2="300" strokeWidth="1.5" />
                  <line x1="180" y1="80" x2="380" y2="80" strokeWidth="1.5" />
                </g>
                <path d="M 110 160 A 30 30 0 0 1 140 130" fill="none" stroke="#e8c97a" strokeWidth="1" />
                <path d="M 260 230 A 25 25 0 0 1 285 255" fill="none" stroke="#e8c97a" strokeWidth="1" />
                <g fill="#e8c97a" fontSize="10" fontFamily="ui-monospace, monospace">
                  <text x="80" y="95">SALA</text>
                  <text x="225" y="55">QUARTO 1</text>
                  <text x="240" y="125">SUÍTE</text>
                  <text x="60" y="240">COZINHA</text>
                  <text x="295" y="240">VARANDA</text>
                </g>
                {/* Furniture details */}
                <g stroke="#c9a84c" fill="none" strokeWidth="0.9">
                  {/* Sofá */}
                  <rect x="40" y="105" width="70" height="22" rx="3" />
                  <line x1="40" y1="115" x2="110" y2="115" />
                  {/* Mesa redonda */}
                  <circle cx="140" cy="135" r="12" />
                  <circle cx="140" cy="118" r="3" />
                  <circle cx="140" cy="152" r="3" />
                  <circle cx="123" cy="135" r="3" />
                  <circle cx="157" cy="135" r="3" />
                  {/* Cama casal (suíte) */}
                  <rect x="295" y="95" width="70" height="50" rx="2" />
                  <rect x="305" y="100" width="22" height="14" />
                  <rect x="333" y="100" width="22" height="14" />
                  {/* Cama solteiro (quarto 1) */}
                  <rect x="200" y="30" width="40" height="40" rx="2" />
                  <rect x="206" y="34" width="28" height="10" />
                  {/* Cozinha: bancada + fogão */}
                  <rect x="30" y="175" width="90" height="14" />
                  <rect x="55" y="178" width="14" height="8" />
                  <circle cx="59" cy="182" r="1.5" />
                  <circle cx="65" cy="182" r="1.5" />
                  {/* Mesa jantar */}
                  <rect x="155" y="195" width="60" height="30" rx="2" />
                  <line x1="155" y1="210" x2="215" y2="210" />
                  {/* Varanda: poltrona + planta */}
                  <rect x="285" y="200" width="30" height="22" rx="3" />
                  <circle cx="345" cy="265" r="10" />
                  <path d="M 345 255 L 345 275 M 338 260 L 352 270 M 352 260 L 338 270" />
                </g>
              </g>

              {/* Scan beam (bottom -> top), glowing */}
              <g filter="url(#scanGlow)" opacity="0.95">
                <line x1="20" y1="320" x2="380" y2="320" stroke="#f0d78c" strokeWidth="2">
                  <animate attributeName="y1" values="320;0;0;320" keyTimes="0;0.45;0.55;1" dur="5s" repeatCount="indefinite" />
                  <animate attributeName="y2" values="320;0;0;320" keyTimes="0;0.45;0.55;1" dur="5s" repeatCount="indefinite" />
                </line>
                <line x1="20" y1="320" x2="380" y2="320" stroke="#fff6d4" strokeWidth="0.6">
                  <animate attributeName="y1" values="320;0;0;320" keyTimes="0;0.45;0.55;1" dur="5s" repeatCount="indefinite" />
                  <animate attributeName="y2" values="320;0;0;320" keyTimes="0;0.45;0.55;1" dur="5s" repeatCount="indefinite" />
                </line>
              </g>
            </svg>
            <span className="sr-only">
              Animação decorativa: planta de apartamento sendo revelada por um scanner que sobe da base ao topo, exibindo móveis e ambientes.
            </span>
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
