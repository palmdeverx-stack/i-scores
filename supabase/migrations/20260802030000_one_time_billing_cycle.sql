-- Support lifetime packages that are paid once instead of renewed.

alter table public.subscription_plans
  drop constraint if exists subscription_plans_billing_cycle_check;

alter table public.subscription_plans
  add constraint subscription_plans_billing_cycle_check
  check (billing_cycle in ('monthly', 'yearly', 'one_time', 'custom'));

alter table public.school_subscriptions
  drop constraint if exists school_subscriptions_billing_cycle_check;

alter table public.school_subscriptions
  add constraint school_subscriptions_billing_cycle_check
  check (billing_cycle in ('monthly', 'yearly', 'one_time', 'custom'));

comment on column public.subscription_plans.billing_cycle is
  'Billing cadence: monthly, yearly, one_time (lifetime purchase), or custom.';
