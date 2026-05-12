-- ════════════════════════════════════════════════════════
--  GRUPO CAPTAR — Supabase Schema Setup
--  Cole este script no SQL Editor do seu projeto Supabase
--  (https://supabase.com → seu projeto → SQL Editor)
-- ════════════════════════════════════════════════════════

-- ── LEADS ──────────────────────────────────────────────
create table if not exists leads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade,
  nome        text not null,
  tel         text default '—',
  email       text default '—',
  tipo        text default '',
  valor       text default 'A definir',
  origem      text default 'Site',
  coluna      text default 'novo',   -- novo | contato | negociacao | fechado
  dias        int  default 0,
  cor         text default '#6366f1',
  created_at  timestamptz default now()
);

-- ── IMÓVEIS ────────────────────────────────────────────
create table if not exists imoveis (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade,
  titulo      text not null,
  endereco    text default '',
  preco       text default '',
  quartos     int  default 0,
  banheiros   int  default 1,
  area        text default '',
  status      text default 'Ativo',
  "statusClass" text default 'status-novo',
  emoji       text default '🏠',
  grad        text default 'linear-gradient(135deg,#1e1b4b,#312e81)',
  created_at  timestamptz default now()
);

-- ── LOCAÇÕES ───────────────────────────────────────────
create table if not exists locacoes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade,
  inquilino   text not null,
  imovel      text default '',
  valor       numeric default 0,
  dia         int    default 10,
  status      text   default 'pendente',  -- pago | pendente | atrasado | avencer
  inicio      text   default '',
  fim         text   default '',
  cor         text   default '#6366f1',
  created_at  timestamptz default now()
);

-- ── VISITAS ────────────────────────────────────────────
create table if not exists visitas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade,
  imovel      text default '',
  cliente     text not null,
  data        text default '',
  hora        text default '',
  status      text default 'agendada',  -- agendada | realizada | cancelada
  corretor    text default '',
  emoji       text default '🏠',
  grad        text default 'linear-gradient(135deg,#1e1b4b,#312e81)',
  created_at  timestamptz default now()
);

-- ── TRANSAÇÕES ─────────────────────────────────────────
create table if not exists transacoes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade,
  tipo        text    not null,  -- entrada | saida
  descricao   text    default '',
  valor       numeric default 0,
  categoria   text    default '',
  data        text    default '',
  created_at  timestamptz default now()
);

-- ── TAREFAS ────────────────────────────────────────────
create table if not exists tarefas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade,
  nome        text not null,
  meta        text default '',
  hora        text default '',
  done        boolean default false,
  created_at  timestamptz default now()
);

-- ── EVENTOS DO CALENDÁRIO ──────────────────────────────
create table if not exists cal_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade,
  date        text not null,   -- formato: YYYY-MM-DD
  title       text default '',
  time        text default '',
  type        text default 'evento',  -- visita | locacao | contrato | reuniao | followup
  color       text default '#3b82f6',
  created_at  timestamptz default now()
);

-- ── CORRETORES ─────────────────────────────────────────
create table if not exists corretores (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users on delete cascade,
  nome          text not null,
  creci         text default '',
  especialidade text default '',
  tel           text default '',
  email         text default '',
  created_at    timestamptz default now()
);
alter table corretores enable row level security;
create policy "corretores_own" on corretores for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── CAMPO TEL EM LOCACOES (rode se ainda não tiver) ────
alter table locacoes add column if not exists tel text default '';

-- ── CAMPO CORRETOR EM IMOVEIS ──────────────────────────
alter table imoveis add column if not exists corretor text default '';

-- ── CAMPO URL_SITE EM IMOVEIS ──────────────────────────
alter table imoveis add column if not exists url_site text default '';

-- ── LOTEAMENTOS E EMPREENDIMENTOS ──────────────────────
create table if not exists loteamentos (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid references auth.users on delete cascade,
  nome                 text not null,
  tipo                 text default 'loteamento',   -- loteamento | condominio | vertical | comercial | haras | industrial
  status               text default 'lancamento',   -- lancamento | obras | pronto | encerrado
  incorporadora        text default '',
  cidade               text default '',
  estado               text default '',
  endereco             text default '',
  total_unidades       int  default 0,
  unidades_disponiveis int  default 0,
  preco_min            text default '',
  preco_max            text default '',
  vgv                  text default '',
  area_total           text default '',
  previsao_entrega     text default '',
  corretor             text default '',
  url_site             text default '',
  descricao            text default '',
  created_at           timestamptz default now()
);
alter table loteamentos enable row level security;
create policy "loteamentos_own" on loteamentos for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── ASSINATURAS (gerenciado pelo admin Grupo Captar) ───
create table if not exists assinaturas (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users on delete set null,
  nome             text not null,
  email            text not null,
  plano            text default 'Alta Performance',
  valor            numeric default 897,
  dia_venc         int  default 1,
  status           text default 'pendente',   -- pago | pendente | atrasado
  inicio           text default '',
  ultimo_pagamento text default '',
  observacao       text default '',
  created_at       timestamptz default now()
);

-- ════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY — cada usuário vê só seus dados
-- ════════════════════════════════════════════════════════
alter table leads       enable row level security;
alter table imoveis     enable row level security;
alter table locacoes    enable row level security;
alter table visitas     enable row level security;
alter table transacoes  enable row level security;
alter table tarefas     enable row level security;
alter table cal_events  enable row level security;
alter table assinaturas enable row level security;

-- Políticas: somente o dono lê/escreve seus registros
create policy "leads_own"       on leads       for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "imoveis_own"     on imoveis     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "locacoes_own"    on locacoes    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "visitas_own"     on visitas     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transacoes_own"  on transacoes  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tarefas_own"     on tarefas     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cal_events_own"  on cal_events  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Assinaturas: cliente lê a própria, admin gerencia todas
create policy "assinaturas_select_own"
  on assinaturas for select
  using (auth.uid() = user_id);

create policy "assinaturas_admin_all"
  on assinaturas for all
  using  ((auth.jwt()->'user_metadata'->>'role') = 'admin')
  with check ((auth.jwt()->'user_metadata'->>'role') = 'admin');

-- ════════════════════════════════════════════════════════
--  TRIGGER — Cria assinatura automaticamente no cadastro
--  Quando um novo usuário se registra, cria uma linha em
--  assinaturas com status "pendente" para o admin revisar
-- ════════════════════════════════════════════════════════
create or replace function public.handle_new_user_assinatura()
returns trigger language plpgsql security definer as $$
begin
  insert into public.assinaturas (user_id, nome, email, plano, valor, dia_venc, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email,'@',1)),
    new.email,
    'Alta Performance',
    897,
    1,
    'pendente'
  );
  return new;
end;
$$;

-- Remove trigger antigo se existir
drop trigger if exists on_auth_user_created_assinatura on auth.users;

create trigger on_auth_user_created_assinatura
  after insert on auth.users
  for each row execute procedure public.handle_new_user_assinatura();

-- ════════════════════════════════════════════════════════
--  ADMIN — Como tornar um usuário administrador
--  No Supabase: Authentication → Users → clique no usuário
--  → Edit user → Raw user metadata → adicione:
--  { "role": "admin" }
--
--  Ou via SQL (substitua o e-mail):
-- ════════════════════════════════════════════════════════
/*
update auth.users
set raw_user_meta_data = raw_user_meta_data || '{"role":"admin"}'::jsonb
where email = 'seu-email-admin@exemplo.com';
*/

-- ════════════════════════════════════════════════════════
--  DADOS DE EXEMPLO (opcional — rode só no primeiro acesso)
--  Substitua 'SEU_USER_ID' pelo UUID do seu usuário
--  Encontre em: Authentication → Users → seu e-mail
-- ════════════════════════════════════════════════════════

-- Exemplo de como inserir dados iniciais depois do login:
/*
insert into leads (user_id, nome, tel, email, tipo, valor, origem, coluna, dias, cor) values
  ('SEU_USER_ID', 'Carlos Mendes',  '(54) 9 9123-4567', 'carlos@email.com',   'Apartamento 3q', 'R$ 480.000', 'Instagram', 'novo',       1, '#6366f1'),
  ('SEU_USER_ID', 'Fernanda Lima',  '(54) 9 9234-5678', 'fernanda@email.com', 'Casa térrea',    'R$ 320.000', 'Site',       'novo',       2, '#ec4899'),
  ('SEU_USER_ID', 'Rafael Santos',  '(54) 9 9345-6789', 'rafael@email.com',   'Sala Comercial', 'R$ 850.000', 'Indicação',  'contato',    3, '#f59e0b'),
  ('SEU_USER_ID', 'Ana Rodrigues',  '(54) 9 9678-9012', 'ana@email.com',      'Apartamento 2q', 'R$ 350.000', 'Indicação',  'negociacao', 8, '#ef4444'),
  ('SEU_USER_ID', 'Roberto Dias',   '(54) 9 9123-4560', 'roberto@email.com',  'Apartamento 4q', 'R$ 890.000', 'Instagram',  'negociacao', 30,'#3b82f6'),
  ('SEU_USER_ID', 'André Carvalho', '(54) 9 9345-6780', 'andre@email.com',    'Casa Condomínio','R$ 720.000', 'Indicação',  'fechado',    45,'#22c55e');

insert into tarefas (user_id, nome, meta, hora, done) values
  ('SEU_USER_ID', 'Ligar para Carlos Mendes',        'Follow-up Lead',         '09:00', false),
  ('SEU_USER_ID', 'Enviar proposta — Cobertura',      'Roberto Dias',           '11:30', true),
  ('SEU_USER_ID', 'Visita ao imóvel — Rua das Acácias','Fernanda Lima',         '14:00', false),
  ('SEU_USER_ID', 'Reunião com a equipe',             'Estratégia de conteúdo', '16:00', false);
*/
