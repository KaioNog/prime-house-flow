-- Corretor enxerga leads se:
-- - corretor_id = id em public.users (via current_user_id), ou
-- - corretor_id = auth.uid() (quando users.id = auth.users.id), ou
-- - corretor_id nulo e corretor_nome do lead = corretor_nome do usuário (import / legado).
-- Idempotente: rode no SQL Editor do Supabase.

drop policy if exists leads_select on public.leads;
create policy leads_select on public.leads for select to authenticated using (
  public.is_gestor(auth.jwt() ->> 'email')
  or corretor_id = public.current_user_id()
  or (corretor_id is not null and corretor_id = auth.uid())
  or (
    public.current_user_id() is not null
    and corretor_id is null
    and length(trim(coalesce(corretor_nome, ''))) > 0
    and lower(trim(corretor_nome)) = lower(
      trim(coalesce(
        (select u.corretor_nome from public.users u where u.id = public.current_user_id()),
        ''
      ))
    )
  )
);

drop policy if exists leads_insert on public.leads;
create policy leads_insert on public.leads for insert to authenticated with check (
  public.is_gestor(auth.jwt() ->> 'email')
  or corretor_id = public.current_user_id()
  or (corretor_id is not null and corretor_id = auth.uid())
);

drop policy if exists leads_update on public.leads;
create policy leads_update on public.leads for update to authenticated using (
  public.is_gestor(auth.jwt() ->> 'email')
  or corretor_id = public.current_user_id()
  or (corretor_id is not null and corretor_id = auth.uid())
  or (
    public.current_user_id() is not null
    and corretor_id is null
    and length(trim(coalesce(corretor_nome, ''))) > 0
    and lower(trim(corretor_nome)) = lower(
      trim(coalesce(
        (select u.corretor_nome from public.users u where u.id = public.current_user_id()),
        ''
      ))
    )
  )
) with check (
  public.is_gestor(auth.jwt() ->> 'email')
  or corretor_id = public.current_user_id()
  or (corretor_id is not null and corretor_id = auth.uid())
  or (
    public.current_user_id() is not null
    and corretor_id is null
    and length(trim(coalesce(corretor_nome, ''))) > 0
    and lower(trim(corretor_nome)) = lower(
      trim(coalesce(
        (select u.corretor_nome from public.users u where u.id = public.current_user_id()),
        ''
      ))
    )
  )
);
