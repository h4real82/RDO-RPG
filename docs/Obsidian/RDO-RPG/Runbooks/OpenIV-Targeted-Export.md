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

### Lokal geprüfte Werkzeuggrenze (2026-10-08)

Vorhandene Installation:
`C:/Users/h4rea/AppData/Local/New Technology Studio/Apps/OpenIV/OpenIV.exe`.
Die mitgelieferte `command line.txt` dokumentiert Spielauswahl, Core-Auswahl
und Archivsuche, jedoch keinen Batch-Export. Das beweist nicht, dass jede
undokumentierte Exportmöglichkeit ausgeschlossen ist; ein automatisierbarer
Export ist damit aber nicht verifiziert.

Die RDR3-Typbibliotheken deklarieren unter anderem `#map` und `#typ`.
Im lokalen RDR3-Verzeichnis liegt kein `openFormats/ShaderManager.xml`
(anders als bei einigen anderen Spielen). Ein vollständiger RDR2-Export von
Drawable-Geometrie samt Shader-/Texturzuordnung darf daher nicht aus der
GTA-Unterstützung abgeleitet werden. Roh-Extraktion und vollständiger
Materialexport sind getrennte Fähigkeiten.

Die aktuelle Codex-Sitzung bietet keine native Desktop-Steuerung. Deshalb
ist die Bedienung des geöffneten OpenIV-Fensters hier nicht automatisierbar.
Ein kostenpflichtiger Discord-Exporter ist keine Projektvoraussetzung und
wird nicht als frei verfügbarer Lösungsweg empfohlen.

Vor einem weiteren Export zunächst an **einem** Kernmodell prüfen, welche
Formate OpenIV tatsächlich anbietet und ob die Ausgabe die Zuordnung von
Mesh-Primitiven zu Shadern und Textur-Slots erhält. PNG-Dateien und aus
Binärdaten gefundene Textur-Namen allein belegen diese Zuordnung nicht.

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
