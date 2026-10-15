# Valentine Vertical Slice – geprüfter Stand

Stand: 2026-10-15. Diese Notiz beschreibt den lokalen Codex-Worktree, nicht
einen veröffentlichten oder vollständig spielbaren Build.

## Neu geprüft am 15.10.2026

- Die korrigierte Projektion ist `X = gameX`, `Y = gameZ`, `Z = -gameY`.
  Der Browsercheck prüft 141 geladene Platzierungen mit positiver Determinante.
- Die Auswahl `default_day` akzeptiert 130 Außenwelt-Platzierungen; elf
  Terrain-Kacheln kommen hinzu. Ausgeschlossen sind 219 Innenräume, 43
  VFX-Helfer, zehn Lockdown-Varianten und drei doppelte LOD-Hüllen.
- Nach Wiederherstellung von 91 Materialvorschauen ist die Beschriftung am
  General Store im West-Kontrollbild lesbar und nicht gespiegelt. Fehlende
  Materialien und weitere Geometrie bleiben sichtbar; die Kartenabnahme ist offen.
- Ein Neuaufbau kann die Materialvorschauen jetzt über
  `--material-preview-root` direkt übernehmen. Der Regressionstest prüft zwei
  aufeinanderfolgende Neuaufbauten samt finalen Asset-Hashes.
- Pipeline: 90 Tests bestanden. Client: 47 Tests bestanden. Vertragsprüfungen,
  Browser-Smoke-Test für WASD/Zoom/POI und `npx pnpm -r build` bestanden.

Die folgenden Abschnitte vom 09.10. dokumentieren den älteren Ausgangsstand;
ihre Bestandszahlen sind keine aktuellen Messwerte.

## Bereits testbar

- Orthografische 2.5D-Vorschau mit WASD, Zoom und POI-Menü.
- Quellgebundene Valentine-Gebäude und elf HD-Terrain-Kacheln aus OpenIV;
  Platzierungen stammen aus exportierten YMAPs, nicht aus Schätzungen.
- Browser-WASD-Test auf `valentine:road:0062`: Quellpunkte 12–36 vom
  Bahnhofszugang durch den Ortskern erreicht, ohne Browserfehler.
- Bewegung stoppt an fehlendem Terrain, statt auf einer alten Höhe
  weiterzulaufen; der HUD unterscheidet Geländelücke und Gebäudehindernis.

## Noch nicht fertig

- Der nördlichere Straßenteil ab Quellpunkt 45 (X≈−250/Z≈891) hat keinen
  exportierten Boden. Die YMAP zeigt benachbarte HD-Kacheln, aber vor weiteren
  Exporten muss die Grenze des geplanten Valentine-Ausschnitts feststehen.
- Der gewünschte Rundweg Bahnhof → Kirche → Sheriff/Saloon → Bahnhof ist
  nicht vollständig begehbar oder als Karte abgenommen.
- Die westliche Quell-Straßenlinie `valentine:road:0059` trifft auf Hotelveranda
  und Gunsmith-Geometrie. Sie ist eine Kartenreferenz, noch kein sicherer
  Laufweg; die Gebäude-Kollision wird deshalb nicht pauschal entfernt.
- Terrain-Farben, UV-Skalierung und große sichtbare Randlücken sind noch
  Vorschauqualität. Vegetation, Wege, Gleise und Innenräume fehlen teilweise.
- Multiplayer, Discord, Figur-Editor und Minispiele sind Planungsumfang,
  nicht Bestandteil dieser lokalen Version.

Details und genaue Messpunkte: [Valentine route coverage audit](../../../runbooks/valentine-route-audit.md).

## Räumliche Genauigkeit vorerst nicht abgenommen

Der markierte Rundweg vom 09.10.2026 zeigt, dass die Vorschau noch keine
verlässlich erkennbare Valentine-Gesamtform besitzt. Aktuell stehen 2.263
Außenwelt- und 2.188 Innenraum-Entitäten in den Quelldaten nur 186 sichtbaren
Außenwelt-Platzierungen und zugleich 408 geladenen Innenraum-Platzierungen
gegenüber; zusätzlich fehlen 1.581 Modellreferenzen. Straßen und Gleise liegen
nur als nicht renderbare Prüflinien vor. Eine möglicherweise spiegelverkehrte
Gebäudeschrift macht außerdem die Achsen-/Handedness-Kalibrierung zum ersten
Gate. Bis dieses Gate bestanden ist, werden keine weiteren Detailmodelle auf
Verdacht exportiert.

Umsetzungsplan: [Valentine Spatial Fidelity Recovery](../../../superpowers/plans/2026-10-09-valentine-spatial-fidelity-recovery.md).

Abhakbare OpenIV-Arbeitsliste: [Valentine Spatial Recovery Export Queue](../Runbooks/OpenIV-Valentine-Spatial-Recovery-Export-Queue.md).

Codex arbeitet im separaten Git-Worktree. Am 15.10. wurden diese Statusnotiz
und die überarbeitete Exportanleitung als lesbare Momentaufnahme auch im Vault
des Hauptprojekts abgelegt und über die Vault-MCP-Verbindung zurückgelesen.
Es gibt weiterhin keine automatische Synchronisation zwischen den Worktrees;
Änderungen an diesen beiden Fassungen müssen vor einer Übernahme verglichen werden.
