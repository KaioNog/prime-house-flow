

# Prime House CRM — Fase 1 (Núcleo)

Sistema interno em tema dark dourado para a imobiliária. Esta fase entrega o núcleo funcional; Clientes, Empreendimentos, Metas e Tarefas virão em fases seguintes.

## Stack
- TanStack Start + React + TypeScript
- Supabase próprio (você fornecerá `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`)
- @dnd-kit para Kanban e reordenar fila, react-confetti para o modal de venda, lucide-react, sonner (toasts)
- Realtime do Supabase em `leads` e `users`

## Design System
- Fundo `#0a0a0f`, cards `#13131a`, borda `#1e1e2e`
- Primária dourada `#c9a84c` (hover `#e2c06a`)
- Sucesso/Perigo/Alerta: `#22c55e` / `#ef4444` / `#f97316`
- Tipografia: Playfair Display (títulos) + DM Sans (corpo) via Google Fonts
- Cards radius 12px, inputs 8px, sombras suaves
- Skeletons, empty states amigáveis e toasts globais

## Autenticação e contexto
- `/login`: logo "Prime House" + tagline, formulário email/senha, botão dourado, validação e toast de erro genérico
- Login via Supabase Auth (`signInWithPassword`); após sucesso, busca o registro em `users` por email
- `UserContext` global: `id, nome, email, role, pontuacao, ativo, posicao_fila`
- Guarda de rotas: rotas privadas redirecionam para `/login` se não autenticado
- `corretor` vê só seus dados; `gestor` vê tudo e tem acesso a `/config`
- Sidebar colapsável com avatar, nome, role e botão Sair

## Telas da Fase 1

### `/home` — Dashboard
- Boas-vindas "Olá, [nome]" + data atual em PT-BR
- 4 cards de resumo do usuário: Leads ativos, Vendas no mês, Comissão do mês, Tarefas pendentes
- Ranking gamificado dos corretores ativos por `pontuacao` (🥇🥈🥉, destaque dourado para 1º, borda dourada na linha do usuário logado)
- Barra de progresso da meta da imobiliária no mês (lê chave `meta_mensal_vendas` da tabela `config`)

### `/crm` — Kanban
- 6 colunas mapeadas a `leads.status`: Novo, Em Negociação, Documentação OK, Agendado, Canetado, Perdido
- Cards com nome, WhatsApp, empreendimento, badge de origem, data
- Drag and drop com `@dnd-kit`; atualização otimista do `status`
- Mover para **Canetado** → modal de parabéns com confetti e formulário de venda (valor, comissão total, comissão corretor) → grava em `clientes`
- Mover para **Agendado** → POST em background para `${VITE_N8N_WEBHOOK_URL}/agenda` (placeholder configurável; falha não bloqueia)
- Drawer lateral ao clicar no card: todos os campos do lead, `conversa_resumo` editável, lista de `tarefas` vinculadas
- Filtros persistentes: corretor (só gestor), empreendimento, origem
- Botão "Novo Lead" com modal (nome, whatsapp, origem, empreendimento)
- Realtime em `leads`

### `/config` — Configurações (apenas gestor)
- **Corretores**: lista com toggle de `ativo`, edição de `posicao_fila`; botão "Adicionar corretor" (cria via Supabase Auth + insert em `users` com `role='corretor'`, `pontuacao=0`)
- **Meta da imobiliária**: input numérico que salva chave `meta_mensal_vendas` na tabela `config`
- **Fila de atendimento**: tabela ordenada por `posicao_fila` com drag and drop para reordenar; card "Próximo na fila"

## Comportamentos globais
- Realtime nas entidades-chave (Kanban e ranking atualizam sem refresh)
- Skeletons em todas as listas/cards durante carregamento
- Empty states com ícone + microcopy amigável
- Toasts (sonner) no topo direito: sucesso/erro/aviso
- Responsivo: sidebar vira drawer no mobile; Kanban vira rolagem horizontal

## Configuração necessária
Antes de rodar você precisará definir nas variáveis de ambiente:
- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (seu Supabase próprio)
- `VITE_N8N_WEBHOOK_URL` (placeholder; pode deixar vazio inicialmente)

O frontend assume que as tabelas (`users`, `empreendimentos`, `leads`, `clientes`, `metas`, `tarefas`, `pontuacao_log`, `atendimentos_escalados`) e as triggers já existem no seu Supabase. Será criada uma tabela simples `config (chave text primary key, valor text)` — caso ela ainda não exista, eu deixo o SQL pronto para você rodar no seu projeto Supabase.

## Próximas fases (depois da v1)
- `/clientes` com upload de PDFs ao Storage
- `/empreendimentos` (CRUD para gestor, grid de cards para corretor)
- `/metas` individuais e coletivas com histórico
- `/tarefas` com vinculação a leads

