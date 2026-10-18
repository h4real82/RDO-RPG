# Minigame-Register

`registry.json` verweist auf einen Ordner pro Spiel. `game.json` beschreibt Identität, Status, Fähigkeiten, Regelversion und verfügbare Varianten. Spielorte werden im Gebäude-/Floor-Register gebunden; Regeln enthalten keine Hauskoordinaten.

Vorhanden sind 13 Katalogeinträge. Nur `darts` besitzt aktuell einen lokalen spielbaren Übungsprototyp. Alle anderen Einträge dokumentieren geplante Ideen, keine aktivierten Spiele. Kino/Musik/Chat bleiben Aktivitäten und werden nicht künstlich als Minigame geführt.

`darts/variants/valentine-saloon-practice.json` dokumentiert den bestehenden Code: sechs Würfe, Ringwertung50/25/10, daneben0, maximal300 Punkte,350ms Wurfpause. Die Runtime lädt und validiert diese Variante; Änderungen an Wurfzahl, Wertung und Wurfpause werden nach neuem Build übernommen. Kein501-Regelwerk, keine Coins, Speicherung oder Multiplayer-Anbindung.

Codeablage je Spiel: `apps/client/src/game/minigames/<gameId>/` mit eigener Definition, Regeln, Ansicht, Gestaltung und Tests. `MinigameRegistry` und `MinigameHost` verwalten den lokalen Spielstart, Ladeabbruch und Dispose; die Runtime sperrt Welt-/Kameraeingaben, die Spielansicht führt ihren Tastaturfokus. Online-Teilnahme/Serverregeln bleiben getrennt. Individuelle Regeln/Varianten bleiben im Spielordner; Serverautorität gehört bei Online-Spielen in den serverseitigen Regeladapter.

Verbindlicher Migrationsplan: `docs/planning/Gebaeude-Minigame-Register-2026-10-18.md`. Katalog prüfen: `python tools/validate_content_catalogs.py`.
