import type { AppUser } from "@/types/db";

/** Linha vinda do Supabase: schema real usa `corretor_nome`; o app usa `nome`. */
type UsersTableRow = Partial<AppUser> & { corretor_nome?: string | null };

export function mapUserRowToAppUser(row: unknown): AppUser {
  const r = row as UsersTableRow;
  const nome =
    (typeof r.nome === "string" && r.nome.trim() ? r.nome.trim() : "") ||
    (typeof r.corretor_nome === "string" && r.corretor_nome.trim() ? r.corretor_nome.trim() : "") ||
    (typeof r.email === "string" ? r.email.split("@")[0]?.trim() ?? "" : "") ||
    "Usuário";
  return {
    id: r.id as string,
    nome,
    email: r.email as string,
    whatsapp: r.whatsapp,
    tag_whatsapp: r.tag_whatsapp,
    role: r.role as AppUser["role"],
    pontuacao: r.pontuacao ?? 0,
    ativo: r.ativo ?? true,
    posicao_fila: r.posicao_fila ?? null,
    created_at: r.created_at,
  };
}

/** Insert em `public.users` com a coluna `corretor_nome`. */
export function newCorretorRowPayload(input: {
  nome: string;
  email: string;
  whatsapp: string;
  tag_whatsapp: string | null;
  posicao_fila: number;
}) {
  return {
    corretor_nome: input.nome.trim(),
    email: input.email.trim(),
    whatsapp: input.whatsapp,
    tag_whatsapp: input.tag_whatsapp,
    role: "corretor" as const,
    ativo: true,
    pontuacao: 0,
    posicao_fila: input.posicao_fila,
  };
}
