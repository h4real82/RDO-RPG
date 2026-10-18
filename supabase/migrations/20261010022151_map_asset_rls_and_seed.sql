-- ============================================================
-- RDO-RPG: RLS + Seed für Map-/Asset-Tabellen
-- ============================================================

-- RLS aktivieren (Defense-in-Depth; Server nutzt service_role)
alter table map_chunks            enable row level security;
alter table world_placements      enable row level security;
alter table world_traces          enable row level security;
alter table collision_meshes      enable row level security;
alter table asset_manifests       enable row level security;
alter table texture_dictionaries  enable row level security;
alter table asset_requirements    enable row level security;
alter table pipeline_runs         enable row level security;

-- Welt-/Content-Tabellen: öffentlich lesbar
do $$
declare t text;
begin
  foreach t in array array['map_chunks','world_placements','world_traces','collision_meshes','asset_manifests','texture_dictionaries','asset_requirements']
  loop
    execute format('drop policy if exists "read_%1$s" on %1$I;', t);
    execute format('create policy "read_%1$s" on %1$I for select to anon, authenticated using (true);', t);
  end loop;
end $$;
-- pipeline_runs: rein serverseitig (keine Client-Policy -> deny-all)

-- ------------------------------------------------------------
-- SEED: Valentine-Chunk-Grid (CRS-Zentrum X:-300, Z:750, 250m)
-- ------------------------------------------------------------
insert into map_chunks (region,chunk_x,chunk_z,size_m,crs_center_x,crs_center_z,crs_min_x,crs_min_z,crs_max_x,crs_max_z,status,lod_level) values
 ('valentine', 0, 0, 250, -300.0, 750.0, -425.0, 625.0, -175.0, 875.0, 'built', 0),
 ('valentine',-1, 0, 250, -550.0, 750.0, -675.0, 625.0, -425.0, 875.0, 'manifest_ready', 0),
 ('valentine', 1, 0, 250, -50.0,  750.0, -175.0, 625.0,  75.0,  875.0, 'manifest_ready', 0),
 ('valentine', 0,-1, 250, -300.0, 500.0, -425.0, 375.0, -175.0, 625.0, 'streaming', 1),
 ('valentine', 0, 1, 250, -300.0,1000.0, -425.0, 875.0, -175.0,1125.0, 'pending', 0)
on conflict (region, chunk_x, chunk_z) do nothing;

-- ------------------------------------------------------------
-- SEED: Texture-Dictionaries (Auschnitt, 43 YTD gesamt)
-- ------------------------------------------------------------
insert into texture_dictionaries (dict_hash,name,texture_count,exported_count,compression) values
 ('0xa44c4584','val_common_ext',96,74,'ktx2'),
 ('0x2992d728','val_saloon_int',120,88,'ktx2'),
 ('0x65e2783c','val_station',64,52,'ktx2'),
 ('0x59f96e71','val_gunsmith',72,61,'ktx2')
on conflict (dict_hash) do nothing;

-- ------------------------------------------------------------
-- SEED: Asset-Manifest-Beispiele (GLB-Katalog, CodeX-Befund)
-- material-Binding bewusst false (RedDeadBlend2/OpenIV-Blocker)
-- ------------------------------------------------------------
insert into asset_manifests (archetype_hash,name,kind,lod_class,glb_path,source_ydr,sha256,has_material_binding,y_up_applied,is_available) values
 ('0x9f5729f9','val_genstore','model','high','data/runtime/models_glb/val_genstore.glb','val_genstore.ydr','a1b2c3d4',false,true,true),
 ('0x9b527830','val_genstore_ext','model','high','data/runtime/models_glb/val_genstore_ext.glb','val_genstore_ext.ydr','b2c3d4e5',false,true,true),
 ('0x64515c59','val_gallows','model','high','data/runtime/models_glb/val_gallows.glb','val_gallows.ydr','c3d4e5f6',false,true,true),
 ('0x0e064189','val_bank_lod','model','slod','data/runtime/models_glb/val_bank_lod.glb','val_bank.ydr','d4e5f6a7',false,true,true),
 ('0x1c980cbe','val_bank','model','high','data/runtime/models_glb/val_bank.glb','val_bank.ydr','e5f6a7b8',false,false,false)
on conflict (archetype_hash, lod_class) do nothing;

-- ------------------------------------------------------------
-- SEED: Coverage-Anforderung (CodeX-Report: 4.451 Entities, 405 renderbar)
-- ------------------------------------------------------------
with c as (select id from map_chunks where region='valentine' and chunk_x=0 and chunk_z=0 limit 1)
insert into asset_requirements (chunk_id,archetype_hash,required_count,available_count) values
 ((select id from c),'0x9f5729f9',18,14),
 ((select id from c),'0x64515c59',6,3),
 ((select id from c),'0x1c980cbe',9,0)
on conflict (chunk_id, archetype_hash) do nothing;

-- ------------------------------------------------------------
-- SEED: Letzter Pipeline-Run (Status-Prototyp)
-- ------------------------------------------------------------
insert into pipeline_runs (stage,status,region,input_count,output_count,missing_count,message,duration_ms,finished_at) values
 ('client_stream','partial','valentine',4451,405,4046,'Teilvorschau: 405 von 4451 Platzierungen renderbar; Rest offene OpenIV-Exportlücke.',612000, now());
