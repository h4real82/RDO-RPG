-- H4R-61 / H4R-35 / H4R-87. Server-only access; no implicit Discord/Auth mapping.
-- Works after the ten historical migrations, with or without local profile preparation.
create table if not exists public.player_profiles (
  discord_id text primary key,
  display_name text not null,
  locale text not null default 'de-DE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.characters drop constraint if exists characters_profile_fk;
alter table public.player_profiles drop constraint player_profiles_pkey;
alter table public.player_profiles add column account_id uuid not null default gen_random_uuid();
alter table public.player_profiles add primary key(account_id);
alter table public.player_profiles alter column discord_id drop not null;
alter table public.player_profiles add constraint profile_discord_unique unique(discord_id);
alter table public.player_profiles add column auth_user_id uuid unique;
alter table public.player_profiles add column discord_name text;
alter table public.player_profiles add column discord_avatar text;
alter table public.characters alter column discord_id drop not null;
alter table public.characters add column account_id uuid unique references public.player_profiles(account_id);
insert into public.player_profiles(discord_id,display_name)
 select discord_id,username from public.characters where discord_id is not null
 on conflict(discord_id) do nothing;
update public.characters c set account_id=p.account_id from public.player_profiles p where c.discord_id=p.discord_id;
create table public.coin_accounts (
 account_id uuid primary key references public.player_profiles(account_id),
 balance bigint not null default 0 check(balance>=0)
);
create table public.coin_entries (
 account_id uuid not null references public.coin_accounts(account_id),
 event_id text not null, amount bigint not null, reason text not null,
 created_at timestamptz not null default now(), primary key(account_id,event_id)
);
create table public.account_events (
 account_id uuid not null references public.player_profiles(account_id), event_id text not null,
 payload jsonb not null, primary key(account_id,event_id)
);
create table public.app_sessions (
 token_hash text primary key, account_id uuid not null references public.player_profiles(account_id),
 provider_cipher text not null, persistent boolean not null,
 created_at timestamptz not null default now(), last_seen_at timestamptz not null default now(),
 expires_at timestamptz not null, absolute_expires_at timestamptz not null,
 recovery boolean not null default false
);
create index app_sessions_account_idx on public.app_sessions(account_id);
create table public.discord_link_flows (
 state_hash text primary key, token_hash text not null references public.app_sessions(token_hash) on delete cascade,
 expires_at timestamptz not null default now()+interval '5 minutes'
);
create table public.gameplay_leases (
 account_id uuid primary key references public.player_profiles(account_id),
 session_id text not null, fence bigint not null default 1, expires_at timestamptz not null,
 checkpoint jsonb
);
-- The original tables remain the authoritative character/inventory stores.
-- Legacy cash/gold is deliberately not converted to Coins.
alter table public.player_profiles enable row level security;
alter table public.coin_accounts enable row level security;
alter table public.coin_entries enable row level security;
alter table public.account_events enable row level security;
alter table public.app_sessions enable row level security;
alter table public.discord_link_flows enable row level security;
alter table public.gameplay_leases enable row level security;
revoke all on public.player_profiles,public.characters,public.inventory_items,public.coin_accounts,public.coin_entries,
 public.account_events,public.app_sessions,public.discord_link_flows,public.gameplay_leases from public,anon,authenticated;
grant select,insert,update,delete on public.player_profiles,public.characters,public.inventory_items,public.coin_accounts,
 public.coin_entries,public.account_events,public.app_sessions,public.discord_link_flows,public.gameplay_leases to service_role;
-- Ledger history is append-only, including for privileged application connections.
create function public.reject_coin_entry_changes() returns trigger language plpgsql
 set search_path=public as $$ begin raise exception 'Coin history is append-only'; end; $$;
revoke execute on function public.reject_coin_entry_changes() from public,anon,authenticated;
create trigger coin_entries_append_only before update or delete on public.coin_entries
 for each row execute function public.reject_coin_entry_changes();
