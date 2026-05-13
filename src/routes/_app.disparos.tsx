import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { formatShort, formatWhatsapp, whatsappDigits } from "@/lib/format";
import { WEBHOOK_DISPARO, MAX_DISPARO_MEDIA_BYTES } from "@/lib/n8nEndpoints";
import type { Lead, Empreendimento } from "@/types/db";
import { cn } from "@/lib/utils";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = r.result as string;
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    r.onerror = () => reject(new Error("read"));
    r.readAsDataURL(file);
  });
}

export const Route = createFileRoute("/_app/disparos")({
  component: DisparosPage,
});

const COLUMNS: { key: string; label: string }[] = [
  { key: "novo", label: "Novo" },
  { key: "em_negociacao", label: "Em Negociação" },
  { key: "documentacao_ok", label: "Doc. OK" },
  { key: "agendado", label: "Agendado" },
  { key: "canetado", label: "Canetado" },
  { key: "perdido", label: "Perdido" },
];

function DisparosPage() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEmp, setFilterEmp] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mensagem, setMensagem] = useState("");
  const [midiaFile, setMidiaFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  const tableWrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    phase: "idle" | "maybe" | "marquee";
  }>({ x1: 0, y1: 0, x2: 0, y2: 0, phase: "idle" });
  const [marquee, setMarquee] = useState<{ l: number; t: number; w: number; h: number } | null>(
    null,
  );

  useEffect(() => {
    if (user && user.role !== "gestor") navigate({ to: "/home" });
  }, [user, navigate]);

  const load = useCallback(async () => {
    if (!user || user.role !== "gestor") return;
    setLoading(true);
    const [{ data: ld }, { data: em }] = await Promise.all([
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      supabase.from("empreendimentos").select("*"),
    ]);
    setLeads((ld as Lead[]) ?? []);
    setEmpreendimentos((em as Empreendimento[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const empMap = useMemo(
    () => new Map(empreendimentos.map((e) => [e.id, e.nome])),
    [empreendimentos],
  );

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (filterEmp && l.empreendimento_id !== filterEmp) return false;
      if (filterStatus && l.status !== filterStatus) return false;
      return true;
    });
  }, [leads, filterEmp, filterStatus]);

  function clearMarqueeListeners() {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  }

  function onPointerMove(e: PointerEvent) {
    const d = dragRef.current;
    if (d.phase === "idle") return;
    const dist = Math.hypot(e.clientX - d.x1, e.clientY - d.y1);
    if (dist > 5) d.phase = "marquee";
    d.x2 = e.clientX;
    d.y2 = e.clientY;
    if (d.phase === "marquee") {
      const l = Math.min(d.x1, d.x2);
      const t = Math.min(d.y1, d.y2);
      const w = Math.abs(d.x2 - d.x1);
      const h = Math.abs(d.y2 - d.y1);
      setMarquee({ l, t, w, h });
    }
  }

  function onPointerUp(e: PointerEvent) {
    clearMarqueeListeners();
    const d = dragRef.current;
    const { x1, y1, x2, y2, phase } = d;
    d.phase = "idle";
    setMarquee(null);

    if (phase === "marquee") {
      const l = Math.min(x1, x2);
      const t = Math.min(y1, y2);
      const r = Math.max(x1, x2);
      const b = Math.max(y1, y2);
      const hits: string[] = [];
      tableWrapRef.current?.querySelectorAll("tr[data-lead-id]").forEach((node) => {
        const id = node.getAttribute("data-lead-id");
        if (!id) return;
        const rect = node.getBoundingClientRect();
        if (l < rect.right && r > rect.left && t < rect.bottom && b > rect.top) hits.push(id);
      });
      setSelectedIds((prev) => [...new Set([...prev, ...hits])]);
      return;
    }

    const el = document.elementFromPoint(x1, y1);
    const tr = el?.closest("tr[data-lead-id]");
    const id = tr?.getAttribute("data-lead-id");
    if (id) {
      setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    }
  }

  function onTablePointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    const t = e.target as HTMLElement;
    if (t.closest("button, input, textarea, select, a, option")) return;
    dragRef.current = {
      x1: e.clientX,
      y1: e.clientY,
      x2: e.clientX,
      y2: e.clientY,
      phase: "maybe",
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  useEffect(() => () => clearMarqueeListeners(), []);

  async function handleMidiaChange(f: File | null) {
    if (!f) {
      setMidiaFile(null);
      return;
    }
    if (f.size > MAX_DISPARO_MEDIA_BYTES) {
      toast.error(
        "O arquivo ultrapassa 100 MB. Otimize o tamanho (compacte o vídeo ou reduza a resolução) e tente novamente.",
      );
      return;
    }
    setMidiaFile(f);
  }

  async function iniciarDisparo() {
    if (!mensagem.trim()) {
      toast.error("Digite a mensagem do disparo.");
      return;
    }
    const chosen = leads.filter((l) => selectedIds.includes(l.id));
    if (chosen.length === 0) {
      toast.error("Selecione ao menos um lead.");
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    const corretor_id = auth.user?.id;
    if (!corretor_id) {
      toast.error("Sessão inválida. Faça login novamente.");
      return;
    }

    let midia_base64: string | null = null;
    let midia_tipo: "imagem" | "video" | null = null;
    if (midiaFile) {
      midia_base64 = await fileToBase64(midiaFile);
      if (midiaFile.type.startsWith("image/")) midia_tipo = "imagem";
      else if (midiaFile.type.startsWith("video/")) midia_tipo = "video";
    }

    setSending(true);
    try {
      const res = await fetch(WEBHOOK_DISPARO, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          corretor_id,
          mensagem: mensagem.trim(),
          midia_base64,
          midia_tipo,
          leads: chosen.map((l) => ({
            nome: l.nome,
            whatsapp: whatsappDigits(l.whatsapp) || l.whatsapp,
          })),
        }),
      });
      if (!res.ok) {
        toast.error(`Falha ao enviar (${res.status}).`);
        return;
      }
      toast.success(`Disparo enviado para ${chosen.length} lead(s).`);
      setSelectedIds([]);
      setMensagem("");
      setMidiaFile(null);
    } catch {
      toast.error("Não foi possível conectar ao servidor.");
    } finally {
      setSending(false);
    }
  }

  if (!user || user.role !== "gestor") return null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 lg:p-8">
      <header>
        <h1 className="font-display text-3xl font-bold text-foreground lg:text-4xl">
          Disparos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Selecione leads, redija a mensagem e envie para o fluxo automatizado.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <select
          value={filterEmp}
          onChange={(e) => setFilterEmp(e.target.value)}
          className="rounded-lg border border-border bg-input/40 px-3 py-2 text-sm"
        >
          <option value="">Todos empreendimentos</option>
          {empreendimentos.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-border bg-input/40 px-3 py-2 text-sm"
        >
          <option value="">Todos status</option>
          {COLUMNS.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setSelectedIds([])}
          className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"
        >
          Limpar seleção ({selectedIds.length})
        </button>
      </div>

      <div
        ref={tableWrapRef}
        className="relative overflow-x-auto rounded-xl border border-border bg-card"
        onPointerDown={onTablePointerDown}
      >
        {marquee && (
          <div
            className="pointer-events-none fixed z-20 border-2 border-primary bg-primary/15"
            style={{ left: marquee.l, top: marquee.t, width: marquee.w, height: marquee.h }}
          />
        )}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">WhatsApp</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Empreendimento</th>
                <th className="px-3 py-2">Criado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr
                  key={l.id}
                  data-lead-id={l.id}
                  className={cn(
                    "cursor-default border-b border-border/50 transition",
                    selectedIds.includes(l.id) ? "bg-primary/15 ring-1 ring-inset ring-primary/40" : "hover:bg-muted/20",
                  )}
                >
                  <td className="px-3 py-2 font-medium text-foreground">{l.nome}</td>
                  <td className="px-3 py-2 text-muted-foreground">{formatWhatsapp(l.whatsapp)}</td>
                  <td className="px-3 py-2 capitalize text-muted-foreground">
                    {String(l.status).replace(/_/g, " ")}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {empMap.get(l.empreendimento_id ?? "") ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{formatShort(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Dica: arraste o mouse sobre as linhas para selecionar várias de uma vez; clique em uma linha
        para marcar ou desmarcar.
      </p>

      <div className="space-y-4 rounded-xl border border-border bg-card p-5">
        <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Mensagem
        </label>
        <textarea
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          rows={5}
          placeholder="Texto do disparo…"
          className="w-full rounded-lg border border-border bg-input/40 p-3 text-sm outline-none focus:border-primary"
        />
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Mídia opcional (foto ou vídeo, máx. 100 MB)
          </label>
          <input
            type="file"
            accept="image/*,video/*"
            onChange={(e) => void handleMidiaChange(e.target.files?.[0] ?? null)}
            className="text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-secondary file:px-3 file:py-1.5 file:text-sm"
          />
          {midiaFile && (
            <p className="mt-1 text-xs text-muted-foreground">Selecionado: {midiaFile.name}</p>
          )}
        </div>
        <button
          type="button"
          disabled={sending}
          onClick={() => void iniciarDisparo()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_0_24px_rgba(201,168,76,0.25)] hover:bg-[oklch(0.78_0.14_85)] disabled:opacity-60"
        >
          {sending && <Loader2 className="h-4 w-4 animate-spin" />}
          Iniciar Disparo
        </button>
      </div>
    </div>
  );
}
