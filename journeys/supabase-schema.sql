-- Inner Voyage · cloud saves
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- One row per (player, slot). The game always saves on the device first;
-- this table is the copy that follows a signed-in player to other devices.
-- Writes go through save_game(), a compare-and-swap on `rev`, so two devices
-- never silently overwrite each other: the loser gets the server copy back,
-- merges it (iv-save.js → IVSave.merge) and tries again.

create table if not exists public.saves (
  user_id      uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  slot         text        not null default 'main' check (slot ~ '^[a-z0-9_-]{1,24}$'),
  data         jsonb       not null,
  rev          integer     not null default 1,
  game_version text,
  updated_at   timestamptz not null default now(),
  primary key (user_id, slot),
  constraint saves_data_size check (pg_column_size(data) < 512000)   -- a save is ~10–60 KB; 500 KB is a hard ceiling
);

alter table public.saves enable row level security;

drop policy if exists "saves: read own"   on public.saves;
drop policy if exists "saves: insert own" on public.saves;
drop policy if exists "saves: update own" on public.saves;
drop policy if exists "saves: delete own" on public.saves;
create policy "saves: read own"   on public.saves for select using (auth.uid() = user_id);
create policy "saves: insert own" on public.saves for insert with check (auth.uid() = user_id);
create policy "saves: update own" on public.saves for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "saves: delete own" on public.saves for delete using (auth.uid() = user_id);

-- Compare-and-swap write.
--   p_base_rev = the rev this device last saw (0 if it has never seen a cloud copy).
--   ok = true  → written; server_rev is the new rev.
--   ok = false → someone else wrote first; server_data/server_rev are the current copy to merge with.
create or replace function public.save_game(p_slot text, p_data jsonb, p_base_rev integer, p_version text default null)
returns table (ok boolean, server_rev integer, server_data jsonb, server_updated_at timestamptz)
language plpgsql
security invoker
set search_path = public
as $$
#variable_conflict use_column
declare
  cur public.saves%rowtype;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;

  select * into cur from public.saves s where s.user_id = uid and s.slot = p_slot for update;

  if not found then
    insert into public.saves (user_id, slot, data, rev, game_version)
    values (uid, p_slot, p_data, 1, p_version);
    return query select true, 1, null::jsonb, now();
  elsif cur.rev = p_base_rev then
    update public.saves s
       set data = p_data, rev = cur.rev + 1, game_version = p_version, updated_at = now()
     where s.user_id = uid and s.slot = p_slot;
    return query select true, cur.rev + 1, null::jsonb, now();
  else
    return query select false, cur.rev, cur.data, cur.updated_at;
  end if;
end;
$$;

-- "Delete my progress" button in the game's account panel.
create or replace function public.delete_my_saves()
returns integer
language sql
security invoker
set search_path = public
as $$
  with d as (delete from public.saves where user_id = auth.uid() returning 1)
  select count(*)::integer from d;
$$;

revoke all on function public.save_game(text, jsonb, integer, text) from public, anon;
revoke all on function public.delete_my_saves() from public, anon;
grant execute on function public.save_game(text, jsonb, integer, text) to authenticated;
grant execute on function public.delete_my_saves() to authenticated;
grant select, insert, update, delete on public.saves to authenticated;
