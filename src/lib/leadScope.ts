/**
 * Filtro PostgREST `.or()`: leads do corretor por `corretor_id`
 * ou, se `corretor_id` for nulo, por `corretor_nome` (igual ao nome do usuário, sem diferenciar maiúsculas).
 */
export function corretorOwnedLeadsOr(corretorUserId: string, nomeExibicao?: string | null): string {
  const idClause = `corretor_id.eq.${corretorUserId}`;
  const nome = nomeExibicao?.trim();
  if (!nome) return idClause;
  const safe = nome.replace(/"/g, '""').replace(/[*%]/g, "");
  if (!safe) return idClause;
  return `${idClause},and(corretor_id.is.null,corretor_nome.ilike."${safe}")`;
}

export function leadBelongsToCorretor(
  lead: { corretor_id: string | null; corretor_nome?: string | null },
  user: { id: string; nome: string },
): boolean {
  if (lead.corretor_id === user.id) return true;
  if (lead.corretor_id != null) return false;
  const a = lead.corretor_nome?.trim().toLowerCase();
  const b = user.nome?.trim().toLowerCase();
  return Boolean(a && b && a === b);
}
