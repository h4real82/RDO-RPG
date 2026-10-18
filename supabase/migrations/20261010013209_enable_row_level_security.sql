-- ============================================================
-- RDO-RPG: Row Level Security (RLS)
-- Server (Colyseus) nutzt den service_role Key (umgeht RLS via Postgres).
-- RLS wird aktiviert, um direkten Client-Zugriff standardmäßig zu sperren
-- und Defense-in-Depth zu gewährleisten.
-- ============================================================

-- Charakter-bezogene Tabellen: Nur Owner-Zugriff (via service_role am Server)
alter table characters        enable row level security;
alter table horses            enable row level security;
alter table inventory_items   enable row level security;
alter table character_quests  enable row level security;
alter table honor_events      enable row level security;
alter table harvested_pelts   enable row level security;
alter table fast_travel_log   enable row level security;

-- Öffentliche Lese-Tabellen (Content/World) – weltweit lesbar, aber nicht schreibbar
alter table items             enable row level security;
alter table pois              enable row level security;
alter table npcs              enable row level security;
alter table dialogs           enable row level security;
alter table quests            enable row level security;
alter table world_obstacles   enable row level security;
alter table hunting_species   enable row level security;

-- Content/World: anon + authenticated dürfen LESEN
do $$
declare t text;
begin
  foreach t in array array['items','pois','npcs','dialogs','quests','world_obstacles','hunting_species']
  loop
    execute format('drop policy if exists "read_%1$s" on %1$I;', t);
    execute format('create policy "read_%1$s" on %1$I for select to anon, authenticated using (true);', t);
  end loop;
end $$;

-- Hinweis: Schreibzugriff auf Content erfolgt ausschließlich über service_role
-- (serverseitige Seed-/Admin-Routen), daher keine INSERT/UPDATE-Policy für anon/authenticated.
