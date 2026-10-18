-- ============================================================
-- RDO-RPG: Core Schema – Enums, Extensions, Characters, Horses
-- Abgeleitet aus packages/shared/src/schema.ts, constants.ts, BLUEPRINT.md §6.3
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";  -- gen_random_uuid()
create extension if not exists "pg_trgm";    -- Textsuche für NPCs/Items

-- Enum-Typen (1:1 aus TS-Enums in shared/constants.ts & types.ts)
do $$ begin
  create type item_type as enum ('weapon','consumable','equipment','material','key_item');
exception when duplicate_object then null; end $$;

do $$ begin
  create type poi_category as enum ('saloon','sheriff','store','doctor','stable','travel','church','station','gunsmith','hotel');
exception when duplicate_object then null; end $$;

do $$ begin
  create type faction_type as enum ('lawmen','outlaw','townsfolk','merchant');
exception when duplicate_object then null; end $$;

do $$ begin
  create type quest_status as enum ('not_started','active','completed','failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pelt_quality as enum ('poor','good','pristine');
exception when duplicate_object then null; end $$;

-- Trigger-Funktion für updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- characters: Persistente Spielerprofile (Discord Activity)
-- ============================================================
create table if not exists characters (
  id                uuid primary key default gen_random_uuid(),
  discord_id        text not null unique,
  username          text not null default 'Gunslinger',
  avatar            text default '',
  -- Progression (Stats-Schema)
  level             int  not null default 1  check (level >= 1),
  exp               int  not null default 0  check (exp >= 0),
  hp                int  not null default 100 check (hp >= 0),
  max_hp            int  not null default 100 check (max_hp > 0),
  mp                int  not null default 50  check (mp >= 0),
  max_mp            int  not null default 50  check (max_mp > 0),
  stamina           int  not null default 100 check (stamina >= 0),
  max_stamina       int  not null default 100 check (max_stamina > 0),
  attack            int  not null default 10,
  defense           int  not null default 5,
  speed             int  not null default 4,
  dead_eye_charge   int  not null default 100 check (dead_eye_charge between 0 and 100),
  -- Moral- & Fahndungssystem (Honor & Bounty Dok)
  honor             int  not null default 0   check (honor between -100 and 100),
  bounty            int  not null default 0   check (bounty >= 0),
  wanted_level      int  not null default 0   check (wanted_level between 0 and 4),
  -- Wirtschaft
  cash              int  not null default 100 check (cash >= 0),
  gold              int  not null default 0   check (gold >= 0),
  -- Weltposition (kontinuierliche Sub-Pixel-Koordinaten)
  map_id            text not null default 'world_map_01',
  pos_x             numeric(10,2) not null default 580,
  pos_y             numeric(10,2) not null default 480,
  heading           numeric(6,3) not null default 1.5708,
  is_online         boolean not null default false,
  last_seen_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_characters_discord on characters(discord_id);
create index if not exists idx_characters_online  on characters(is_online) where is_online = true;
create index if not exists idx_characters_honor   on characters(honor);

drop trigger if exists trg_characters_updated on characters;
create trigger trg_characters_updated before update on characters
for each row execute function set_updated_at();

-- ============================================================
-- horses: Reittiere eines Charakters (HorseState-Schema)
-- ============================================================
create table if not exists horses (
  id             uuid primary key default gen_random_uuid(),
  character_id   uuid not null references characters(id) on delete cascade,
  name           text not null default 'Morgan',
  breed          text not null default 'Morgan',
  stamina        int  not null default 100 check (stamina between 0 and 100),
  max_stamina    int  not null default 100 check (max_stamina > 0),
  bonding        int  not null default 0   check (bonding between 0 and 100),
  is_active      boolean not null default false,   -- aktuell geritten
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_horses_character on horses(character_id);
-- Nur ein aktives Pferd pro Charakter
create unique index if not exists uq_horses_one_active
  on horses(character_id) where is_active = true;

drop trigger if exists trg_horses_updated on horses;
create trigger trg_horses_updated before update on horses
for each row execute function set_updated_at();
