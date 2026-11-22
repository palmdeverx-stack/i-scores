create table public.master_sales_sellers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 200),
  address text not null default '' check (length(address) <= 1000),
  tax_id text not null default '' check (length(tax_id) <= 30),
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create trigger set_master_sales_sellers_updated_at
before update on public.master_sales_sellers
for each row execute function public.handle_updated_at();

alter table public.master_sales_sellers enable row level security;
revoke all on public.master_sales_sellers from public, anon, authenticated;
grant select, insert, update on public.master_sales_sellers to service_role;
