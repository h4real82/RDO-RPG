# Gebäude-Register

`registry.json` ist der Einstieg; jeder Eintrag verweist auf genau einen eigenen Ordner mit `building.json`. Der Client lädt diesen editierbaren Inhaltskatalog beim Build. Bank und Smithfield’s haben angebundene `floors/ground.json` für Boden, Eingang und sparsame eigene Geometrie. Andere leere Floor-Listen bleiben geplant.

- `id`: stabile Projekt-ID; unabhängig von Dateinamen, Sprache und Quellmodell.
- `sourcePlacementIds` / `sourceAssets`: Quellbezug, keine neuen Exportaufträge.
- `originalAccess.status`: `confirmed-open`, `confirmed-closed` oder `unknown`; nur mit Evidenz bestätigen. Story/RDO unterscheiden, wenn bekannt. Fehlende Interior-Dateien beweisen keine Nichtzugänglichkeit.
- `interior.policy`: `recognizable-adaptation` für belegt offene Originalräume, `blank-wood` für belegt geschlossene Häuser, `provisional-wood` solange Originalzugänglichkeit ungeklärt ist.
- `recognitionFeatures`: wenige prägende Raum-/Einrichtungsmerkmale mit Quellenbezug, keine vollständige Objektliste.
- `floorDefinitions`: Referenzen auf `floors/ground.json`, `floors/upper.json` usw.; jede Floor-Datei führt Boden, Wände, Zugänge, Treppen und lokale Aktionsanker. Noch leere Listen sind keine fertigen Innenräume.
- `actions`: Spiel-/Varianten-ID, Floor, sichtbarer Wandanker und begehbarer Interaktionspunkt; keine Spielregeln. Optionale Street-Approach-Anker bleiben ausdrücklich eigene Spielgestaltung.

Saloon und Hotel sind anhand der ausgewerteten P5-/P6-Fotos als innen zugänglich dokumentiert; die konkrete Story-/RDO-Ausgabe wird nicht daraus erraten. Andere Einträge bleiben offen, bis ihre Zugänglichkeit belegt ist. Die 31 Datensätze sind 28 Hüllenkandidaten plus drei Sonderklärungen, keine endgültige Zahl fertiger Gebäude.

Ein ursprünglicher Holzboden ist nicht überall zwingend: In belegten offenen Stall-/Schmiedebereichen bleiben passender Erd-/Werkstattboden und prägende Geometrie erhalten. Neu zugänglich gemachte Originalhäuser beginnen mit leerem Holzboden und sicherem Ausgang.

Vollständige Regeln und Runtime-Migration: `docs/planning/Gebaeude-Minigame-Register-2026-10-18.md`. Katalog prüfen: `python tools/validate_content_catalogs.py`.
