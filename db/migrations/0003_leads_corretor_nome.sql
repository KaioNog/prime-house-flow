-- Nome do corretor denormalizado em leads (ex.: para listagens e histórico).
-- Idempotente.

alter table public.leads add column if not exists corretor_nome text;
