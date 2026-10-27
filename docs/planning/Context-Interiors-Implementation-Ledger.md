# Umsetzung: Kontextkamera und Register

Freigabe: Benutzer18.10.2026. Code und lokale Vorschauen verwenden `C:/Users/h4rea/.codex/worktrees/rdo-restart-foundation/RDO-RPG`; kein Code-Backport in den abweichenden Main-Checkout. Aktiver Code im bestehenden Restart-Arbeitsstand, gemischte Änderungen bleiben erhalten. Plan: docs/superpowers/plans/2026-10-18-context-camera-interiors.md.

## Start

- H4R-93: Runtime-Register und räumlicher Kontext begonnen.
- Bestehende Bank-/Saloonlayouts werden in ihre Floor-Dateien migriert. Andere Häuser bleiben im Katalog ausdrücklich geplant, bis ihr eigener Floor gebaut und geprüft ist.
- Ruling: Katalogdaten werden beim Client-Build eingebunden, statt für die ersten zwei Layouts einen zusätzlichen ungesicherten Dateiserver zu öffnen. JSON-Dateien bleiben die einzige editierbare Inhaltsquelle; generierte Runtime-Verteilung kann später denselben validierten Datensatz übernehmen.
- Ruling: Zunächst gleiche Weltbasis und gleiche Pilotkollision erhalten. Verbesserte Innenwanddarstellung, Kamera und Eingaben bauen auf diesem nachgewiesenen Übergang auf; keine automatische Innenraumerzeugung aus Quell-Gesamt-AABBs.

## Prüfprotokoll

- Register: 31 Katalogeinträge werden beim Client-Build geladen. Bank/Smithfield’s beziehen Layout, Bodenhöhe, Zugang und Aktionen aus ihren Floor-/Building-Dateien; nur zwei Erdgeschosse sind gebaut.
- SpatialContext: gerichtete Eingangskorridore, tatsächlicher Schwellenübertritt, 0,15s Bestätigung und 0,25m Austrittshysterese. Rückwand-/Höhen-/Blockerfälle geprüft. Recovery und DEV-Relocation setzen Kontext explizit neu.
- Kamera: draußen42m, Annäherung bis7m, aktives Erdgeschoss mit Rand und Aspect-/Yaw-Fit. Mausrad kann den Innen-Fit nicht abschneiden. Reduced Motion setzt Fokus/Zoom direkt; Referenzkamera behält Vorrang.
- Sicht: Originale/Nachbarn innen verborgen; eigene Cutaway-Wände, Holzboden und wenige Saloon-Formen sichtbar. Physical Support/Kollision bleiben registriert; Picking filtert verborgene Gruppen aus.
- Bewegung: außen6/9m/s, innen/Türvorzone6m/s; Begrenzung bei jedem physischen X-/Z-Teilschritt. Gehaltenes Shift erfordert nach Innenraum Loslassen; Klickzielmodus wird beim Eintritt auf Gehen abgewertet. Capture/Blur/Recovery/Pointercancel räumen Zustand auf.
- Hinweise: Ausgang nur in erreichbarer Nähe, Aktion nur bei aktiver Spieldefinition/gleichem Floor/freiem Weg. Darts sitzt an einem Wandanker; Theke und zwei Tische sind bewusst sparsame eigene Formen. Galerie, Obergeschoss und Treppe sind noch offen, keine Wiedererkennbarkeits-Abnahme behauptet.
- Minigames: Registry/Host laden nur Darts per typisiertem Lazy-Adapter. Eigener Codeordner, validierte konfigurierbare Variante, unabhängige Runden, sicherer Abbruch bei verspätetem Modulladen. Andere zwölf Spiele bleiben geplant.
- RED→GREEN: neue Registry-, Kontext-, Kamera-, Präsentations-, Bewegungs-, Hinweis-, Saloon- und Minigamefälle. Client-Suite147/147 bestanden; Workspace-Build bestanden.
- Browser `scripts/e2e-context-interiors.mjs`: Straße42m → Annäherung~35m → Saloon~23m → Straße42m; Rennen9/innen6; null sichtbare Quell-Okkluder innen und86 wieder außen; Floor-Klick, Darts-Eingabesperre/Wurf/Schließen, Kontext-RENNEN und Hochformat bestanden. Frische lokale Belege unter `data/runtime/valentine/test-artifacts/context-interiors/`.
- Browserfehler gefunden und behoben: Ausgangs-DIV erbte die nur für Buttons gesetzte Positionierung nicht und lag unterhalb des Canvas. Sichtfeld-Assertion erst rot, nach gemeinsamer Prompt-CSS grün.
- Frühere Saloon-Prüfung aktualisiert: Floor-Klick führt erst zum nahen Darts-Bereich, bevor die Aktionsschaltfläche erwartet wird. Die neue Reichweite soll gerade nicht den ganzen Raum zur Aktion machen.

## Offene Abnahme

- Produktions-Menü/Darts/Rückkehr Desktop+390px bestanden (`e2e-night-production.mjs`); zwölf Eingabeschutzfälle bestanden (`e2e-input-guards.mjs`).
- Bank: echter Weg von der Straßenrampe hinein/hinaus, aktives Bank-Erdgeschoss und restaurierte Umgebung bestanden (`e2e-bank-context.mjs`). Rechtsklick auf die verborgene Rampe bietet kein Laufziel.
- Ein unabhängiges frisches Abschlussreview fand einen wichtigen Punkt: Picking prüfte nur die Wurzelgruppe, nicht eine nachträglich verborgene Rampen-Unterfläche. Final: fixed — `TerrainGround.test.ts` Regression zuerst RED, danach GREEN und147/147 Suite. Picking prüft nun alle Sichtbarkeits-Vorfahren; Höhen-/Kollisionsabfrage behält verborgene Flächen. Frischer Saloon- und Bank-Browserlauf danach bestanden. Keine weiteren Critical/Important-Funde, keine zurückgestellten Minor-Funde gemeldet.
- Zehn App-Session-Lade-/Abbruch-/Wiederholungszyklen bestanden, einschließlich verspätetem altem Ladevorgang, simuliertem503-Fehler mit Wiederholung, effektiver Renderauflösung und sauberem Dispose (`e2e-app-concept.mjs`, Bericht14:06:42UTC). Keine unerwarteten Browserfehler.
- H4R-47 bleibt offen: weitere Häuser, Stockwerke/Treppenverbinder und echte Wiedererkennbarkeit der Originalräume müssen noch gebaut und visuell geprüft werden.
- H4R-92/93/94/95 führen konkrete Pilotimplementierung, keine vollständige Stadt-Abnahme.
- Keine neue Benutzer-Zuarbeit und keine erneute Originaldatei-Anforderung.


## Bewusste Entscheidungen und Folgen

1. Ruling: Daten beim Build bündeln — bewahrt eine editierbare JSON-Quelle ohne zusätzlichen Dateiserver. Nachteil: Katalogänderungen benötigen einen Neubau; bei späterem Live-Editor muss derselbe Validator an dynamisches Laden angeschlossen werden.
2. Ruling: Bewährte Pilotmaße und Koordinatenbasis erhalten — neue Sicht-/Steuerungsteile bauen auf nachgewiesenen Türen auf. Keine Räume aus groben Quell-AABBs ableiten. Nachteil: weitere Häuser brauchen eigene Layout-/Zugangsprüfung; eine spätere Maßkorrektur erfordert erneute Laufprobe.

## Nächste eigenständige Arbeiten

1. Hotel: Empfang, Flur, Zimmer und vereinfachte verbundene Treppe anhand vorhandener P6-Referenzen gestalten.
2. Saloon: Galerie/weiteres Geschoss und begehbaren Treppenverbinder ergänzen; getrennte Sicht- und Wiedererkennbarkeits-Abnahme.
3. Danach Ladengebäude und öffentliche Gebäude chargenweise ausrollen. Gleiche Boden-/Ausgangs-/Kamera-/Kollisionsprüfungen je Haus.
4. Sonderkomponenten und noch nicht endgültig zugeordnete Häuser im Coverage-Bericht offen halten. Gesamt-H4R-47/93 erst nach vollständiger Liste und echten Laufproben schließen.

Benutzeraufgaben: aktuell keine. Gelieferte Fotos/Modelle reichen für diese nächste Gestaltung; keine neuen OpenIV-Dateien angefordert.

Linear nachgetragen: H4R-96 Done; H4R-92/93/94/95/47 weiterhin In Progress mit konkreter Pilot-Evidenz und offener Gesamtcoverage. Native Dokumente ebenfalls aktualisiert.


## Revision nach Screenshotfeedback: Veranda und Darts

Die früheren Pilotmaße und dazugehörigen historischen Routen wurden durch Quellenmessung korrigiert. Aktueller Stand und Browserbelege: [Porch-Interior-Revision-2026-10-18.md](Porch-Interior-Revision-2026-10-18.md). Saloon: drei Stufenrampen, Y117,99 und entdrehter Grundriss; Bank Y117,77. Darts ausschließlich innen in weniger als 1,8 m Scheibennähe, Schaltfläche diagonal oberhalb. Erkennbare eigene Möbel und kameraseitige transparente Wandfelder, natives Kontextmenü auch bei Pause unterdrückt. Mausausgang beider Piloten geprüft. Weitere Häuser und Stockwerke bleiben offen; Benutzer-Zuarbeit weiterhin keine.


## Grafikstil nach Benutzerkorrektur: Originalasset-Pilot

Die reine Eigenmodell-Möblierung ist visuell nicht abgenommen. Im Saloon ersetzt nun eine belegte Originaltheke mit Rückbuffet die Platzhalter; eigener Raum/Boden/Möbelholz tragen Originaltexturen. Originalgeometrie/UVs und Materialadaption werden getrennt geführt. Weitere originale Stuhl-/Tisch-/Klaviermeshes fehlen als belegte lokale Zuordnung. Details, Quellen und aktueller Prüfstand: [Saloon-Originalassets-2026-10-18.md](Saloon-Originalassets-2026-10-18.md). Die allgemeine Freigabe für einfache Laufgeometrie ist keine Freigabe für untexturierte Blockoptik.
