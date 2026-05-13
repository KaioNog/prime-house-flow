-- =========================================================
-- Prime House CRM — Migration inicial (Fase 1)
-- Rode este script no SQL Editor do seu projeto Supabase.
-- Idempotente: pode ser executado mais de uma vez.
-- =========================================================

create extension if not exists "pgcrypto";

-- ENUMs ---------------------------------------------------
do $$ begin
  create type user_role as enum ('corretor','gestor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lead_status as enum (
    'novo','em_negociacao','documentacao_ok','agendado','canetado','perdido'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type lead_origem as enum ('meta_ads','site','indicacao','panfleto','cartaz');
exception when duplicate_object then null; end $$;

do $$ begin
  create type empreendimento_status as enum ('ativo','em_breve','inativo');
exception when duplicate_object then null; end $$;

do $$ begin
  create type vaga_tipo as enum ('carro','moto','sem_vaga');
exception when duplicate_object then null; end $$;

-- USERS ---------------------------------------------------
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null unique,
  whatsapp text,
  tag_whatsapp text,
  role user_role not null default 'corretor',
  pontuacao integer not null default 0,
  ativo boolean not null default true,
  posicao_fila integer,
  created_at timestamptz not null default now()
);

-- EMPREENDIMENTOS -----------------------------------------
create table if not exists public.empreendimentos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  localizacao text,
  endereco text,
  num_dorms integer,
  prazo_entrega text,
  metragem text,
  varanda boolean default false,
  vaga vaga_tipo default 'sem_vaga',
  construtora text,
  incorporadora text,
  financiamento text,
  url_midias text,
  foto_url text,
  status empreendimento_status default 'ativo',
  arquivado boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.empreendimentos add column if not exists metragem text;
alter table public.empreendimentos add column if not exists varanda boolean default false;
alter table public.empreendimentos add column if not exists vaga vaga_tipo default 'sem_vaga';
alter table public.empreendimentos add column if not exists construtora text;
alter table public.empreendimentos add column if not exists incorporadora text;
alter table public.empreendimentos add column if not exists financiamento text;
alter table public.empreendimentos add column if not exists url_midias text;
alter table public.empreendimentos add column if not exists foto_url text;
alter table public.empreendimentos add column if not exists status empreendimento_status default 'ativo';
alter table public.empreendimentos add column if not exists arquivado boolean not null default false;
alter table public.empreendimentos add column if not exists prazo_entrega text;
alter table public.empreendimentos add column if not exists num_dorms integer;
alter table public.empreendimentos add column if not exists endereco text;

-- LEADS ---------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  whatsapp text not null,
  origem lead_origem not null default 'site',
  status lead_status not null default 'novo',
  corretor_id uuid references public.users(id) on delete set null,
  empreendimento_id uuid references public.empreendimentos(id) on delete set null,
  numero_unidade text,
  conversa_resumo text,
  anotacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leads add column if not exists numero_unidade text;
alter table public.leads add column if not exists anotacoes text;
alter table public.leads add column if not exists updated_at timestamptz not null default now();

create index if not exists leads_corretor_idx on public.leads(corretor_id);
create index if not exists leads_status_idx on public.leads(status);
create index if not exists leads_empreendimento_idx on public.leads(empreendimento_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists leads_touch_updated on public.leads;
create trigger leads_touch_updated
  before update on public.leads
  for each row execute function public.touch_updated_at();

-- CLIENTES ------------------------------------------------
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  corretor_id uuid references public.users(id) on delete set null,
  valor_venda numeric(14,2),
  comissao_total numeric(14,2),
  comissao_corretor numeric(14,2),
  arquivos text[],
  created_at timestamptz not null default now()
);

-- TAREFAS -------------------------------------------------
create table if not exists public.tarefas (
  id uuid primary key default gen_random_uuid(),
  corretor_id uuid references public.users(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  titulo text not null,
  descricao text,
  prazo timestamptz,
  concluida boolean not null default false,
  created_at timestamptz not null default now()
);

-- ATENDIMENTOS ESCALADOS ----------------------------------
create table if not exists public.atendimentos_escalados (
  id uuid primary key default gen_random_uuid(),
  corretor_id uuid not null references public.users(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  status text not null default 'pendente',
  created_at timestamptz not null default now()
);

-- CONFIG --------------------------------------------------
create table if not exists public.config (
  chave text primary key,
  valor text
);
insert into public.config(chave, valor) values ('meta_mensal_vendas','30')
on conflict (chave) do nothing;

-- RLS -----------------------------------------------------
alter table public.users enable row level security;
alter table public.empreendimentos enable row level security;
alter table public.leads enable row level security;
alter table public.clientes enable row level security;
alter table public.tarefas enable row level security;
alter table public.atendimentos_escalados enable row level security;
alter table public.config enable row level security;

create or replace function public.is_gestor(_email text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (select 1 from public.users where email=_email and role='gestor' and ativo=true);
$$;

create or replace function public.current_user_id()
returns uuid language sql stable security definer set search_path=public as $$
  select id from public.users where email = (auth.jwt() ->> 'email');
$$;

drop policy if exists users_select on public.users;
create policy users_select on public.users for select to authenticated using (true);
drop policy if exists users_modify on public.users;
create policy users_modify on public.users for all to authenticated
  using (public.is_gestor(auth.jwt() ->> 'email'))
  with check (public.is_gestor(auth.jwt() ->> 'email'));

drop policy if exists emp_select on public.empreendimentos;
create policy emp_select on public.empreendimentos for select to authenticated using (true);
drop policy if exists emp_modify on public.empreendimentos;
create policy emp_modify on public.empreendimentos for all to authenticated
  using (public.is_gestor(auth.jwt() ->> 'email'))
  with check (public.is_gestor(auth.jwt() ->> 'email'));

drop policy if exists leads_select on public.leads;
create policy leads_select on public.leads for select to authenticated using (
  public.is_gestor(auth.jwt() ->> 'email') or corretor_id = public.current_user_id()
);
drop policy if exists leads_insert on public.leads;
create policy leads_insert on public.leads for insert to authenticated with check (
  public.is_gestor(auth.jwt() ->> 'email') or corretor_id = public.current_user_id()
);
drop policy if exists leads_update on public.leads;
create policy leads_update on public.leads for update to authenticated using (
  public.is_gestor(auth.jwt() ->> 'email') or corretor_id = public.current_user_id()
);
drop policy if exists leads_delete on public.leads;
create policy leads_delete on public.leads for delete to authenticated
  using (public.is_gestor(auth.jwt() ->> 'email'));

drop policy if exists clientes_select on public.clientes;
create policy clientes_select on public.clientes for select to authenticated using (
  public.is_gestor(auth.jwt() ->> 'email') or corretor_id = public.current_user_id()
);
drop policy if exists clientes_insert on public.clientes;
create policy clientes_insert on public.clientes for insert to authenticated with check (
  public.is_gestor(auth.jwt() ->> 'email') or corretor_id = public.current_user_id()
);

drop policy if exists tarefas_all on public.tarefas;
create policy tarefas_all on public.tarefas for all to authenticated
  using (public.is_gestor(auth.jwt() ->> 'email') or corretor_id = public.current_user_id())
  with check (public.is_gestor(auth.jwt() ->> 'email') or corretor_id = public.current_user_id());

drop policy if exists atend_all on public.atendimentos_escalados;
create policy atend_all on public.atendimentos_escalados for all to authenticated
  using (public.is_gestor(auth.jwt() ->> 'email') or corretor_id = public.current_user_id())
  with check (public.is_gestor(auth.jwt() ->> 'email') or corretor_id = public.current_user_id());

drop policy if exists config_select on public.config;
create policy config_select on public.config for select to authenticated using (true);
drop policy if exists config_modify on public.config;
create policy config_modify on public.config for all to authenticated
  using (public.is_gestor(auth.jwt() ->> 'email'))
  with check (public.is_gestor(auth.jwt() ->> 'email'));

-- REALTIME (ignore o erro se a tabela já estiver na publication)
alter publication supabase_realtime add table public.leads;
alter publication supabase_realtime add table public.users;
