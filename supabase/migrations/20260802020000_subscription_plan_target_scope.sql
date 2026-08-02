-- Declare who can buy each reusable package. Existing plans remain school
-- packages, while new plans can explicitly target an individual buyer without
-- requiring a school during Marketplace provisioning.

alter table public.subscription_plans
  add column if not exists target_scope text not null default 'school';

alter table public.subscription_plans
  drop constraint if exists subscription_plans_target_scope_check;

alter table public.subscription_plans
  add constraint subscription_plans_target_scope_check
  check (target_scope in ('individual', 'school', 'both'));

comment on column public.subscription_plans.target_scope is
  'Supported Marketplace buyer scope: individual, school, or both.';
