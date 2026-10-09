# OpenIV-Exportliste – Valentine Spatial Recovery

Stand: 2026-10-09. Ziel ist ausschließlich der geplante Valentine-Ausschnitt
mit dem markierten Rundweg. Die Liste vermeidet den Export benachbarter
Terrain-Sektoren: Eine Prüfung aller vorhandenen Terrain-YMAPs zeigt, dass die
310 × 450 m große Slice-Grenze `X -460…-150 / Game-Y 540…990` nur von
`l_09__ymap`, `l_09__strm_0_ymap` und dem übergeordneten
`jklm_7_10_lod_ymap` belegt wird.

## Verbindliche Exportregeln

- Niemals aus dem Suchfenster exportieren. Suche → Rechtsklick → **Go to file**;
  erst in der Hauptansicht exportieren.
- `.ymap`, `.ytyp` und `_manifest.ymf`: **Export to XML**.
- `.ydr`, `.ybn`, `.yft` und `.ych`: **Save content/Export**. Den kompletten
  von OpenIV erzeugten Unterordner mit `.full`, `.gfx` und `.sys` behalten.
- `.ytd`: im Texture Viewer **Export all textures → PNG**. Jedes YTD erhält
  einen eigenen Unterordner, damit gleichnamige Texturen nicht überschrieben
  werden.
- Jeden Batch in einen neuen Ordner exportieren:
  `D:\Projects\RDO-RPG\data\raw\openiv-batches\valentine-spatial\<batch>`.
- Vorhandene Dateien nicht überschreiben. Bei Namenskonflikten den
  Quellarchivnamen als zusätzlichen Ordner verwenden.

## Batch 00 – Metadaten und Herkunft (zuerst)

Ziel: `00-metadata/`

### Valentine-Area-Metadaten

Unter `levels_1.rpf/levels/rdr3/area/lod/` beziehungsweise per Tiefensuche und
anschließendem **Go to file**:

- [x] `jklm_7_10_area_lod_combine_metadata.rpf`: **nicht komplett
  exportieren**. Die 327 Hash-YMAPs müssen nicht einzeln bearbeitet werden;
  die für Valentine relevanten Klartext-YMAPs/YTYPs liegen bereits geprüft
  unter `data/raw/ymap/`.
- [ ] Aus diesem Archiv nur später von Codex ausdrücklich genannte Hash-YMAPs
  exportieren, falls die Coverage-Auswertung eine konkrete Referenz als
  fehlend meldet.
- [x] `jklm_7_10_area_lod.rpf`: kein pauschaler Metadatenexport erforderlich;
  vorhandene Valentine-Quellen zuerst verwenden.
- [x] `jklm_7_10_area_lod_combine.rpf`: **kein Manifest vorhanden** (in
  OpenIV geprüft: 171 Drawable Dictionaries und 22 Texture Dictionaries).
  Diesen LOD-Assetcontainer nicht pauschal exportieren; sichtbare
  Silhouettenmodelle werden erst nach der Coverage-Auswertung gezielt benannt.

### Terrain-Metadaten

Unter `levels_5.rpf/levels/rdr3/terrain/jklm_07_10/`:

- [x] `jklm_7_10_lod_combine_metadata.rpf`: 69 XML-Dateien unter
  `data/raw/terrain/jklm_07_10/metadata/` geprüft, einschließlich der
  relevanten `l_09`-YMAPs und 32 YTYPs.
- [x] `jklm_7_10_lod.rpf`: enthält nur vier YDR und ein YTD, keine weiteren
  YMAP-/YTYP-Metadaten; kein Metadatenexport erforderlich.
- [x] `l_09_.rpf`: `_manifest.ymf` als
  `data/raw/terrain/l_09/Metadata/_manifest_ymf.xml` geprüft.
- [x] `l_09_placement.rpf`: vorhandene YMAP als
  `data/raw/ymap/l_09_placement_ymap.xml` geprüft; das Archiv enthält kein
  Manifest.
- [ ] `l_09_a_placement.rpf` bis `l_09_e_placement.rpf`: die insgesamt acht
  YMAPs als XML exportieren. Die je Archiv vorhandene `_cache.ych` ist keine
  Metadaten-XML und wird für die räumliche Kalibrierung nicht benötigt.
- [x] `l_09_ftr.rpf`: im vorhandenen Metadatenbestand geprüft; kein
  zusätzlicher pauschaler Export erforderlich.

Bereits vorhandene XMLs unter `data/raw/ymap/` und
`data/raw/terrain/jklm_07_10/metadata/` bleiben erhalten. Dieser Batch dient
als vollständiger, erneut prüfbarer Snapshot.

## Batch 01 – Valentine-Außenwelt (höchste Priorität)

Ziel: `01-valentine-exteriors/<archivname>/`

Unter `levels_1.rpf/levels/rdr3/area/jklm_07_10/` jeweils die komplette
Hauptansicht nach Typgruppen exportieren:

- [x] `val_01_.rpf` – Bahnhof, Kutschenhaus und südöstlicher Ortseingang
      - "D:\Projects\RDO-RPG\data\raw\01-valentine-exteriors\val_01_.rpf" Exportiertes Rpf Archiv verschlüsselung prüfen
- [x] `val_02_.rpf` – Hotel, Bank und Gunsmith-Block
      - "D:\Projects\RDO-RPG\data\raw\01-valentine-exteriors\val_02_.rpf" Exportiertes Rpf Archiv verschlüsselung prüfen
- [x] `val_03_.rpf` – Hauptstraße, Sheriff/Jail, General Store, Saloon und Stable
      - "D:\Projects\RDO-RPG\data\raw\01-valentine-exteriors\val_03_.rpf" Exportiertes Rpf Archiv verschlüsselung prüfen
- [x] `val_04_.rpf` – nordöstlicher Wohn-/Saloon-Bereich
      - "D:\Projects\RDO-RPG\data\raw\01-valentine-exteriors\val_04_.rpf" Exportiertes Rpf Archiv verschlüsselung prüfen
- [x] `val_05_.rpf` – westliche und nördliche Bebauung
      - "D:\Projects\RDO-RPG\data\raw\01-valentine-exteriors\val_05_.rpf" Exportiertes Rpf Archiv verschlüsselung prüfen
- [x] `val_06_.rpf` – ergänzende Ortsbebauung
      - "D:\Projects\RDO-RPG\data\raw\01-valentine-exteriors\val_06_.rpf" Exportiertes Rpf Archiv verschlüsselung prüfen
- [x] `val_07_.rpf` – Kirche, nördlicher Ortsrand und Magic-Lantern-Bereich
      - "D:\Projects\RDO-RPG\data\raw\01-valentine-exteriors\val_07_.rpf" Exportiertes Rpf Archiv verschlüsselung prüfen
- [x] `val_vfx.rpf` – nur Metadaten sichern; VFX-Drawables noch nicht in die Standard-Außenwelt übernehmen
      - Keine Metadaten enthalten, "D:\Projects\RDO-RPG\data\raw\01-valentine-exteriors\val_vfx.rpf" Exportiertes Rpf Archiv verschlüsselung prüfen

### Prüfung des vollständigen Archivexports vom 2026-10-09

Die acht Ordner sind als Inhaltsinventar brauchbar, aber **nicht direkt für die
Konvertierung geeignet**. Geprüfter Bestand: 291 `.ydr`, vier `.yft`, 155
`.ytd` und sieben binäre `.ymf`; keine `.ydr.full`, XML oder PNG. Die
Ressourcen tragen weiterhin den `RSC8`-/`PSIN`-Containerheader. Unsere
reproduzierbare Pipeline verarbeitet dagegen die von OpenIV über **Save
content/Export** erzeugten `.full/.gfx/.sys`-Dateien sowie XML und PNG.

Darum bitte **nicht** alle 291 YDR einzeln erneut exportieren. Die vorhandenen
178 Valentine-`.ydr.full`-Exporte werden zuerst gegen den Rundweg ausgewertet;
nur danach fehlende, sichtbare Silhouetten erhalten eine kleine, exakte
Exportliste. Die kopierten RPF-Inhalte bleiben als Herkunftsinventar erhalten.


Für die später von der Coverage-Auswertung **einzeln benannten Ziele** aus dem
jeweiligen `val_0X_.rpf` exportieren:

- alle **Drawable objects (`.ydr`)** über Save content/Export;
- alle **Fragment objects (`.yft`)** über Save content/Export;
- alle **Static collisions (`.ybn`)** über Save content/Export;
- alle **Texture dictionaries (`.ytd`)** als PNG in getrennte YTD-Ordner;
- `_manifest.ymf`, `.ymap` und `.ytyp` als XML.

Die Quelldaten enthalten im Ausschnitt 2.263 Außenwelt-Entitäten und 1.108
unterschiedliche Archetypen, davon 1.083 nur als Hash. Deshalb wird der
vorhandene Archiv-Snapshot maschinell ausgewertet und anschließend nur eine
kleine Liste sichtbarer, noch fehlender Rundweg-Silhouetten per **Go to file**
und **Save content/Export** nachgezogen.

### Sichtbare Schlüsselmodelle zur Kontrolle

Nach Batch 01 müssen mindestens folgende Klarnamen im Export vorkommen; sie
sind Kontrollpunkte, keine vollständige Einzelliste:

- [ ] `val_trainstn_int`, `val_carriagehouse_int`
- [ ] `val_hotel_ext`, `val_hotel_lod`
- [ ] `val_bank`, `val_bank_lod`
- [ ] `val_gunsmith_ext`, `val_gunsmith_lod`
- [ ] `val_genstore_ext`, `val_genstore`
- [ ] `val_saloon2`, `val_saloon2_lod`, `val_saloon_int`
- [ ] `val_gallows`, `val_gallows_lod`
- [ ] Jail/Sheriff-, Doctor-, Stable- und Kirchen-Außenmodelle, auch wenn sie
  in OpenIV nur als Hash erscheinen

## Batch 02 – Terrain, Straßenoberfläche und Vegetation für `l_09`

Ziel: `02-terrain-l09/<archivname>/`

Unter `levels_5.rpf/levels/rdr3/terrain/jklm_07_10/`:

- [ ] `l_09_.rpf` – alle 88 YDR, alle 16 YBN, alle 17 YTD und die einzelne YCH
- [ ] `l_09_ftr.rpf` – alle enthaltenen YDR/YBN/YTD/YCH
- [ ] `l_09_placement.rpf` – alle enthaltenen Instanz-/Vegetationsressourcen
- [ ] `l_09_a_placement.rpf`
- [ ] `l_09_b_placement.rpf`
- [ ] `l_09_c_placement.rpf`
- [ ] `l_09_d_placement.rpf`
- [ ] `l_09_e_placement.rpf`
- [ ] `jklm_7_10_lod.rpf` – alle Drawables und Texture Dictionaries
- [ ] `jklm_7_10_lod_combine.rpf` – alle Drawables und Texture Dictionaries

Die bereits exportierten elf `l_09__hd_0_*`-Modelle bleiben gültig. Der neue
Batch schließt insbesondere Straßen-/Bodenstücke, Böschungen, große
Vegetationsgruppen und Kollisionen, die in der bisherigen Vorschau fehlen.

## Batch 03 – Bahnhof, Gleise und südlicher Rundweg

Ziel: `03-station-rail/`

Unter `levels_1.rpf/levels/rdr3/area/jklm_07_10/`:

- [ ] `jklm_7_10_rails_b.rpf` – alle YDR/YBN/YTD und Metadaten
- [ ] `jklm_7_10_rails_c.rpf` – alle YDR/YBN/YTD und Metadaten
- [ ] `wal_train_.rpf` – alle YDR/YBN/YTD und Metadaten
- [ ] `jklm_7_10_area_lod_combine_collision.rpf` – alle YBN

Unter `levels_4.rpf/levels/rdr3/terrain/instance_placement/`:

- [ ] `jklm_7_10_static_collision.rpf` – alle YBN plus Manifest/Metadaten
- [ ] `jklm_7_10_instance_placement.rpf` – sämtliche Platzierungsmetadaten und
  referenzierte Vegetations-/Instanzressourcen

Dieser Batch ist erforderlich für Bahnhof, Bahnsteig, Gleisbett, Wasserturm,
den südlichen Straßenknoten und verlässliche Quellkollision.

## Batch 04 – Globale Texturwörterbücher

Ziel: `04-global-textures/<rpf>/<ytd>/`

Unter `levels_2.rpf/levels/rdr3/gtxd/`:

- [ ] `gtxd_valentine.rpf` – alle YTD vollständig als PNG
- [ ] `gtxd_railroad.rpf` – alle YTD vollständig als PNG
- [ ] `gtxd_terrain1.rpf` – mindestens `heartlands1_l09.ytd`, dessen `+hi`
  Variante und alle `l_09`/`jklm_07_10` treffenden YTD

Zusätzlich in der OpenIV-Tiefensuche suchen und per **Go to file** öffnen:

- [ ] `val_*_txd.ytd`, `val_*_details.ytd`, `val_*_props.ytd`
- [ ] `val_*+hi.ytd` und `val_*+hidr.ytd`
- [ ] `heartlands1_l09*.ytd`
- [ ] `railroad*.ytd`, `track*.ytd`, `trainstn*.ytd`

Die vorhandene Einzelliste `D:\Projects\RDO-RPG\data\needed_textures_valentine.txt`
dient als Abschlusskontrolle. Bei mehrfachen Treffern alle Varianten getrennt
nach Quell-RPF ablegen.

## Batch 05 – Umgebung und lesbare Silhouette

Ziel: `05-surroundings/`

Diese Archive liegen ebenfalls unter
`levels_1.rpf/levels/rdr3/area/jklm_07_10/`. Sie erst nach Batch 01–04
exportieren:

- [ ] `hea_rd_sgn_.rpf` – Wegweiser und Straßenschilder
- [ ] `hea_bridge.rpf` – Brücken-/Durchlassgeometrie am Ausschnitt
- [ ] `wag_01_.rpf` und `wal_train_.rpf` – Wagen-/Bahninfrastruktur
- [ ] `jklm_7_10_area_lod_combine.rpf` – große Hintergrund-/Silhouettenmodelle
- [ ] `jklm_7_10_area_lod.rpf` – korrespondierende LOD-Modelle

Nur wenn die Coverage-Auswertung danach noch konkrete Treffer im Slice meldet:
`bea_for.rpf`, `che_01_.rpf`, `cor_01_.rpf`, `mil_01_.rpf`, `old_01_.rpf`,
`reg_hrt_00.rpf`, `six_01_.rpf`, `wild_01.rpf`. Diese Pakete nicht pauschal
vor Batch 01–04 exportieren.

## Batch 06 – Innenräume für später (optional)

Ziel: `06-interiors-future/`

Innenräume werden aktuell **nicht** in der Straßenansicht geladen. Wenn Zeit
bleibt, können die folgenden Pakete vollständig für die spätere Gebäudephase
gesichert werden:

- [ ] `val_trainstn_int.rpf`, `val_carriagehouse_int.rpf`
- [ ] `val_hotel_int.rpf`, `val_bank_int.rpf`, `val_gunsmith_int.rpf`
- [ ] `val_genstore_int.rpf`, `val_saloon_int.rpf`, `val_saloon2_int.rpf`
- [ ] `val_jail_int.rpf`, `val_doctor_int.rpf`, `val_stable_int.rpf`
- [ ] `val_res_01_f_int.rpf`, `val_res_a_int.rpf`, `val_magiclantern_int.rpf`

Je Paket: YDR/YBN/YFT/YCH per Save content/Export, YTD als PNG und
YMAP/YTYP/YMF als XML. Lockdown-, zerstörte und optionale Entity-Set-Varianten
getrennt ablegen; sie dürfen nicht mit dem normalen Tageszustand vermischt
werden.

## Übergabe an Codex

Nach jedem Batch nur schreiben: `Batch 01 fertig` (entsprechend der Nummer).
Codex prüft dann automatisch Dateizahl, Duplikate, Quellhashes und fehlende
Typgruppen. Batch 01–04 sind für die geplante Karte zwingend; Batch 05 ist
coverage-gesteuert, Batch 06 optional.

