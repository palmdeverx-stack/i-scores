alter table public.inventory_items
  add column description text not null default '',
  add column brand text not null default '',
  add column model text not null default '',
  add column specifications text not null default '',
  add column barcode text not null default '',
  add column reference_price numeric(14,2) not null default 0 check(reference_price >= 0),
  add column supplier text not null default '',
  add column notes text not null default '',
  add column image_path text;

-- Images are private. Only authorized inventory routes issue short-lived URLs.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('inventory-images', 'inventory-images', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
