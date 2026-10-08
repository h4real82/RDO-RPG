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

### Isolierter Straßentest, 2026-10-08

Ein testseitig gefiltertes Manifest mit ausschließlich 22 Platzierungen
von `val_03_road_d_*` wurde mit den Textur-GLBs an der Referenzpose
`main-street-s-curve` gerendert. Keine JavaScript- oder Konsolenfehler.
Bild: `data/runtime/valentine/test-artifacts/full-textured-reference/isolated-road-decals.png`.
Die hellen Fahrspuren bleiben auch ohne Gebäude und Hilfsbox sichtbar.
Die exakt referenzierte PNG
`std_annesburg_muddyroad_03_abstd_annesburg_muddyroad_03_al.png` ist selbst
grau-weiß; `nbx_ground_road02_abal.png` enthält dagegen dunklen Boden.
Eine fehlende oder ersatzweise weiße Textur erklärt die Fahrspuren damit nicht.

Der Shader `0xec8e6107` hat Renderbucket 2. Seine aus dem Rohmodell gelesenen
Konstanten wurden anhand der librdr3-Parameterliste benannt:
`DecalBlendOpacityGBuffer0 = 0`, `...1 = 1`, `...2 = 1`, `...3 = 0`.
Dies stützt eine Decal-/GBuffer-Rolle, beweist aber noch keine vollständige
Portierung dieser Shadersemantik. Kein dauerhaftes Ausblenden, Umfärben
oder Ersetzen durch geratenes Terrain wurde vorgenommen.
Parameterreferenz:
https://github.com/Sage-of-Mirrors/librdr3/blob/master/include/drawable/shaderparamnames.hpp

Die Version ist **nicht** grafisch abgenommen und nicht vollständig.
Es fehlen weiterhin 1581 referenzierte Modelltypen. Erforderlich bleiben
belegte Shader-/Renderrollen, Terrain, vollständige Assetabdeckung,
maßgetreue Referenzvergleiche und zuverlässige spielbare Kollisionsflächen.
Ein grüner Build oder erfolgreicher Spawn-Test beweist diese Punkte nicht.
