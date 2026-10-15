---
title: "RDO-RPG Meilenstein-System & Phasen-Tracking"
type: milestone
tags:
  - rdo/planning
  - milestone/overview
updated: 2026-10-07
status: active
---

# 🏆 RDO-RPG Phasen- & Meilenstein-System

Historische Planung vom 07.10.2026. Prozentwerte und Checkboxen sind keine aktuelle Abnahme. Aktuelle Meilensteine und Aufgaben führt [Linear](https://linear.app/h4real82/project/rdo-rpg-d9ca7fe5de94); siehe [H4R-50](https://linear.app/h4real82/issue/H4R-50) und den [geprüften Stand vom 16.10.](../../../Project-Status-2026-10-16.md).

---

## 📊 Phasen-Übersicht & Fortschritt

| Meilenstein | Name & Fokus | Status | Fortschritt | Blocker / Nächster Schritt |
| :--- | :--- | :--- | :--- | :--- |
| **Milestone 1** | **The Outlaw Skeleton** (Fundament & Multiplayer) | 🟡 In Arbeit | **~85%** | PostgreSQL & Drizzle DB-Persistenz |
| **Milestone 2** | **The Frontiersman Loop** (Gameplay, Quests & Combat) | ⚪ Vorgezogen | **~35%** | Dialog-Graph & Quest-Tracking Engine |
| **Milestone 3** | **Outlaw Territories** (Saint Denis, Sharding & Skalierung) | ⚪ Backlog | **~5%** | Saint Denis Chunks & Redis Sharding |

---

## 🎯 Milestone 1: The Outlaw Skeleton
> **Ziel:** Ein durchgängig lauffähiger Vertikalschnitt: Discord Activity iFrame-Start im Voice-Channel, autoritative 20 Hz Multiplayer-Bewegung in Three.js, Kollision und persistente Speicherung bei Reload.

### Status-Kriterien & Task-Checkliste
- [x] **Discord Activity SDK & OAuth2:** Initialisierung über `@discord/embedded-app-sdk`, Token-Exchange und JWT `#milestone/m1`
- [x] **Three.js 3D Engine & Valentine Map:** Prozedurale und YMAP-basierte Rekonstruktion von Valentine, Straßen und Terrain `#milestone/m1`
- [x] **ThreeJS Guard Umsetzung:** Dachüberhänge <= 0.5 Einheiten & Kamera-Occlusion-Transparenz (`opacity: 0.15`) `#milestone/m1`
- [x] **Colyseus 20 Hz Multiplayer Loop:** Kontinuierliche Positionsübertragung und Interpolation (`world_room`) `#milestone/m1`
- [x] **Server AABB-Kollision:** Serverseitige Kollisionsüberprüfung gegen `VALENTINE_OBSTACLES` & Anti-Teleport Sanity Checks `#milestone/m1`
- [x] **Code Guard:** Defensive `try...catch`-Blöcke und Null-Checks bei allen Event-Listenern (`E`, `Tab`, `Esc`, `F`) `#milestone/m1`
- [ ] **PostgreSQL & Drizzle ORM Persistenz:** Speichern und Laden von Charakteren, Position, Bargeld und Inventar bei Sitzungsende `#milestone/m1` *(Aktueller Hauptblocker für M1-Abschluss)*
- [ ] **30s Graceful Reconnection:** Unterbrechungsfreie Wiederherstellung bei kurzen Netzwerk-Timeouts `#milestone/m1`

---

## 🎯 Milestone 2: The Frontiersman Loop
> **Ziel:** Der spielerische Kern-Loop: Interaktionen mit Orten und NPCs in Valentine, vollwertiges Inventar-Management, dynamische Dialoge, Aufträge und Echtzeit-Auseinandersetzungen.

### Status-Kriterien & Task-Checkliste
- [x] **Outlaw Logbook UI (`menu.ts`):** Tab-Menü mit Charakter-Stats, Ehre-Balken, Inventar-Slots und Tagebuch `#milestone/m2`
- [x] **POI-Interaktions-System:** Begehbare Punkte in Valentine (Smithfield's Saloon, Gemischtwarenladen, Arzt, Sheriff) mit Aktions-Dialogen `#milestone/m2`
- [x] **Fast-Travel System:** Schnellreise-Overlay (`F`) zu historischen Landmarken `#milestone/m2`
- [x] **Dynamisches Wetter & Tageszeit:** Server-synchronisierte Zyklen (`timeOfDay`, `weather`) `#milestone/m2`
- [ ] **Deterministischer Dialog-Graph:** Graph-basierte Verzweigungen mit NPCs (Sheriff Malloy, Barkeeper) `#milestone/m2`
- [ ] **Quest-Engine (`quests.json`):** Automatische Verfolgung von Jagd- und Kopfgeld-Aufträgen mit Belohnungsauszahlung `#milestone/m2`
- [ ] **Echtzeit-Waffen & Dead Eye:** Raycast-Zielen, Dead Eye Markierung und Schadensberechnung mit Trefferzonen `#milestone/m2`
- [ ] **Tier-Ökologie & Fell-System:** Autonome Tier-FSM (Flucht bei Annäherung), Waffenstufen-Abgleich und 3-Sterne-Fellqualitäten `#milestone/m2`

---

## 🎯 Milestone 3: Outlaw Territories
> **Ziel:** Skalierbare Spielwelt, erweiterte Territorien (Saint Denis, The Heartlands), persistente Posse-Lager und hochverfügbare Sharding-Infrastruktur.

### Status-Kriterien & Task-Checkliste
- [ ] **Saint Denis Sektor:** Industrielle Metropole, YMAP-Chunk-Streaming und Straßenbahnen `#milestone/m3`
- [ ] **Camp- & Posse-System:** Platzierbare Banden-Lager, Lager-Aufwertungen und Versorgungs-Events `#milestone/m3`
- [ ] **Multi-Room Redis Sharding:** Verteilung von Voice-Channel-Instanzen über Redis Presence `#milestone/m3`
- [ ] **Discord App Review Readiness:** Vollständige CSP-Absicherung, Rate-Limiting und Datenlösch-Endpunkte (`DELETE /api/me`) `#milestone/m3`
