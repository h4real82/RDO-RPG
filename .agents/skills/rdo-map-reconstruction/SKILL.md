---
name: rdo-map-reconstruction
description: Ground truth reconstruction & asset validation rules for the Red Dead Online world geometry and map alignment.
---

# Skill: RDO Ground Truth Reconstruction & Asset Validation

## Ziel
Rekonstruktion der Red Dead Online Spielwelt ohne Halluzinationen, Achsenfehler oder Schätzwerte.

## Verbindliche Regeln (Guardrails)
1. **Offline Ground Truth (`data/raw/`):**
   - Der lokale Ordner `data/raw/` (`data/raw/rdomap/` und `data/raw/collectors/`) ist die alleinige verbindliche Offline-Ground-Truth.
   - Kein Mesh darf allein aus isolierten Bildpixeln geraten werden. Jedes Objekt muss durch mindestens zwei Quellen bestätigt sein:
     * Quelle A: Jean Röpke Repo Rohdaten (`data/raw/rdomap/` und `data/raw/collectors/`: Marker, Tier-Spawns, Fast-Travel, Shops, GeoJSON-Strecken).
     * Quelle B: Kartenreferenzen im Ordner `Media/` (`Valentine MAP.jpg`, `Valentine Detailed MAP.png`, `Valentine Station.png`, `Complete Red Dead Online Map.png`) oder RAGE Archetype-Kataloge.

2. **Validierungsregeln gegen Falschplatzierungen (Valentine):**
   - **Valentine Südwest/West:** An den Koordinaten `[-360.0, 720.0]` (bzw. im Bereich der Stallungen) darf NIEMALS eine Kirche (`church`) gerendert werden! Dort steht der Valentine Auction Yard / die große Scheune (`barn`/`stables`) mit Viehgattern, Zäunen und gegenüberliegender Freifläche/Show-Zelt.
   - **Valentine Nord-Hügel:** Die echte historische Kirche von Valentine (`val_church` / `church_valentine`) liegt strikt nördlich auf den Hügeln bei `[-180.0, 890.0]` mit angeschlossenem Friedhof (`cemetery`).
   - Wenn an Koordinaten Tier-Spawns hinterlegt sind, wird niemals ein normales Wohnhaus gerendert, sondern Zäune (`FenceSystem`), Gatter und Unterstände (`shelter`/`corral`).

3. **Gleis-Priorität & Stetige Schienen-Splines:**
   - Schienen-Splines müssen stetig als zusammenhängende Catmull-Rom-Kurve ohne abrupte Enden durchlaufen.
   - Bahngleise (`RailTracks`) besitzen immer oberste Priorität im Raum. Bounding-Boxes von Gebäuden dürfen Gleissplines niemals schneiden.

4. **Koordinaten- & Achsensynchronisation:**
   - Leaflet/2D-Kartenkoordinaten müssen mathematisch konsistent ins Three.js-Koordinatensystem überführt werden:
     `threeX = game_x`, `threeY = game_z (elevation)`, `threeZ = game_y`.
