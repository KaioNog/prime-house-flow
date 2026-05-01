import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Building2,
  MapPin,
  BedDouble,
  Ruler,
  Car,
  CalendarClock,
  Pencil,
  Archive,
  ArchiveRestore,
  X,
  ExternalLink,
  Loader2,
  ImagePlus,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  getPreviewEmpreendimentos,
  isPreviewId,
  newPreviewId,
  savePreviewEmpreendimentos,
} from "@/lib/previewStore";
import type { Empreendimento, EmpreendimentoStatus, VagaTipo } from "@/types/db";

export const Route = createFileRoute("/_app/empreendimentos")({
  component: EmpreendimentosPage,
});

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  ativo: {
    label: "Ativo",
    className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  em_breve: {
    label: "Em breve",
    className: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  },
  inativo: {
    label: "Inativo",
    className: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  },
};

const VAGA_LABEL: Record<string, string> = {
  carro: "Vaga de carro",
  moto: "Vaga de moto",
  sem_vaga: "Sem vaga",
};

function EmpreendimentosPage() {
  const { user } = useUser();
  const isPreview = isPreviewId(user?.id);
  const isGestor = user?.role === "gestor";

  const [items, setItems] = useState<Empreendimento[] | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Empreendimento | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (isPreview) {
      setItems(getPreviewEmpreendimentos());
      return;
    }
    supabase
      .from("empreendimentos")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toast.error("Erro ao carregar empreendimentos.");
          setItems([]);
          return;
        }
        setItems((data as Empreendimento[]) ?? []);
      });
  }, [user, isPreview]);

  const filtered = useMemo(() => {
    const list = items ?? [];
    return list
      .filter((e) => (showArchived ? e.arquivado : !e.arquivado))
      .filter((e) => {
        if (!query) return true;
        const q = query.toLowerCase();
        return (
          e.nome?.toLowerCase().includes(q) ||
          e.localizacao?.toLowerCase().includes(q) ||
          e.construtora?.toLowerCase().includes(q)
        );
      });
  }, [items, showArchived, query]);

  function persist(next: Empreendimento[]) {
    setItems(next);
    if (isPreview) savePreviewEmpreendimentos(next);
  }

  async function handleSave(e: Empreendimento) {
    if (isPreview) {
      const list = items ?? [];
      const exists = list.find((x) => x.id === e.id);
      const next = exists ? list.map((x) => (x.id === e.id ? e : x)) : [e, ...list];
      persist(next);
      toast.success(exists ? "Empreendimento atualizado." : "Empreendimento criado.");
      return;
    }
    const payload: Partial<Empreendimento> = { ...e };
    delete (payload as { id?: string }).id;
    const op = items?.find((x) => x.id === e.id)
      ? supabase.from("empreendimentos").update(payload).eq("id", e.id).select().single()
      : supabase.from("empreendimentos").insert(payload).select().single();
    const { data, error } = await op;
    if (error) {
      toast.error("Erro ao salvar empreendimento.");
      return;
    }
    const saved = data as Empreendimento;
    const list = items ?? [];
    const next = list.find((x) => x.id === saved.id)
      ? list.map((x) => (x.id === saved.id ? saved : x))
      : [saved, ...list];
    setItems(next);
    toast.success("Empreendimento salvo.");
  }

  async function toggleArchive(emp: Empreendimento) {
    const next = !emp.arquivado;
    if (isPreview) {
      const list = items ?? [];
      persist(list.map((x) => (x.id === emp.id ? { ...x, arquivado: next } : x)));
      toast.success(next ? "Arquivado." : "Restaurado.");
      return;
    }
    const { error } = await supabase
      .from("empreendimentos")
      .update({ arquivado: next })
      .eq("id", emp.id);
    if (error) {
      toast.error("Erro ao arquivar.");
      return;
    }
    setItems((prev) =>
      (prev ?? []).map((x) => (x.id === emp.id ? { ...x, arquivado: next } : x)),
    );
    toast.success(next ? "Arquivado." : "Restaurado.");
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 lg:p-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
            <span className="text-gold">Empreendimentos</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "empreendimento" : "empreendimentos"}
            {showArchived ? " arquivados" : " ativos"}
          </p>
        </div>
        {isGestor && (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_0_24px_rgba(201,168,76,0.25)] transition hover:bg-[oklch(0.78_0.14_85)]"
          >
            <Plus className="h-4 w-4" /> Novo empreendimento
          </button>
        )}
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, local ou construtora"
            className="w-full rounded-xl border border-border bg-input/40 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        {isGestor && (
          <button
            onClick={() => setShowArchived((v) => !v)}
            className={cn(
              "rounded-xl border px-3 py-2 text-xs font-medium transition",
              showArchived
                ? "border-primary/40 bg-primary/10 text-gold"
                : "border-border text-muted-foreground hover:bg-accent",
            )}
          >
            {showArchived ? "Ver ativos" : "Ver arquivados"}
          </button>
        )}
      </div>

      {items === null ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhum empreendimento {showArchived ? "arquivado" : "cadastrado"} ainda.
          </p>
          {isGestor && !showArchived && (
            <button
              onClick={() => setCreating(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> Cadastrar o primeiro
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((emp) => (
            <EmpCard
              key={emp.id}
              emp={emp}
              isGestor={isGestor}
              onEdit={() => setEditing(emp)}
              onArchive={() => toggleArchive(emp)}
            />
          ))}
        </div>
      )}

      {(creating || editing) && (
        <EmpFormModal
          initial={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSave={(emp) => {
            handleSave(emp);
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function EmpCard({
  emp,
  isGestor,
  onEdit,
  onArchive,
}: {
  emp: Empreendimento;
  isGestor: boolean;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const status = STATUS_LABEL[emp.status ?? "ativo"] ?? STATUS_LABEL.ativo;
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition hover:border-primary/40">
      <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-[oklch(0.22_0.02_280)] to-[oklch(0.16_0.012_280)]">
        {emp.foto_url ? (
          <img
            src={emp.foto_url}
            alt={emp.nome}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Building2 className="h-10 w-10 text-muted-foreground/60" />
          </div>
        )}
        <span
          className={cn(
            "absolute left-3 top-3 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            status.className,
          )}
        >
          {status.label}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="font-display text-lg font-semibold leading-tight text-foreground">
            {emp.nome}
          </h3>
          {emp.localizacao && (
            <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="line-clamp-2">{emp.localizacao}</span>
            </p>
          )}
        </div>

        {emp.descricao && (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {emp.descricao}
          </p>
        )}

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          {emp.num_dorms != null && (
            <Spec icon={BedDouble} label={`${emp.num_dorms} dorm.`} />
          )}
          {emp.metragem && <Spec icon={Ruler} label={emp.metragem} />}
          {emp.vaga && <Spec icon={Car} label={VAGA_LABEL[emp.vaga] ?? String(emp.vaga)} />}
          {emp.prazo_entrega && (
            <Spec icon={CalendarClock} label={`Entrega ${emp.prazo_entrega}`} />
          )}
        </dl>

        {(emp.construtora || emp.financiamento) && (
          <div className="flex flex-wrap gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            {emp.construtora && (
              <span className="rounded-md bg-muted px-2 py-0.5">{emp.construtora}</span>
            )}
            {emp.financiamento && (
              <span className="rounded-md bg-muted px-2 py-0.5">{emp.financiamento}</span>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          {emp.url_midias ? (
            <a
              href={emp.url_midias}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-gold hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> Mídias
            </a>
          ) : (
            <span />
          )}
          {isGestor && (
            <div className="flex items-center gap-1">
              <button
                onClick={onEdit}
                className="rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                aria-label="Editar"
                title="Editar"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={onArchive}
                className="rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                aria-label={emp.arquivado ? "Restaurar" : "Arquivar"}
                title={emp.arquivado ? "Restaurar" : "Arquivar"}
              >
                {emp.arquivado ? (
                  <ArchiveRestore className="h-4 w-4" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function Spec({ icon: Icon, label }: { icon: typeof BedDouble; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-foreground">
      <Icon className="h-3.5 w-3.5 text-gold" />
      <span>{label}</span>
    </div>
  );
}

function EmpFormModal({
  initial,
  onClose,
  onSave,
}: {
  initial: Empreendimento | null;
  onClose: () => void;
  onSave: (e: Empreendimento) => void;
}) {
  const isEdit = Boolean(initial);
  const [form, setForm] = useState<Empreendimento>(
    initial ?? {
      id: newPreviewId("emp"),
      nome: "",
      descricao: "",
      localizacao: "",
      num_dorms: null,
      prazo_entrega: "",
      metragem: "",
      varanda: false,
      vaga: "carro",
      construtora: "",
      incorporadora: "",
      financiamento: "",
      url_midias: "",
      foto_url: null,
      status: "ativo",
      arquivado: false,
    },
  );
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function update<K extends keyof Empreendimento>(key: K, value: Empreendimento[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Foto muito grande (máx. 2MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update("foto_url", String(reader.result));
    reader.readAsDataURL(file);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.error("Informe o nome do empreendimento.");
      return;
    }
    setSaving(true);
    onSave(form);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-6 py-4 backdrop-blur">
          <h2 className="font-display text-xl font-bold text-foreground">
            {isEdit ? "Editar empreendimento" : "Novo empreendimento"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5 p-6">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <div className="h-24 w-32 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
              {form.foto_url ? (
                <img src={form.foto_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <Building2 className="h-6 w-6" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhoto}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
              >
                <ImagePlus className="h-3.5 w-3.5" />
                {form.foto_url ? "Trocar foto" : "Adicionar foto"}
              </button>
              {form.foto_url && (
                <button
                  type="button"
                  onClick={() => update("foto_url", null)}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Remover foto
                </button>
              )}
            </div>
          </div>

          <Field label="Nome *">
            <input
              value={form.nome}
              onChange={(e) => update("nome", e.target.value)}
              className={inputCls}
              required
            />
          </Field>

          <Field label="Descrição">
            <textarea
              value={form.descricao ?? ""}
              onChange={(e) => update("descricao", e.target.value)}
              rows={3}
              className={inputCls}
            />
          </Field>

          <Field label="Localização">
            <input
              value={form.localizacao ?? ""}
              onChange={(e) => update("localizacao", e.target.value)}
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Nº dorms">
              <input
                type="number"
                min={0}
                value={form.num_dorms ?? ""}
                onChange={(e) =>
                  update("num_dorms", e.target.value === "" ? null : Number(e.target.value))
                }
                className={inputCls}
              />
            </Field>
            <Field label="Metragem">
              <input
                value={form.metragem ?? ""}
                onChange={(e) => update("metragem", e.target.value)}
                placeholder="38m²"
                className={inputCls}
              />
            </Field>
            <Field label="Prazo de entrega">
              <input
                value={form.prazo_entrega ?? ""}
                onChange={(e) => update("prazo_entrega", e.target.value)}
                placeholder="2028"
                className={inputCls}
              />
            </Field>
            <Field label="Varanda">
              <select
                value={form.varanda ? "sim" : "nao"}
                onChange={(e) => update("varanda", e.target.value === "sim")}
                className={inputCls}
              >
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </Field>
            <Field label="Vaga">
              <select
                value={(form.vaga as string) ?? "carro"}
                onChange={(e) => update("vaga", e.target.value as VagaTipo)}
                className={inputCls}
              >
                <option value="carro">Carro</option>
                <option value="moto">Moto</option>
                <option value="sem_vaga">Sem vaga</option>
              </select>
            </Field>
            <Field label="Status">
              <select
                value={(form.status as string) ?? "ativo"}
                onChange={(e) => update("status", e.target.value as EmpreendimentoStatus)}
                className={inputCls}
              >
                <option value="ativo">Ativo</option>
                <option value="em_breve">Em breve</option>
                <option value="inativo">Inativo</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Construtora">
              <input
                value={form.construtora ?? ""}
                onChange={(e) => update("construtora", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Incorporadora">
              <input
                value={form.incorporadora ?? ""}
                onChange={(e) => update("incorporadora", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Financiamento">
              <input
                value={form.financiamento ?? ""}
                onChange={(e) => update("financiamento", e.target.value)}
                placeholder="Caixa Econômica"
                className={inputCls}
              />
            </Field>
            <Field label="URL de mídias">
              <input
                value={form.url_midias ?? ""}
                onChange={(e) => update("url_midias", e.target.value)}
                placeholder="https://..."
                className={inputCls}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-accent"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-[oklch(0.78_0.14_85)] disabled:opacity-60"
            >
              {saving && <Loader2 className="h-3 w-3 animate-spin" />}
              {isEdit ? "Salvar alterações" : "Criar empreendimento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-border bg-input/40 px-3 py-2 text-sm outline-none transition focus:border-primary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
