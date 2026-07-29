-- Allow an eKru school to invite an email before that person creates a
-- Marketplace account. The account is linked only after authenticated accept.

alter table public.marketplace_school_invitations
  alter column marketplace_user_id drop not null;

alter table public.marketplace_school_invitations
  add column if not exists last_sent_at timestamptz,
  add column if not exists email_delivery_status text not null default 'pending'
    check (email_delivery_status in ('pending', 'sent', 'failed')),
  add column if not exists email_delivery_error text;

drop index if exists public.marketplace_school_invitations_school_email_key;
create unique index marketplace_school_invitations_school_email_key
  on public.marketplace_school_invitations (school_id, lower(invited_email));

create or replace function public.accept_marketplace_school_invitation(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_marketplace_user public.marketplace_users%rowtype;
  invitation_record public.marketplace_school_invitations%rowtype;
begin
  select *
  into current_marketplace_user
  from public.marketplace_users
  where auth_user_id = auth.uid();

  if current_marketplace_user.id is null then
    raise exception 'Marketplace account not found';
  end if;

  select *
  into invitation_record
  from public.marketplace_school_invitations
  where token_hash = encode(digest(invite_token, 'sha256'), 'hex')
    and lower(invited_email) = lower(current_marketplace_user.email)
    and (
      marketplace_user_id is null
      or marketplace_user_id = current_marketplace_user.id
    )
    and accepted_at is null
    and revoked_at is null
    and expires_at > now()
  for update;

  if invitation_record.id is null then
    raise exception 'Invitation is invalid, expired, or belongs to another email';
  end if;

  insert into public.marketplace_school_members (
    school_id,
    marketplace_user_id,
    membership_role
  )
  values (
    invitation_record.school_id,
    current_marketplace_user.id,
    invitation_record.membership_role
  )
  on conflict (school_id, marketplace_user_id)
  do update set membership_role = excluded.membership_role;

  update public.marketplace_school_invitations
  set
    marketplace_user_id = current_marketplace_user.id,
    accepted_at = now()
  where id = invitation_record.id;

  return invitation_record.school_id;
end;
$$;

revoke all on function public.accept_marketplace_school_invitation(text) from public;
grant execute on function public.accept_marketplace_school_invitation(text) to authenticated;
