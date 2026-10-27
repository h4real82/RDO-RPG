# Valentine: geprüfter Map-Batch am 24.10.2026

> Nachtrag zur Nutzerrückmeldung: Die unten dokumentierten 24 Ein-/Ausgänge
> begannen auf den konfigurierten Rampenfüßen. Das war keine Prüfung des Wegs
> vom tatsächlichen Gelände. Der strengere Folgelauf fand 13 fehlerhafte
> Terrainanschlüsse sowie zusätzliche Klick-/Nachbargebäudeprobleme. Historische
> grüne Ergebnisse ersetzen diese neue Abnahme nicht. Siehe
> `Codex-Entrance-Feedback-2026-10-24.md` und den fortlaufenden Headless-Ledger.

Arbeitsstand im Restart-Worktree
`C:/Users/h4rea/.codex/worktrees/rdo-restart-foundation/RDO-RPG`,
Basis-HEAD `d5cdb755`. Main bleibt separat. Keine Commits, kein Push und keine
pauschale Synchronisierung des gemischten Gemini-/Codex-Arbeitsstands.

## Ergebnis

- Straßen verwenden durchgehende UVs, eine explizit konfigurierte vorhandene
  Stroh-/Erdtextur und weiche Ränder. Höhenquellen und Originalimporte bleiben erhalten.
- Unsichtbare eigene Zugangsrampen bleiben physisch. Konfigurierte Innenräume
  besitzen ihre Spielkollision und Bodensupport exklusiv; eine alte Quellhülle
  liefert keinen zweiten widersprüchlichen Boden.
- Hotel und beide Auktionsscheunen erhalten tatsächlich verbundene Geschosse.
  Figurenhöhe folgt der Rampe statt eines festen Etagen-Snaps. Obere Floors sind
  außen nicht als frei erreichbare Eingänge registriert.
- Fünf zusätzliche texturierte Erdgeschosspiloten: Law Office, Sheriff-Haus,
  Wohnhaus F, Frachtstation und Auction House. Türflächen/Bodenebenen der vorhandenen
  Modelle dienen der Ausrichtung; Grundriss und Zugang sind eigene Spielgeometrie.
  Originalzugänglichkeit bleibt `unknown`.
- Das Hotelbett verwendet einen separat ausgewählten Originalmodellbereich mit
  vier unveränderten Albedos und Original-UVs. 22.132 Quelldreiecke werden durch
  Bereichsauswahl zu 19.096; keine zusätzliche Simplify-Reduktion behauptet.
  Badewanne weiterhin eigene Geometrie. Quellen: `hotel/visuals/source-manifest.json`.
- Drei gezielte Materialersatz-Zuordnungen an Hotel/Bahnhof ersetzen weiße
  Fehltexturflächen ausdrücklich als authored. Fehlende Originalreferenzen bleiben
  dokumentiert; keine globale Shader- oder CPV-Umlackierung.
- Statische eigene Möbel und dekorative Treppenteile teilen Materialbindungen und
  werden gebündelt. Gemessene Straßenansicht: 981→404 Draw Calls; Hotel: 109→23,
  inzwischen mit Originalbett. Das ist keine Geräte-FPS-Garantie.
- Kompakter HUD, getrennte mobile Wallet und freier Hauptmenülink. Unveränderte
  Frames schreiben auch im DEV keine ständigen Screenreader-Textupdates.

## Validierung

Belege liegen lokal unter
`data/runtime/valentine/test-artifacts/headless-map-2026-10-23/`.

| Prüfung | Ergebnis / Beleg |
|---|---|
| Gesamte Clientsuite | 312/312 Tests, 70 Dateien; `client-tests-2026-10-24.log` |
| Pflichtbuild |`npx pnpm -r build` bestanden; `build-2026-10-24.log` |
| Generator/Source-Auswahl |9/9 bestanden; `generator-tests.log` |
| Hotel/Scheunen-Auf- und Abstieg |3/3 mit echter Eingabe und aktiver Kollision; `floors-post-appearance/report.json` |
| Bestehende 19 Gebäude |19/19 echte Ein-/Austritte; `survey-roundtrip/report.json` |
| Neue fünf Gebäude |2/2 plus3/3 echte Ein-/Austritte; `survey-new-two-houses` und `survey-next-three-rotated` |
| Gemeinsamer aktueller 24-Gebäude-Lauf |24/24 Eintritte und24/24 Ausgänge bestanden, keine Browserexceptions; `survey-complete-24-stable/report.json` |
| Desktop und 430px, direkter/Solo-Menü-Einstieg |bestanden; `presentation-final` und `presentation-shell` |
| Originalbett/Texturevidenz |10 aktuelle SHA256-Prüfungen bestanden; `hotel-source-hash-check-2026-10-24.json` |
| Unabhängiger Code-Review |keine konkreten Fehler im geprüften Support-/Floor-/Rendering-/Ressourcen-Batch; zusätzlicher Gesamtbuild grün |

DEV-Relokation stellt bei Gebäudetests nur den jeweiligen äußeren Startpunkt her.
Eintritt, Ausgang und Stockwerkswechsel verwenden echte Maus-/Tastatureingabe mit
Kollision. Seitenzugang an Wohnhaus F wird nach normaler E-Kameradrehung angeklickt.
Fehlgeschlagene Diagnoseläufe bleiben erhalten und zählen nicht als Abnahme.

## Abnahmegrenzen und weiterer Scope

24 Gebäude sind konfiguriert, 27 Floors registriert. Das sind geprüfte Pilotwege,
keine vollständige Abnahme der gesamten Valentine-Map. 11 Katalog-/Sonderdatensätze
haben noch keinen konfigurierten Floor; ihre tatsächliche Gebäude-/Innenraumrolle
muss teilweise noch geklärt werden. Weitere begehbare Geschosse, erkennbare
Originalraumorganisation, Ausstattung, CPV-/Textursonderflächen, passende Props,
Friedhof-/Terrainabgleich und die zusammenhängende Außenroute bleiben offen.

Linear bleibt entsprechend **In Progress**:
[H4R-27](https://linear.app/h4real82/issue/H4R-27),
[H4R-28](https://linear.app/h4real82/issue/H4R-28),
[H4R-47](https://linear.app/h4real82/issue/H4R-47),
[H4R-93](https://linear.app/h4real82/issue/H4R-93).
Die Abwesenheits-Automation wurde nach Benutzer-Rückkehr gelöscht.

Lokale Vorschau aus diesem Worktree: `http://127.0.0.1:4178/`.
