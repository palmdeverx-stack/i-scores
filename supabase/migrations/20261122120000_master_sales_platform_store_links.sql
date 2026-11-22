create table public.master_sales_platform_store_links (
  platform_id text primary key,
  marketplace_seller_id text not null unique
);

alter table public.master_sales_platform_store_links enable row level security;
revoke all on public.master_sales_platform_store_links from public, anon, authenticated;
grant select on public.master_sales_platform_store_links to service_role;

with platform as (
  select id::text,
    coalesce(nullif(btrim(document_issuer_name), ''), nullif(btrim(company_name), ''),
      nullif(btrim(concat_ws(' ', first_name, last_name)), ''), brand_name) as name,
    coalesce(nullif(btrim(document_tax_address), ''), btrim(address)) as address,
    nullif(btrim(tax_id), '') as tax_id
  from public.marketplace_provider_settings
  order by updated_at desc, id
  limit 1
), matches as (
  select p.id as platform_id, s.id::text as marketplace_seller_id
  from platform p
  join public.marketplace_sellers s on s.owner_role = 'master_admin' and s.status = 'active'
    and regexp_replace(lower(p.name), '\s+', '', 'g') =
        regexp_replace(lower(coalesce(nullif(btrim(s.company_name), ''), s.display_name)), '\s+', '', 'g')
    and length(btrim(s.business_address)) >= 5
    and starts_with(p.address, btrim(s.business_address))
    and nullif(btrim(s.company_tax_id), '') is not null
    and (p.tax_id is null or p.tax_id = btrim(s.company_tax_id))
)
insert into public.master_sales_platform_store_links (platform_id, marketplace_seller_id)
select platform_id, marketplace_seller_id from matches where (select count(*) from matches) = 1;
