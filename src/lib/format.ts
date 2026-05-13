export const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

export function formatBRL(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "R$ 0,00";
  return BRL.format(value);
}

export function formatDatePtBr(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatShort(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export function startOfMonthISO(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0);
  return x.toISOString();
}

export function endOfMonthISO(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0);
  return x.toISOString();
}

/** First name for greetings; safe when `nome` is null/empty in the database. */
export function displayFirstName(user: { nome?: string | null; email?: string | null }) {
  const n = user.nome?.trim();
  if (n) {
    const first = n.split(/\s+/)[0];
    if (first) return first;
  }
  const local = user.email?.split("@")[0]?.trim();
  if (local) return local;
  return "você";
}

export function formatWhatsapp(raw?: string | null) {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return raw;
}

/** Apenas dígitos (ex.: payload em APIs / WhatsApp). */
export function whatsappDigits(raw?: string | null): string {
  if (!raw) return "";
  return raw.replace(/\D/g, "");
}
