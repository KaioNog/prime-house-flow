import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import {
  Plus,
  Filter,
  X,
  MessageCircle,
  Calendar,
  Loader2,
  Download,
  Hash,
  CheckCircle2,
  Circle,
  Trash2,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import { supabase, N8N_WEBHOOK_URL } from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { formatShort, formatWhatsapp, formatBRL, displayFirstName } from "@/lib/format";
import { mapUserRowToAppUser } from "@/lib/userRow";
import { corretorOwnedLeadsOr, leadBelongsToCorretor } from "@/lib/leadScope";
import { cn } from "@/lib/utils";
import {
  getPreviewEmpreendimentos,
  getPreviewLeads,
  getPreviewTarefas,
  isPreviewId,
  newPreviewId,
  savePreviewLeads,
  savePreviewTarefas,
} from "@/lib/previewStore";
import type { Lead, AppUser, Empreendimento, Tarefa } from "@/types/db";
import { ImportLeadsModal } from "@/components/ImportLeadsModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_app/crm")({
  component: CRMPage,
});

const COLUMNS: { key: string; label: string; tone: string }[] = [
  { key: "novo", label: "Novo", tone: "border-sky-500/40" },
  { key: "em_negociacao", label: "Em Negociação", tone: "border-yellow-500/40" },
  { key: "documentacao_ok", label: "Documentação OK", tone: "border-blue-500/40" },
  { key: "agendado", label: "Agendado", tone: "border-orange-500/40" },
  { key: "canetado", label: "Canetado", tone: "border-emerald-500/40" },
  { key: "perdido", label: "Perdido", tone: "border-rose-500/40" },
];

const ORIGEM_OPTIONS: { value: string; label: string }[] = [
  { value: "meta_ads", label: "Meta Ads" },
  { value: "site", label: "Site" },
  { value: "indicacao", label: "Indicação" },
  { value: "panfleto", label: "Panfleto" },
  { value: "cartaz", label: "Cartaz" },
];

const ORIGEM_LABEL: Record<string, string> = ORIGEM_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.value]: o.label }),
  {} as Record<string, string>,
);

const ORIGEM_COLORS: Record<string, string> = {
  meta_ads: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  site: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  indicacao: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  panfleto: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  cartaz: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

function leadCorretorDisplay(lead: Lead, corMap: Map<string, string>): string {
  const n = lead.corretor_nome?.trim();
  if (n) return n;
  if (lead.corretor_id) return corMap.get(lead.corretor_id) ?? "—";
  return "—";
}

function CRMPage() {
  const { user } = useUser();
  const isPreview = isPreviewId(user?.id);
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [corretores, setCorretores] = useState<AppUser[]>([]);
  const [filterCorretor, setFilterCorretor] = useState<string>("");
  const [filterEmp, setFilterEmp] = useState<string>("");
  const [filterOrigem, setFilterOrigem] = useState<string>("");
  const [openLead, setOpenLead] = useState<Lead | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [vendaModal, setVendaModal] = useState<Lead | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const empMap = useMemo(
    () => new Map(empreendimentos.map((e) => [e.id, e.nome])),
    [empreendimentos],
  );
  const corMap = useMemo(() => new Map(corretores.map((c) => [c.id, c.nome])), [corretores]);

  const refetchLeads = useCallback(async () => {
    if (!user) return;
    if (isPreview) {
      const allLeads = getPreviewLeads();
      setLeads(
        user.role === "corretor"
          ? allLeads.filter((l) => l.corretor_id === user.id)
          : allLeads,
      );
      return;
    }
    let q = supabase.from("leads").select("*").order("created_at", { ascending: false });
    if (user.role === "corretor") q = q.or(corretorOwnedLeadsOr(user.id, user.nome));
    const { data, error } = await q;
    if (error) {
      // eslint-disable-next-line no-console
      console.error("Erro ao carregar leads:", error.message);
    }
    setLeads((data as Lead[]) ?? []);
  }, [user, isPreview]);

  useEffect(() => {
    if (!user) return;

    if (isPreview) {
      void refetchLeads();
      setEmpreendimentos(getPreviewEmpreendimentos().filter((e) => !e.arquivado));
      setCorretores([
        {
          id: "preview-corretor-1",
          nome: "Moreno",
          email: "moreno@primehouse.com.br",
          role: "corretor",
          pontuacao: 1510,
          ativo: true,
          posicao_fila: 1,
        },
        {
          id: "preview-corretor-2",
          nome: "Alquimista",
          email: "alquimista@primehouse.com.br",
          role: "corretor",
          pontuacao: 1220,
          ativo: true,
          posicao_fila: 2,
        },
      ]);
      return;
    }

    void refetchLeads();

    supabase
      .from("empreendimentos")
      .select("*")
      .then(({ data }) => setEmpreendimentos((data as Empreendimento[]) ?? []));

    supabase
      .from("users")
      .select("*")
      .eq("role", "corretor")
      .eq("ativo", true)
      .then(({ data }) => setCorretores((data ?? []).map(mapUserRowToAppUser)));

    const ch = supabase
      .channel("leads-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        (payload) => {
          setLeads((prev) => {
            if (!prev) return prev;
            const row = payload.new as Lead;
            const old = payload.old as Lead;
            if (payload.eventType === "INSERT") {
              if (user.role === "corretor" && !leadBelongsToCorretor(row, user)) return prev;
              if (prev.find((l) => l.id === row.id)) return prev;
              return [row, ...prev];
            }
            if (payload.eventType === "UPDATE") {
              const merged = prev.map((l) => (l.id === row.id ? { ...l, ...row } : l));
              if (user.role === "corretor") {
                return merged.filter((l) => leadBelongsToCorretor(l, user));
              }
              return merged;
            }
            if (payload.eventType === "DELETE") {
              return prev.filter((l) => l.id !== old.id);
            }
            return prev;
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, isPreview, refetchLeads]);

  if (!user) return null;

  const filteredLeads = (leads ?? []).filter((l) => {
    if (user.role === "corretor" && !leadBelongsToCorretor(l, user)) return false;
    if (filterCorretor && l.corretor_id !== filterCorretor) return false;
    if (filterEmp && l.empreendimento_id !== filterEmp) return false;
    if (filterOrigem && l.origem !== filterOrigem) return false;
    return true;
  });

  function persistLeads(next: Lead[]) {
    setLeads(next);
    if (isPreview) {
      // Preview store keeps the full list (across roles) — merge.
      const all = getPreviewLeads();
      const ids = new Set(next.map((l) => l.id));
      const others = all.filter((l) => !ids.has(l.id));
      // For corretor mode, "next" is only their leads; merge with others.
      savePreviewLeads([...next, ...others]);
    }
  }

  async function handleDragEnd(e: DragEndEvent) {
    const id = e.active.id as string;
    const newStatus = e.over?.id as string | undefined;
    if (!newStatus) return;
    const lead = (leads ?? []).find((l) => l.id === id);
    if (!lead || lead.status === newStatus) return;

    // optimistic
    const optimistic = (leads ?? []).map((l) =>
      l.id === id ? { ...l, status: newStatus } : l,
    );
    persistLeads(optimistic);

    if (newStatus === "canetado") {
      setVendaModal({ ...lead, status: newStatus });
    }

    if (isPreview) return;

    const { error } = await supabase.from("leads").update({ status: newStatus }).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar lead. Tente novamente.");
      setLeads(
        (prev) => prev?.map((l) => (l.id === id ? { ...l, status: lead.status } : l)) ?? prev,
      );
      return;
    }

    if (newStatus === "agendado" && N8N_WEBHOOK_URL) {
      fetch(`${N8N_WEBHOOK_URL.replace(/\/$/, "")}/agenda`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: lead.id,
          nome: lead.nome,
          whatsapp: lead.whatsapp,
          corretor: leadCorretorDisplay(lead, corMap),
          empreendimento: empMap.get(lead.empreendimento_id ?? "") ?? "",
        }),
      }).catch((err) => {
        // eslint-disable-next-line no-console
        console.error("Webhook /agenda falhou:", err);
      });
    }
  }

  function exportCsv() {
    if (filteredLeads.length === 0) {
      toast.info("Nenhum lead para exportar.");
      return;
    }
    const headers = [
      "Nome",
      "WhatsApp",
      "Origem",
      "Status",
      "Empreendimento",
      "Nº unidade",
      "Corretor",
      "Criado em",
      "Resumo",
    ];
    const rows = filteredLeads.map((l) => [
      l.nome,
      l.whatsapp,
      ORIGEM_LABEL[l.origem] ?? l.origem,
      String(l.status).replace("_", " "),
      empMap.get(l.empreendimento_id ?? "") ?? "",
      l.numero_unidade ?? "",
      leadCorretorDisplay(l, corMap),
      formatShort(l.created_at),
      (l.conversa_resumo ?? "").replace(/\s+/g, " "),
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const s = String(cell ?? "");
            return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(";"),
      )
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`${filteredLeads.length} lead(s) exportado(s).`);
  }

  return (
    <div className="flex h-full flex-col p-4 lg:p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            CRM <span className="text-gold">Kanban</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {filteredLeads.length} lead(s)
            {user.role === "corretor" && " · seus leads"}
            {user.role === "gestor" &&
              filterCorretor &&
              ` · ${corretores.find((c) => c.id === filterCorretor)?.nome ?? ""}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void refetchLeads()}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-sm font-medium text-foreground transition hover:border-primary/40 hover:bg-accent"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-sm font-medium text-foreground transition hover:border-primary/40 hover:bg-accent"
          >
            <Download className="h-4 w-4" /> Exportar
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_24px_rgba(201,168,76,0.25)] hover:bg-[oklch(0.78_0.14_85)]"
              >
                <Plus className="h-4 w-4" /> Novo Lead
                <ChevronDown className="h-4 w-4 opacity-80" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-border bg-popover">
              <DropdownMenuItem
                className="cursor-pointer"
                onSelect={() => {
                  setShowNew(true);
                }}
              >
                Adicionar Lead
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onSelect={() => {
                  setShowImport(true);
                }}
              >
                Importar Leads
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {user.role === "gestor" && (
          <select
            value={filterCorretor}
            onChange={(e) => setFilterCorretor(e.target.value)}
            className="rounded-lg border border-border bg-input/40 px-3 py-1.5 text-sm"
          >
            <option value="">Todos os corretores</option>
            {corretores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        )}
        <select
          value={filterEmp}
          onChange={(e) => setFilterEmp(e.target.value)}
          className="rounded-lg border border-border bg-input/40 px-3 py-1.5 text-sm"
        >
          <option value="">Todos empreendimentos</option>
          {empreendimentos.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </select>
        <select
          value={filterOrigem}
          onChange={(e) => setFilterOrigem(e.target.value)}
          className="rounded-lg border border-border bg-input/40 px-3 py-1.5 text-sm"
        >
          <option value="">Todas origens</option>
          {ORIGEM_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {(filterCorretor || filterEmp || filterOrigem) && (
          <button
            onClick={() => {
              setFilterCorretor("");
              setFilterEmp("");
              setFilterOrigem("");
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            limpar
          </button>
        )}
      </div>

      {/* Kanban */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const items = filteredLeads.filter((l) => l.status === col.key);
            return (
              <Column
                key={col.key}
                id={col.key}
                label={col.label}
                tone={col.tone}
                count={items.length}
              >
                {leads == null ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
                  ))
                ) : items.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border/60 p-3 text-center text-xs text-muted-foreground">
                    Nada por aqui
                  </p>
                ) : (
                  items.map((l) => (
                    <LeadCard
                      key={l.id}
                      lead={l}
                      empreendimentoNome={empMap.get(l.empreendimento_id ?? "") ?? "—"}
                      corretorLine={
                        user.role === "gestor" ? leadCorretorDisplay(l, corMap) : undefined
                      }
                      onClick={() => setOpenLead(l)}
                    />
                  ))
                )}
              </Column>
            );
          })}
        </div>
      </DndContext>

      {openLead && (
        <LeadDrawer
          lead={openLead}
          empreendimentos={empreendimentos}
          corretorNome={leadCorretorDisplay(openLead, corMap)}
          isPreview={isPreview}
          onClose={() => setOpenLead(null)}
          onUpdated={(upd) => {
            const next = (leads ?? []).map((l) => (l.id === upd.id ? upd : l));
            persistLeads(next);
            setOpenLead(upd);
          }}
        />
      )}

      {showNew && (
        <NewLeadModal
          empreendimentos={empreendimentos}
          corretores={corretores}
          isPreview={isPreview}
          onClose={() => setShowNew(false)}
          onCreated={(l) => {
            const next = leads ? [l, ...leads] : [l];
            persistLeads(next);
            setShowNew(false);
            toast.success("Lead criado!");
          }}
        />
      )}

      {vendaModal && (
        <CanetadoModal
          lead={vendaModal}
          isPreview={isPreview}
          onClose={() => setVendaModal(null)}
          onConfirmed={() => {
            toast.success("Venda registrada com sucesso!");
            setVendaModal(null);
          }}
        />
      )}

      <ImportLeadsModal
        open={showImport}
        onOpenChange={setShowImport}
        onSuccess={() => void refetchLeads()}
      />
    </div>
  );
}

function Column({
  id,
  label,
  tone,
  count,
  children,
}: {
  id: string;
  label: string;
  tone: string;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl border-2 bg-card/60 transition",
        tone,
        isOver && "ring-2 ring-primary",
      )}
    >
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {count}
        </span>
      </div>
      <div className="flex-1 space-y-2 p-2">{children}</div>
    </div>
  );
}

function LeadCard({
  lead,
  empreendimentoNome,
  corretorLine,
  onClick,
}: {
  lead: Lead;
  empreendimentoNome: string;
  corretorLine?: string;
  onClick: () => void;
}) {
  const { setNodeRef, attributes, listeners, transform, isDragging } = useDraggable({
    id: lead.id,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined;
  const tone = ORIGEM_COLORS[lead.origem] ?? "bg-zinc-500/15 text-zinc-300 border-zinc-500/30";
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (isDragging) return;
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "cursor-grab rounded-lg border border-border bg-card p-3 text-left shadow-sm transition hover:border-primary/40 hover:shadow-md",
        isDragging && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-semibold text-foreground">{lead.nome}</p>
        {lead.numero_unidade && (
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-gold">
            <Hash className="h-2.5 w-2.5" />
            {lead.numero_unidade}
          </span>
        )}
      </div>
      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <MessageCircle className="h-3 w-3" /> {formatWhatsapp(lead.whatsapp)}
      </p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{empreendimentoNome}</p>
      {corretorLine ? (
        <p className="mt-1 truncate text-[10px] font-medium text-gold/90">Corretor: {corretorLine}</p>
      ) : null}
      <div className="mt-2 flex items-center justify-between">
        <span className={cn("rounded-full border px-2 py-0.5 text-[10px] uppercase", tone)}>
          {ORIGEM_LABEL[lead.origem] ?? String(lead.origem)}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Calendar className="h-3 w-3" /> {formatShort(lead.created_at)}
        </span>
      </div>
    </div>
  );
}

function LeadDrawer({
  lead,
  empreendimentos,
  corretorNome,
  isPreview,
  onClose,
  onUpdated,
}: {
  lead: Lead;
  empreendimentos: Empreendimento[];
  corretorNome: string;
  isPreview: boolean;
  onClose: () => void;
  onUpdated: (l: Lead) => void;
}) {
  const empMap = useMemo(
    () => new Map(empreendimentos.map((e) => [e.id, e.nome])),
    [empreendimentos],
  );
  const [resumo, setResumo] = useState(lead.conversa_resumo ?? "");
  const [numeroUnidade, setNumeroUnidade] = useState(lead.numero_unidade ?? "");
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [novaTarefa, setNovaTarefa] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isPreview) {
      setTarefas(getPreviewTarefas().filter((t) => t.lead_id === lead.id));
      return;
    }
    supabase
      .from("tarefas")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => setTarefas((data as Tarefa[]) ?? []));
  }, [lead.id, isPreview]);

  async function save() {
    setSaving(true);
    const updates = {
      conversa_resumo: resumo,
      numero_unidade: numeroUnidade || null,
    };
    if (isPreview) {
      const next = { ...lead, ...updates };
      onUpdated(next);
      setSaving(false);
      toast.success("Salvo!");
      return;
    }
    const { data, error } = await supabase
      .from("leads")
      .update(updates)
      .eq("id", lead.id)
      .select()
      .single();
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar.");
      return;
    }
    toast.success("Salvo!");
    onUpdated(data as Lead);
  }

  function persistTarefas(next: Tarefa[]) {
    setTarefas(next);
    if (isPreview) {
      const all = getPreviewTarefas();
      const otherIds = new Set(next.map((t) => t.id));
      const others = all.filter((t) => t.lead_id !== lead.id || !otherIds.has(t.id));
      savePreviewTarefas([...others.filter((t) => t.lead_id !== lead.id), ...next]);
    }
  }

  async function addTarefa() {
    const titulo = novaTarefa.trim();
    if (!titulo) return;
    const novo: Tarefa = {
      id: newPreviewId("tarefa"),
      corretor_id: lead.corretor_id,
      lead_id: lead.id,
      titulo,
      descricao: null,
      prazo: null,
      concluida: false,
      created_at: new Date().toISOString(),
    };
    if (isPreview) {
      persistTarefas([...tarefas, novo]);
      setNovaTarefa("");
      return;
    }
    const { data, error } = await supabase
      .from("tarefas")
      .insert({
        corretor_id: lead.corretor_id,
        lead_id: lead.id,
        titulo,
        concluida: false,
      })
      .select()
      .single();
    if (error) {
      toast.error("Erro ao adicionar tarefa.");
      return;
    }
    setTarefas((prev) => [...prev, data as Tarefa]);
    setNovaTarefa("");
  }

  async function toggleTarefa(t: Tarefa) {
    const next = tarefas.map((x) => (x.id === t.id ? { ...x, concluida: !x.concluida } : x));
    persistTarefas(next);
    if (isPreview) return;
    await supabase.from("tarefas").update({ concluida: !t.concluida }).eq("id", t.id);
  }

  async function removeTarefa(t: Tarefa) {
    const next = tarefas.filter((x) => x.id !== t.id);
    persistTarefas(next);
    if (isPreview) return;
    await supabase.from("tarefas").delete().eq("id", t.id);
  }

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-card shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-5 py-4 backdrop-blur">
          <div className="min-w-0">
            <h2 className="truncate font-display text-xl font-bold text-foreground">
              {lead.nome}
            </h2>
            <p className="truncate text-xs text-muted-foreground">
              {formatWhatsapp(lead.whatsapp)} · {empMap.get(lead.empreendimento_id ?? "") ?? "—"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 p-5">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Status" value={String(lead.status).replace("_", " ")} />
            <Field
              label="Origem"
              value={ORIGEM_LABEL[lead.origem] ?? String(lead.origem)}
            />
            <Field label="Corretor" value={corretorNome} />
            <Field label="Criado" value={formatShort(lead.created_at)} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Nº unidade reservada
            </label>
            <input
              value={numeroUnidade}
              onChange={(e) => setNumeroUnidade(e.target.value)}
              placeholder="ex. 204"
              className="w-full rounded-lg border border-border bg-input/40 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Resumo
            </label>
            <textarea
              value={resumo}
              onChange={(e) => setResumo(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-border bg-input/40 p-3 text-sm outline-none focus:border-primary"
            />
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-[oklch(0.78_0.14_85)] disabled:opacity-60"
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />} Salvar alterações
          </button>

          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Tarefas
            </h3>
            <div className="mb-2 flex gap-2">
              <input
                value={novaTarefa}
                onChange={(e) => setNovaTarefa(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTarefa();
                  }
                }}
                placeholder="Nova tarefa…"
                className="flex-1 rounded-lg border border-border bg-input/40 px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={addTarefa}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-[oklch(0.78_0.14_85)]"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </button>
            </div>
            {tarefas.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                Nenhuma tarefa
              </p>
            ) : (
              <ul className="space-y-1.5">
                {tarefas.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-2 rounded-lg border border-border bg-background/40 p-2.5"
                  >
                    <button
                      onClick={() => toggleTarefa(t)}
                      className="shrink-0 text-muted-foreground transition hover:text-gold"
                      aria-label={t.concluida ? "Marcar como pendente" : "Concluir"}
                    >
                      {t.concluida ? (
                        <CheckCircle2 className="h-5 w-5 text-gold" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </button>
                    <span
                      className={cn(
                        "flex-1 text-sm",
                        t.concluida && "text-muted-foreground line-through",
                      )}
                    >
                      {t.titulo}
                    </span>
                    <button
                      onClick={() => removeTarefa(t)}
                      className="shrink-0 rounded-md p-1 text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
                      aria-label="Remover"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 capitalize text-foreground">{value || "—"}</p>
    </div>
  );
}

function NewLeadModal({
  empreendimentos,
  corretores,
  isPreview,
  onClose,
  onCreated,
}: {
  empreendimentos: Empreendimento[];
  corretores: AppUser[];
  isPreview: boolean;
  onClose: () => void;
  onCreated: (l: Lead) => void;
}) {
  const { user } = useUser();
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [origem, setOrigem] = useState("meta_ads");
  const [empId, setEmpId] = useState("");
  const [numeroUnidade, setNumeroUnidade] = useState("");
  const [corretorId, setCorretorId] = useState(user?.role === "corretor" ? user.id : "");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome || !whatsapp) {
      toast.error("Nome e WhatsApp são obrigatórios.");
      return;
    }
    setSaving(true);
    const corNome =
      corretorId && corretores.length
        ? (corretores.find((c) => c.id === corretorId)?.nome?.trim() ?? null)
        : user?.role === "corretor"
          ? (user?.nome?.trim() ?? null)
          : null;
    const base = {
      nome,
      whatsapp,
      origem,
      empreendimento_id: empId || null,
      corretor_id: corretorId || null,
      corretor_nome: corNome,
      numero_unidade: numeroUnidade || null,
      status: "novo",
    };
    if (isPreview) {
      const novo: Lead = {
        id: newPreviewId("lead"),
        ...base,
        anotacoes: "",
        conversa_resumo: "",
        created_at: new Date().toISOString(),
      };
      onCreated(novo);
      setSaving(false);
      return;
    }
    const { data, error } = await supabase.from("leads").insert(base).select().single();
    setSaving(false);
    if (error) {
      toast.error(
        error.message.includes("unique") ? "WhatsApp já cadastrado." : "Erro ao criar lead.",
      );
      return;
    }
    onCreated(data as Lead);
  }

  return (
    <ModalShell title="Novo lead" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Input label="Nome *" value={nome} onChange={setNome} />
        <Input
          label="WhatsApp *"
          value={whatsapp}
          onChange={setWhatsapp}
          placeholder="11999999999"
        />
        <SelectField
          label="Origem"
          value={origem}
          onChange={setOrigem}
          options={ORIGEM_OPTIONS}
        />
        <SelectField
          label="Empreendimento"
          value={empId}
          onChange={setEmpId}
          options={[
            { value: "", label: "—" },
            ...empreendimentos.map((e) => ({ value: e.id, label: e.nome })),
          ]}
        />
        <Input
          label="Nº unidade"
          value={numeroUnidade}
          onChange={setNumeroUnidade}
          placeholder="opcional"
        />
        {user?.role === "gestor" && (
          <SelectField
            label="Corretor"
            value={corretorId}
            onChange={setCorretorId}
            options={[
              { value: "", label: "Sem atribuição" },
              ...corretores.map((c) => ({ value: c.id, label: c.nome })),
            ]}
          />
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-[oklch(0.78_0.14_85)] disabled:opacity-60"
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />} Criar
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function CanetadoModal({
  lead,
  isPreview,
  onClose,
  onConfirmed,
}: {
  lead: Lead;
  isPreview: boolean;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const { user } = useUser();
  const { width, height } = useWindowSize();
  const [valor, setValor] = useState("");
  const [comTotal, setComTotal] = useState("");
  const [comCorr, setComCorr] = useState("");
  const [saving, setSaving] = useState(false);
  const fired = useRef(false);

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (fired.current) return;
    fired.current = true;
    setSaving(true);

    if (isPreview) {
      setSaving(false);
      onConfirmed();
      return;
    }

    const valorN = Number(valor);
    const totalN = Number(comTotal);
    const corrN = Number(comCorr);

    const { data: existing } = await supabase
      .from("clientes")
      .select("id")
      .eq("lead_id", lead.id)
      .maybeSingle();

    const payload = {
      lead_id: lead.id,
      corretor_id: lead.corretor_id,
      valor_venda: valorN || null,
      comissao_total: totalN || null,
      comissao_corretor: corrN || null,
    };

    const op = existing
      ? supabase.from("clientes").update(payload).eq("id", existing.id)
      : supabase.from("clientes").insert(payload);

    const { error } = await op;
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar venda. Tente novamente.");
      fired.current = false;
      return;
    }
    onConfirmed();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <Confetti width={width} height={height} numberOfPieces={250} recycle={false} />
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-primary/40 bg-card p-6 shadow-2xl">
        <h2 className="text-center font-display text-2xl font-bold text-gold">
          🎉 Parabéns, {user ? displayFirstName(user) : "você"}!
        </h2>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Venda fechada — registre os valores
        </p>
        <form onSubmit={confirm} className="mt-5 space-y-3">
          <Input label="Valor da venda" value={valor} onChange={setValor} type="number" />
          <Input
            label="Comissão total"
            value={comTotal}
            onChange={setComTotal}
            type="number"
          />
          <Input
            label="Comissão do corretor"
            value={comCorr}
            onChange={setComCorr}
            type="number"
          />
          {valor && (
            <p className="text-xs text-muted-foreground">
              Venda: {formatBRL(Number(valor))}{" "}
              {comCorr && <>· Sua comissão: {formatBRL(Number(comCorr))}</>}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
            >
              Depois
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-[oklch(0.78_0.14_85)] disabled:opacity-60"
            >
              {saving && <Loader2 className="h-3 w-3 animate-spin" />} Confirmar venda
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-input/40 px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-input/40 px-3 py-2 text-sm outline-none focus:border-primary"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
