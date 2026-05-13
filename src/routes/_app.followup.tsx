import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { formatWhatsapp, whatsappDigits } from "@/lib/format";
import { WEBHOOK_FOLLOWUP_CONFIG } from "@/lib/n8nEndpoints";
import type { Lead } from "@/types/db";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/followup")({
  component: FollowupPage,
});

type FollowStep = { ordem: number; cadencia_horas: number; mensagem: string };

function defaultSteps(): FollowStep[] {
  return Array.from({ length: 5 }, (_, i) => ({
    ordem: i + 1,
    cadencia_horas: i === 0 ? 24 : 48,
    mensagem: "",
  }));
}

function FollowupPage() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [ativo, setAtivo] = useState(true);
  const [followups, setFollowups] = useState<FollowStep[]>(defaultSteps);
  const [poolIds, setPoolIds] = useState<string[]>([]);
  const [pickLeadId, setPickLeadId] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (user && user.role !== "gestor") navigate({ to: "/home" });
  }, [user, navigate]);

  const load = useCallback(async () => {
    if (!user || user.role !== "gestor") return;
    setLoading(true);
    const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    setAllLeads((data as Lead[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const poolLeads = useMemo(
    () => allLeads.filter((l) => poolIds.includes(l.id)),
    [allLeads, poolIds],
  );

  const availableToAdd = useMemo(
    () => allLeads.filter((l) => !poolIds.includes(l.id)),
    [allLeads, poolIds],
  );

  function addToPool() {
    if (!pickLeadId) return;
    setPoolIds((p) => (p.includes(pickLeadId) ? p : [...p, pickLeadId]));
    setPickLeadId("");
  }

  function removeFromPool(id: string) {
    setPoolIds((p) => p.filter((x) => x !== id));
  }

  function updateStep(i: number, patch: Partial<FollowStep>) {
    setFollowups((prev) => prev.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  }

  async function doSave() {
    setSaving(true);
    try {
      const res = await fetch(WEBHOOK_FOLLOWUP_CONFIG, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ativo,
          followups: followups.map((f) => ({
            ordem: f.ordem,
            cadencia_horas: Math.max(0, Number(f.cadencia_horas) || 0),
            mensagem: f.mensagem.trim(),
          })),
          leads: poolLeads.map((l) => ({
            nome: l.nome,
            whatsapp: whatsappDigits(l.whatsapp) || l.whatsapp,
          })),
        }),
      });
      if (!res.ok) {
        toast.error(`Falha ao salvar (${res.status}).`);
        return;
      }
      toast.success("Configuração de follow-up enviada.");
      setConfirmOpen(false);
    } catch {
      toast.error("Não foi possível conectar ao servidor.");
    } finally {
      setSaving(false);
    }
  }

  if (!user || user.role !== "gestor") return null;

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 lg:p-8">
      <header>
        <h1 className="font-display text-3xl font-bold text-foreground lg:text-4xl">
          Follow-up
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ative o fluxo global e defina até 5 mensagens sequenciais. Salve para sincronizar com o
          n8n.
        </p>
      </header>

      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4">
        <div className="space-y-1">
          <Label htmlFor="fu-ativo" className="text-base font-medium text-foreground">
            Follow-up automático global
          </Label>
          <p className="text-xs text-muted-foreground">
            Quando desativado, o workflow pode ignorar novos disparos automáticos.
          </p>
        </div>
        <Switch id="fu-ativo" checked={ativo} onCheckedChange={setAtivo} />
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 font-display text-lg font-semibold text-foreground">
          Leads em follow-up
        </h2>
        <div className="mb-4 flex flex-wrap gap-2">
          <select
            value={pickLeadId}
            onChange={(e) => setPickLeadId(e.target.value)}
            className="min-w-[200px] flex-1 rounded-lg border border-border bg-input/40 px-3 py-2 text-sm"
          >
            <option value="">Adicionar lead da base…</option>
            {availableToAdd.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome} — {formatWhatsapp(l.whatsapp)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addToPool}
            disabled={!pickLeadId}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Adicionar
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        ) : poolLeads.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
            Nenhum lead na lista. Adicione leads acima.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {poolLeads.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span>
                  <span className="font-medium text-foreground">{l.nome}</span>
                  <span className="ml-2 text-muted-foreground">{formatWhatsapp(l.whatsapp)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => removeFromPool(l.id)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                  aria-label="Remover"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
          Sequência (até 5 follow-ups)
        </h2>
        <div className="space-y-4">
          {followups.map((step, i) => (
            <div
              key={step.ordem}
              className="grid gap-3 rounded-lg border border-border/60 bg-background/40 p-4 sm:grid-cols-[auto_1fr]"
            >
              <div className="flex items-center gap-2 sm:flex-col sm:items-start">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Follow-up
                </span>
                <span className="font-display text-2xl font-bold text-gold">{step.ordem}</span>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Cadência (horas até o próximo)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={step.cadencia_horas}
                    onChange={(e) =>
                      updateStep(i, { cadencia_horas: Number(e.target.value) || 0 })
                    }
                    className="w-32 rounded-lg border border-border bg-input/40 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Mensagem</label>
                  <textarea
                    value={step.mensagem}
                    onChange={(e) => updateStep(i, { mensagem: e.target.value })}
                    rows={3}
                    placeholder='Ex.: Olá {{nome}}, tudo bem?'
                    className="w-full rounded-lg border border-border bg-input/40 p-3 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <button
        type="button"
        disabled={saving}
        onClick={() => setConfirmOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_0_24px_rgba(201,168,76,0.25)] hover:bg-[oklch(0.78_0.14_85)] disabled:opacity-60"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Salvar
      </button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar atualização</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação vai atualizar o workflow de automação. Confirmar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              type="button"
              disabled={saving}
              onClick={() => void doSave()}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-[oklch(0.78_0.14_85)]"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
