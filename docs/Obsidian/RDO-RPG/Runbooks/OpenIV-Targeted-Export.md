---
type: runbook
status: active
tags: [rdo-rpg, openiv, assets, valentine]
---

# OpenIV: gezielter Valentine-Nachexport

## Zweck

Die lokale Preview rendert nur Modelle, die als GLB verifiziert in der Runtime
liegen. Die separat gebaute Textur-/MLO-Preview enthält derzeit 594
Manifest-Platzierungen; sie ist keine vollständige oder grafisch abgenommene
Karte. Fehlendes Terrain, offene Shadersemantik und 1581 fehlende Modelltypen
sind bekannte Lücken. Ersatzgeometrie wird nicht erfunden.

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

Der vom Nutzer durchgeführte Drawable-Probeexport erzeugte `.ydr.full`,
`.ydr.sys` und `.ydr.gfx`. Der Pipeline-Decoder liest Geometrie-Shader-Indizes,
Texturreferenzen, Renderbuckets, Modellmasken und Shader-Konstanten daraus.
Die derzeitige GLB-Bindung ist trotzdem nur Diffuse-Farbe, keine vollständige
Nachbildung der RDR2-Shader.

Die Tiefensuche dient nur zum Auffinden: Eintrag auswählen, Rechtsklick,
„Go to file“, dann im **Hauptfenster** exportieren. Der Nutzer hat darauf
hingewiesen, dass ein Export aus dem Suchfenster nur die verschlüsselte Datei
kopieren würde. YMAPs über „Export to XML“, Drawables über den am Probeexport
geprüften „Save content/Export“-Weg exportieren.

Die Rohdateien nach `data/raw/models/<modellname>/` exportieren. Bereits
vorhandene Dateien nicht überschreiben. Nach jedem Batch folgt die bestehende
GLB-Konvertierung und der Runtime-Build; die Rohdaten bleiben die Quelle der
Wahrheit.

## Priorität 1: Terrain-Quellen identifizieren

Die offizielle OpenIV-Namensdatenbank in Commit
`cebe8efa08bbbb82cc2cdb3a0c6ad5ad150238d9` nennt den Archivbereich:

`levels_5.rpf → levels → rdr3 → terrain → jklm_07_10`

Darunter stehen unter anderem `jklm_7_10_lod_combine_metadata`,
`jklm_7_10_lod_combine`, `jklm_7_10_lod` sowie Kacheln wie `j_07_`,
`k_09_` und deren Placement-Archive. Im Metadatenbestand stehen unter
anderem `j_07_`, `j_07__strm_0` und nummerierte Combine-Metadaten.

**Zuerst einen Screenshot dieses OpenIV-Bereichs anfertigen**, damit die
tatsächlichen Dateitypen und angebotenen Exportformate geprüft werden können.
Die Namenslisten belegen weder Resource-Endungen noch die genaue Valentine-
Teilmenge. Keine Kachel anhand ihres Namens auf Verdacht platzieren.
Zunächst die vorhandenen Terrain-YMAPs als XML in einen neuen Unterordner
von `data/raw/ymap/` exportieren; Transformationsdaten müssen vor Geometrie-
Auswahl und Einbindung geprüft werden. Bestehende Exporte nicht überschreiben.

Weitere Namenshinweise auf Kollisionsarchive finden sich unter
`levels_4.rpf → levels → rdr3 → terrain → instance_placement`:
`jklm_7_10_static_collision` und `jklm_7_10_instance_placement`.
Auch hier sind Typ und Exportweg noch am tatsächlichen OpenIV-Bestand zu prüfen.

## Weitere fehlende Modelle

- `val_hotel_lod`
- `val_bank_lod`
- `val_saloon2_lod`
- `val_gunsmith_lod`
- `val_gallows_lod`

## Priorität 2: Stations- und Stallbereich

`val_genstore`, `val_trainstn_int` und `val_stable_int` sind MLO-Wurzeln,
keine automatisch fehlenden Drawables. Ihre exportierten YTYP-Basisobjekte
werden bereits über `--archetype-root` expandiert. Nicht nach ähnlich benannten
Ersatzfassaden suchen. Für weitere fehlende Objekte liefert der Pipeline-Befehl
`export-targets` hashgeprüfte Suchnamen und deren Namensdatenbank-Quellen.

## LOD-Qualitätsgrenze

Ein lesender Abgleich der vorhandenen YMAPs mit den 527 Textur-GLB-Namen
fand 41 verfügbare HD-, 129 ORPHANHD-, 10 SLOD1- und 6 LOD-Quellplatzierungen.
Das zählt Quellobjekte, nicht deduplizierte Manifest-Platzierungen oder
expandierte MLO-Innenobjekte. Die aktuelle Adaption setzt Placement-LOD noch
auf 0; die GLB-interne LOD-Auswahl ersetzt keine YMAP-Hierarchieauswertung.
Eltern- und Kindobjekte dürfen erst anhand der Map-/Entity-Verknüpfungen
ausgewählt werden, nicht anhand eines `_lod`-Namenssuffixes.

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
  --archetype-root 'D:/Projects/RDO-RPG/data/raw/ymap' `
  --runtime-root 'data/runtime/valentine/local-preview' `
  --allow-incomplete
```

Danach `validate-valentine`, Client-Tests, E2E, Referenz-Render-Check und
`npx pnpm -r build` ausführen.
