# H4R-107: Lokalen Main-/Restart-Mischstand konsolidieren

> **For agentic workers:** Use superpowers:executing-plans for this bounded task.

**Goal:** Der tatsächlich verwendete lokale Hauptcheckout baut wieder; aktive Minigames und ihre vollständigen Tests bleiben erhalten.

**Architecture:** Main startet weiterhin ThreeWorld. Nicht angebundene partielle Restart-Kopien werden mit Herkunfts-/Hashinventar außerhalb aktiver Quellen archiviert. Die vollständige Welt-Runtime bleibt im Restart. Echte aktive Schnittstellen werden vollständig angepasst statt mit Typstubs oder Testausschlüssen versteckt.

**Tech Stack:** TypeScript, Vite, pnpm, Vitest/Happy DOM und vorhandene Playwright-Prüfungen.

**Spec:** H4R-107; bestehende Benutzerfreigabe zur selbstständigen Arbeit. Keine Live-Migration, Asset-Veröffentlichung oder ungeprüfte Umstellung von Diensten/Startern.

## Entscheidungen

Eine vollständige Runtime-Migration würde ungeprüfte Gebäude-/Weltverträge und viele weitere Änderungen verlangen. Nur Compiler-Ausschlüsse würden die unvollständigen Kopien verdecken. Gewählt: 24 per Importgraph als inaktiv belegte lokale Kopien extern archivieren, aktive Minigame-Verträge vollständig prüfen und korrigieren.

Der fehlerhafte Mischstand ist nicht auf GitHub veröffentlicht. Änderungen werden zunächst gezielt im betroffenen Hauptcheckout mit geprüftem Quellsnapshot umgesetzt. Keine pauschale Veröffentlichung der bereits vorhandenen lokalen Spiellogik. Der saubere Arbeitsbranch führt Plan und Ergebnis; nur unabhängig prüfbare Änderungen werden gegebenenfalls veröffentlicht.

## Schritte

- [x] Issue aufnehmen, Baseline-/Importgraph und Unterschiede zum Restart lesen.
- [x] Vollständigen externen Quellsnapshot erstellen: 109 Dateien, 33.956.889 Bytes mit SHA-256; 264 Restart-Quellhashes als Vergleich.
- [x] Fehlende Vitest-/DOM-Abhängigkeiten gezielt in Main ergänzen; keine Testdateien ausschließen.
- [x] Fehlenden Wetteinsatzgrund und öffentlichen Golf-Einstieg durch Regressionstests abdecken.
- [x] Bestehende Tests rot ausführen und die tatsächlichen Fehler erfassen: 12 von 111 fehlgeschlagen, 6 von 23 Dateien betroffen.
- [x] Inaktive Kopien mit Hash-/Pfadkontrolle archivieren; VenueDialog und dessen CSS erhalten.
- [x] Vite-Typen, Wetteinsatzvertrag und alte Testfixtures mit bestehenden Restart-Verträgen abgleichen.
- [x] Main-Golf-Export bereits über den öffentlichen Registry-Test als iframe angebunden bestätigt; Main-Loader nicht durch die andere Restart-Variante ersetzen.
- [x] Vollständige Main-Tests: 73 Tests in 18 Dateien; `npx pnpm -r build` erfolgreich.
- [x] Produktionsbrowser: fertig geladene Golf-Karte/Loch 19, Schließen/Wiederöffnen; Archery-Einsatz 25/Refund; Poker-Einsatz 200/Check-Call, Schließen/Wiederöffnen.
- [x] Unabhängiges Quellreview und Zusatzreview des Runtime-Helfers; 264 Restart-Quellen und beide Starter unverändert.

## Ergänzungen aus Prüfung und Review

Der erste DOM-Test konnte einen iframe und die Loch-Auswahl sehen, obwohl die Karte wegen SPA-HTML statt JSON nicht geladen war. Die anschließende Bildprüfung fand den tatsächlichen Fehler. Ein gezielter read-only Runtime-Mount für DEV und Preview behebt die Auslieferung; 6 HTTP-Tests prüfen JSON, 404, Methoden, HEAD, Traversal und Junction-Grenzen. Die lokale Konfiguration wählt ausdrücklich den vorhandenen r19-Snapshot; keine neuen Binärdateien oder Änderungen an Startern.

Das Review fand einen zufallsabhängigen Blackjack-Test: Ein natürliches Blackjack konnte den späteren Hit-Test vorzeitig beenden. Ein kontrollierter Shuffle erzeugt nun ein nicht natürliches Ausgangsblatt und einen garantierten Bust; der Test prüft den Ausgang ohne bedingtes Überspringen. Zielprüfung 14/14, vollständige aktive Suite 73/73 grün.

Vite-Neuladen durch parallelen Shared-Build und ein zunächst ungeeigneter Zugriff auf TypeScript-Quellen im Produktions-QA waren Prüfwerkzeugfehler; keine Produktabnahme daraus. Der korrigierte Produktionslauf nutzt den sichtbaren Ablauf und die lokale Spielgeldablage. Kaltes Golf-Laden erforderte mehr als 60 Sekunden für die vorhandenen großen Assets; kein Ladezeit-/FPS-Erfolg behauptet, H4R-106/H4R-49 bleiben eigenständig offen.

Vollständige Evidenz lokal unter `D:/Projects/RDO-RPG-Backups/2026-10-31-main-consolidation/`: Quellsicherung, Inventar, Archivmanifest, rote/grüne Tests, Build, Bilder, `production/playtest-report.json` und abschließender Hashvergleich. 109 Originaldateien geprüft; 24 archiviert, 13 gezielt geändert, 72 unverändert. Der Veröffentlichungsbranch enthält nur unabhängig prüfbare Test-/Runtime-Infrastruktur und Dokumentation, keine pauschale Übernahme der lokalen Spiellogik.

## Review Focus

Archivierte Quellen sind vollständig rückholbar. Kein beabsichtigtes Main-Minispiel verschwindet. Kein Konto-DTO wird für alte Tests verbogen. Geldbeträge bleiben string/bigint gemäß vorhandenem Vertrag. Gelieferter Golf-Export und eigene Konten sind getrennte Übungssysteme; keine neue Online-Abnahme behaupten.
