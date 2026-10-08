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
