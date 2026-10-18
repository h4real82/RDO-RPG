-- ============================================================
-- RDO-RPG: Asset-Pipeline-Tabellen (CodeX-Historie)
-- Quelle: codex_prompt_history.md – GLB-Katalog, LOD, Texture-Dicts,
--         Coverage-Gap (405/4451), Pipeline-Runs, OpenIV-Blocker
-- ============================================================

do $$ begin
  create type asset_kind as enum ('model','texture_dict','collision');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lod_class as enum ('high','med','low','slod','vlow','unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pipeline_stage as enum ('openiv_export','python_extract','validate','blender_convert','runtime_manifest','client_stream');
exception when duplicate_object then null; end $$;

do $$ begin
  create type run_status as enum ('pending','running','success','partial','failed','blocked');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- asset_manifests: Versionierter Katalog exportierter Artefakte
-- (GLB/Texturen) mit SHA-256 & LOD-Klasse. Single-Runtime-Quelle.
-- ------------------------------------------------------------
create table if not exists asset_manifests (
  id             uuid primary key default gen_random_uuid(),
  archetype_hash text not null,                 -- 0x... YDR-Quelle
  name           text not null default '',
  kind           asset_kind not null default 'model',
  lod_class      lod_class not null default 'unknown',
  glb_path       text,                          -- checkout-relativer Pfad in data/runtime/
  source_ydr     text,                          -- OpenIV-Quelldatei (Nachvollziehbarkeit)
  sha256         text,                          -- Reproduzierbarkeit / Dedup
  vertex_count   int  check (vertex_count >= 0),
  has_material_binding boolean not null default false,  -- RedDeadBlend2-Blocker!
  y_up_applied   boolean not null default true,         -- GLB Z-up→Y-up Korektur
  is_available   boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint uq_asset_archetype unique (archetype_hash, lod_class)
);

create index if not exists idx_asset_kind on asset_manifests(kind);
create index if not exists idx_asset_lod on asset_manifests(lod_class);
create index if not exists idx_asset_available on asset_manifests(is_available);
create index if not exists idx_asset_material on asset_manifests(has_material_binding);

drop trigger if exists trg_asset_updated on asset_manifests;
create trigger trg_asset_updated before update on asset_manifests
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- texture_dictionaries: YTD-Quellen & Coverage (texture_references.py)
-- Quelle: 43 YTD, Coverage 1.548/2.956
-- ------------------------------------------------------------
create table if not exists texture_dictionaries (
  id             uuid primary key default gen_random_uuid(),
  dict_hash      text not null unique,          -- 0x... YTD-Quelle
  name           text not null default '',
  texture_count  int  not null default 0 check (texture_count >= 0),
  exported_count int  not null default 0 check (exported_count >= 0),  -- texture-coverage
  png_dir        text,                          -- data/runtime/textures/<dict>/
  compression    text not null default 'ktx2',  -- WebP/KTX2 Zielformat (Kanban)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_texdict_hash on texture_dictionaries(dict_hash);

drop trigger if exists trg_texdict_updated on texture_dictionaries;
create trigger trg_texdict_updated before update on texture_dictionaries
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- asset_requirements: Benötigte vs. vorhandene Assets (Coverage-Gap)
-- Verknüpft world_placements mit asset_manifests je Chunk.
-- ------------------------------------------------------------
create table if not exists asset_requirements (
  id             uuid primary key default gen_random_uuid(),
  chunk_id       uuid references map_chunks(id) on delete cascade,
  archetype_hash text not null,
  required_count int  not null default 0 check (required_count >= 0),  -- aus Manifest
  available_count int not null default 0 check (available_count >= 0), -- exportiert
  coverage_pct   numeric(5,2) generated always as (
                   case when required_count = 0 then 100.00
                        else round((available_count::numeric / required_count) * 100, 2) end
                 ) stored,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint uq_req_chunk_arch unique (chunk_id, archetype_hash)
);

create index if not exists idx_req_chunk on asset_requirements(chunk_id);
create index if not exists idx_req_gap on asset_requirements(required_count, available_count);

drop trigger if exists trg_req_updated on asset_requirements;
create trigger trg_req_updated before update on asset_requirements
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- pipeline_runs: Protokoll jeder Pipeline-Ausführung (Audit/Gate)
-- ------------------------------------------------------------
create table if not exists pipeline_runs (
  id             uuid primary key default gen_random_uuid(),
  stage          pipeline_stage not null,
  status         run_status not null default 'pending',
  region         text not null default 'valentine',
  input_count    int  not null default 0,
  output_count   int  not null default 0,
  missing_count  int  not null default 0,        -- z.B. 4.046 fehlende Modelle
  message        text not null default '',
  duration_ms    int  check (duration_ms >= 0),
  started_at     timestamptz not null default now(),
  finished_at    timestamptz
);

create index if not exists idx_runs_stage on pipeline_runs(stage);
create index if not exists idx_runs_status on pipeline_runs(status);
create index if not exists idx_runs_started on pipeline_runs(started_at desc);
