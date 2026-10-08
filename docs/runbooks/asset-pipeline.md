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
`val_lights_holder_05` verdeckt derzeit Teile der Vorschau: Ein isolierter
Browservergleich ohne dieses Objekt beseitigte die große Fläche. Renderbucket
und untersuchte Materialkonstanten entsprechen jedoch normalen sichtbaren
Shadern; dauerhaftes Ausblenden ist daher noch nicht begründet.
