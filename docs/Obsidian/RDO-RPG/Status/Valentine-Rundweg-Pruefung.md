# Valentine-Rundweg – Bestandsprüfung

## Aktueller Stand 16.10.2026 (H4R-27 / H4R-52)

Bahnhof und Kirche sind jetzt mit originalen HD-Quellplatzierungen belegt;
Audit frisch wiederholt, beide `source-placement-found`. Export-Teilauftrag
[H4R-52](https://linear.app/h4real82/issue/H4R-52) abgeschlossen.
Die darunterstehenden Fehlmeldungen zur Platzierungsquelle sind historisch.
Kein weiterer Export für diese zwei Platzierungen erforderlich.

Noch keine Runtime-Integration: 143 Platzierungen, beide Exteriors fehlen.
116 Pipeline-Tests, 48 Client-Tests, Vertragsprüfungen, Manifestvalidierung
und Build bestanden. Keine neue Browser-/Rundweg-Abnahme in dieser Sitzung.
H4R-27 bleibt offen; Terrain/Kollisionen und H4R-30 ebenfalls.
Details: `docs/Project-Status-2026-10-16.md`.

## H4R-27 – Gegenprüfung mit Sollumz_RDR (15.10.2026)

Der tatsächliche Sollumz_RDR-XML-Reader wurde unter Blender ausgeführt.
92 YMAPs, 96 YTYPs, 4.922 Root-Entities, 8.274 Archetypen und 2.188
MLO-Mitglieder wurden in den relevanten Zuordnungs-/Transformationsfeldern
verglichen. Keine Abweichung außerhalb erwarteter float32-Rundung gefunden.

Die Modelldefinitionen für Bahnhof und Kirche werden von beiden Auswertungen
gefunden, passende Außenplatzierungen dagegen nicht. Eine YMAP erfordert beim
Referenzreader eine verlustfreie Umwandlung dezimaler Occluder-Byte-Arrays in
Hextext im Speicher. Originaldateien und Weltmanifest bleiben unverändert.
Details und Grenzen: `docs/runbooks/sollumz-reader-crosscheck.md`.

Die frühere Anleitung mit sechs hexadezimalen YMAP-Dateinamen ist
zurückgezogen: interne XML-Kennungen sind keine verifizierten Archivdateinamen.
Aufgrund dieses Abgleichs wird kein weiterer manueller Export angefordert.

## H4R-27 – Patchpack006-YTYP geprüft (15.10.2026)

Alle 23 neu exportierten XML-Dateien unter
`D:/Projects/RDO-RPG/data/raw/placement-recovery/patchpack006` sind lesbare
CMapTypes-Exporte. Sie enthalten 2.744 Archetypen. Beide gesuchten
CBaseArchetypeDef/ASSET_TYPE_DRAWABLE-Definitionen stehen in
`0x4904B9D1_ytyp.xml`: Bahnhof `0xbfef411a`, Kirche `0xe945accd`;
jeweils name und assetName stimmen mit dem Modellhash überein.
Die YTYP enthält lokale Bounds/Extension-Offets, keine belegte Weltplatzierung.

Der Gesamtaudit umfasst nun 190 XMLs, 96 YTYPs, 92 YMAPs, 8.274 Archetypen
und 4.922 Root-Entities. Beide Modelle wechseln von source-link-missing
zu archetype-only. Die Runtime-Platzierungen bleiben unverändert.

Als nächster gezielter Metadatenexport werden die sechs Sektor-YMAPs aus
demselben patchpack006-Archiv benötigt; Varianten getrennt halten:

| Suchname | Dateiname bei Hash-Anzeige |
| --- | --- |
| val_01_.ymap | 0xE5A96AFE.ymap |
| val_01__strm_0.ymap | 0x9007F699.ymap |
| val_01__long_0.ymap | 0xBDC4BA8A.ymap |
| val_05_.ymap | 0xE18BEEC7.ymap |
| val_05__strm_0.ymap | 0xAE7A22A0.ymap |
| val_05__long_0.ymap | 0x313126B0.ymap |

Die Hashes sind aus den internen Identitäten der vorhandenen Original-YMAPs
abgelesen. Export to XML im OpenIV-Hauptfenster verwenden, Ziel ist derselbe
placement-recovery/patchpack006-Ordner. Keine Modell-/Textur-Neuexporte und
kein Export aller 327 YMAPs. Die frühere Anforderung weiterer YTYP-Suche
ist damit erledigt. 116 Pipeline-Tests und Build bestanden.

## Schritt 1 – Platzierungsquellen geprüft (15.10.2026, H4R-27)

Die erneute Prüfung aller 167 lokalen XMLs (92 YMAPs, 73 YTYPs,
4.922 Root-Entities und 5.530 Archetypen) findet für Bahnhof-Außenhülle
`val_01_trainstn_ext` und Kirche `val_05_church_ext` weder eine direkte
Platzierung noch eine explizite Archetyp-/Drawable-Zuordnung oder MLO-Mitgliedschaft.
Die vollständigen Modelle und konvertierten GLBs liegen vor; sie müssen
nicht erneut exportiert werden. Die Original-Platzierungsmetadaten fehlen
weiterhin. Keine Position wurde geraten oder von Regen-/Innenraum-/LOD-Objekten
übernommen, die Vorschau wurde nicht verändert.

Der reproduzierbare Nachweis steht in
`docs/runbooks/station-church-source-recovery.md`; der lokale Bericht heißt
`data/runtime/valentine/placement-recovery/landmark-source-recovery.json`.
Die frühere pauschale Aussage „kein weiterer Export erforderlich“ gilt für
diese Modelle/Texturen; sie belegt keine vollständigen Platzierungsmetadaten.

## Batch 02A – geprüft und eingebunden (15.10.2026)

Die drei neuen Terrainmodelle wurden aus den .ydr.full-Dateien konvertiert
und ausschließlich über ihre YMAP-Quelltransformationen eingebunden.
Die lokale Vorschau enthält jetzt 143 Platzierungen, davon 14 Terrain-Kacheln.
Die 33 südlichen Quell-Prüfpunkte liegen innerhalb exportierter
Terrain-Begrenzungen; das allein beweist noch keine lückenlose Oberfläche.

Der echte WASD-Lauftest auf Quellstraße valentine:road:0059 von Punkt 0 bis
13 besteht jetzt ohne Browserfehler. Zuvor blockierte val_lights_holder_05:
ein 24-Vertex-Hilfsvolumen von etwa 65,6 × 17,3 × 79,8 Metern mit
Checker-Textur. Nur dieses konkret untersuchte Modell ist aus dem
Tages-Weltzustand ausgeschlossen; andere Lampen bleiben unverändert.
Die Bedeutung der Quell-RenderMask-Bits ist damit nicht allgemein geklärt.

110 Pipeline-Tests, Manifestvalidierung und npx pnpm -r build bestanden.
Der erste Testlauf wurde durch einen parallelen Build/Seitenreload
unterbrochen; der Wiederholungslauf nach Build-Ende bestand.
Offen bleiben der vollständige Rundweg, Bahnhof-/Kirchen-Platzierungen,
Straßenmaterialien und die vollständige visuelle Kartenabnahme.
Aktuell ist kein weiterer OpenIV-Export erforderlich.


Stand: 15.10.2026. Die neue automatische Prüfung vergleicht die Gebäude für
deinen Rundweg mit den ursprünglichen Platzierungen. Sie prüft auch Richtung
und Maßstab; ein passender Dateiname allein reicht nicht.

| Gebäude | Ergebnis |
| --- | --- |
| Sheriff, zweiter Saloon, großer Saloon | Quellposition, Richtung und Maßstab passen |
| Hotel, Bank, westlicher Stall | Quellposition, Richtung und Maßstab passen |
| Magic-Lantern-Zelt | Quellposition, Richtung und Maßstab passen |
| Bahnhof-Außenhülle | Modell vollständig vorhanden; Platzierungsquelle fehlt |
| Kirche | Modell vollständig vorhanden; Platzierungsquelle fehlt |

Für Bahnhof und Kirche musst du die Modelle **nicht erneut exportieren**.
Ihre `.ydr.full` und GLBs liegen bereits vor. Codex sucht die fehlende
Verknüpfung zur Platzierung. Die Position eines Regen-/VFX-Objekts wird dafür
nicht als Gebäudeplatzierung übernommen.

Die fünf Abschnitte sind erfasst: Bahnhofszufahrt → Kirche → Hauptstraße →
westlich am Zelt vorbei → Bahnhof. Ihre exakten Laufwege sind noch nicht
abgenommen. Fehlender Boden, begehbare Veranden, Gleise und Kollisionen
brauchen weiterhin eine eigene Prüfung im Spiel.

Deine aktuelle Vorbereitung bleibt
[Batch 00B aus der Exportanleitung](../Runbooks/OpenIV-Valentine-Spatial-Recovery-Export-Queue.md).
Die vollständige Karte ist noch nicht fertig.

## Neue Lauf- und Bildprüfung

Die Bahnhofszufahrt und die anschließende Straße bis Quellpunkt 36 wurden am
15.10. mit echter WASD-Eingabe durchlaufen; beide Teilprüfungen waren ohne
Browserfehler erfolgreich. Das ist noch kein erfolgreicher vollständiger Rundweg.

Eine feste Draufsicht mit Norden oben ist jetzt reproduzierbar. Sie zeigt
noch große Bodenlücken im Westen und am Bahnhof sowie uneinheitliche
Terrain-Texturen und unvollständige Straßendarstellung. Diese Bildfehler sind
offene Abnahmepunkte, auch wenn einzelne Gebäude korrekt platziert sind.

Geprüft: 96 Pipeline-Tests, 48 Client-Tests, Vertragsprüfungen, Build und
Browser-Kalibrierung mit 141 Platzierungen bestanden.

## Terrain-Materialien korrigiert

Alle elf Terrain-Kacheln haben jetzt Materialvorschauen: 105 Vier-Schicht-
Materialien, fünf weiterhin nicht unterstützte Materialplätze. Bei sechs
Kacheln fehlten vorher sämtliche Materialien. Die Quellparameter zur
Texturwiederholung (in den untersuchten Materialien 128×128) und die
UV-Auswahl werden jetzt berücksichtigt. Dadurch verschwinden die riesigen
Grashalme; die Originalgeometrie bleibt erhalten.

Die aktuelle Draufsicht zeigt weiterhin echte Bodenlücken und helle,
unvollständige Straßen-/Decalflächen. Die vollständige Material- und
Kartenabnahme ist offen. Die neue Prüfung besteht 105 Pipeline-Tests,
48 Client-Tests, Build und Browser-Smoke-Test.

Lokale Vorschau, nicht als fertige Karte abgenommen:

![Terrain-Vorschau vom 15.10.2026](Attachments/preview-terrain-2026-10-15.png)
