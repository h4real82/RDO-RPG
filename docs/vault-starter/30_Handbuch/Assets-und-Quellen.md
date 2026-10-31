---
title: "Assets und Quellen"
type: system
tags: [rdo]
updated: 2026-10-31
status: active
---

# Assets und Quellen

- `data/raw/`: unveränderte lokale Originale.
- `data/runtime/`: gezielt freigegebene, selbstständige Laufzeitdateien.
- `data/reference/valentine/buildings/<gebäude>/`: Gebäudedetails und Herkunft.
- `data/reference/minigames/<spiel>/`: Regeln/Varianten je Spiel; Ortskoordinaten nicht duplizieren.
- GitHub: Code, Schemas, Register und Pipeline-Werkzeuge; keine binären Modell-/Texturpakete.

## Belege statt Hash-Vermutungen

Unbekannte Modell-/Archividentität bleibt **[FLAG: Data Missing]**. Lookup-Hashes sind keine belegten Originaldateinamen. Automatische Asset-Listen sind technische Daten, kein kuratiertes Wissensnetz.

Ein Exportauftrag braucht belegten Originalnamen, bekannten vollständigen Archivpfad, Format/Befehl, absolutes Ziel und erwartete Dateien. Erledigte Lieferungen nicht erneut pauschal anfordern.

Supabase dient relationalen Spielzuständen. GLBs/Texturen gehören nicht in Postgres. Storage-Uploads und Live-Migrationen sind eigene bewusste Arbeitsschritte.

Quelle: [AGENTS.md](https://github.com/h4real82/RDO-RPG/blob/main/AGENTS.md). [[10_Projekt/Ziel-und-Grenzen|Gestaltungsgrenzen]] · [[40_Recherche/Offene-Fragen|Ungeklärtes]].

