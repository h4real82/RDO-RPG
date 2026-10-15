# Valentine-Rundweg – Bestandsprüfung

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
