-- ============================================================
-- RDO-RPG: Map/World-Runtime-Tabellen (Codex-Asset-Pipeline)
-- Quelle: codex_prompt_history.md – Welt-Manifest, 250m-Chunks,
--         CRS-Transform, Ground-Truth-Traces, Mesh-Kollision
-- ============================================================

do $$ begin
  create type placement_source as enum ('ymap','milo_interior');
exception when duplicate_object then null; end $$;

do $$ begin
  create type chunk_status as enum ('pending','manifest_ready','built','streaming');
exception when duplicate_object then null; end $$;

do $$ begin
  create type trace_type as enum ('street','rail','sidewalk','boardwalk');
exception when duplicate_object then null; end $$;

do $$ begin
  create type collision_shape as enum ('aabb','mesh','convex_hull');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- map_chunks: 250m-Chunk-Gitter für Valentine-Streaming
-- CRS-Raum (Meter). Zentrum: X:-300, Z:750 (Three.js-Z=750)
-- ------------------------------------------------------------
create table if not exists map_chunks (
  id             uuid primary key default gen_random_uuid(),
  region         text not null default 'valentine',
  chunk_x        int  not null,                 -- Gitterindex (CRS 250m-Raster)
  chunk_z        int  not null,
  size_m         numeric(6,1) not null default 250,  -- Chunkkantenlänge in Metern
  crs_center_x   numeric(10,2) not null,
  crs_center_z   numeric(10,2) not null,
  crs_min_x      numeric(10,2) not null,
  crs_min_z      numeric(10,2) not null,
  crs_max_x      numeric(10,2) not null,
  crs_max_z      numeric(10,2) not null,
  status         chunk_status not null default 'pending',
  manifest_hash  text,                          -- Reproduzierbarkeit: Hash des Quell-Manifests
  lod_level      int  not null default 0 check (lod_level >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint uq_chunk_grid unique (region, chunk_x, chunk_z)
);

create index if not exists idx_chunks_region on map_chunks(region);
create index if not exists idx_chunks_status on map_chunks(status);

drop trigger if exists trg_chunks_updated on map_chunks;
create trigger trg_chunks_updated before update on map_chunks
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- world_placements: DAS Welt-Manifest (4.451 Ground-Truth-Entities)
-- Einzige Laufzeitquelle für Position/Rotation/Maß. Keine Schätzwerte.
-- ------------------------------------------------------------
create table if not exists world_placements (
  id             uuid primary key default gen_random_uuid(),
  source         placement_source not null default 'ymap',
  source_file    text,                          -- YMAP-Quelldatei (Nachvollziehbarkeit)
  archetype_hash text,                          -- 0x... YDR-Archetyp (→ asset_models)
  name           text not null default '',
  chunk_id       uuid references map_chunks(id) on delete set null,
  -- Ground-Truth CRS-Koordinaten (Quelle)
  crs_x          numeric(10,3) not null,
  crs_y          numeric(10,3) not null,
  crs_z          numeric(10,3) not null,
  -- Abgeleitete Client-Laufzeitkoordinaten (Three.js Y-up)
  runtime_x      numeric(10,2) not null,
  runtime_y      numeric(10,2) not null,
  rot_yaw        numeric(7,3) not null default 0,   -- Rotation (Radians)
  rot_pitch      numeric(7,3) not null default 0,
  rot_roll       numeric(7,3) not null default 0,
  scale_x        numeric(7,3) not null default 1,
  scale_y        numeric(7,3) not null default 1,
  scale_z        numeric(7,3) not null default 1,
  -- Z-Fighting-Layer (Codex: Terrain=0.0, Roads=0.002, BuildingFloors=0.005)
  z_layer        numeric(8,4) not null default 0,
  is_renderable  boolean not null default false,  -- false = Modell-Lücke (Coverage!)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_placements_chunk on world_placements(chunk_id);
create index if not exists idx_placements_archetype on world_placements(archetype_hash);
create index if not exists idx_placements_source on world_placements(source);
create index if not exists idx_placements_renderable on world_placements(is_renderable);
create index if not exists idx_placements_unrendered on world_placements(chunk_id) where is_renderable = false;

drop trigger if exists trg_placements_updated on world_placements;
create trigger trg_placements_updated before update on world_placements
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- world_traces: Ground-Truth-Straßen-/Schienen-Linien (infrastructure.py)
-- ------------------------------------------------------------
create table if not exists world_traces (
  id             uuid primary key default gen_random_uuid(),
  region         text not null default 'valentine',
  trace_type     trace_type not null default 'street',
  name           text not null default '',
  chunk_id       uuid references map_chunks(id) on delete set null,
  geometry       jsonb not null default '[]'::jsonb,  -- [[crs_x,crs_z], ...] Polyline
  z_layer        numeric(8,4) not null default 0.002,  -- Roads liegen über Terrain
  width_m        numeric(6,2),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_traces_chunk on world_traces(chunk_id);
create index if not exists idx_traces_type on world_traces(trace_type);

drop trigger if exists trg_traces_updated on world_traces;
create trigger trg_traces_updated before update on world_traces
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- collision_meshes: Erweiterte Kollision (Manifest-Mesh, Kanten-Gleiten)
-- Komplementiert world_obstacles (grobe AABBs). echte Mesh-Form.
-- ------------------------------------------------------------
create table if not exists collision_meshes (
  id             uuid primary key default gen_random_uuid(),
  placement_id   uuid references world_placements(id) on delete cascade,
  chunk_id       uuid references map_chunks(id) on delete set null,
  shape          collision_shape not null default 'mesh',
  -- Grobe AABB-Hülle (schneller Vorfilter)
  aabb_min_x     numeric(10,2) not null,
  aabb_min_y     numeric(10,2) not null,
  aabb_max_x     numeric(10,2) not null,
  aabb_max_y     numeric(10,2) not null,
  height         numeric(8,2) not null default 0,
  -- Mesh-Vertices (Client-Raum) für präzises Kanten-Gleiten
  vertices       jsonb not null default '[]'::jsonb,  -- [[x,y], ...]
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_cmesh_placement on collision_meshes(placement_id);
create index if not exists idx_cmesh_chunk on collision_meshes(chunk_id);

drop trigger if exists trg_cmesh_updated on collision_meshes;
create trigger trg_cmesh_updated before update on collision_meshes
for each row execute function public.set_updated_at();
