import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { Plus, Filter, X, MessageCircle, Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import { supabase, N8N_WEBHOOK_URL } from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { formatShort, formatWhatsapp, formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Lead, AppUser, Empreendimento, Tarefa } from "@/types/db";

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

const ORIGEM_COLORS: Record<string, string> = {
  meta_ads: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  indicacao: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  offline: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  outro: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
};

function CRMPage() {
  const { user } = useUser();
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [corretores, setCorretores] = useState<AppUser[]>([]);
  const [filterCorretor, setFilterCorretor] = useState<string>("");
  const [filterEmp, setFilterEmp] = useState<string>("");
  const [filterOrigem, setFilterOrigem] = useState<string>("");
  const [openLead, setOpenLead] = useState<Lead | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [vendaModal, setVendaModal] = useState<Lead | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const empMap = useMemo(
    () => new Map(empreendimentos.map((e) => [e.id, e.nome])),
    [empreendimentos],
  );
  const corMap = useMemo(() => new Map(corretores.map((c) => [c.id, c.nome])), [corretores]);

  // Load
  useEffect(() => {
    if (!user) return;
    let q = supabase.from("leads").select("*").order("created_at", { ascending: false });
    if (user.role === "corretor") q = q.eq("corretor_id", user.id);
    q.then(({ data }) => setLeads((data as Lead[]) ?? []));

    supabase
      .from("empreendimentos")
      .select("*")
      .then(({ data }) => setEmpreendimentos((data as Empreendimento[]) ?? []));

    supabase
      .from("users")
      .select("*")
      .eq("role", "corretor")
      .eq("ativo", true)
      .then(({ data }) => setCorretores((data as AppUser[]) ?? []));

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
              if (user.role === "corretor" && row.corretor_id !== user.id) return prev;
              if (prev.find((l) => l.id === row.id)) return prev;
              return [row, ...prev];
            }
            if (payload.eventType === "UPDATE") {
              return prev.map((l) => (l.id === row.id ? { ...l, ...row } : l));
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
  }, [user]);

  if (!user) return null;

  const filteredLeads = (leads ?? []).filter((l) => {
    if (filterCorretor && l.corretor_id !== filterCorretor) return false;
    if (filterEmp && l.empreendimento_id !== filterEmp) return false;
    if (filterOrigem && l.origem !== filterOrigem) return false;
    return true;
  });

  async function handleDragEnd(e: DragEndEvent) {
    const id = e.active.id as string;
    const newStatus = e.over?.id as string | undefined;
    if (!newStatus) return;
    const lead = (leads ?? []).find((l) => l.id === id);
    if (!lead || lead.status === newStatus) return;

    // optimistic
    setLeads((prev) => prev?.map((l) => (l.id === id ? { ...l, status: newStatus } : l)) ?? prev);

    if (newStatus === "canetado") {
      // open modal; don't persist status until confirmed? We persist now since trigger may handle.
      setVendaModal({ ...lead, status: newStatus });
    }

    const { error } = await supabase.from("leads").update({ status: newStatus }).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar lead. Tente novamente.");
      setLeads(
        (prev) => prev?.map((l) => (l.id === id ? { ...l, status: lead.status } : l)) ?? prev,
      );
      return;
    }

    if (newStatus === "agendado" && N8N_WEBHOOK_URL) {
      // background webhook
      fetch(`${N8N_WEBHOOK_URL.replace(/\/$/, "")}/agenda`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: lead.id,
          nome: lead.nome,
          whatsapp: lead.whatsapp,
          corretor: corMap.get(lead.corretor_id ?? "") ?? "",
          empreendimento: empMap.get(lead.empreendimento_id ?? "") ?? "",
        }),
      }).catch((err) => {
        // eslint-disable-next-line no-console
        console.error("Webhook /agenda falhou:", err);
      });
    }
  }

  return (
    <div className="flex h-full flex-col p-4 lg:p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground lg:text-3xl">
            CRM <span className="text-gold">Kanban</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {filteredLeads.length} lead(s) {user.role === "corretor" && "· seus leads"}
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_24px_rgba(201,168,76,0.25)] hover:bg-[oklch(0.78_0.14_85)]"
        >
          <Plus className="h-4 w-4" /> Novo Lead
        </button>
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
          <option value="meta_ads">Meta Ads</option>
          <option value="indicacao">Indicação</option>
          <option value="offline">Offline</option>
          <option value="outro">Outro</option>
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
              <Column key={col.key} id={col.key} label={col.label} tone={col.tone} count={items.length}>
                {leads == null
                  ? Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
                    ))
                  : items.length === 0
                    ? (
                        <p className="rounded-lg border border-dashed border-border/60 p-3 text-center text-xs text-muted-foreground">
                          Nada por aqui
                        </p>
                      )
                    : items.map((l) => (
                        <LeadCard
                          key={l.id}
                          lead={l}
                          empreendimentoNome={empMap.get(l.empreendimento_id ?? "") ?? "—"}
                          onClick={() => setOpenLead(l)}
                        />
                      ))}
              </Column>
            );
          })}
        </div>
      </DndContext>

      {openLead && (
        <LeadDrawer
          lead={openLead}
          empreendimentoNome={empMap.get(openLead.empreendimento_id ?? "") ?? "—"}
          corretorNome={corMap.get(openLead.corretor_id ?? "") ?? "—"}
          onClose={() => setOpenLead(null)}
          onUpdated={(upd) => {
            setLeads((prev) => prev?.map((l) => (l.id === upd.id ? upd : l)) ?? prev);
            setOpenLead(upd);
          }}
        />
      )}

      {showNew && (
        <NewLeadModal
          empreendimentos={empreendimentos}
          corretores={corretores}
          onClose={() => setShowNew(false)}
          onCreated={(l) => {
            setLeads((prev) => (prev ? [l, ...prev] : [l]));
            setShowNew(false);
            toast.success("Lead criado!");
          }}
        />
      )}

      {vendaModal && (
        <CanetadoModal
          lead={vendaModal}
          onClose={() => setVendaModal(null)}
          onConfirmed={() => {
            toast.success("Venda registrada com sucesso!");
            setVendaModal(null);
          }}
        />
      )}
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
  onClick,
}: {
  lead: Lead;
  empreendimentoNome: string;
  onClick: () => void;
}) {
  const { setNodeRef, attributes, listeners, transform, isDragging } = useDraggable({ id: lead.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined;
  const tone = ORIGEM_COLORS[lead.origem] ?? ORIGEM_COLORS.outro;
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
      <p className="truncate text-sm font-semibold text-foreground">{lead.nome}</p>
      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <MessageCircle className="h-3 w-3" /> {formatWhatsapp(lead.whatsapp)}
      </p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{empreendimentoNome}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className={cn("rounded-full border px-2 py-0.5 text-[10px] uppercase", tone)}>
          {String(lead.origem).replace("_", " ")}
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
  empreendimentoNome,
  corretorNome,
  onClose,
  onUpdated,
}: {
  lead: Lead;
  empreendimentoNome: string;
  corretorNome: string;
  onClose: () => void;
  onUpdated: (l: Lead) => void;
}) {
  const [resumo, setResumo] = useState(lead.conversa_resumo ?? "");
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("tarefas")
      .select("*")
      .eq("lead_id", lead.id)
      .order("prazo", { ascending: true })
      .then(({ data }) => setTarefas((data as Tarefa[]) ?? []));
  }, [lead.id]);

  async function save() {
    setSaving(true);
    const { data, error } = await supabase
      .from("leads")
      .update({ conversa_resumo: resumo })
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

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">{lead.nome}</h2>
            <p className="text-xs text-muted-foreground">
              {formatWhatsapp(lead.whatsapp)} · {empreendimentoNome}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-5 p-5">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Status" value={String(lead.status).replace("_", " ")} />
            <Field label="Origem" value={String(lead.origem).replace("_", " ")} />
            <Field label="Corretor" value={corretorNome} />
            <Field label="Criado" value={formatShort(lead.created_at)} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Resumo da conversa
            </label>
            <textarea
              value={resumo}
              onChange={(e) => setResumo(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-border bg-input/40 p-3 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={save}
              disabled={saving}
              className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-[oklch(0.78_0.14_85)] disabled:opacity-60"
            >
              {saving && <Loader2 className="h-3 w-3 animate-spin" />} Salvar resumo
            </button>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Tarefas vinculadas
            </h3>
            {tarefas.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                Nenhuma tarefa
              </p>
            ) : (
              <ul className="space-y-2">
                {tarefas.map((t) => (
                  <li
                    key={t.id}
                    className="rounded-lg border border-border bg-background/40 p-3 text-sm"
                  >
                    <p className={cn("font-medium", t.concluida && "line-through opacity-60")}>
                      {t.titulo}
                    </p>
                    {t.prazo && (
                      <p className="text-xs text-muted-foreground">{formatShort(t.prazo)}</p>
                    )}
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
  onClose,
  onCreated,
}: {
  empreendimentos: Empreendimento[];
  corretores: AppUser[];
  onClose: () => void;
  onCreated: (l: Lead) => void;
}) {
  const { user } = useUser();
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [origem, setOrigem] = useState("meta_ads");
  const [empId, setEmpId] = useState("");
  const [corretorId, setCorretorId] = useState(user?.role === "corretor" ? user.id : "");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome || !whatsapp) {
      toast.error("Nome e WhatsApp são obrigatórios.");
      return;
    }
    setSaving(true);
    const payload = {
      nome,
      whatsapp,
      origem,
      empreendimento_id: empId || null,
      corretor_id: corretorId || null,
      status: "novo",
    };
    const { data, error } = await supabase.from("leads").insert(payload).select().single();
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("unique") ? "WhatsApp já cadastrado." : "Erro ao criar lead.");
      return;
    }
    onCreated(data as Lead);
  }

  return (
    <ModalShell title="Novo lead" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Input label="Nome *" value={nome} onChange={setNome} />
        <Input label="WhatsApp *" value={whatsapp} onChange={setWhatsapp} placeholder="11999999999" />
        <Select label="Origem" value={origem} onChange={setOrigem}
          options={[
            { value: "meta_ads", label: "Meta Ads" },
            { value: "indicacao", label: "Indicação" },
            { value: "offline", label: "Offline" },
            { value: "outro", label: "Outro" },
          ]}
        />
        <Select
          label="Empreendimento"
          value={empId}
          onChange={setEmpId}
          options={[{ value: "", label: "—" }, ...empreendimentos.map((e) => ({ value: e.id, label: e.nome }))]}
        />
        {user?.role === "gestor" && (
          <Select
            label="Corretor"
            value={corretorId}
            onChange={setCorretorId}
            options={[{ value: "", label: "Sem atribuição" }, ...corretores.map((c) => ({ value: c.id, label: c.nome }))]}
          />
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent">
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
  onClose,
  onConfirmed,
}: {
  lead: Lead;
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
    const valorN = Number(valor);
    const totalN = Number(comTotal);
    const corrN = Number(comCorr);

    // Upsert by lead_id
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
          🎉 Parabéns, {user?.nome.split(" ")[0]}!
        </h2>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Venda fechada — registre os valores
        </p>
        <form onSubmit={confirm} className="mt-5 space-y-3">
          <Input label="Valor da venda" value={valor} onChange={setValor} type="number" />
          <Input label="Comissão total" value={comTotal} onChange={setComTotal} type="number" />
          <Input label="Comissão do corretor" value={comCorr} onChange={setComCorr} type="number" />
          {valor && (
            <p className="text-xs text-muted-foreground">
              Venda: {formatBRL(Number(valor))}{" "}
              {comCorr && <>· Sua comissão: {formatBRL(Number(comCorr))}</>}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent">
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
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent">
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

function Select({
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
