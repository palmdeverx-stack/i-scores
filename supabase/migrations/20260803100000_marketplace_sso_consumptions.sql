-- One-time SSO tickets are signed by Marketplace and consumed once by E-KRU.

create table if not exists public.marketplace_sso_consumptions (
  jti uuid primary key,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz not null default now()
);

create index if not exists marketplace_sso_consumptions_expires_idx
  on public.marketplace_sso_consumptions (expires_at);

alter table public.marketplace_sso_consumptions enable row level security;

comment on table public.marketplace_sso_consumptions is
  'Replay protection for short-lived Marketplace-to-E-KRU SSO JWT tickets.';

