# Originalnähe und getrennte Register für Gebäude und Minigames

Präzisierung des Benutzerauftrags vom18.10.2026. Ergänzt Kontextkamera-/Innenraumdesign und dessen Ausführungsplan. Erfasst unter H4R-47/93 und H4R-96; gemeinsamer Aktivitätskern bleibt H4R-64. Neue Katalogdateien sind vorhanden, Runtime-Migration ist noch nicht durchgeführt.

## Welche Innenräume entstehen?

| Originalzustand | Umsetzung im Projekt | Abnahme |
| --- | --- | --- |
| Belegt begehbar | Vereinfachte, quellenorientierte Adaption des erkennbaren Originalraums | Raumaufteilung, wichtige Einbauten/Wege, prägende Materialien und wenige Merkmale passen zu den Referenzen |
| Belegt nicht begehbar | Eigener, zunächst leerer Raum mit Holzboden, einfachen Wänden und sicherem Eingang/Ausgang | Betretbar und rückverlassbar; keine erfundene originale Inneneinrichtung behauptet |
| Noch ungeklärt | Vorläufige eigene Holzfläche möglich; Originalzugänglichkeit bleibt `unknown` | Keine stillschweigende Einstufung als Original geschlossen; Referenzen später nachtragen |

RDR2-Story und RDO können unterschiedliche Zugänge/Zustände zeigen. Die belegte Ausgabe und der Bild-/Quellnachweis gehören in den Datensatz. Ein vorhandenes MLO belegt Geometrie, nicht automatisch öffentlich begehbare Türen; ein fehlendes MLO beweist keine verschlossene Tür. `[FLAG: Data Missing]` bezeichnet die offene Originalzuordnung und blockiert nicht den einfachen eigenen Boden.

Bei Originalräumen zuerst nutzbare vorhandene Innenraumgeometrie/Materialien prüfen. Teure oder ungeeignete Teile durch eigene vereinfachte Formen ersetzen und als solche kennzeichnen. Keine Pflicht zu kompletten Originalmöbelpaketen. Ziel sind wenige identitätsstiftende Merkmale, häufig drei bis fünf pro Funktionsraum, nicht hunderte Objekte. Leere Regale, vereinfachte Stühle und wiederverwendete Grundmaterialien genügen. Laufwege und Zugänge dürfen weiterhin breiter/einfacher sein.

Belegte Beispiele aus vorhandener Fotorunde: Smithfield’s mit Thekenzone, Galerie/Luftraum, Treppen-/Laufwegen und Holzcharakter; Hotel mit Empfang, Innentreppe, Zimmerflur und einfachen Zimmern. Ein völlig generischer Holzkasten gilt für diese offenen Originalräume nur als vorübergehender Bodenpilot, nicht als fertige Wiedererkennbarkeits-Abnahme. Bankreferenzen bleiben gesondert offen; Hotelaufnahmen belegen keinen Bankinnenraum. Passender sichtbarer Erd-/Werkstattboden in belegten Stall-/Schmiedebereichen wird erhalten.

## Gebäudeablage und Datenhoheit

```text
data/reference/valentine/buildings/
  registry.json
  smithfields-saloon/
    building.json
    floors/ground.json           # nach Layout-Migration
    floors/upper.json            # sobald verbunden gebaut
  hotel/building.json
  bank/building.json
  … je Kandidat ein eigener Ordner
```

Die Registry ist ein Index; `building.json` besitzt die Gebäudedefinition genau einmal. Aktuell31 Kandidaten-/Sonderdatensätze, keine behauptete endgültige Hauszahl. Die103-Placement-Inventur bleibt der Quellsnapshot; ergänzende Objekte erhalten beim Registeraufbau ihren Gebäude-/Detailbezug. Auch Häuser aus den Mapreferenzen ohne vollständige importierte Hülle müssen ergänzt werden.

Jeder Datensatz führt stabile ID, Name, Quellbezug, Originalzugänglichkeit/Evidenz, Innenraumstrategie, prägende Merkmale, Floor-Dateien und Aktionsreferenzen. Jede Floor-Datei besitzt Raum-/Bodenpolygone, Höhe, Schnittwände, Tür-/Treppenverbindungen, Kamerarahmen und lokale Anker. Render-, Support- und Kollisionsrollen bleiben getrennt.

Runtime-Geometrieadapter später unter `apps/client/src/game/buildings/<buildingId>/`, z.B. `build.ts` und passende Tests. Zentraler Loader/Validator unter `game/buildings/BuildingRegistry.ts`; generische Innenraum-/Kameradienste bleiben unter `game/interiors/` und `game/player/`. JSON hält editierbare Layoutdaten; TypeScript baut daraus Geometrie, keine zweite Kopie derselben Türkoordinaten. Bisherige AuthoredBank-/AuthoredSaloon-Module erst nach Paritätsprüfung migrieren.

Eine Pipeline validiert und erzeugt künftig das schlanke Runtime-Register unter `data/runtime/valentine/`. Diese generierte Datei ist ignorierter Output; Quellen bleiben die versionierten Gebäudedateien. Keine parallele zweite Quelle `buildings.json` neben den neuen Ordnerdaten pflegen.

## Minigame-Ablage

```text
data/reference/minigames/
  registry.json
  darts/game.json
  darts/variants/valentine-saloon-practice.json
  poker/game.json
  maexchen/game.json
  … weitere geplante Spiele

apps/client/src/game/minigames/    # geplante Code-Migration
  MinigameRegistry.ts
  MinigameHost.ts
  darts/
    definition.ts
    rules.ts
    DartsGame.ts
    DartsGame.css
    rules.test.ts
```

`gameId` benennt das Spiel, `variantId` dessen konkrete Regeln/Gestaltung, Gebäude-/Floor-/Action-ID den Spielort. So kann dieselbe Dartslogik verschiedene Valentine-Varianten und mehrere Spielorte bedienen. Eine neue Variante kopiert weder den Spielkern noch Hauskoordinaten. Aktuell13 Katalogeinträge aus den bisherigen Benutzerideen; das ist keine Ausweitung des nächsten Sprints auf13 Implementierungen.

Gemeinsamer Host: verfügbare Fähigkeiten, Öffnen/Join, Input-/Kamerasperre, Fokus, Rückkehr, Fehler/Abbruch und Dispose. Je Spiel: eigene Regeln/Zustände, Darstellung, lokale Ressourcen, individuelle Parameter und Tests. Online-Spiele benötigen einen autoritativen Serveradapter; gemeinsame reine Regel-/Vertragstypen wiederverwenden, keine private Karten-/Würfeldaten ins Zuschauer-UI geben. Regeln werden nicht im Gebäuderegister dupliziert.

Die vorhandenen `game/activities/SaloonDarts*` bleiben zunächst unverändert. Die neue Variante dokumentiert deren tatsächliche Regelwerte, ist aber noch nicht angeschlossen. Geplanter Ablauf: Definition/Host erstellen, Darts mit unverändertem Spielverhalten in seinen Unterordner migrieren, Registry-Gateway anbinden, alle Einstiegspunkte auf dieselbe Definition umstellen, erst dann `runtimeRegistryWired` aktivieren. Alte Imports/Listener nach Paritätsprüfung entfernen. Poker/Mäxchen/Skat und weitere Spiele erhalten Implementierungen in eigenen Aufträgen.

## Konkrete Umsetzungsschritte und Abnahme

1. Katalogreferenzen, eindeutige IDs, Originalzugänglichkeit/Strategie und Variantenverknüpfungen prüfen; fehlende Nachweise offen lassen.
2. H4R-93: Gebäudeloader und Floor-Layoutdaten migrieren; Originalnähe pro Haus durch wenige belegte Wiedererkennungsmerkmale abnehmen. Geschlossene Originalhäuser bleiben zunächst leer.
3. H4R-47: Boden/Ein-/Austritt je Haus prüfen; bekannte Originalräume zusätzlich visuell gegen passende Referenzen prüfen. Bodenpilot, Wiedererkennbarkeit und vollständige Stockwerksabnahme getrennt zählen.
4. H4R-96/H4R-64: Minigame-Definition/Host und Darts-Code-Migration mit sechs Würfen, Wertung, Reset, Escape/Fokus/Dispose und stabiler Welt-Rückkehr prüfen. Eine Spielvariante ändern, ohne andere Varianten oder Orte zu verändern.
5. Build und serielle Browserprüfung nach tatsächlichen Runtime-Änderungen. Aktuell keine neue Gameplayfunktion oder fertigen Originalinnenraum behaupten.

Keine neue Benutzer-Zuarbeit erforderlich; gelieferte Screenshots und lokale Quellen werden verwendet. Kein pauschaler neuer OpenIV-Exportauftrag.


## Implementierung nach Freigabe, 18.10.2026

Die oben als Migration beschriebenen Grundlagen sind jetzt angebunden: BuildingRegistry liest einzelne Building-/Floor-Dateien; Bank und Smithfield’s haben je einen gebauten Erdgeschosspiloten. SpatialContext versorgt Kamera, Sicht, Bewegung und Hinweise. Der lokale Darts-Einstieg führt durch MinigameRegistry/MinigameHost in `game/minigames/darts/`; seine JSON-Variante wird tatsächlich validiert und verwendet. Die alten `activities/SaloonDarts*.ts` sind nur Kompatibilitätsexporte. Die zwölf anderen Spiele bleiben geplant. Aktuelle Evidenz und offene Stockwerks-/Gebäudeabnahme: `Context-Interiors-Implementation-Ledger.md`.
