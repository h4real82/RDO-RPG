-- ============================================================
-- RDO-RPG: Security-Härtung (Advisor-Remediation)
-- 1) set_updated_at: fixen search_path (function_search_path_mutable)
-- 2) pg_trgm in dediziertes Schema verschieben (extension_in_public)
-- ============================================================

-- 1) Funktion mit fixem search_path neu definieren (Trigger bleiben intakt)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2) pg_trgm aus public in extensions-Schema verschieben.
--    Bestehende Trigram-Indizes (gin_trgm_ops) wandern mit der Extension.
do $$ begin
  create schema if not exists extensions;
  -- Extension nur verschieben, falls noch in public
  if exists (
    select 1 from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pg_trgm' and n.nspname = 'public'
  ) then
    alter extension pg_trgm set schema extensions;
  end if;
end $$;

-- search_path für die Funktion erweitern, damit gin_trgm_ops weiter auflösbar bleibt
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public, extensions
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
