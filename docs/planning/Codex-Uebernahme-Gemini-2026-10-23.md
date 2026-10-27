# Codex-Übernahme nach Gemini – 23.10.2026

Auftrag: [H4R-27](https://linear.app/h4real82/issue/H4R-27), mit Bezug zu
[H4R-47](https://linear.app/h4real82/issue/H4R-47) und
[H4R-93](https://linear.app/h4real82/issue/H4R-93).

## Übernommener Kontext

`docs/TEMP/CodexCache.md` enthält historische Codex-Protokolle und ab Zeile 29316
Geminis Übergabe vom 21.–23.10.2026. Die Ausbaubatches behandeln Innenräume,
Gelände/Dressing, Minigame-Register, Coins, Poker, Bar/Getränke, Kino,
Erinnerungsraum und zuletzt Höhen-/Materialkorrekturen. Benutzerwünsche aus diesen
Notizen sind Kontext; Fertigmeldungen sind separat zu prüfen.

Aktiv geprüft und bearbeitet wurde
`C:/Users/h4rea/.codex/worktrees/rdo-restart-foundation/RDO-RPG`
auf `codex/rdo-restart-foundation`. Main unter `D:/Projects/RDO-RPG` ist kein
vollständiges Duplikat: Clientpaket und Runtime unterscheiden sich, dort fehlt
beispielsweise `apps/client/src/game/buildings/RoomTransform.ts`. Kein pauschales
Zurückkopieren oder Committen des gemischten Arbeitsstands.

## Frisch festgestellter Stand

- Aktives Verified-Scene-Manifest: 170 Platzierungen.
- Gebäuderegister: 19 Einträge mit 22 referenzierten Floor-Dateien. Das ist
  Konfigurationscoverage, keine Abnahme von 19 begehbaren Innenräumen.
- Hotel und Auktionsscheunen 2/3 haben je zwei Floors, aber keine registrierten
  `layout.stairs`. Alle sechs Floors lassen standardmäßig einen Außeneingang zu.
  Ein erreichbarer Stockwerkswechsel ist damit nicht nachgewiesen.
- Station referenziert nur ein Erdgeschoss. Die alte Obergeschossdatei liegt
  weiterhin vor, ist aber nicht registriert. Ein Registry-Test erwartet noch
  zwei Stockwerke und schlägt fehl.
- Die gesichtete Browseransicht zeigt weiterhin dunkle, harte Straßenbänder,
  weiße Fassadenflächen und eine sehr dunkle Innenraumbeleuchtung. Die Map ist
  visuell nicht abgenommen. Die HUD-Zahl 1595 bezeichnet offene Quellreferenzen,
  nicht 1595 nachgewiesen fehlende Pflichtgebäude.
- Der zuletzt verschobene Jail-Default liegt laut GLB-Metadaten als
  `missing-texture` vor. Positionskorrektur, passende Innenraumhöhe und
  Texturauflösung benötigen getrennte Prüfung; pauschales Umfärben ersetzt sie nicht.

## Erste Korrekturen im Restart

1. `SpatialContext.ts`: Bodenprüfung wieder auf tatsächliche Fußbodenhöhe begrenzt;
   Polygon-/Aussparungsprüfung und vorhandene Treppenlogik bleiben erhalten.
   Die pauschale Toleranz von mehreren Metern und der geschlossene Wände
   umgehende Eintritts-Fallback sind entfernt. Offene Scheunen bleiben explizit offen.
   Rampenannäherung prüft wieder die erwartete Rampenhöhe.
2. `InteriorPresentation.ts`: Gewöhnliche Möbel werden über Raumgruppen ausgeblendet,
   nicht dauerhaft durch Überschreiben ihrer Einzel-Sichtbarkeit. Ersetzte
   Platzhalter bleiben verborgen. Erdgeschossboden/-einrichtung bleiben außen
   durch Öffnungen sichtbar; Cutaway-Wände bleiben innen, inaktive obere Floors
   verborgen. Physischer Support wird nicht abgemeldet.
3. `ValentineRuntime.ts`: Die Vertexmasken-Korrektur greift nur auf als importiert
   gekennzeichnete Materialvorschauen über. Eigene Materialien behalten ihre
   Vertexfarben. Breitere Materialänderungen wurden nach visueller Regression
   verworfen; die Straßen-/Texturprobleme sind nicht als behoben markiert.

Gezielte Regressionen wurden vor der Korrektur rot und danach grün ausgeführt.
Der alte Runtime-Snap auf `spatial.current.floor.layout.floorY` bleibt als
Folgepunkt bestehen: Vor realer Stockwerksabnahme müssen physischer Treppensupport,
Höhennachführung und Floor-Verbindungen gemeinsam korrigiert werden.

## Validierung und Grenzen

- 35 gezielte Tests in fünf Dateien bestanden: Runtime-Materialgrundlagen,
  SpatialContext, InteriorPresentation, SourceTraversal, TerrainGround.
- Vollständige Clientsuite: 276 bestanden, 16 fehlgeschlagen, 68 Testdateien.
  Fehler betreffen unter anderem Registry-Erwartung, SourceAppearance,
  Venue-DOM-Tests und Wallet-/Minigame-Verträge. Die Übergabeaussage einer
  vollständig grünen Testsuite ist derzeit nicht reproduzierbar.
- Browser: von explizitem Startpunkt auf der Saloonveranda per echtem Mausklick
  durch die Tür gelaufen; Indoorzustand, sichtbare Einrichtung, 430px-Ansicht und
  Ausgang mit wieder eingeblendeter Umgebung geprüft. Keine Browserexceptions.
  Das belegt diesen Türübergang, keine gesamte Stadt-/Treppen-/Routenabnahme.
- Ein erster zeitgesteuerter Lauf ab Straßen-Spawn erreichte den Eingang nicht;
  sein fehlgeschlagener Bericht bleibt erhalten und wird nicht als Erfolg gezählt.
- Pflichtbuild `npx pnpm -r build` ausgeführt. Der Client scheitert weiterhin an
  Typfehlern in Wallet-/Minigame-Verträgen und einem Venue-Aufruf; das zuvor
  vorhandene `RoomLayout.height`-Problem ist mit der SpatialContext-Korrektur entfernt.

Belege ausschließlich lokal im Restart:
`data/runtime/valentine/test-artifacts/codex-takeover-2026-10-23/` mit
`before.json`, `before-street.png`, `floor-audit.json`, `final-browser-report.json`,
`final-street.png`, `final-saloon.png`, `final-saloon-mobile.png`, `map-tests.log`,
`client-tests.log`, `build.log` und Vorherkopien der bearbeiteten Dateien.

## Linear-Abgleich

Live abgefragt: Die von Gemini lokal als Done signierten Aufgaben sind nicht
entsprechend geschlossen. H4R-87/74/69/70 stehen auf In Progress;
H4R-88/68/71/76/77/80/81/90/72 stehen auf Backlog. Diese Status wurden nicht
pauschal geändert. Lokale Implementierungen, Serverautorität, gemeinsamer
Mehrspielerzustand und tatsächliche Anbieterfunktion müssen getrennt geprüft werden.
Insbesondere belegt Browser-localStorage keine geteilten Erinnerungen für Freunde.

H4R-27/47/93 bleiben In Progress. Neue Erkenntnisse und der überprüfte Teilumfang
werden als Kommentare ergänzt; keine Gesamtfertigstellung oder Synchronisierung behauptet.

## Reihenfolge der weiteren Map-Arbeit

1. Straßen-/Terrainmaterialien und weiße Quellflächen anhand einzelner Material-
   und Texturzuordnungen korrigieren; feste Vergleichskameras verwenden.
2. Gebäudeweise Grundriss, reale Eingangshöhe und Zugang koppeln. Hotel und
   Scheunenoberdeck erst mit verbundenen, begehbaren Treppen abnehmen.
3. Bahnhof, Jail sowie Kirche/Friedhof mit den gelieferten Referenzen abgleichen.
4. Gesamtroute und Innen-/Außenübergänge nachprüfen. Beleuchtung/HUD anschließend
   auf Desktop und Mobilgerät abstimmen.

L22 bleibt außerhalb des Scopes. Keine neue OpenIV-Lieferung angefordert.
