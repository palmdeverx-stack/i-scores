-- MAX=0 means no maximum target has been configured (preserves old items).
alter table public.inventory_items
  add column maximum_stock integer not null default 0 check(maximum_stock >= 0),
  add constraint inventory_items_stock_range_check
    check(maximum_stock = 0 or maximum_stock >= minimum_stock);
