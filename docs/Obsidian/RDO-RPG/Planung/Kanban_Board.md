---
kanban-plugin: basic
title: "RDO-RPG Entwicklungs-Kanban"
type: kanban
tags:
  - rdo/kanban
  - planning
updated: 2026-10-07
---

> Historische Aufgabenliste vom 07.10.; Checkboxen sind keine aktuelle Abnahme.
> Status führt [Linear](https://linear.app/h4real82/project/rdo-rpg-d9ca7fe5de94).
> Manifest: [H4R-27](https://linear.app/h4real82/issue/H4R-27),
> Quellrecovery: [H4R-52](https://linear.app/h4real82/issue/H4R-52),
> Terrain: [H4R-28](https://linear.app/h4real82/issue/H4R-28),
> Kollision: [H4R-29](https://linear.app/h4real82/issue/H4R-29),
> Route: [H4R-30](https://linear.app/h4real82/issue/H4R-30),
> Persistenz: [H4R-35](https://linear.app/h4real82/issue/H4R-35).
> `scripts/sync_kanban.mjs` ist kein Linear-Sync.

## 📋 Backlog

- [ ] [[Milestones|PostgreSQL & Drizzle DB-Persistenz & Autosave einrichten]] #milestone/m1 #priority/high
- [ ] Quest-Engine (`quests.json`) Integration mit Belohnungen #milestone/m2
- [ ] O'Driscoll Banditen-Camp NPC AI Spawns #milestone/m2
- [ ] Tier-FSM & 3-Sterne-Jagdsystem implementieren #milestone/m2
- [ ] Inventar-Gewichtslimit & Drop-Mechanik #milestone/m2
- [ ] Saint Denis Chunk Definitionen vorbereiten #milestone/m3
- [ ] 30s Graceful Reconnection bei Colyseus-Verbindungsabbrüchen #milestone/m1


## ⚡ Ungeplant / Ad-hoc

- [ ] Spontane Fixes & ungeplante Ideen hier eintragen #rdo


## ⏳ In Progress

- [ ] Valentine World Manifest Abgleich mit `data/raw/rdomap` #milestone/m1
- [ ] Dachüberhänge bei allen Valentine-Modulen auf <= 0.5 Einheiten auditieren #milestone/m1 #threejs
- [ ] Occlusion-Shader Transparenz (`opacity: 0.15`, `depthWrite: false`) für Kamera-Sichtlinie #milestone/m1 #threejs


## 🧪 Testing / Review

- [ ] Event-Listener Keydown ('E', 'Tab', 'Esc', 'F') defensive Null-Checks #code-guard #milestone/m1
- [ ] `npx pnpm -r build` Build-Gate Prüfung #build-gate


## ✅ Done

- [x] Deterministischer Dialog-Graph für Smithfields Saloon Barkeeper #milestone/m2
- [x] Valentine Gunsmith & Saints Hotel POI-Systeme & Menüs #milestone/m2
- [x] Ground-Truth 3D-Koordinaten Angleichung aller Valentine POIs in `pois.json` #milestone/m1
- [x] Three.js Client Vite 5 Setup mit pnpm Workspace #milestone/m1
- [x] Colyseus 20Hz Multiplayer-Synchronisation in `world_room` #milestone/m1
- [x] Outlaw Logbook UI (`menu.ts`) mit Inventar, Stats & Tagebuch #milestone/m2
- [x] POI-Interaktionen mit Saloon, Store, Arzt, Sheriff (`E`-Taste) #milestone/m2
- [x] Fast-Travel System (`F`) zu historischen Landmarken #milestone/m2
- [x] Initialisierung des Obsidian-Vaults mit MCP `rdo-vault` #vault
- [x] 4-Säulen-Datenarchitektur in Obsidian Vault #vault
- [x] Multi-Agent Dashboard (`MADashboard.md`) & Telemetrie #agy


%% kanban:settings
```
{"kanban-plugin":"basic"}
```
%%
