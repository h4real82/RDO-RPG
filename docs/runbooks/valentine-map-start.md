# Lokale Valentine-Kartenfassung starten

Im Hauptprojekt D:/Projects/RDO-RPG die Datei
Start-Valentine-Karte-2026-10-24.cmd doppelt anklicken. Sie startet einen lokalen
Webserver und öffnet die Karte im Browser. Das Terminalfenster offen lassen;
Schließen beendet den Server. Benötigt Node.js und den lokal erzeugten Snapshot
unter data/runtime/valentine/finished-map-2026-10-24. Die großen Modelle/Texturen
werden absichtlich nicht nach GitHub übertragen.

Die CMD startet den eigenständigen Kartenbuild aus dem Restart-Arbeitsbranch.
Sie ersetzt keinen Main-Quellbranch und benötigt keine zusätzliche Installation.
Ein neuer Clone enthält keinen fertigen Asset-Snapshot. Nach lokalem Assetaufbau:

    npx pnpm -r build
    node scripts/package-valentine-map.mjs D:/Projects/RDO-RPG

Bekannte Abnahmegrenzen am24.10.: Kirchen-Ausgangsprüfung noch rot;
Stockwerksverbindungen und vollständige Ortsrunde noch nicht fertig abgenommen.
Details: docs/planning/Valentine-Gesamtfertigstellung-2026-10-24.md, H4R-27/29/47.
