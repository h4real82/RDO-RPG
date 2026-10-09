# Valentine Vertical Slice – geprüfter Stand

Stand: 2026-10-09. Diese Notiz beschreibt den lokalen Codex-Worktree, nicht
einen veröffentlichten oder vollständig spielbaren Build.

## Bereits testbar

- Orthografische 2.5D-Vorschau mit WASD, Zoom und POI-Menü.
- Quellgebundene Valentine-Gebäude und zehn HD-Terrain-Kacheln aus OpenIV;
  Platzierungen stammen aus exportierten YMAPs, nicht aus Schätzungen.
- Browser-WASD-Test auf `valentine:road:0062`: Quellpunkte 12–35 vom
  Bahnhofszugang durch den Ortskern erreicht, ohne Browserfehler.
- Bewegung stoppt an fehlendem Terrain, statt auf einer alten Höhe
  weiterzulaufen.

## Noch nicht fertig

- Der Lauf stoppt bei X≈−272/Z≈832 vor Quellpunkt 36. Die nächste belegte
  Terrain-Kachel `l_09__hd_0_1_-1` (Zentrum −288/864) fehlt als OpenIV-Export.
- Der gewünschte Rundweg Bahnhof → Kirche → Sheriff/Saloon → Bahnhof ist
  nicht vollständig begehbar oder als Karte abgenommen.
- Terrain-Farben, UV-Skalierung und große sichtbare Randlücken sind noch
  Vorschauqualität. Vegetation, Wege, Gleise und Innenräume fehlen teilweise.
- Multiplayer, Discord, Figur-Editor und Minispiele sind Planungsumfang,
  nicht Bestandteil dieser lokalen Version.

Details und genaue Messpunkte: [Valentine route coverage audit](../../../runbooks/valentine-route-audit.md).

Codex arbeitet im separaten Git-Worktree. Diese Notiz wird im Obsidian-Vault
des Haupt-Checkouts erst nach einer geprüften Git-Übernahme sichtbar; es gibt
keine automatische Synchronisation zwischen den Worktrees.
