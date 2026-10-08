# Asset-Pipeline-Runbook

## Umgebung

Die Pipeline benötigt Python 3.11 oder neuer. Für lokale Tests wird eine
isolierte Umgebung unter `tools/rdo_pipeline/.venv/` verwendet und nie
committet. Blender bleibt ein externer, versionsgebundener Konverter; seine
genaue Version wird mit jedem späteren Build-Bericht erfasst.

## Eingaben und Ausgaben

`data/raw/` und die Referenzmedien sind nur lesbar. Laufzeitdaten, Manifeste,
Provenienzberichte und Validierungsergebnisse entstehen ausschließlich unter
`data/runtime/`. Ein Inventurlauf erzeugt keine Datei neben den Eingaben.

## Test und Wiederanlauf

```powershell
& tools/rdo_pipeline/.venv/Scripts/python.exe -m pytest tools/rdo_pipeline/tests -q
```

Bei einem Fehler wird kein Rohbestand manuell korrigiert. Ursache, Werkzeug-
version und Quellpfad werden erfasst; nach der Korrektur im Tool wird der Lauf
aus denselben Rohdaten wiederholt. Fehlende Assets, ungültige Koordinaten und
unbekannte Layer werden in späteren Validierungsschritten als harte Fehler
behandelt.

## Innenraum-Archetypen (YTYP)

```powershell
& tools/rdo_pipeline/.venv/Scripts/python.exe -m rdo_pipeline.cli inspect-mlo `
  --archetype-root 'D:/Projects/RDO-RPG/data/raw/ymap' `
  --runtime-root 'data/runtime/valentine/local-preview'
```

`mlo-archetypes.json` erhält lokale Positionen, Quaternionen und Skalierungen
der Basisobjekte getrennt von optionalen Entity-Sets. Es ist ein Diagnoseartefakt
(`renderable: false`), kein Weltmanifest. Fehlende Transformationen sind Fehler;
optionale Sets werden nicht automatisch aktiviert. MLO-Namen dürfen nicht
durch ähnlich benannte Außenmodelle ersetzt werden.

`build-valentine --archetype-root <YTYP-Ordner>` expandiert Basisobjekte der
MLO-Platzierungen vor der Modellauflösung. Ihre YTYP-Dateien werden mit Hashes
in der Provenienz erfasst. Optionale Entity-Sets sind damit nicht abgedeckt;
für die aktuelle Preview wurden leere `defaultEntitySets` in allen 14
exportierten MLO-YMAPs geprüft. Eine spätere Karte mit aktivierten Sets benötigt
deren explizite Auswertung, bevor sie als vollständig gelten kann.

## Belegte Diffuse-Materialien

Der Decoder liest RDR3-Geometrie-Shader-Indizes sowie Texturreferenzen und
Renderbuckets direkt aus dem OpenIV-Systemresource-Export. Die Layoutreferenzen
sind [Cfx RDR3](https://github.com/citizenfx/fivem/blob/master/code/components/rage-formats-x/include/rmcDrawable.h)
und [librdr3](https://github.com/Sage-of-Mirrors/librdr3/blob/master/src/drawable/shaderdata.cpp).
Es wird kein Material anhand eines Dateinamens geraten.

```powershell
& 'D:/Projects/RDO-RPG/apps/tools/Blender/blender-3.2.2-windows-x64/blender.exe' `
  --background --python tools/convert_models_blender.py -- `
  --input-dir 'D:/Projects/RDO-RPG/data/raw/models' `
  --output-dir 'data/runtime/valentine/local-preview/textured-assets' `
  --texture-root 'D:/Projects/RDO-RPG/data/raw/textures'
```

Bestehende GLBs im Ziel werden nicht überschrieben. Änderungen am Konverter
benötigen deshalb einen neuen Ausgabeordner für eine vollständige Neuberechnung.
Rohdaten werden nur gelesen; `.ydr.full` wird zum Import temporär außerhalb des
Rohordners kopiert. Texturen sind im GLB eingebettet.

`rdo_material_status` in den GLB-Materialextras unterscheidet `diffuse-only`,
`missing-texture`, `ambiguous-texture` und `unsupported-diffuse-binding`.
Ein erfolgreicher Export belegt weder vollständige PBR-Materialien noch korrekte
Transparenz, Mehrschichtshader oder die Renderrolle von Hilfsgeometrie.

`inspect-drawable-materials` erhält zusätzlich die Konstanten der RDR3-
Shaderparameter: Parameterhash, Bufferindex, Byteoffset und unveränderte
Hexbytes. Das Format folgt `sgaShaderParamName` in der oben verlinkten
Cfx-Layoutreferenz (6 Bit Bufferindex, je 12 Bit Offset und Länge).
Es werden keine Float-, Farb- oder UV-Semantiken geraten. Ungültige Indizes
und Bytebereiche brechen den Decoder ab. Ein lesender Bestandscheck am
2026-10-08 dekodierte alle 527 vorhandenen `.ydr.full`-Dateien: 2249 Shader,
72120 Konstanten, keine Decoderfehler. Diese Daten sind noch nicht als
Materialsteuerung im GLB-Exporter oder Browser implementiert.

`val_lights_holder_05` verdeckt derzeit Teile der Vorschau: Ein isolierter
Browservergleich ohne dieses Objekt beseitigte die große Fläche. Renderbucket
und untersuchte Materialkonstanten entsprechen jedoch normalen sichtbaren
Shadern; dauerhaftes Ausblenden ist daher noch nicht begründet.

## Fehlende Assets gezielt in OpenIV suchen

Die [offizielle OpenIV-Namensdatenbank](https://github.com/OpenIV-Team/RAGE-StringsDatabase)
ist eine Suchhilfe, keine Quelle für Geometrie oder bewiesene Dateitypen.
Der lokale Referenzbestand liegt unter
`data/runtime/valentine/source-reference/openiv-strings` und wurde aus Commit
`cebe8efa08bbbb82cc2cdb3a0c6ad5ad150238d9` gelesen.
Für Windows beim Klonen `git -c core.longpaths=true clone ...` verwenden.
Der Referenzbestand ist nicht Teil der Projektversionierung; nur `.txt`-
Namenslisten werden gelesen, kein fremder Code wird ausgeführt.

```powershell
& tools/rdo_pipeline/.venv/Scripts/python.exe -m rdo_pipeline.cli export-targets `
  --missing-models data/runtime/valentine/local-preview/textured-runtime/missing-models.json `
  --name-database data/runtime/valentine/source-reference/openiv-strings/RDR2/ArchiveItems `
  --runtime-root data/runtime/valentine/local-preview/export-targets
```

Ergebnis: `export-targets.json`, mit SHA-256 der Missing-Liste und des
Namensdatenbestands, sortierten Kandidaten und allen passenden Namensquellen.
`name-candidate` bedeutet exakter JOAAT-Treffer oder bereits belegter
`modelName` in den Platzierungsdaten; **nicht** bestätigte `.ydr`-Geometrie.
`ambiguous` behält alle Kandidaten, `unknown` erfindet keinen Namen.
Der Abgleich verändert weder Raw-Dateien noch das Weltmanifest.

Stand 2026-10-08: 1581 Anforderungen, 1155 Namenskandidaten, 426 unbekannt,
keine Mehrdeutigkeit im angefragten Teilbestand. 1150 Kandidaten stammen
aus bisher nur als Hash benannten Einträgen; fünf Modelle waren schon benannt.
In OpenIV nach dem Kandidatennamen suchen, über „Go to file“ zum Hauptfenster
wechseln, Dateityp und Archiv prüfen und dort exportieren. Textdatenbank-Pfade
sind Herkunftshinweise, kein Beweis einer bestimmten Resource-Endung.
