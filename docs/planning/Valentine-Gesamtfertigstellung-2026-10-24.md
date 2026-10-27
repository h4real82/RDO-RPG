# Aktive Valentine-Karte vollständig gestalten und prüfen

Verbindlicher Auftrag24.10.2026: die gesamte aktive Karte fertigstellen,
einschließlich ähnlich gestalteter eigener Bäume, Zäune und kleiner Objekte.
H4R-27 ist der bestehende Auftrag; keine weitere Minigame-Ablenkung.
Maßgeblich sind die freigegebene2,5D-Gestaltung und bestätigte Spielgrenze.
Eigene Geometrie ist erlaubt; Original-YBNs/Originalbaum-Dateien sind keine
Abnahmevoraussetzung für diese eigene Spielwelt. L22 bleibt ausgenommen.

## Durchgehender Arbeitsplan

1. Vollständigen Sektoratlas der Spielgrenze plus Landmarkennahbilder aufnehmen.
   Erkannte Lücken unmittelbar in diesem Auftrag führen und schließen.
2. Bäume verbessern: eigene Blatt-/Nadeltexturen, verzweigte Silhouetten,
   Variation; schmale Stammhüllen innerhalb des Spielbereichs, keine Kronen-
   oder Zweigkollision. Waldsaum und bislang kahle Ortsränder ergänzen.
3. Zäune/Gärten/Koppeln, Friedhof/Kirchumfeld, Nordhäuser, Camp/Kino,
   Markt-/Scheunen-/Bahnhofsumfeld und Straßenmobiliar vervollständigen.
   Türen/Straßen/Zugänge freihalten; Durchgänge statt geschlossener Sackgassen.
4. Sichtbare Bodenlücken, schwimmende Objekte und fehlende/unpassende Materialien
   anhand der Ansichten korrigieren. Eigene Randgeometrie darf Quelle überlappen,
   soweit keine Z-Fighting-/doppelte Spielkollision entsteht.
5. Ganze Außenroute, alle registrierten Gebäudeein-/austritte sowie vorhandene
   Stockwerksverbindungen prüfen; gefundene Fehler reparieren und nachprüfen.
6. Alle Sektoren erneut betrachten, repräsentative Baum-/Zaunkollision,
   Kameraverdeckung und Performance prüfen. Client-/Generatortests und Pflichtbuild.
7. Konkrete Gesamtprüfung in Linear und Ledger dokumentieren; einen tatsächlich
   geprüften Stand zur Benutzung bereitstellen. Gemischte Main-Änderungen erhalten.

Die folgende Abnahme meint eine vollständig gestaltete, erkennbare und spielbare
aktive Karte. Sie verlangt weder jedes einzelne RDR2-Originalobjekt noch einen
1:1-Nachbau. Ein verbliebener konkret sichtbarer Fehler ist weiter Arbeit dieses
Auftrags; ein historischer Quellenvorbehalt wird nicht zum künstlichen Blocker.


## Abschluss auf Benutzerwunsch wegen Kontingent –24.10.2026,21:16

Umsetzung gesichert:278 eigene texturierte Bäume mit schmaler Stammkollision,
385 ergänzende Zaunfelder in13 Bereichen,93 weitere Hof-/Straßenobjekte;
Camp, Livery und eigene Schmiede;33 begehbare Gebäude/38 konfigurierte Floors.
Originalimporte und Main-Quellstand erhalten. Keine Veröffentlichung.

379Clienttests/79Dateien,14Generator-/Terraintests und Gesamtbuild grün.
49 frische Gesamt-/Detailansichten tatsächlich betrachtet. Vollständige erste
Gebäudeprüfung:30/33 komplett grün; Nachprüfung Stall und WohnhausD grün.
Kirchen-Ausgangsprüfung weiterhin rot, Ursache noch nicht abschließend geklärt.
Zusätzlich reproduzierten Diagonalfehler im PlayerController mit rotem/grünem
Regressionstest behoben: freier Diagonalweg wird jetzt vor Achsen-Wandgleiten
geprüft und ausgeführt. Anschließende Ortsrunde erreichte11 Stationen;
keine vollständige Ortsrunden- oder frische Fünf-Treppen-Abnahme behaupten.

Benutzer fordert ausdrücklich jetzt Ende wegen fast leerem Kontingent.
Laufende große QA wird beendet; kein weiteres autonomes Weiterarbeiten.
Karte NICHT als vollständig abgenommen markieren. H4R-27/29/47 bleiben
In Progress. Nächster gezielter Schritt: Kirchen-Ausgang diagnostizieren,
dann fünf Stockwerksverbindungen und restliche zusammenhängende Ortsrunde.

Benutzbarer lokaler Build im Main-Verzeichnis über
Start-Valentine-Karte-2026-10-24.cmd; eigenständige Kartenfassung aus dem
Restart-Worktree, kein behaupteter Merge des Main-Quellbranches.
