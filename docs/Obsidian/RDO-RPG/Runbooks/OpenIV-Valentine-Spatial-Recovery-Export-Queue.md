# OpenIV-Arbeitsanleitung – Valentine Spatial Recovery

Stand: 2026-10-15. Diese Anleitung gilt nur für den geplanten
Valentine-Ausschnitt und den markierten Rundweg. Du musst keine Dateinamen
erraten und keine technischen Entscheidungen allein treffen.

## Was du jetzt tun sollst

1. ✅ **Batch 00B ist vollständig geprüft und erledigt.** Alle acht XMLs
   liegen unter `D:\Projects\RDO-RPG\data\raw\ymap\` vor.
2. **Aktuell ist kein weiterer Pflicht-Export nötig.** Codex prüft die
   vorhandenen Daten weiter und nennt anschließend konkrete fehlende Dateien.
3. Die 291 Valentine-YDR und die 88 Terrain-YDR bitte weiterhin nicht
   pauschal erneut exportieren. Auch Bahnhof und Kirche sind bereits als
   vollständige Modelle vorhanden; dort fehlt eine Platzierungsquelle.
4. **Batch 04A ist optional und vorerst zurückgestellt**, bis Codex die
   vorhandenen Texturen abgeglichen hat. Damit vermeidest du doppelte Arbeit.

## Status-Legende

- ✅ **Geprüft und brauchbar:** Die Datei liegt im richtigen Pipelineformat vor.
- 🟨 **Gesichert, aber noch nicht konvertierbar:** Als Inventar nützlich; ein
  späterer gezielter Export kann nötig sein.
- ⬜ **Deine nächste Aufgabe:** Kann jetzt bearbeitet werden.
- ⏸️ **Warten:** Erst bearbeiten, wenn Codex exakte Dateien nennt.
- 🚫 **Nicht exportieren:** Bringt für den aktuellen Ausschnitt keinen Nutzen.

Ein Punkt ist erst ✅, wenn nicht nur der Dateiname, sondern auch das erzeugte
Format geprüft wurde.

## Die vier Exportwege

| OpenIV-Typ | Richtiger Befehl | Das muss im Zielordner erscheinen |
| --- | --- | --- |
| `.ymap`, `.ytyp`, `_manifest.ymf` | **Export to XML** | eine lesbare `.xml` |
| `.ydr`, `.ybn`, `.yft`, `.ych` | **Save content/Export** | Unterordner mit `.full`, meist zusätzlich `.gfx` und `.sys` |
| `.ytd` | Datei öffnen → **Export all textures** → PNG | mehrere `.png` |
| komplettes `.rpf` | nur nach ausdrücklicher Aufforderung | ein Archiv-Snapshot, kein Modellkonvertat |

### Wichtigster Kontrollpunkt

Niemals direkt aus dem Suchfenster exportieren. Im Suchfenster:

1. Treffer einmal links anklicken.
2. Rechtsklick → **Go to file**.
3. Prüfen, dass OpenIV den Treffer im Hauptfenster markiert hat.
4. Erst dort Rechtsklick → den richtigen Exportweg aus der Tabelle wählen.

Wenn am Ende nur `modellname.ydr`, `textur.ytd` oder `_manifest.ymf` im
Windows-Ordner liegt, war es lediglich eine Ressourcen-/Archivkopie. Nicht
löschen, aber als 🟨 behandeln. Für YDR/YBN/YFT/YCH ist ein `.full`-Unterordner
die entscheidende Kontrolle.

## Einheitliche Zielordner

Neue Exporte bitte hier ablegen:

`D:\Projects\RDO-RPG\data\raw\openiv-batches\valentine-spatial\<batch>\<quellarchiv>\<dateiname>\`

Beispiel:

`...\00-metadata\l_09_a_placement.rpf\l_09_a_placement_ymap.xml`

- Vorhandene Dateien nicht überschreiben.
- Bei gleichem Namen aus zwei Archiven beide Quellarchive als Ordner behalten.
- Keine Dateien umbenennen, außer OpenIV schlägt selbst einen XML-Namen vor.

## Batch 00 – Metadaten

### 00A – Bereits geprüft

- ✅ `jklm_7_10_area_lod_combine_metadata.rpf`: Die 327 Hash-YMAPs müssen
  **nicht** einzeln exportiert werden. Relevante Valentine-YMAP/YTYP-Quellen
  sind bereits vorhanden.
- 🚫 `jklm_7_10_area_lod_combine.rpf`: enthält kein Manifest, sondern 171
  Drawable Dictionaries und 22 Texture Dictionaries. Kein Pauschalexport.
- ✅ `jklm_7_10_lod_combine_metadata.rpf`: 69 XML-Dateien geprüft,
  einschließlich 32 YTYPs und der relevanten `l_09`-YMAPs.
- 🚫 `jklm_7_10_lod.rpf`: nur vier YDR und ein YTD, keine zusätzlichen
  Metadaten.
- ✅ `l_09_.rpf`: `_manifest.ymf` liegt als
  `data/raw/terrain/l_09/Metadata/_manifest_ymf.xml` vor.
- ✅ `l_09_placement.rpf`: YMAP liegt als
  `data/raw/ymap/l_09_placement_ymap.xml` vor; dieses Archiv hat kein Manifest.
- ✅ `l_09_ftr.rpf`: benötigte Metadaten sind im vorhandenen Bestand enthalten.

### 00B – ✅ Abgeschlossen: acht Placement-YMAPs

Am 15.10. geprüft: acht eindeutige, lesbare `CMapData`-XMLs. Die fünf
benannten Placement-Dateien sind gültige leere Karten. Die drei Hash-Dateien
enthalten acht Gras-Batches mit insgesamt 90 Instanzen. Es sind keine
normalen Gebäude-/Terrain-Entitäten und keine Prop-Instanzen enthalten.

Die leeren `<entities/>`-Abschnitte sind **kein Exportfehler**. Die
Graspositionen liegen in separaten gepackten Instanzlisten; ihre Nullwerte in
den äußeren Transformationsfeldern werden nicht als echte Positionen verwendet.
Codex hat für jede Datei eine SHA-256-Prüfsumme und den Inhaltstyp erfasst.

Erhaltene Hash-Dateien: `0xE8AEF56E_ymap.xml`, `0xD6E951E3_ymap.xml`,
`0x750C0E2A_ymap.xml`. Die folgende Tabelle dokumentiert den erledigten Export.

Pfad in OpenIV:

`levels_5.rpf/levels/rdr3/terrain/jklm_07_10/`

| Archiv | Erwarteter Inhalt | Aufgabe |
| --- | ---: | --- |
| `l_09_a_placement.rpf` | 1 YMAP + `_cache.ych` | nur die YMAP als XML |
| `l_09_b_placement.rpf` | 1 YMAP + `_cache.ych` | nur die YMAP als XML |
| `l_09_c_placement.rpf` | 1 YMAP + `_cache.ych` | nur die YMAP als XML |
| `l_09_d_placement.rpf` | 4 YMAP + `_cache.ych` | alle vier YMAP als XML |
| `l_09_e_placement.rpf` | 1 YMAP + `_cache.ych` | nur die YMAP als XML |

Die `_cache.ych` bitte überspringen. Sie wird für die aktuelle räumliche
Kalibrierung nicht benötigt.

Kontrolle nach dem Export:

- Es müssen insgesamt **acht neue `.xml`-Dateien** vorhanden sein.
- Eine XML mit Editor öffnen: Die erste Zeile beziehungsweise das Wurzelelement
  muss lesbarer XML-Text sein, typischerweise `<CMapData>`.
- Dateigröße `0 KB`, unlesbare Binärzeichen oder nur eine `.ymap` ohne `.xml`
  bedeutet: falscher Exportweg. Dann erneut im Hauptfenster **Export to XML**.

## Batch 01 – Valentine-Außenwelt

### Bereits gesicherter Bestand

🟨 Die Ordner `val_01_.rpf` bis `val_07_.rpf` und `val_vfx.rpf` liegen unter
`data/raw/01-valentine-exteriors/`. Codex hat darin geprüft:

- 291 `.ydr`
- 4 `.yft`
- 155 `.ytd`
- 7 binäre `.ymf`
- keine `.ydr.full`, keine XML und keine PNG

Diese Dateien tragen weiterhin `RSC8`-/`PSIN`-Containerheader. Sie sind ein
sehr gutes Inhaltsinventar, aber noch kein direktes Pipelineformat. Sie bleiben
erhalten; du hast nichts falsch gemacht.

### Entscheidung für den weiteren Export

⏸️ **Keine 291 YDR einzeln nacharbeiten.** Es existieren bereits 178 passende
Valentine-`.ydr.full`. Codex vergleicht zuerst diese Modelle mit den
Platzierungen und dem Rundweg. Danach erhältst du eine kleine Tabelle mit:

- exaktem Modellnamen;
- exaktem Quell-RPF;
- Exportbefehl;
- Zielordner;
- sichtbarem Zweck, zum Beispiel „Kirchensilhouette“;
- Kontrollmerkmal, zum Beispiel erwartete `.full`-Datei.

Wenn Codex später einen Namen nennt, suchst du ihn per Tiefensuche, verwendest
**Go to file** und exportierst ihn aus der Hauptansicht.

## Batch 02 – Terrain, Straßen und Vegetation

### Bereits verwendbar

- ✅ Elf `l_09__hd_0_*`-Terrainmodelle sind als `.ydr.full` exportiert,
  konvertiert und in der lokalen Vorschau platziert.
- ✅ Die YMAP-Transformationen dieser Modelle sind geprüft.

### Noch nicht pauschal exportieren

- ⏸️ die übrigen 77 der 88 YDR aus `l_09_.rpf`;
- ⏸️ alle Drawables aus `l_09_ftr.rpf`;
- ⏸️ Drawables aus `jklm_7_10_lod.rpf` und
  `jklm_7_10_lod_combine.rpf`.

Grund: Viele davon sind Detail-, Fern- oder überlappende LOD-Modelle. Die
Coverage-Prüfung wählt nur Modelle aus, die Bodenlücken, Straßenkonturen,
Böschungen oder große Vegetationssilhouetten auf dem Rundweg schließen.

### Optional vorbereitbar: Kollisionen

Wenn du jetzt weiter exportieren möchtest, darfst du die 16 YBN aus
`l_09_.rpf` einzeln per **Save content/Export** nach
`02-terrain-l09/l_09_.rpf/collision/` exportieren.

Kontrolle: Jeder YBN-Export muss einen eigenen Ordner mit mindestens einer
`.ybn.full` erzeugen. Erscheint nur `0x….ybn`, stoppen und einen Screenshot
des Kontextmenüs senden.

## Batch 03 – Bahnhof, Gleise und südlicher Rundweg

Status: ⏸️ bis zur Coverage-Zielliste.

Später mögliche Quellarchive:

- `jklm_7_10_rails_b.rpf`
- `jklm_7_10_rails_c.rpf`
- `wal_train_.rpf`
- `jklm_7_10_area_lod_combine_collision.rpf`
- `levels_4.rpf/.../instance_placement/jklm_7_10_static_collision.rpf`
- `levels_4.rpf/.../instance_placement/jklm_7_10_instance_placement.rpf`

Bitte diese Archive noch nicht vollständig exportieren. Bahnhof, Gleis,
Bahnsteig, Wasserturm und der südliche Straßenknoten werden zuerst gegen die
bereits vorhandenen 178 Modelle geprüft.

## Batch 04 – Globale Texturen

Texturen sind sicher vorab exportierbar, weil sie keine falschen
Gebäudeplatzierungen erzeugen.

### 04A – Valentine-Texturen (darf nach Batch 00B beginnen)

Pfad:

`levels_2.rpf/levels/rdr3/gtxd/gtxd_valentine.rpf`

Für jedes YTD:

1. YTD doppelklicken, damit der Texture Viewer erscheint.
2. **Export all textures** wählen.
3. Format **Portable Network Graphics (`.png`)** wählen.
4. Ziel:
   `04-global-textures/gtxd_valentine.rpf/<name-des-ytd>/`.
5. Viewer schließen und mit dem nächsten YTD fortfahren.

Kontrolle:

- Jeder YTD-Ordner enthält mindestens eine PNG.
- Stichprobe: zwei PNGs öffnen; sie müssen als Bild sichtbar sein.
- Transparente Bilder mit Schachbrett sind erlaubt und kein Fehler.
- Bei gleichen PNG-Namen niemals Ordner zusammenführen.

### 04B – Später oder bei viel Zeit

- `gtxd_railroad.rpf`: alle YTD wie oben nach getrennten Ordnern.
- `gtxd_terrain1.rpf`: zunächst nur `heartlands1_l09.ytd`, dessen `+hi`
  Variante und eindeutig mit `l_09` bezeichnete YTDs.

Bei Varianten gilt: Basis, `+hi` und `+hidr` getrennt exportieren; nicht selbst
entscheiden, welche Variante „besser“ ist. Die Pipeline entscheidet später je
Darstellungsstufe.

## Batch 05 – Umgebung

Status: ⏸️. Nur nach einer konkreten Codex-Zielliste bearbeiten.

Mögliche Quellen sind `hea_rd_sgn_.rpf`, `hea_bridge.rpf`, `wag_01_.rpf`,
`wal_train_.rpf` sowie die beiden `jklm_7_10_area_lod*`-Archive. Auch
`bea_for.rpf`, `che_01_.rpf`, `cor_01_.rpf`, `mil_01_.rpf`, `old_01_.rpf`,
`reg_hrt_00.rpf`, `six_01_.rpf` und `wild_01.rpf` werden nur bei einem
nachgewiesenen Treffer im Slice benötigt.

## Batch 06 – Innenräume

Status: ⏸️ optional und derzeit nicht laden.

Innenräume sind für den ersten begehbaren Rundweg nicht erforderlich. Sie
werden erst bearbeitet, wenn Außenwelt, Kamera, Kollision und Rundweg korrekt
sind. Lockdown-, zerstörte und optionale Entity-Set-Varianten müssen später
getrennt bleiben und dürfen nie gemeinsam mit `default_day` geladen werden.

## Wenn etwas anders aussieht als beschrieben

Treffe keine technische Vermutung. Nutze diese Fallbacks:

- **Dateityp fehlt im Archiv:** Screenshot mit eingeklappten Typgruppen senden.
- **„Save content/Export“ fehlt:** Screenshot des Kontextmenüs senden; nicht
  stattdessen „Extract“ wählen.
- **Export erzeugt nur `.ydr/.ybn/.ytd`:** als 🟨 behalten und stoppen.
- **OpenIV fragt nach Überschreiben:** abbrechen und einen neuen Quellordner
  anlegen.
- **Mehrere gleichnamige Suchtreffer:** nichts auswählen; Screenshot mit
  sichtbaren Quellpfaden senden.
- **Unklar, ob Basis oder `+hi/+hidr`:** alle Varianten getrennt behalten.
- **XML-Datei hat 0 KB oder unlesbare Binärzeichen:** aus der Hauptansicht
  erneut **Export to XML**. Lesbares XML mit `<entities/>` darf dagegen
  tatsächlich leer sein; erst von Codex prüfen lassen.

## Übergabe und Kontrollinstanz

Nach einem Batch reicht folgende kurze Meldung:

```text
Batch 00B fertig
Zielordner: D:\...\00-metadata
Ergebnis: 8 XML
Abweichung: keine
```

Bei einer Abweichung ergänzt du nur einen Screenshot. Codex übernimmt danach:

1. Dateizahl und Endungen prüfen;
2. XML-/Ressourcenheader kontrollieren;
3. Duplikate und Quellpfade prüfen;
4. sagen, was gültig ist;
5. die nächste kleine Aufgabe eindeutig freigeben.

Du musst selbst nur dann eine Entscheidung treffen, wenn es um Zeitaufwand
geht: **Batch 04A jetzt zusätzlich exportieren oder nach Batch 00B warten.**
Technische Auswahlentscheidungen übernimmt Codex anhand der Coverage-Daten.
