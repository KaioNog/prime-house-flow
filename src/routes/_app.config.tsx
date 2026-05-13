import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Loader2, UserPlus, GripVertical, Save, Target, Users as UsersIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { mapUserRowToAppUser, newCorretorRowPayload } from "@/lib/userRow";
import { useUser } from "@/contexts/UserContext";
import type { AppUser } from "@/types/db";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/config")({
  component: ConfigPage,
});

function ConfigPage() {
  const { user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role !== "gestor") navigate({ to: "/home" });
  }, [user, navigate]);

  if (!user || user.role !== "gestor") return null;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 lg:p-10">
      <header>
        <h1 className="font-display text-3xl font-bold text-foreground lg:text-4xl">
          Configurações
        </h1>
        <p className="text-sm text-muted-foreground">Gestão da imobiliária — apenas gestor</p>
      </header>

      <CorretoresSection />
      <MetaSection />
      <FilaSection />
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
  action,
}: {
  icon: typeof UsersIcon;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-gold">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function CorretoresSection() {
  const [list, setList] = useState<AppUser[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("role", "corretor")
      .order("posicao_fila", { ascending: true });
    setList((data ?? []).map(mapUserRowToAppUser));
  }
  useEffect(() => {
    load();
  }, []);

  async function toggleAtivo(c: AppUser) {
    const { error } = await supabase.from("users").update({ ativo: !c.ativo }).eq("id", c.id);
    if (error) return toast.error("Erro ao atualizar.");
    toast.success(c.ativo ? "Corretor desativado" : "Corretor ativado");
    load();
  }

  async function updateFila(c: AppUser, val: number) {
    const { error } = await supabase.from("users").update({ posicao_fila: val }).eq("id", c.id);
    if (error) return toast.error("Erro ao atualizar.");
    load();
  }

  async function removeCorretor(c: AppUser) {
    const ok = window.confirm(
      `Excluir "${c.nome}" (${c.email}) do CRM?\n\nOs leads dele ficam sem corretor vinculado. Se for cadastrar o mesmo email de novo, apague também o usuário em Authentication no Supabase.`,
    );
    if (!ok) return;
    const { error } = await supabase.from("users").delete().eq("id", c.id);
    if (error) {
      toast.error(`Não foi possível excluir: ${error.message}`);
      return;
    }
    toast.success("Corretor removido do CRM.");
    load();
  }

  return (
    <SectionCard
      icon={UsersIcon}
      title="Corretores"
      subtitle="Gerencie a equipe e a fila"
      action={
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-[oklch(0.78_0.14_85)]"
        >
          <UserPlus className="h-4 w-4" /> Adicionar corretor
        </button>
      }
    >
      {!list ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhum corretor cadastrado ainda.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Posição</th>
                <th className="px-3 py-2">Ativo</th>
                <th className="px-3 py-2 w-12" aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="border-b border-border/50 last:border-0">
                  <td className="px-3 py-3 font-medium text-foreground">{c.nome}</td>
                  <td className="px-3 py-3 text-muted-foreground">{c.email}</td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      defaultValue={c.posicao_fila ?? 0}
                      onBlur={(e) => updateFila(c, Number(e.target.value))}
                      className="w-20 rounded-md border border-border bg-input/40 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => toggleAtivo(c)}
                      className={cn(
                        "inline-flex h-6 w-11 items-center rounded-full transition",
                        c.ativo ? "bg-primary" : "bg-muted",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-5 w-5 transform rounded-full bg-background transition",
                          c.ativo ? "translate-x-5" : "translate-x-0.5",
                        )}
                      />
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => removeCorretor(c)}
                      className="rounded-md p-2 text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
                      title="Excluir corretor"
                      aria-label={`Excluir corretor ${c.nome}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <AddCorretorModal onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); load(); }} />}
    </SectionCard>
  );
}

function AddCorretorModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [tag, setTag] = useState("");
  const [senha, setSenha] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome || !email || !whatsapp || !senha) {
      toast.error("Preencha nome, email, whatsapp e senha.");
      return;
    }
    setSaving(true);

    // Try to create the auth user (may fail without service role; user will need to do it manually)
    const { error: authErr } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome } },
    });
    if (authErr && !authErr.message.includes("registered")) {
      toast.error(`Auth: ${authErr.message}`);
      setSaving(false);
      return;
    }

    // Calculate next posicao_fila
    const { data: maxRow } = await supabase
      .from("users")
      .select("posicao_fila")
      .order("posicao_fila", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextPos = (maxRow?.posicao_fila ?? 0) + 1;

    const { error } = await supabase.from("users").insert(
      newCorretorRowPayload({
        nome,
        email,
        whatsapp,
        tag_whatsapp: tag || null,
        posicao_fila: nextPos,
      }),
    );

    setSaving(false);
    if (error) {
      toast.error(`Erro: ${error.message}`);
      return;
    }
    toast.success("Corretor adicionado!");
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="mb-4 font-display text-xl font-bold">Novo corretor</h2>
        <form onSubmit={submit} className="space-y-3">
          {[
            { label: "Nome *", v: nome, set: setNome },
            { label: "Email *", v: email, set: setEmail },
            { label: "WhatsApp *", v: whatsapp, set: setWhatsapp },
            { label: "Tag WhatsApp", v: tag, set: setTag },
          ].map((f) => (
            <div key={f.label}>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{f.label}</label>
              <input
                value={f.v}
                onChange={(e) => f.set(e.target.value)}
                className="w-full rounded-lg border border-border bg-input/40 px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
          ))}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Senha inicial *</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-lg border border-border bg-input/40 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
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
      </div>
    </div>
  );
}

function MetaSection() {
  const [valor, setValor] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("config")
      .select("valor")
      .eq("chave", "meta_mensal_vendas")
      .maybeSingle()
      .then(({ data }) => {
        setValor(String(data?.valor ?? ""));
        setLoading(false);
      });
  }, []);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("config")
      .upsert({ chave: "meta_mensal_vendas", valor }, { onConflict: "chave" });
    setSaving(false);
    if (error) {
      toast.error(
        "Tabela 'config' não encontrada? Crie com: create table config (chave text primary key, valor text);",
      );
      return;
    }
    toast.success("Meta atualizada!");
  }

  return (
    <SectionCard icon={Target} title="Meta da imobiliária" subtitle="Vendas-alvo do mês">
      {loading ? (
        <div className="h-10 w-full animate-pulse rounded bg-muted" />
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Meta mensal de vendas
            </label>
            <input
              type="number"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full rounded-lg border border-border bg-input/40 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-[oklch(0.78_0.14_85)] disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Salvar meta
          </button>
        </div>
      )}
    </SectionCard>
  );
}

function FilaSection() {
  const [list, setList] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("role", "corretor")
      .eq("ativo", true)
      .order("posicao_fila", { ascending: true });
    setList((data ?? []).map(mapUserRowToAppUser));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    setList((prev) => {
      const oldIdx = prev.findIndex((p) => p.id === e.active.id);
      const newIdx = prev.findIndex((p) => p.id === e.over!.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
  }

  async function persist() {
    setSaving(true);
    const updates = list.map((c, i) =>
      supabase.from("users").update({ posicao_fila: i + 1 }).eq("id", c.id),
    );
    const results = await Promise.all(updates);
    setSaving(false);
    if (results.some((r) => r.error)) {
      toast.error("Erro ao salvar a fila.");
      return;
    }
    toast.success("Fila atualizada!");
    load();
  }

  const proximo = list[0];

  return (
    <SectionCard
      icon={UsersIcon}
      title="Fila de atendimento (roleta)"
      subtitle="Arraste para reordenar"
      action={
        <button
          onClick={persist}
          disabled={saving || list.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-[oklch(0.78_0.14_85)] disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Salvar ordem
        </button>
      }
    >
      {proximo && (
        <div className="mb-4 rounded-lg border border-primary/40 bg-primary/10 p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Próximo na fila</p>
          <p className="font-display text-xl font-bold text-gold">{proximo.nome}</p>
          <p className="text-xs text-muted-foreground">{proximo.whatsapp}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhum corretor ativo na fila.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={list.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {list.map((c, i) => (
                <SortableRow key={c.id} user={c} index={i} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </SectionCard>
  );
}

function SortableRow({ user, index }: { user: AppUser; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: user.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3",
        isDragging && "ring-2 ring-primary",
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground"
        aria-label="Arrastar"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="w-8 text-center text-sm font-semibold text-gold">{index + 1}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{user.nome}</p>
        <p className="text-xs text-muted-foreground">{user.whatsapp}</p>
      </div>
    </li>
  );
}
