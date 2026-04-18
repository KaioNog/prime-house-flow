import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anon) {
  // Don't throw — let the UI surface a friendly message.
  // eslint-disable-next-line no-console
  console.warn(
    "[Prime House CRM] Faltam VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY nas variáveis de ambiente.",
  );
}

export const supabase = createClient(url ?? "https://invalid.supabase.co", anon ?? "invalid", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: "prime-house-crm-auth",
  },
});

export const supabaseConfigured = Boolean(url && anon);

export const N8N_WEBHOOK_URL = (import.meta.env.VITE_N8N_WEBHOOK_URL as string | undefined) ?? "";
