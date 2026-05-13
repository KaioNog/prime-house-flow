// Lightweight types matching the existing Supabase schema (frontend-only).
export type UserRole = "corretor" | "gestor";

export interface AppUser {
  id: string;
  /** Nome de exibição; no Supabase a coluna costuma ser `corretor_nome`. */
  nome: string;
  email: string;
  whatsapp?: string | null;
  tag_whatsapp?: string | null;
  role: UserRole;
  pontuacao: number;
  ativo: boolean;
  posicao_fila: number | null;
  created_at?: string;
}

export type LeadStatus =
  | "novo"
  | "em_negociacao"
  | "documentacao_ok"
  | "agendado"
  | "canetado"
  | "perdido";

export type LeadOrigem = "meta_ads" | "site" | "indicacao" | "panfleto" | "cartaz";

export interface Lead {
  id: string;
  nome: string;
  whatsapp: string;
  origem: LeadOrigem | string;
  status: LeadStatus | string;
  corretor_id: string | null;
  /** Nome do corretor responsável (coluna no Supabase; pode redundar com users). */
  corretor_nome?: string | null;
  empreendimento_id: string | null;
  numero_unidade?: string | null;
  conversa_resumo?: string | null;
  anotacoes?: string | null;
  created_at: string;
  updated_at?: string;
}

export type EmpreendimentoStatus = "ativo" | "em_breve" | "inativo";
export type VagaTipo = "carro" | "moto" | "sem_vaga";

export interface Empreendimento {
  id: string;
  nome: string;
  descricao?: string | null;
  localizacao?: string | null;
  num_dorms?: number | null;
  prazo_entrega?: string | null;
  metragem?: string | null;
  varanda?: boolean | null;
  vaga?: VagaTipo | string | null;
  construtora?: string | null;
  incorporadora?: string | null;
  financiamento?: string | null;
  url_midias?: string | null;
  foto_url?: string | null;
  status?: EmpreendimentoStatus | string | null;
  arquivado?: boolean | null;
  endereco?: string | null;
  created_at?: string;
}

export interface Cliente {
  id: string;
  lead_id: string;
  corretor_id: string | null;
  valor_venda: number | null;
  comissao_total: number | null;
  comissao_corretor: number | null;
  arquivos?: string[] | null;
  created_at: string;
}

export interface Tarefa {
  id: string;
  corretor_id: string | null;
  lead_id: string | null;
  titulo: string;
  descricao?: string | null;
  prazo: string | null;
  concluida: boolean;
  created_at: string;
}

export interface AtendimentoEscalado {
  id: string;
  corretor_id: string;
  lead_id?: string | null;
  status: string;
  created_at: string;
}
