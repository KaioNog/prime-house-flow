-- Corrige correspondência de email entre JWT (Auth) e public.users
-- quando há diferença de maiúsculas/minúsculas — evita corretor sem current_user_id()
-- e is_gestor() falso para gestores.
-- Rode no SQL Editor do Supabase (idempotente).

create or replace function public.is_gestor(_email text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.users
    where lower(email) = lower(trim(_email))
      and role = 'gestor'
      and ativo = true
  );
$$;

create or replace function public.current_user_id()
returns uuid language sql stable security definer set search_path=public as $$
  select id from public.users
  where lower(email) = lower(trim(auth.jwt() ->> 'email'));
$$;
