# Valentine-Rundweg – Bestandsprüfung

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
