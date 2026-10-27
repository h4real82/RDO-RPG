# Kontextkamera und alle Innenräume – Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Bestehende autonome Freigabe beachten; keine neue Bestätigungsschleife. Dieser Plan meldet keine Laufzeitimplementierung als abgeschlossen.

**Goal:** Draußen Überblick und Rennen, an Eingängen sanfte Annäherung, innen ein gut lesbares aktives Stockwerk; jedes Gebäude erhält einen einfachen sicheren Innenraum.

**Architecture:** Gemeinsames Gebäude-/Floor-Register und SpatialContext versorgen Kamera, Render-Maske, Input und Aktionshinweise. Physik bleibt unabhängig von Sichtbarkeit. Vorhandene Bank-/Saloonpiloten werden migriert; übrige Gebäude folgen über dieselben Bausteine.

**Tech Stack:** Bestehendes TypeScript, Three.js, Vite, Vitest, Playwright; keine neue Engine und keine zusätzlichen Modellpakete erforderlich.

**Spec:** `docs/superpowers/specs/2026-10-18-context-camera-interiors-design.md`

## Globale Vorgaben

- Einfache eigene Geometrie als `authored-gameplay`; bestehende Koordinatenbasis und Spielgrenze unverändert. L22 ausgenommen; Wald dekorativ.
- Ein zuständiger Satz Kollisionskörper pro Pilotbereich; keine zweite blockierende Quellhülle.
- Physische Wände/Support bleiben bei Render-Maskierung bestehen; andere Stockwerke sind keine Klickziele.
- Rennen nur draußen, Treppen/Türvorzone/Innenraum erzwingen Gehen. Alle Inputhandler defensiv und vollständig entsorgbar.
- Jeder Codeauftrag endet mit `npx pnpm -r build`; Tests passend zur Änderung, visuelle Abnahme separat. Keine pauschale Git-Staging-/Commit-/Uploadaktion.

## Review-Schwerpunkte

1. Schwellen, überlappende Höhen und große Quell-AABBs dürfen keine falsche Haus-/Floor-Zuordnung auslösen.
2. Sprint auf einem langsamen Frame darf weder Wand noch Eintrittszone überspringen; Shift darf nach Innenraum nicht hängenbleiben.
3. Maskierte Mehrgeschossmeshes dürfen weder andere Floors anklickbar machen noch Support/Kollision abschalten.
4. Manuelles Zoom/Yaw, wechselnde Aspect-Ratios und Reduced Motion dürfen die Automatik nicht zum Pendeln bringen.
5. Entladen/Recovery/Modal/Sessionwechsel müssen Sicht, Material und Inputzustand sauber restaurieren.

## Task 1 – Bestand und gemeinsames Register (H4R-93)

**Dateien:** neu `apps/client/src/game/buildings/BuildingRegistry.ts`, `BuildingRegistry.test.ts`, `data/reference/valentine/buildings/registry.json + einzelne <buildingId>/building.json und floors/*.json`; ergänzen `data/reference/valentine/interior-rollout-inventory.json` und Bestandsbericht. Bestehende `world/AuthoredBank.ts`, `world/AuthoredSaloon.ts`, `ValentineRuntime.ts` gezielt migrieren.

**Schnittstelle:** `BuildingDefinition {id, sourcePlacementIds, originalAccess, interiorPolicy, recognitionFeatures, floors, entrances, stairs, actions}`; `FloorDefinition {id, label, polygons, elevationRange, cameraBounds, supportGroupIds, collisionGroupIds, renderGroupIds}`. `validateBuildings(definitions, placementIds)` liefert explizite Fehler und Coverage; keine automatisch akzeptierten Häuser aus Dateinamensmustern.

- [ ] Tests: doppelte IDs, fehlende Floor-/Entrance-Verweise, nicht zugeordnete Kandidaten, falsche Geschoss-Höhen, 103 Datensätze ohne stille Auslassung; 72 Details erst nach bewusster Zuordnung als abgeschlossen zählen.
- [ ] Originalzugänglichkeit belegen: confirmed-open → recognizable-adaptation, confirmed-closed → blank-wood, unknown → provisional-wood; keine geschlossene Tür aus fehlendem Export ableiten. Eigenen Ordnerkatalog nach docs/planning/Gebaeude-Minigame-Register-2026-10-18.md migrieren.
- [ ] Register und authored-Geometrie aus vorhandenen Pilotwerten erstellen; Source-Hüllen nur Referenz/Sicht, keine neuen Originalherkunftsbehauptungen.
- [ ] Beide Piloten mit unveränderter Bewegungsbasis nachweisen; Bestandsprüfung mit Fotos/Maplabels vervollständigen, fehlende Häuser als eigene Einträge ergänzen.
- [ ] Tests und Pflicht-Build; Registry bleibt ein Planungsskelett, solange Floorbau/Abnahme fehlt.

## Task 2 – Stabilen räumlichen Kontext auflösen (H4R-93)

**Dateien:** neu `interiors/SpatialContext.ts`, `SpatialContext.test.ts`; Integration `ValentineRuntime.ts`, `world/TerrainGround.ts`, `world/SourceTraversal.ts`.

**Schnittstelle:** `SpatialContextResolver.update(previousPosition, currentPosition, dt): SpatialContext`; Kontext enthält Modus, Gebäude/Floor, benutzten Eingang/Treppenverbinder und erreichbaren Fokusanker. `reset(position)` für validierten Spawn/Recovery, `suspend()` für Modal/Sessionende. Keine Quellmesh-Suche im Kameracontroller.

- [ ] Tests: Straße vor Haus, Veranda, Tür hinein/hinaus, Hausrückwand, Stillstand auf Grenze, Start innen, Recovery außen, zwei übereinander liegende Floors und getrennte Nachbarhäuser.
- [ ] Hysterese/Übergangszonen implementieren. Eine passende Y-Höhe allein genügt nicht. Treppenwechsel nur über registrierten begehbaren Verbinder.
- [ ] Bestehende Terrain-/Kollisionsauflösung erhalten; aktive Support-/Pick-Mengen explizit auswählen.
- [ ] Reale Bank-/Saloonroute mit Kontextprotokoll prüfen; Tests und Pflicht-Build.

## Task 3 – Kontextkamera (H4R-92)

**Dateien:** neu `player/ContextCamera.ts`, `ContextCamera.test.ts`; erweitern `player/OrthographicFollowCamera.ts/.test.ts`, `ValentineRuntime.ts`; neue Browserprüfung `scripts/e2e-context-camera.mjs`.

**Schnittstelle:** `ContextCamera.resolve(context, player, viewport, yaw, userZoomOffset): CameraGoal {target, visibleHeight, transitionSeconds}`; `OrthographicFollowCamera` übernimmt das Ziel und bestehende Drehung. Innen-Fit projiziert Floor-Eckpunkte, berücksichtigt Aspect-Ratio und HUD-Rand. DEV-Referenzpose hat Vorrang.

- [ ] Tests: overview42, Annäherung7m→1m, keine Wandnähe-Auslösung, aktive Floor-Grenzen bei mehreren Yaws, Hochformat, wiederholter Ein-/Austritt, manuelles Zoom/0 und Reduced Motion.
- [ ] Ziel-/Zoominterpolation einbauen; auf Benutzerkorrekturen begrenzt reagieren, nicht pro Frame gegen das Mausrad arbeiten.
- [ ] Street → Porch → Indoor → Street auf Screenshots/Videozuständen prüfen; Bild darf keine Ausgänge abschneiden. Große Floors vollständig einpassen.
- [ ] Tests und Pflicht-Build vor serieller Browserprüfung; während GPU-Prüfung keine Codeänderungen oder Builds.

## Task 4 – Nur aktives Geschoss zeigen (H4R-32, H4R-47)

**Dateien:** neu `interiors/InteriorPresentation.ts/.test.ts`; ergänzen authored-Geometrie, `ValentineRuntime.ts`, `player/OcclusionController.ts`, explizite Auswahlfilter für Boden-/Objektrays.

**Schnittstelle:** `InteriorPresentation.apply(context)` und `restore()/dispose()`. Jeder gruppierte Originalzustand wird einmal gespeichert; zwischen aktiven Floors wird Sichtbarkeit deterministisch berechnet. Aufgeteilte eigene Innenflächen und vereinfachte sichtbare Cutaway-Wände ersetzen im Innenbild nötigenfalls die gesamte unsegmentierte Quellhülle.

- [ ] Tests: Nachbarhaus optisch verborgen, aber weiter kollidierbar; falscher Floor nicht anklickbar; Boden bleibt sichtbar; ein Mesh über mehrere Floors; Originalmaterial nach Fade/Maskierung wiederhergestellt.
- [ ] Aktiven Boden/Wände/Props/Figur/verbundene Treppe zeigen, Außenwelt ausblenden. Keine globalen Materialänderungen an geteilten Assets.
- [ ] Entladen, abgebrochenes Laden, Recovery und Sessionende prüfen; kein hängenbleibend unsichtbares Valentine.
- [ ] Innenbilder Bank/Saloon plus Rückkehr draußen im Browser; Tests und Pflicht-Build.

## Task 5 – Gehen/Rennen und Kontextaktionen (H4R-94, H4R-86)

**Dateien:** erweitern `player/PlayerController.ts/.test.ts`, neu `input/MovementMode.ts/.test.ts`; `ValentineRuntime.ts`, `interaction/FallbackMenu.ts`, `presentation/Hud.ts`, `app/AppShell.ts`.

**Schnittstelle:** `MovementMode.resolve({context, heldShift, requestedPathMode, captured}): 'walk'|'run'|'stopped'`; initiale Geschwindigkeiten6/9 zentral konfiguriert. Kontext wird an jedem physischen Teilschritt neu begrenzt. Rückgabe/Verbrauch eines Sprintwunsches wird ausdrücklich modelliert.

- [ ] Tests: gehaltenes Shift außen, LAUFEN/RENNEN auf Boden, normales Linksklickziel, Objekt mit primärer Aktion, indoor nurLAUFEN, Sprintziel über Tür, gehaltenes Shift nach Verlassen, niedrige Bildrate und analoger Endschritt.
- [ ] Blur/Modal/Pointercancel/Recovery löschen Wunsch und Laufziel; neue Shift-Flanke nach Indoor erforderlich.
- [ ] Kontext auf aktionsfreiem erreichbarem Boden zeigt beide Bewegungsarten, innen Rennen nicht auswählbar. Keine Interaktionsaktion als Laufbefehl umdeuten.
- [ ] Browserlauf gegen Wand/Kartenrand/fehlendes Terrain; aktuelle Local-Solo-Einschränkung dokumentieren. Tests und Pflicht-Build.

## Task 6 – Dezente Übergangs- und Aktionshinweise (H4R-95)

**Dateien:** neu `interiors/ProximityHints.ts/.test.ts`, zugehörige CSS; bestehende Darts-Markierung in `ValentineRuntime.ts` migrieren; Aktionsanker mit `InteractionRuntime.ts` verbinden.

**Schnittstelle:** `ProximityHints.resolve(context, position, availableActions)` liefert nur erreichbare Hinweise des aktiven Floors; Renderer stellt Text/Symbol und sanft begrenzte Deckkraft dar. Maus/F/Kontext benutzen identische Action-IDs.

- [ ] Tests: nahe Treppe/Ausgang sichtbar, weiter entfernt ausgeblendet, Wand dazwischen, inaktiver Floor, mehrere nahe Aktionen, Reduced Motion, fehlende Capability.
- [ ] Eigene einfache Dartscheibe an Wand statt Hausdach als Klickziel; Bar/Sitz/Tisch und Musikanker nur bei implementierter Aktion aktivieren. Unbekannte Kategorie bleibt schließbar.
- [ ] Tür/Treppe bei Annäherung im Innenbild eindeutig lesbar; keine dauerhaft blinkenden Markierungen. Tests und Pflicht-Build.

## Task 7 – Alle Gebäude mit minimalen Räumen ausrollen (H4R-47)

**Dateien:** Registerdaten `data/reference/valentine/buildings/registry.json + einzelne <buildingId>/building.json und floors/*.json`, minimale Innenraum-Presets unter `game/interiors/`; ergänzende `scripts/e2e-interior-coverage.mjs`, JSON/Screenshots lokal unter `data/runtime/...`.

- [ ] Charge A: Bank und Smithfield’s, einschließlich eigener sichtbarer Innenwände und sinnvoller verbundener Geschosse gemäß freigegebenem vereinfachtem Design.
- [ ] Charge B: Hotel, General Store, Büchsenmacher, Arzt, Law Office, Sheriff, Gefängnis-Hülle, Schmiede, zweiter Saloon.
- [ ] Charge C: Bahnhof, Frachtstation, Kirche, Kinozelt, Kassenhäuschen.
- [ ] Charge D: Viehmarkt-Stall1/2, Auktionsscheune2/3, Viehmarkt-Schuppen, Viehmarkt-Scheune, Livery-Stall.
- [ ] Charge E: WohnhausF/E/D und AuktionshausA/B; zusätzliche auf Mapreferenzen sichtbare Häuser in die passende Charge aufnehmen.
- [ ] Sonderklärungen Kleintierbau, Gefängnis-Komponente und Ruine abschließen; zugeordnete Details/fehlende Originalhüllen nicht als unerfasste Häuser übersehen.
- [ ] Je Floor mindestens passender vorhandener Boden oder eigener Holzfallback, einfache freie Laufzone, sichere Tür, Ausgangsmarkierung, verbundenes Treppenziel falls mehrgeschossig. Keine volle Möblierung erforderlich.
- [ ] Je Charge eigenen Coverage-Bericht und Ein-/Austritts-/Floorwechsel-Probe; H4R-47 erst bei100%aller endgültig freigegebenen Häuser/Floors und frischer Gameplay-Abnahme schließen.

## Abschluss und Benutzer-Zuarbeit

Linear führt aktuellen Status und Abhängigkeiten. Nach jedem abgenommenen Teil aktualisieren; keinen Gesamtfortschritt aus Anzahl GLB-Dateien oder grünem Build ableiten. Referenzmodelle/Bilder bleiben lokal, keine Binärdateien oder pauschalen Uploads.

Aktuell keine Benutzer-Zuarbeit nötig. Unbekannte Original-Assetnamen bleiben Identifikationslücken; der einfache eigene Innenraum kann trotzdem gestaltet werden. Neue Original-Exportaufträge nur mit genauer belegter Datei, Archivpfad, Format und vorbereitetem absolutem Zielordner.


Ergänzung: Wiedererkennbare Originalinnenräume sind getrennt vom Bodenpilot abzunehmen; ursprünglich geschlossene Häuser bleiben zunächst leere Holzbodenräume. Minigames erhalten eigenen Katalog und getrennten Migrationsplan docs/superpowers/plans/2026-10-18-minigame-registry.md.


## Umsetzungsstand nach Freigabe

Runtime-Register, stabiler Eingangskontext, Kontextkamera, Innenmaske, Rennen und Nähehinweise sind für die beiden Erdgeschosspiloten Bank/Smithfield’s integriert und im Browser geprüft. Saloon hat Theke, zwei Tische und einen Darts-Wandanker. Noch keine vollständige Stockwerks-/Gebäudecoverage; die umfassenden Prüfcheckboxen bleiben bis zu ihrer vollständigen Erfüllung offen. Präzises Prüfprotokoll und nächste Charge: `docs/planning/Context-Interiors-Implementation-Ledger.md`. Minigame-Registry und lokale Darts-Migration sind ebenfalls angeschlossen; Online bleibt H4R-64.
