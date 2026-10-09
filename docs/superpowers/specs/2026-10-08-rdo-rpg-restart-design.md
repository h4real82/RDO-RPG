# RDO-RPG 2.5D Neustart – Architekturentwurf

## Zweck und Erfolgskriterien

RDO-RPG wird als browserfähiges, maßgetreues 2.5D-Spiel neu aufgebaut. Die erste lieferbare Erfahrung ist ein lokal spielbarer Singleplayer-Vertical-Slice von Valentine. Die sichtbare Welt soll Red Dead Online möglichst originalgetreu nachbilden; grafische Qualität und überprüfbare räumliche Genauigkeit haben vor Entwicklungsgeschwindigkeit Vorrang.

Erfolg bedeutet, dass ein Spieler Valentine mit einer konsistenten, leicht abgesenkten orthografischen Kamera erkunden kann, ohne dass Geometrie, Straßenführung oder Gebäudeplatzierung geraten werden. Die Anwendung muss in einem normalen Desktop-Browser stabil laufen und alle Laufzeitdaten reproduzierbar aus den vorhandenen OpenIV-Exporten erzeugen können.

## Nichtziele der ersten Ausbaustufe

- Kein Multiplayer, kein Colyseus-Server und keine Discord-Aktivität.
- Keine zusätzliche Region außerhalb Valentines.
- Kein prozedurales Erfinden von Straßen, Gebäuden, Gleisen oder Landmarken.
- Keine Übernahme des bisherigen Clients als technische Grundlage.

## Bestandsübernahme

| Kategorie | Entscheidung | Begründung |
| --- | --- | --- |
| `data/raw/` OpenIV-Modelle, Texturen, YMAPs | Behalten, schreibgeschützt behandeln | Wertvollste Primärquelle; muss jederzeit erneut verarbeitbar sein. |
| `data/processed/` und Platzierungsdaten | Prüfen und gezielt übernehmen | Nur Artefakte mit nachvollziehbarer Herkunft dürfen Runtime-Eingaben werden. |
| `tools/` Python-Exporter und Konverter | Prüfen, testen, konsolidieren | Sie werden Teil der reproduzierbaren Datenpipeline. |
| Referenzmedien | Behalten | Visuelle und räumliche Validierungsgrundlage. |
| Bestehender Client, Server, alte Blueprints | Nur Referenz | Keine Übernahme ohne neuen Vertrag und Tests. |
| Antigravity-Logs | Entfernen | Relevante Entscheidungen werden in neue Codex-ADRs und Runbooks übertragen; keine Archivpflicht. |

## Autoritative Datenkette

```text
OpenIV-Archive (data/raw)
  -> geprüfte Python-Extraktoren und Konverter (tools)
  -> validierte Runtime-Artefakte (data/runtime)
  -> versioniertes rdo_world_manifest.json
  -> Three.js-World-Runtime und Browser-Client
```

`data/raw/` ist unveränderlich. Generatoren schreiben ausschließlich nach `data/runtime/` und erzeugen einen nachvollziehbaren Bericht mit Quellhash, Werkzeugversion, Validierungsergebnis und Manifestversion. Kein Clientcode liest Rohdaten direkt.

Das Weltmanifest ist die einzige Quelle für Objekt-ID, Modellpfad, Position, Rotation, Maßstab, Materialvariante, Kollisionsklasse, Chunk und LOD. Ohne Manifestdatensatz darf kein sichtbares Weltobjekt entstehen.

## Weltgesetze

Die vorhandene RDO-Rekonstruktionsvorgabe gilt unverändert:

- Coordinates: `game_x = (lng - 111.29) / 0.01552` und `game_y = (lat - (-63.6)) / 0.01552`; Three.js verwendet X = `game_x`, Y = Höhe, Z = `-game_y`. Diese rechtshändige Basis `(X, Z, -Y)` entspricht dem Blender-/glTF-Export und verhindert die zuvor durch eine negative Instanzskalierung gespiegelten Fassaden und Schriften.
- Schichten: Terrain `0.000`, Straßen/Schienen `0.002`, Boardwalks `0.0035`, Gebäude/Fundamente `0.005`.
- Straßen und Schienen sind manifestgesteuerte BufferGeometry-Quad-Strips; Schienen haben Kollisions- und Lichtraumpriorität.
- Streaming erfolgt deterministisch in 250 m × 250 m großen Chunks mit vollständigem GPU-Resource-Disposal beim Entladen.
- Dachüberhänge bleiben bei höchstens 0.5 Einheiten. Verdeckende Bauteile blenden stufenlos auf `opacity: 0.15` und `depthWrite: false`.

## Zielarchitektur

### Repository-Grenzen

- `data/source/` oder der bestehende, gleichwertige Rohdatenbereich: archivierte OpenIV-Exporte, nur lesend.
- `tools/`: Python-Programme für Konvertierung, Inventur, Validierung und wiederholbare Builds.
- `data/runtime/`: erzeugte Modelle, Texturen, Manifeste, Kollisions- und POI-Daten; nie handkorrigierte Primärquelle.
- `packages/world-contracts/`: TypeScript-Schemas, Datenmodelle und Validierungslogik für Pipeline und Client.
- `apps/client/`: eigenständiger Three.js-/TypeScript-Browserclient.
- `docs/`: versionierte technische Dokumentation, ADRs, Runbooks und Pläne.
- `docs/Obsidian/`: derselbe Markdown-Bestand als Obsidian-Vault, nicht als Kopie oder Exportziel.

Die endgültige Migration kann die Namen `data/raw/` und `data/processed/` beibehalten, sofern ihre Rolle in den Verträgen exakt abgebildet wird. Eine unnötige Massendatei-Verschiebung ist ausdrücklich kein Ziel.

### Client-Grenzen

1. **World Runtime** lädt und entlädt Chunks, instanziiert ausschließlich Manifestobjekte und besitzt alle GPU-Ressourcen.
2. **Player Runtime** enthält Eingabe, Bewegung, Kollision, Kamera und Sichtschutz.
3. **Interaction Runtime** verwaltet POIs und Menüs. Jeder Listener hat Null-Checks, `try/catch` und ein schließbares Fallback-Menü.
4. **Presentation Runtime** enthält HUD, Minimap, Audio und Dialoge. Sie kennt keine Rohdaten und erzeugt keine Weltgeometrie.

Ein späterer Multiplayer-Server erhält nur Domänenzustand, Autorität, Persistenz und Lobby/Discord-Integration. Er wird nie für lokales Rendering oder Asset-Streaming zuständig.

## Visueller Stil und Kamera

Die festgelegte Perspektive ist eine leicht abgesenkte, spielerfolgende orthografische 2.5D-Kamera. Sie besitzt global versionierte Konstanten für Neigung, Höhe, Zoomgrenzen und Nachführverhalten. Der Spieler dreht nicht die Kamera frei; Screenshot- und Debug-Kameras sind klar von der Spielkamera getrennt.

Die Szene verwendet echte PBR-Geometrie und Materialdaten, nicht Sprite- oder Kachel-Ersatz. Qualität im Browser entsteht durch folgende Reihenfolge:

1. richtiger Datensatz und richtige Platzierung,
2. geprüfte LOD-Stufen pro Asset,
3. Instancing gleichartiger Objekte,
4. frustum- und chunkbasiertes Culling,
5. GPU-komprimierte Texturen und festgelegte Textur-Budgets.

Schlechtes Maß oder improvisierte Low-Poly-Substitution ist keine zulässige Performance-Optimierung. Werden Budgets überschritten, wird zuerst die Pipeline optimiert und dann die Änderung gegen Referenzbilder validiert.

## Obsidian, MCPs und Skills

Das neue Codex-Projektwissen wird in Git-versioniertem Markdown geführt, das Obsidian direkt als Vault öffnet. Damit arbeiten Codex und Obsidian an denselben Dateien. Git ist alleinige Historie und Konfliktauflösung.

Während Codex mehrere Dokumente umstrukturiert, bleiben diese Notizen in Obsidian geschlossen. Normale Obsidian-Änderungen werden wie Code geprüft und committed. Die lokale REST-API dient für gezielte Suche und kontrollierte Operationen; API-Schlüssel bleiben ausschließlich in der lokalen Umgebung. Sie startet keine Codex-Aufgaben automatisch.

MCPs bleiben minimal: begrenzter Vault-Dateizugriff, lokale Obsidian-REST-API und der schreibgeschützte OpenAI-Dokumentations-MCP. Breite Dateisystemzugriffe und eingecheckte Secrets sind verboten.

Die verbindlichen Skills sind:

- `rdo-map-reconstruction` für Weltgesetze und Validierung,
- eine fokussierte Asset-Pipeline-Skill für Konvertierung und Prüfberichte,
- eine Obsidian-Skill für Vault-Struktur und sichere REST-Verwendung.

Ein einzelner Hauptagent hält Architektur und Verträge konsistent. Kleine, günstige Nebenagenten sind nur für voneinander unabhängige, schreibgeschützte Inventuren zulässig.

## Qualitätsgates

- Jede Codeänderung endet mit `npx pnpm -r build`.
- Jede Datenverarbeitung validiert Schema, Referenzierbarkeit, Koordinaten, Layer, Chunk-Zuordnung und fehlende Asset-Dateien.
- Unit-Tests decken Koordinatentransformation, Manifest-Schema, Chunk-Grenzen, Disposal und Sichtschutz ab.
- Browser-Smoke-Tests decken Laden, Bewegung, Kamera, POI-Fallback und den Valentine-Start ab.
- Visuelle Referenztests vergleichen definierte Kamerapositionen mit freigegebenen Referenzbildern und dokumentieren Abweichungen.

## Lieferreihenfolge

1. **Inventur und Verträge:** Daten klassifizieren, Herkunft erfassen und Manifestvertrag definieren.
2. **Pipeline:** reproduzierbaren Konverter, Validator und einen kleinen, überprüften Valentine-Abschnitt erzeugen.
3. **World Runtime:** Chunking, Streaming, Disposal, Layer und Ground-Truth-Geometrie implementieren.
4. **Spielbarer Slice:** Spieler, festgelegte Kamera, Sichtschutz, Interaktion, HUD und Minimap ergänzen.
5. **Qualitäts-Slice:** vollständiger Valentine-Rundgang, LOD-/Speicher-Budgets und Referenzvergleich.
6. **Multiplayer-Vorbereitung:** Netzwerkgrenzen und Persistenz modellieren; erst anschließend Colyseus und Discord integrieren.

## Entscheidungsprotokoll

- Browser-Singleplayer-Vertical-Slice vor Multiplayer/Discord: bestätigt.
- Valentine als alleiniger Erstinhalt: bestätigt.
- Datengetriebener Neustart statt Sanierung oder Datenverzicht: bestätigt.
- Filmische orthografische 2.5D-Kamera: bestätigt.
- Grafische Qualität und Maßtreue vor Geschwindigkeit: bestätigt.
- Antigravity-Logs nach Wissensübernahme entfernen: bestätigt.
