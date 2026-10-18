-- H4R-51: additive migration for scprntjzambjhpbhccei.
-- Prior migrations are restored from the project's applied migration history.
-- Discord identity is verified by the game server, not Supabase Auth.
-- No client policies: the authoritative backend owns all reads/writes for now.

create table public.player_profiles (
  discord_id text primary key check (length(btrim(discord_id)) > 0),
  display_name text not null check (length(btrim(display_name)) between 1 and 80),
  locale text not null default 'de-DE' check (length(locale) between 2 and 35),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Preserve all existing characters. Profile names are distinct from character names.
insert into public.player_profiles(discord_id, display_name)
select discord_id, left(coalesce(nullif(btrim(username), ''), 'Gunslinger'), 80)
from public.characters;

alter table public.characters
  add constraint characters_profile_fk foreign key (discord_id)
    references public.player_profiles(discord_id) on delete cascade,
  add column elevation numeric(12,4);

comment on column public.characters.pos_x is
  'Authoritative horizontal world X. Legacy column preserved; coordinate adapter must be validated before autosave.';
comment on column public.characters.pos_y is
  'Legacy second horizontal axis (Three.js world Z), not height. Preserve existing values.';
comment on column public.characters.elevation is
  'Three.js world Y height. NULL means not measured; do not invent a zero height.';

create table public.character_settings (
  character_id uuid primary key references public.characters(id) on delete cascade,
  camera_mode text not null default 'orthographic'
    check (camera_mode in ('orthographic', 'perspective')),
  camera_sensitivity numeric(5,2) not null default 1
    check (camera_sensitivity > 0 and camera_sensitivity <= 10),
  subtitles_enabled boolean not null default true,
  outfit_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.highscores (
  character_id uuid not null references public.characters(id) on delete cascade,
  leaderboard text not null check (leaderboard ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  season text not null default 'all-time' check (season ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  score bigint not null check (score >= 0),
  achieved_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (character_id, leaderboard, season)
);
create index highscores_ranking_idx
  on public.highscores(leaderboard, season, score desc, achieved_at, character_id);

create trigger player_profiles_updated before update on public.player_profiles
  for each row execute function public.set_updated_at();
create trigger character_settings_updated before update on public.character_settings
  for each row execute function public.set_updated_at();
create trigger highscores_updated before update on public.highscores
  for each row execute function public.set_updated_at();

alter table public.player_profiles enable row level security;
alter table public.character_settings enable row level security;
alter table public.highscores enable row level security;
alter table public.characters enable row level security;

revoke all on public.player_profiles, public.character_settings,
  public.highscores, public.characters from public, anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on public.player_profiles,
  public.character_settings, public.highscores, public.characters to service_role;

comment on table public.player_profiles is 'Discord player accounts; server-authoritative access only.';
comment on table public.character_settings is 'Typed per-character settings; no binary asset payloads.';
comment on table public.highscores is 'Server-validated scores; client-submitted scores must not be trusted.';
