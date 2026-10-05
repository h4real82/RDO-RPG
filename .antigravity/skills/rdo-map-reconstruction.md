# Skill: RDO Ground Truth Reconstruction & Asset Validation

## Ziel
Rekonstruktion der Red Dead Online Spielwelt ohne Halluzinationen, Achsenfehler oder Schätzwerte.

## Verbindliche Regeln (Guardrails)
1. **Multi-Source Validation:**
   - Kein Mesh darf allein aus Bildpixeln geraten werden.
   - Jedes Objekt muss durch mindestens zwei Quellen bestätigt sein:
     * Quelle A: Jean Röpke Repo (`RDOMap` / `RDR2CollectorsMap` JSONs: Marker, Tier-Spawns, Fast-Travel, Shops).
     * Quelle B: Kartenkacheln (`detailed`-Layer) oder RPF/YMAP-Archetype-Kataloge.
2. **Semantische Zonierung statt Einheitsbrei:**
   - Wenn an Koordinaten Tier-Spawns (z. B. `sheep`, `pig`, `chicken`) hinterlegt sind, wird NIEMALS ein Wohnhaus (`Building`) gerendert, sondern Zäune (`FenceSystem`), Gatter und Unterstände.
   - Bahngleise (`RailTracks`) besitzen immer oberste Priorität im Raum. Bounding-Boxes von Gebäuden dürfen Gleissplines niemals schneiden.
3. **Koordinaten- & Achsensynchronisation:**
   - Leaflet/2D-Kartenkoordinaten müssen mathematisch konsistent ins Three.js-Koordinatensystem überführt werden.
