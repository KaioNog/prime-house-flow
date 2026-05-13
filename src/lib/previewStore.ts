// Preview-mode persistence using localStorage.
// Used when the logged user id starts with "preview-" so the UI works
// without a real Supabase backend during demos.
import type { Empreendimento, Lead, Tarefa } from "@/types/db";

const KEY_EMP = "prime-house-preview-empreendimentos";
const KEY_LEADS = "prime-house-preview-leads";
const KEY_TAREFAS = "prime-house-preview-tarefas";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

// ---------- Empreendimentos ----------
export const SEED_EMP_ID = "preview-emp-vila-eco-jatoba";

const SEED_EMPREENDIMENTOS: Empreendimento[] = [
  {
    id: SEED_EMP_ID,
    nome: "Vila Eco Jatobá",
    descricao:
      "Projeto na divisa entre Barueri e Osasco, entrada em 40x, comissão 50% na venda e o restante no repasse.",
    localizacao: "Rua Pereira Barreto – Jardim Munhoz Júnior, Osasco – SP",
    num_dorms: 2,
    prazo_entrega: "2028",
    metragem: "38m²",
    varanda: false,
    vaga: "carro",
    construtora: "Arbore",
    incorporadora: "Arbore",
    financiamento: "Caixa Econômica",
    url_midias:
      "https://drive.google.com/file/d/1KXlHw10RK18Ok7x70PQstXT56aJQ627L/view?usp=drive_link",
    foto_url: null,
    status: "ativo",
    arquivado: false,
    created_at: new Date().toISOString(),
  },
];

export function getPreviewEmpreendimentos(): Empreendimento[] {
  const list = read<Empreendimento[]>(KEY_EMP, []);
  if (list.length === 0) {
    write(KEY_EMP, SEED_EMPREENDIMENTOS);
    return SEED_EMPREENDIMENTOS;
  }
  return list;
}

export function savePreviewEmpreendimentos(list: Empreendimento[]) {
  write(KEY_EMP, list);
}

// ---------- Leads ----------
const SEED_LEADS: Lead[] = [
  {
    id: "preview-lead-1",
    nome: "Ana Souza",
    whatsapp: "11987654321",
    origem: "meta_ads",
    status: "novo",
    corretor_id: "preview-corretor-1",
    corretor_nome: "Moreno",
    empreendimento_id: SEED_EMP_ID,
    numero_unidade: null,
    conversa_resumo: "Mostrou interesse via Instagram.",
    anotacoes: "",
    created_at: new Date().toISOString(),
  },
  {
    id: "preview-lead-2",
    nome: "Bruno Lima",
    whatsapp: "11912345678",
    origem: "indicacao",
    status: "em_negociacao",
    corretor_id: "preview-corretor-1",
    corretor_nome: "Moreno",
    empreendimento_id: SEED_EMP_ID,
    numero_unidade: "204",
    conversa_resumo: "Indicado pela cliente Marta.",
    anotacoes: "Quer visitar sábado.",
    created_at: new Date().toISOString(),
  },
  {
    id: "preview-lead-3",
    nome: "Carla Mendes",
    whatsapp: "11955554444",
    origem: "panfleto",
    status: "agendado",
    corretor_id: "preview-corretor-2",
    corretor_nome: "Alquimista",
    empreendimento_id: SEED_EMP_ID,
    numero_unidade: null,
    conversa_resumo: "Pegou panfleto na feira.",
    anotacoes: "",
    created_at: new Date().toISOString(),
  },
];

export function getPreviewLeads(): Lead[] {
  const list = read<Lead[]>(KEY_LEADS, []);
  if (list.length === 0) {
    write(KEY_LEADS, SEED_LEADS);
    return SEED_LEADS;
  }
  return list;
}

export function savePreviewLeads(list: Lead[]) {
  write(KEY_LEADS, list);
}

// ---------- Tarefas ----------
export function getPreviewTarefas(): Tarefa[] {
  return read<Tarefa[]>(KEY_TAREFAS, []);
}

export function savePreviewTarefas(list: Tarefa[]) {
  write(KEY_TAREFAS, list);
}

export function isPreviewId(id: string | null | undefined) {
  return Boolean(id && id.startsWith("preview-"));
}

export function newPreviewId(prefix: string) {
  return `preview-${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}
