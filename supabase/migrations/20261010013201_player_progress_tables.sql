-- ============================================================
-- RDO-RPG: Spieler-Fortschritts-Tabellen
-- Verknüpfen characters mit Content: Inventar, Quests, Ehre, Jagd
-- ============================================================

-- inventory_items: Charakter-Inventar (ItemStack-Schema)
create table if not exists inventory_items (
  id             uuid primary key default gen_random_uuid(),
  character_id   uuid not null references characters(id) on delete cascade,
  item_id        text not null references items(id) on delete restrict,
  quantity       int  not null default 1 check (quantity >= 0),
  slot_index     int  not null default 0 check (slot_index >= 0),
  is_equipped    boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_inventory_character on inventory_items(character_id);
create index if not exists idx_inventory_item on inventory_items(item_id);
-- Ein Item-Typ pro Slot; gleiches Item stackt über quantity
create unique index if not exists uq_inventory_slot
  on inventory_items(character_id, slot_index);

drop trigger if exists trg_inventory_updated on inventory_items;
create trigger trg_inventory_updated before update on inventory_items
for each row execute function set_updated_at();

-- character_quests: Quest-Fortschritt pro Charakter (quests.json)
create table if not exists character_quests (
  id             uuid primary key default gen_random_uuid(),
  character_id   uuid not null references characters(id) on delete cascade,
  quest_id       text not null references quests(id) on delete cascade,
  status         quest_status not null default 'active',
  step_progress  jsonb not null default '{}'::jsonb,  -- { stepId: aktuellerZaehler }
  current_step   text,
  started_at     timestamptz not null default now(),
  completed_at   timestamptz,
  updated_at     timestamptz not null default now(),
  constraint uq_character_quest unique (character_id, quest_id)
);

create index if not exists idx_charquest_character on character_quests(character_id);
create index if not exists idx_charquest_status on character_quests(status);

drop trigger if exists trg_charquest_updated on character_quests;
create trigger trg_charquest_updated before update on character_quests
for each row execute function set_updated_at();

-- honor_events: Audit-Log aller Ehren-/Kopfgeld-Ereignisse (Honor & Bounty Dok)
create table if not exists honor_events (
  id             uuid primary key default gen_random_uuid(),
  character_id   uuid not null references characters(id) on delete cascade,
  event_type     text not null,     -- z.B. 'kill_civilian','bounty_alive','clean_hunt'
  honor_delta    int  not null default 0,
  bounty_delta   int  not null default 0,
  witness_count  int  not null default 0,
  description    text not null default '',
  created_at     timestamptz not null default now()
);

create index if not exists idx_honor_character on honor_events(character_id);
create index if not exists idx_honor_created on honor_events(created_at desc);

-- harvested_pelts: Erlegte Tiere & Fellqualität (Hunting & Ecosystem Dok)
create table if not exists harvested_pelts (
  id             uuid primary key default gen_random_uuid(),
  character_id   uuid not null references characters(id) on delete cascade,
  species_id     text not null references hunting_species(id) on delete restrict,
  quality        pelt_quality not null default 'poor',
  weapon_class   text not null default '',
  star_rating    int  not null default 1 check (star_rating between 1 and 3),
  sale_price     int,                       -- NULL solange nicht verkauft
  sold_at        timestamptz,
  harvested_at   timestamptz not null default now()
);

create index if not exists idx_pelts_character on harvested_pelts(character_id);
create index if not exists idx_pelts_species on harvested_pelts(species_id);
create index if not exists idx_pelts_unsold on harvested_pelts(character_id) where sold_at is null;

-- fast_travel_log: Protokoll der Schnellreisen (Fast-Travel-System 'F')
create table if not exists fast_travel_log (
  id             uuid primary key default gen_random_uuid(),
  character_id   uuid not null references characters(id) on delete cascade,
  origin_poi_id  text references pois(id) on delete set null,
  dest_poi_id    text references pois(id) on delete set null,
  cost           int  not null default 0 check (cost >= 0),
  traveled_at    timestamptz not null default now()
);

create index if not exists idx_travel_character on fast_travel_log(character_id);
create index if not exists idx_travel_time on fast_travel_log(traveled_at desc);
