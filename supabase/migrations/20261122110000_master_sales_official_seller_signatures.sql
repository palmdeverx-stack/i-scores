create table public.master_sales_official_seller_signatures (
  source text not null check (source in ('marketplace', 'platform')),
  seller_id text not null check (length(seller_id) between 1 and 100),
  signature_image text not null default '' check (
    length(signature_image) <= 349552
    and (signature_image = '' or signature_image like 'data:image/png;base64,%'
      or signature_image like 'data:image/jpeg;base64,%')
  ),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (source, seller_id)
);

create trigger set_master_sales_official_seller_signatures_updated_at
before update on public.master_sales_official_seller_signatures
for each row execute function public.handle_updated_at();

alter table public.master_sales_official_seller_signatures enable row level security;
revoke all on public.master_sales_official_seller_signatures from public, anon, authenticated;
grant select, insert, update on public.master_sales_official_seller_signatures to service_role;
