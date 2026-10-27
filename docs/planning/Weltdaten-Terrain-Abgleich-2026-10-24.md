# Valentine: Weltdaten, Terrain und Ausstattung24.10.2026

Level-Design-Reihenfolge: verlässliche Gelände-/Objektgrundlage vor weiterer
Dekoration. Aktiver Restart-Worktree; Main und originale Rohdaten erhalten.
KeinCommit/Push, keine vollständige Map-Abnahme.

## Quellenabgleich

110lokale CMapData-XMLs gegen Runtime-TRS verglichen. Die unabhängige Matrix-
rechnung folgt der CEntityDef-Quaternion-Invertierung in Sollumz_RDR
`ymap/ymapimport.py` (Commit3e4ddd0cc4e809843e09538baf32f1014fb301aa) und
CodeWalker `CodeWalker.Core/GameFiles/FileTypes/YmapFile.cs`
(Commit485d56bec00262ed7fa472261cce7bbc6202b96e). Basis X=gameX,Y=gameZ,Z=-gameY.
Dies ist ein Daten-/Codeabgleich, keine behauptete GUI-Abnahme dieser Programme.

-Veraltete Sheriff-Kopie bei[-258.5855,116.487,-739.0651] entfernt. Dasselbe
 Modell war zusätzlich korrekt bei[-259.0177,120.1503,-741.3681] geladen;
 beide trugen dieselbeID. Der korrekte Import und eigene Innenraum bleiben.
-`val_03_default_jail` vonY121.7221 auf belegtesY114.9548 gesetzt. Alter
 Abstand6.7673m; X/Z/Asset/ID erhalten. Die aktive Gefängnishülle ist ein
 anderes Teil mit eigenem Pivot, keine Grundlage für diese alte Kopiehöhe.
-Assembler ersetzt jetzt überholte Legacy-TRS durch geprüfte Quelldaten,
 statt beide aufzunehmen; Runtime lehnt doppelte Placement-IDs ab.
-Nachher168nicht-authored Placements mit direktem YMAP-Abgleich ohne
 Positions-/Rotationsabweichung;170gesamte Placements mit170eindeutigenIDs.

## Terrain

Alle25originalen Terrain-GLBs sind bytegleich erhalten (SHA-Prüfung gegen die
im vorherigen Landscape gespeicherten Quellhashes). Die belegten Kachel-
platzierungen stimmten bereits; keine globale Höhenverschiebung vorgenommen.

Fehler saß in unserer Ergänzung: grobe gemischte Randdreiecke überspannten
originale Renderflächen, im gemessenen Beispiel bis2.3287m darüber. Zusätzlich
wurde die Laufnormalen-Grenze von0.65 zur Renderabdeckung verwendet und somit
steile, aber vorhandene native Flächen als fehlend behandelt.

Jetzt getrennte Renderabdeckung und Lauf-/Baumunterstützung, feinere
Randunterteilung, Grenzsuche gegen echte native Dreiecke und native Randhöhen.
Die fehlende Seite nähert sich lokalen Originalflächen statt nur einem groben
Rastermittel. Im abschließenden Audit der Überlappungs-Dreieckszentren keine
positiven Überdeckungen mehr; das ist keine globale punktweise Fehlergrenze.
711Straßenstichproben gegen native begehbare Renderflächen: maximal ca0.15m
Abstand einschließlich eigener Straßenauflage. Keine neue Originaltreuebehauptung
für interpolierte Flächen/Straßenbreiten.

Die westliche Sichtprobe kreuzt eine native Renderface unter der bestehenden
Laufnormalen-Grenze: Bewegung dort weiterhin gesperrt. Unabhängige Quellprofile
belegen die Neigung; das ist keine als erfolgreich gemeldete Laufroute. Die
anfängliche ungeeignete Erwartung, beide Randproben müssten frei sein, ist als
`views/first-probe-report.json` erhalten. Flache Randlandung, Kirche und Tor
bestehen ihre gezielten Laufproben. Form und Neigung dieser Original-Renderkante
sind nicht zusätzlich durch originale Kollisionsdaten bestätigt.

## Bäume und Zauntor

8zusätzliche eigene Schattenbäume auf exakt gesampelten begehbaren nativen
Dreiecken; insgesamt24Bäume im Dressing. Gebäude-/Eingangs-/Straßenfreiräume
bleiben geprüft. Vier zusätzliche Vorschläge verworfen. Ein ausschließlich
nativ gegründeter äußerer Waldstreifen war mit vorhandener Abdeckung nicht
belegbar und wurde nicht erzwungen. Eigene Baumgeometrie/-platzierung bleibt
authored-gameplay; keine erfundenen Originalbaum-Identitäten.

Original `val_01_emrfencegate02x_open` aus vorhandenem lokalen YDR mit bestehenden
Texturen konvertiert (820Dreiecke). Belegte Position aus
`placement-recovery/levels_1/0x2B2E065D_ymap.xml`, Entity1, übernommen.
Offener Zustand explizit eigene Spielentscheidung; keine bestätigte originale
State-Aktivierung und keine erfundenen Zaunzüge. Geöffnetes Tor blockiert den
Laufweg nicht. Herkunft/Hashes: `source-gate-addition-2026-10-24.json`.

## Prüfung und Grenzen

19gezielte Pipeline-Tests,14Terrain-/Dressing-Tests,11Clienttests grün;
Pflichtbuild `npx pnpm -r build` grün. Zwei betroffene Gebäude per echter Maus
betreten/verlassen;4gezielte Umgebungsbilder/Laufprüfungen mit erwarteter
Sperre an der steilen nativen Face, keine Browserexceptions. Keine breite
24Gebäude-/gesamteWelt-Wiederholung.

Originale Terrain-YBNs liegen binär vor (16Dateien), wurden aber nicht unabhängig
dekodiert. Der vorhandene RedDeadBlend2-Import unterstützt keinYBN; Sollumz_RDR
verarbeitet entsprechende XML-Exporte. Der aktuelle Abgleich betrifft YMAP-TRS
und YDR-abgeleitete Rendergeometrie, keine behauptete vollständige RAGE-
Kollisionsrekonstruktion. Vor einem eigenen Binärparser oder weiteren großen
Geländeeingriffen ist diese Lücke zu schließen. Weitere Map-/Wald-/Zaun-
Vollständigkeit und visuelle Gesamt-Abnahme bleiben offen.

Evidenz: `data/runtime/valentine/world-data-audit-2026-10-24/`.
Reproduzierbare Korrekturbelege: `data/reference/valentine/world-reconciliation-2026-10-24.json`.
LinearH4R-27/H4R-28 bleiben InProgress.
