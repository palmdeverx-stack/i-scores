alter table public.master_sales_customers
  add column school_id uuid references public.schools(id) on delete set null;

create unique index master_sales_customers_school_id_key
  on public.master_sales_customers (school_id)
  where school_id is not null;
