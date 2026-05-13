import { useState, useEffect } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { WEBHOOK_IMPORT_LEADS } from "@/lib/n8nEndpoints";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function ImportLeadsModal({ open, onOpenChange, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setBusy(false);
    }
  }, [open]);

  async function handleSubmit() {
    if (!file) {
      toast.error("Selecione um arquivo CSV ou XLSX.");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(WEBHOOK_IMPORT_LEADS, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        toast.error(`Falha no envio (${res.status}). Tente novamente.`);
        setBusy(false);
        return;
      }
      toast.success("Importação concluída.");
      setFile(null);
      onSuccess();
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível conectar ao servidor de importação.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Importar leads</DialogTitle>
        </DialogHeader>
        {busy ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10">
            <Loader2 className="h-10 w-10 animate-spin text-gold" />
            <p className="text-sm text-muted-foreground">Processando leads...</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Arquivo (.csv, .xlsx, .xls)
              </label>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-input/20 px-4 py-8 transition hover:border-primary/40">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-foreground">
                  {file ? file.name : "Clique para escolher arquivo"}
                </span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  className="sr-only"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!file}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(201,168,76,0.2)] hover:bg-[oklch(0.78_0.14_85)] disabled:opacity-50"
              >
                Enviar
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
