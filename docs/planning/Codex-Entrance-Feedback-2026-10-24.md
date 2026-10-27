# Valentine: Eingangskollision und Umgebung nach Nutzerrückmeldung

Aktiver Restart-Worktree, Main separat erhalten. Kein Stilwechsel, keine
Veröffentlichung und keine Map-Gesamtabnahme.

## Reproduktion

`scripts/audit-entrance-approaches.mjs before` beginnt 2m außerhalb jedes
konfigurierten Rampenfußes auf gesampeltem Terrain. 13/24 Wege erreichen die
Innenbodenhöhe nicht. Pivot-/Dachhöhen waren als Erdgeschosse eingetragen,
Räume ohne gemessene Gebäuderotation angelegt; Terrain und Rampenfuß liegen
teils etwa6m auseinander. Die alte Start-Teleportation auf Rampenhöhe verdeckte
diesen Fehler. Die reine Geradeausprobe prüft noch keine Mausklickbarkeit.

Beim Hotel blockiert zusätzlich `val_hotel_ext_prch.glb` mit eigener alter
Renderkollision. Der Verandateil gehört jetzt zum selben Gebäude wie die
authored-gameplay-Kollision. Wände und erreichbare Eingänge bleiben erhalten.

Die echte Mausprüfung fand außerdem einen Selektionsfehler: Unsichtbare eigene
Außenrampen waren physisch aktiv, aber von `TerrainGround.pick` ausgefiltert.
Ein Terrainklick unter der Rampe wurde wegen abweichender erreichbarer Höhe
korrekt abgelehnt; dadurch war der Zugang per Maus dennoch nicht benutzbar.
Nur explizit als `physicsOnly` und `exteriorAccess` markierte Flächen unter einem
authored-gameplay-Besitzer sind jetzt ausgenommen. Verborgene Innenböden und
verborgene Elterngruppen bleiben nicht anklickbar. Der neue Regressionstest
scheiterte vor der Änderung und besteht danach.

Der erste lange Mauslauf wurde nach reproduzierten Fehlern bewusst beendet
(Fortschritt gespeichert, kein grüner Gesamtlauf). Stallzugang auf die andere
gemessene Türseite verlegt, da der vorherige Startpunkt bereits im Bereich
der Nachbarscheune lag. Auf der neuen Seite muss die Kamerazuweisung erneut
mit geprüft werden.

## Korrektur und Herkunft

`buildings/entrance-repair.json` hält die source-aligned authored-gameplay-
Parameter. `scripts/repair-entrance-layouts.mjs` setzt Boden, Türseite, Rotation,
Einrichtung und die verbundenen Scheunen-Lofts gemeinsam um. GLB-Rohdaten und
importierte Quellen bleiben unverändert. Türgroße Flächen und Boden-Dreiecke
sind Ausrichtungsevidenz, keine nachträgliche Bestätigung originaler Portale
oder Originalzugänglichkeit. Die bestehende Originalzugangs-Klassifikation
wurde durch diesen Batch nicht neu verifiziert.

## Umgebung

Der Dressing-Generator überschrieb bisher richtige Anker mit falschen festen
Werten. Zylinder/Kegel hatten nach innen gerichtete Flächen und waren außen
ausgeblendet. Korrigierte Geometrie mit UVs und vier vorhandenen Albedos ersetzt
dies. Eigene Äste/Blattkarten sind ausdrücklich vorläufige authored-gameplay-
Baumgeometrie. Keine Originalbaum-Modelle wurden gefunden oder behauptet.

Höhen ohne ausreichend nahe Quellen und Dekoration in Straßen-/Eingangsflächen
werden ausgelassen. Bestehende Zaunimporte umfassen vier größere Modelle und
sieben kleine Tor-/Scharniermodelle. Das erklärt keine vollständige Einzäunung.
Keine pauschale Verlagerung oder erfundene Original-Zaunzüge vorgenommen.

Vertiefte Quellenprüfung:71 lokale CMapData-Dateien,13 verfügbare Fence/Pen-
Modelle,17 Treffer. Die zwei fehlenden Placements sind ein bewusst
ausgeschlossener grober Pigpen-LOD und ein ungeklärter offener Gate-Zustand.
Diese werden nicht still als Originalzustand aktiviert. Das hoch liegende
Auctionyard-`fence_det` ist tatsächlich Rope-Geometrie am Eingangsbogen;
Absenken wäre falsch. Belege: `fence-candidate-2026-10-24/findings.md` sowie
Quellen-/Vertexreports im selben Runtime-Ordner.

Ein echter Darstellungsfehler wurde korrigiert: Die allgemeine Texturregel
setzte selbst bei explizit `OPAQUE` deklarierten Quellmaterialien `alphaTest=.5`.
Im Stable-Rahmenmaterial `val_dc_mudgrime_1_abal` haben82,7296% der Pixel Alpha
unter128. Dies schnitt vorhandene Geometrie aus. Explizites OPAQUE bleibt jetzt
undurchsichtig; MASK/BLEND behalten ihre jeweilige Regel. Neuer Test vor der
Änderung rot, danach grün. Der isolierte Bildtest zeigt wieder durchgängige
Pfosten/Querbalken (`glb-review/stable-fence-opaque-fixed.png`). Das Modell
enthält zwei Rahmen; daraus keine vollständigen Zaunlinien ableiten.

Die Baumgeometrie wurde im selben Stil von173104 auf54064 Dressing-Dreiecke
reduziert (−68,8%).16Bäume und4Texturen bleiben; individuelle Baum-Budgets2592
bzw3712Dreiecke. Echte Originalvegetation und eine vollständige Wald-/Zaun-
Abnahme bleiben offen. Keine FPS-Steigerung allein aus der Dreieckzahl behaupten.

## Validierung

Evidenz unter `data/runtime/valentine/test-artifacts/entrance-feedback-2026-10-24/`.
Der verschärfte `e2e-map-survey.mjs` beginnt auf echtem Terrain und bewegt sich
mit realen Mausklicks zum Rampenfuß, durch die Tür und zurück. Die initiale
DEV-Verlagerung bleibt ausdrücklich Teil des Testumfangs; beliebige Ortsrouten
sind damit nicht geprüft. Ergebnis des abschließenden Laufs folgt im Ledger.

Linear: H4R-93 (Innenräume/Stockwerke), H4R-27 (Map/Umgebung). Weiter In Progress.

Generator auf diesem Worktree mit fehlenden Rohtexturen:
`node scripts/prepare-authored-dressing.mjs --source-root D:/Projects/RDO-RPG`.
Das liest die lokalen Originaltexturen aus Main und schreibt ausschließlich
die Runtime im Restart; ein Aufruf ohne diese Option scheitert hier mit ENOENT.
