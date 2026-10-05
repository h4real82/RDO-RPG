# Skill: RDO Knowledge Ingestion & Investigation Engine

---
name: rdo-investigation-engine
description: >
  Verarbeitet unstrukturierte Recherche-Ergebnisse (Google Search, Wikis,
  Forum-Beitraege, Discord-Logs) und transformiert sie in validierte
  Spielwelt-Parameter fuer das RDO-RPG-Projekt. Verhindert Halluzinationen,
  stellt mathematische Konsistenz sicher und schuetzt vor bekannten
  Regressionsfehlern.
---

## 1. Zweck & Funktionsweise

Dieser Skill verarbeitet unstrukturierte Recherche-Ergebnisse (z. B. aus Google
Search, Wikis, Forum-Beitraegen oder Discord-Logs) und transformiert sie in
validierte Spielwelt-Parameter fuer das Projekt. Er verhindert Halluzinationen,
stellt mathematische Konsistenz sicher und schuetzt vor bekannten
Regressionsfehlern.

---

## 2. Ingestion-Pipeline (Der 4-Stufen-Filter)

Sobald der Benutzer Recherche-Text oder Google-Outputs uebergibt, durchlaeuft
jede Information exakt diese vier Pruef-Stufen:

### Stufe 1 - Extraktion (Raw Fact Mining)
- Lies den Roh-Text und extrahiere **nur atomare Fakten** (Koordinaten,
  Gebaudenamen, Strassennamen, Eigentuemer, Oeffnungszeiten, Spawn-IDs).
- Markiere jeden Fakt mit seinem Primaerquellentyp:
  `[WIKI]`, `[FORUM]`, `[DISCORD]`, `[VIDEO_TIMESTAMP]`, `[DATAMINE]`.
- **Ignoriere** alle Meinungen, Schaetzungen und unverifizierten Einzelaussagen
  ohne Quellenbeleg.

### Stufe 2 - Kreuz-Validierung gegen Offline-Ground-Truth
- **Pflichtabgleich** mit folgenden lokalen Dateien:
  - `data/raw/rdomap/` - animal_spawns, fasttravels, shops, interiors,
    overlays_beta, discoverables
  - `data/raw/collectors/` - railroads, regionale GeoJSONs,
    item-coordinates-in-game
  - `apps/client/src/world/data/rdo_world_manifest.json`
  - `apps/client/src/world/data/worldData.json`
- Wenn ein extrahierter Fakt **mit keiner** Ground-Truth-Datei uebereinstimmt
  => automatisch als `[UNVERIFIED]` markieren.
- Wenn ein Fakt eine bestehende Koordinate um **mehr als 50 Game-Units**
  verschiebt => zwingend Rueckfrage an den Benutzer bevor Schreiben.

### Stufe 3 - Mathematische Konsistenzpruefung
- **Koordinatensystem-Check:** Three.js-Konvention: `game_x => x`,
  `game_z => z` (Tiefe), `game_y => y` (Hoehe).
- **Bounding-Box-Check:** Alle Valentine-Strukturen muessen innerhalb von
  `x: [-500, 200], z: [600, 1100]` liegen.
- **Dachueberhang-Regel (aus AGENTS.md):** Ueberhang <= 0.5 Einheiten ueber
  Fassade.
- **Kollisionscheck:** Neues Objekt darf nicht innerhalb von 5 Game-Units
  eines bestehenden Objekts (aus `worldData.json`) platziert werden.
- Bei Verstoss => Ausgabe einer Fehler-Tabelle mit dem konkreten Konflikt.

### Stufe 4 - Ausgabe als strukturierter Patch
Valide Fakten werden als JSON-Patch-Fragment ausgegeben, das direkt in
`worldData.json` oder `rdo_world_manifest.json` eingefuegt werden kann:

```jsonc
// Beispiel-Patch-Fragment:
{
  "id": "valentine_sheriffs_office",
  "type": "building",
  "subtype": "law",
  "position": { "x": -85, "y": 68.2, "z": 820 },
  "dimensions": { "w": 12, "d": 10, "h": 6.5 },
  "sources": ["[WIKI:rdr2.fandom.com]", "[DATAMINE:RAGE_archetype_0x4A2F]"],
  "confidence": "HIGH",
  "tags": ["#law", "#sheriff", "#valentine"]
}
```

---

## 3. Bekannte Regressionsfehler (Anti-Pattern-Liste)

Diese Fehler sind in frueheren Sessions aufgetreten. Der Skill MUSS sie
aktiv abfangen:

| Fehler-ID | Beschreibung | Erkennungsmerkmal | Praeventionsregel |
|-----------|-------------|-------------------|------------------|
| `REG-001` | Koordinaten-Swap (x/z vertauscht) | Gebaeude erscheint weit ausserhalb der Stadt | Immer beide Achsen gegen Map-PNG-Overlay validieren |
| `REG-002` | Doppeltes Spawnen desselben Gebaeudes | Zwei Objekte mit demselben `id`-String | Vor Schreiben `id`-Duplikat-Check in worldData.json |
| `REG-003` | Y-Achsen-Drift (falsche Hoehe) | Gebaeude schweben oder versinken | IDW-Interpolation aus `elevation_benchmarks.json` pflichtmaessig verwenden |
| `REG-004` | Fehlender Chunk-Boden | Spieler blickt ins Leere an Chunk-Kanten | `buildChunkGroundMesh()` immer vor Objekt-Instanziierung aufrufen |
| `REG-005` | Globale Minimap-Blackout | Map wird schwarz ausserhalb Valentine | Immer `Complete Red Dead Online Map.png` als Basis; clamp-to-edge-Skirts |
| `REG-006` | Unhandled Event-Listener Exception | Input-Loop friert ein | Strikte Null-Checks + try/catch um alle keydown-Handler (E, Tab, Esc, F) |
| `REG-007` | Fehlende Corral-Zaeune | Corral hat solide Waende statt offene Zaeune | `FenceSystem` verwenden; keine `BoxGeometry`-Waende fuer Corrals |
| `REG-008` | Shop-Injekt ohne Railroad-Kollisionspruefung | Shops ueberlappen Gleisebene | Vor Injekt alle Shops gegen `railroads.json`-Splines pruefen (Puffer: 8m) |

---

## 4. Koordinaten-Referenz-Tabelle (Valentine Ground Truth)

Alle diese Werte sind **unveraenderlich** und dienen als Anker-Punkte:

| Landmark | Three.js X | Three.js Z | Quelle |
|----------|------------|------------|--------|
| Bahnhof (Mitte) | 120 | 950 | `Valentine Station.png` + `fasttravels.json` |
| Hauptstrasse Anfang (Sued) | -20 | 680 | `Valentine MAP.jpg` S-Kurven-Vermessung |
| Hauptstrasse Ende (Nord) | 30 | 1050 | `Valentine MAP.jpg` S-Kurven-Vermessung |
| Sheriff's Office | -85 | 820 | `shops.json` + WIKI |
| Saloon (Valentine) | -40 | 800 | `shops.json` |
| Church (North Hill) | -180 | 890 | Benutzer-Direktive (Session 3) |
| Auction Barn / Stables | -360 | 720 | Benutzer-Direktive (Session 3) |
| Livery Stable | -30 | 760 | `interiors.json` |
| Hotel / Bank | 15 | 810 | `Valentine Saints Hotel and Bank.jpg` |

---

## 5. Qualitaetsstufen fuer ausgegebene Fakten

| Stufe | Label | Kriterien |
|-------|-------|-----------|
| A | `HIGH` | >= 2 unabhaengige Quellen, matematisch konsistent, in Ground-Truth-Datei |
| B | `MEDIUM` | 1 Quelle + visual bestaetigt per Map-PNG, matematisch konsistent |
| C | `LOW` | Nur 1 Quelle, nicht in Ground-Truth; requires user approval before write |
| D | `UNVERIFIED` | Kein Quellenbeleg; darf NICHT in worldData.json geschrieben werden |

---

## 6. Workflow-Checkliste (Agent-Pflichtprotokoll)

Vor jeder Code-Modifikation auf Basis von Recherche-Ergebnissen:

- [ ] Ingestion-Pipeline (Stufen 1-4) vollstaendig durchlaufen
- [ ] Alle `[UNVERIFIED]`-Fakten an Benutzer gemeldet
- [ ] `REG-001` bis `REG-008` Anti-Pattern aktiv geprueft
- [ ] JSON-Patch-Fragment erstellt und gezeigt (vor dem Schreiben)
- [ ] Build Gate ausgefuehrt: `npx pnpm -r build` (aus AGENTS.md)
- [ ] Keine unhandled Exception in Event-Listenern (Code Guard aus AGENTS.md)

---

## 7. Integration mit anderen Skills

| Skill | Wann aufrufen |
|-------|---------------|
| `rdo-map-reconstruction` | Fuer geometrische Rekonstruktion nach validiertem Fakt |
| `modern-web-guidance` | Bei UI-Komponenten (Minimap, HUD, Menues) |
| `gemini-api-dev` | Wenn KI-gestuetzte Koordinatenextraktion aus Bild-Assets benoetigt wird |

---

## 8. Beispiel-Session

```
User: "Laut Reddit liegt das Doctor's Office in Valentine neben dem Hotel,
       ungefaehr bei x=30, z=830."

Agent-Output (nach Pipeline):
  Stufe 1: Fakt extrahiert -- "Doctor's Office bei x=30, z=830" [FORUM:Reddit]
  Stufe 2: shops.json -- kein Eintrag fuer Doctor's Office in Valentine.
           worldData.json -- kein bestehender Eintrag mit dieser ID.
           => Status: [UNVERIFIED]
  Stufe 3: Koordinaten innerhalb Valentine-Bounding-Box OK
           Kein Kollisionskonflikt mit Hotel (x=15, z=810) -- Abstand 20.2 Units OK
  Stufe 4: Confidence-Stufe: LOW (nur 1 Forum-Quelle, kein Ground-Truth-Match)
           => Ausgabe als LOW-Patch-Fragment; Benutzer-Freigabe erforderlich.
```
