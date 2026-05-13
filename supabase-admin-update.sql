-- ════════════════════════════════════════════════════════
--  GRUPO CAPTAR — Admin Update SQL
--  Cole no SQL Editor do Supabase para ativar as novas
--  funcionalidades do painel admin.
--  https://supabase.com → seu projeto → SQL Editor
-- ════════════════════════════════════════════════════════

-- ── CAMPO BLOQUEADO em ASSINATURAS ─────────────────────
-- Permite bloquear/desbloquear acesso de usuários
alter table assinaturas add column if not exists bloqueado boolean default false;

-- ── TABELA DE AVISOS ────────────────────────────────────
-- Avisos criados pelo admin aparecem para todos os usuários
create table if not exists avisos (
  id         uuid primary key default gen_random_uuid(),
  titulo     text not null,
  mensagem   text default '',
  tipo       text default 'info',   -- info | warn | danger | success
  ativo      boolean default true,
  created_at timestamptz default now()
);

-- RLS: admin pode fazer tudo, usuários leem apenas avisos ativos
alter table avisos enable row level security;

create policy "avisos_admin_all"
  on avisos for all
  using  ((auth.jwt()->'user_metadata'->>'role') = 'admin'
       or (auth.jwt()->'app_metadata'->>'role')  = 'admin')
  with check ((auth.jwt()->'user_metadata'->>'role') = 'admin'
           or (auth.jwt()->'app_metadata'->>'role')  = 'admin');

create policy "avisos_users_read"
  on avisos for select
  using (ativo = true);

-- ════════════════════════════════════════════════════════
--  PRONTO! Volte ao dashboard e as novas funções admin
--  estarão disponíveis.
-- ════════════════════════════════════════════════════════

-- ── COMISSÃO EM LOCAÇÕES ────────────────────────────────
-- % que a imobiliária/corretor recebe do valor do aluguel
alter table locacoes add column if not exists pct_comissao numeric default 0;
alter table locacoes add column if not exists corretor_comissao text default '';

-- ── DATA DE NASCIMENTO EM LEADS ─────────────────────────
-- Para aniversários e lembretes automáticos
alter table leads add column if not exists data_nasc text default '';
