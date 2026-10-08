# Valentine-Preview: Prüfstand

## Ressourcen-Wiederverwendung, 2026-10-08

Geprüft wurde Commit `8ec3bd2` im Headless-Chromium bei 1280×720.
Die Requests auf `local-preview` wurden im Test auf den separat gebauten
`data/runtime/valentine/local-preview/textured-runtime` umgeleitet.
Die normale Vorschau wurde dadurch nicht auf diesen Datenbestand umgestellt.

- Start und kurze WASD-Bewegung erfolgreich; orthografische Kamera vorhanden.
- Tab/Escape ausgelöst; danach lief die Simulation weiter.
- 403 GLB-Abrufe für 403 unterschiedliche Assets; maximal ein Abruf je Asset.
  Dies gilt für den geladenen Spawn-Bereich, nicht für alle Referenzposen.
- Gemeldeter JavaScript-Heap nach dem Test: 304.793.691 Bytes.
- Zwei große Headless-Prozesse lagen während des Ladens bei etwa 1,78 und
  2,08 GB Working Set. Das ist eine Momentaufnahme, kein GPU-Speicherwert
  und kein reproduzierbarer Vorher/Nachher-Benchmark.
- Zeit vom Navigationsbeginn bis nach Eingabeprüfung und Screenshot: 33.128 ms.
  Nicht als reine Boot-Zeit oder Echtgeräte-Performance interpretieren.
- Keine `pageerror`-Ereignisse; Konsolenfehler wurden in diesem Einzeltest
  nicht zusätzlich erfasst.

Lokales Bild: `data/runtime/valentine/test-artifacts/full-textured-reference/cached-spawn.png`.
Das Bild wurde visuell geprüft: Die große undurchsichtige Hilfsgeometrie,
fehlendes Terrain, helle Straßenflächen und pinke Materialbereiche bleiben
sichtbar. Der Cache behebt diese grafischen Fehler nicht.

## Offene Abnahme

Die Version ist **nicht** grafisch abgenommen und nicht vollständig.
Es fehlen weiterhin 1581 referenzierte Modelltypen. Erforderlich bleiben
belegte Shader-/Renderrollen, Terrain, vollständige Assetabdeckung,
maßgetreue Referenzvergleiche und zuverlässige spielbare Kollisionsflächen.
Ein grüner Build oder erfolgreicher Spawn-Test beweist diese Punkte nicht.
