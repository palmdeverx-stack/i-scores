alter table public.master_sales_customers
  add column document_email text not null default ''
    check (length(document_email) <= 254);
