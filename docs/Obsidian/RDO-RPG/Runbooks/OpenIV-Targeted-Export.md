---
type: runbook
status: active
tags: [rdo-rpg, openiv, assets, valentine]
---

# OpenIV: gezielter Valentine-Nachexport

## Zweck

Die lokale Preview rendert nur Modelle, die als GLB verifiziert in der Runtime
liegen. Der aktuelle Datenbestand enthält 405 renderbare Platzierungen aus
4.451 YMAP-Entitäten. Der Engpass sind fehlende Kernfassaden, nicht erfundene
Ersatzgeometrie.

## Exportziel

Die Rohdateien nach `data/raw/models/<modellname>/` exportieren. Bereits
vorhandene Dateien nicht überschreiben. Nach jedem Batch folgt die bestehende
GLB-Konvertierung und der Runtime-Build; die Rohdaten bleiben die Quelle der
Wahrheit.

## Priorität 1: sichtbare Valentine-Kernmodelle

- `val_genstore`
- `val_hotel_lod`
- `val_bank_lod`
- `val_saloon2_lod`
- `val_gunsmith_lod`
- `val_gallows_lod`

## Priorität 2: Stations- und Stallbereich

- `val_trainstn_int`
- `val_stable_int`

## Qualitätsregel

Nur in OpenIV eindeutig als RDR2-Drawable identifizierte Modelle exportieren.
Keine Texturen, Platzierungen oder Geometrie raten beziehungsweise erzeugen.
Ein nicht auffindbares Modell wird als Lücke dokumentiert und nicht durch ein
ähnlich benanntes Asset ersetzt.

## Nachbearbeitung

```powershell
& 'tools/rdo_pipeline/.venv/Scripts/python.exe' -m rdo_pipeline.cli build-valentine `
  --asset-root 'D:/Projects/RDO-RPG/data/processed/models_glb' `
  --placements 'D:/Projects/RDO-RPG/data/valentine_placements.json' `
  --runtime-root 'data/runtime/valentine/local-preview' `
  --allow-incomplete
```

Danach `validate-valentine`, Client-Tests, E2E, Referenz-Render-Check und
`npx pnpm -r build` ausführen.
