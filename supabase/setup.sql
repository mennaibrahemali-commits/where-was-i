-- where was i? — database setup for Supabase.
-- Paste all of this into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once.

create table if not exists public.wwi_docs (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id         text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists wwi_docs_user_updated on public.wwi_docs (user_id, updated_at);

-- The server sets updated_at itself, so devices with wrong clocks can't
-- confuse syncing.
create or replace function public.wwi_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists wwi_docs_touch on public.wwi_docs;
create trigger wwi_docs_touch before insert or update on public.wwi_docs
for each row execute function public.wwi_touch();

-- Row level security: every signed-in person can only see and change their
-- own rows. People who are not signed in get nothing.
alter table public.wwi_docs enable row level security;

drop policy if exists "read own" on public.wwi_docs;
drop policy if exists "add own" on public.wwi_docs;
drop policy if exists "change own" on public.wwi_docs;
drop policy if exists "remove own" on public.wwi_docs;

create policy "read own" on public.wwi_docs for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "add own" on public.wwi_docs for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "change own" on public.wwi_docs for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "remove own" on public.wwi_docs for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.wwi_docs from anon;
grant select, insert, update, delete on public.wwi_docs to authenticated;
