alter table public.master_sales_sellers
  add column signature_image text not null default ''
    check (
      length(signature_image) <= 349552
      and (signature_image = '' or signature_image like 'data:image/png;base64,%'
        or signature_image like 'data:image/jpeg;base64,%')
    );
