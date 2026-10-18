-- ============================================================
-- RDO-RPG: Content- & Welt-Tabellen
-- Aus packages/content/data/{items,pois,tilesets}.json,
-- shared/constants.ts VALENTINE_OBSTACLES, Obsidian GameSystems
-- ============================================================

-- items: Item-Definitionen (Source of Truth aus items.json)
create table if not exists items (
  id             text primary key,             -- z.B. 'potion_red'
  name           text not null,
  description    text not null default '',
  type           item_type not null,
  icon           text default '',
  stackable      boolean not null default true,
  max_stack      int not null default 99 check (max_stack >= 1),
  effect_heal_hp     int default 0,
  effect_heal_mp     int default 0,
  effect_attack_bonus int default 0,
  effect_defense_bonus int default 0,
  base_price     int not null default 0 check (base_price >= 0),  -- Wirtschaft (Händler)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_items_type on items(type);
create index if not exists idx_items_name_trgm on items using gin (name gin_trgm_ops);

drop trigger if exists trg_items_updated on items;
create trigger trg_items_updated before update on items
for each row execute function set_updated_at();

-- pois: Points of Interest (aus pois.json)
create table if not exists pois (
  id             text primary key,             -- z.B. 'saloon_smithfields'
  name           text not null,
  category       poi_category not null,
  pos_x          numeric(10,2) not null,
  pos_y          numeric(10,2) not null,
  radius         numeric(6,2) not null default 13,
  prompt_text    text not null default '',
  icon           text default '',
  description    text not null default '',
  map_id         text not null default 'world_map_01',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_pois_category on pois(category);
create index if not exists idx_pois_map on pois(map_id);

drop trigger if exists trg_pois_updated on pois;
create trigger trg_pois_updated before update on pois
for each row execute function set_updated_at();

-- npcs: Händler, Gesetzeshüter, Banden, Bürger
create table if not exists npcs (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  faction        faction_type not null,
  role           text not null default '',         -- z.B. 'Sheriff', 'Barkeeper'
  poi_id         text references pois(id) on delete set null,
  hp             int not null default 100 check (hp >= 0),
  is_merchant    boolean not null default false,
  dialog_id      uuid,                              -- FK nach dialogs (unten per ALTER)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_npcs_faction on npcs(faction);
create index if not exists idx_npcs_poi on npcs(poi_id);
create index if not exists idx_npcs_name_trgm on npcs using gin (name gin_trgm_ops);

drop trigger if exists trg_npcs_updated on npcs;
create trigger trg_npcs_updated before update on npcs
for each row execute function set_updated_at();

-- dialogs: Deterministische Dialog-Graphen (BLUEPRINT §7.1)
create table if not exists dialogs (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,                    -- z.B. 'sheriff_malloy'
  start_node     text not null default 'welcome',
  nodes          jsonb not null default '{}'::jsonb,  -- { nodeId: { text, choices[], effects[] } }
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_dialogs_name on dialogs(name);

drop trigger if exists trg_dialogs_updated on dialogs;
create trigger trg_dialogs_updated before update on dialogs
for each row execute function set_updated_at();

-- FK npcs.dialog_id -> dialogs.id jetzt definieren
do $$ begin
  alter table npcs
    add constraint fk_npcs_dialog foreign key (dialog_id)
    references dialogs(id) on delete set null;
exception when duplicate_object then null; end $$;

-- quests: Quest-Definitionen (quests.json / BLUEPRINT §7.2)
create table if not exists quests (
  id             text primary key,                 -- z.B. 'coyote_cull'
  title          text not null,
  description    text not null default '',
  act            text not null default 'Prolog',   -- Story-Akt
  giver_npc_id   uuid references npcs(id) on delete set null,
  steps          jsonb not null default '{}'::jsonb,  -- { stepId: { desc, target } }
  reward_cash    int not null default 0 check (reward_cash >= 0),
  reward_gold    int not null default 0 check (reward_gold >= 0),
  reward_honor   int not null default 0,
  reward_exp     int not null default 0 check (reward_exp >= 0),
  min_level      int not null default 1 check (min_level >= 1),
  is_repeatable  boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_quests_act on quests(act);
create index if not exists idx_quests_giver on quests(giver_npc_id);

drop trigger if exists trg_quests_updated on quests;
create trigger trg_quests_updated before update on quests
for each row execute function set_updated_at();

-- world_obstacles: AABB-Kollisionshindernisse (ersetzt hartkodiertes VALENTINE_OBSTACLES)
create table if not exists world_obstacles (
  id             text primary key,                 -- z.B. 'saloon'
  name           text not null,
  map_id         text not null default 'world_map_01',
  min_x          numeric(10,2) not null,           -- AABB min X (px)
  min_y          numeric(10,2) not null,           -- AABB min Y (px)
  width          numeric(10,2) not null check (width >= 0),
  depth          numeric(10,2) not null check (depth >= 0),
  height         numeric(8,2) not null default 0,  -- 3D-Höhe (Meter)
  is_solid       boolean not null default true,    -- false = begehbar (z.B. durchsichtig)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_obstacles_map on world_obstacles(map_id);

drop trigger if exists trg_obstacles_updated on world_obstacles;
create trigger trg_obstacles_updated before update on world_obstacles
for each row execute function set_updated_at();

-- hunting_species: Jagdbare Tierarten (Hunting & Ecosystem Dok)
create table if not exists hunting_species (
  id             text primary key,                 -- z.B. 'coyote'
  name           text not null,
  size_class     text not null check (size_class in ('varmint','medium','large')),
  required_weapon text not null default '',        -- korrekte Waffenklasse für 3 Sterne
  base_price     int not null default 0 check (base_price >= 0),
  flee_radius    numeric(6,2) not null default 40, -- Alarmierungsradius (Einheiten)
  region         text not null default 'new_hanover',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_species_size on hunting_species(size_class);

drop trigger if exists trg_species_updated on hunting_species;
create trigger trg_species_updated before update on hunting_species
for each row execute function set_updated_at();
