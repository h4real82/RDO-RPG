---
name: rdo-map-reconstruction
description: Ground truth reconstruction & asset validation rules for the Red Dead Online world geometry and map alignment.
---

# Skill: RDO Ground Truth Reconstruction & Manifest Governance

## Unumstößliche Grundgesetze (Core Logic)

1. **PROZEDURALE SANDBOX IST UNTERSAGT:**
   - Welt-Geometrie, Straßen, Schienen und Gebäude dürfen niemals mathematisch erraten oder prozedural ausgewürfelt werden.
   - Kein Mesh, kein Straßenpfad und kein Schienenstrang entsteht aus heuristischem Noise oder isolierten Bildschätzungen ohne deterministische Manifest-Verankerung.

2. **MANIFEST-GESTEUERTES DESIGN:**
   - Alle Platzierungen erfolgen ausschließlich über statische, tabellarische Einträge in der `apps/client/src/world/data/rdo_world_manifest.json`.
   - Die Manifestdatei bildet die einzige autoritative Quelle der Wahrheit für alle Zonen, Gebäude, Straßen und Gleise im Client.

3. **CRS-KOORDINATEN-ZWANG:**
   - Jede Position MUSS strikt über die Ground-Truth-Formeln aus den Leaflet/Raw-Koordinaten berechnet werden:
     ```text
     game_x = (lng - 111.29) / 0.01552
     game_y = (lat - (-63.6)) / 0.01552
     ```
   - Three.js-Achsenzuordnung:
     - `X = game_x`
     - `Y = elevation` (berechnet via IDW-Mittelung [Inverse Distance Weighting] aus den 5 nächstgelegenen Referenzmesspunkten)
     - `Z = game_y`

4. **GEOMETRISCHE AUSRICHTUNG & INFRASTRUKTUR:**
   - Gebäude nutzen für `rot_y` zwingend den realen `orientation_rad`-Wert aus den Rohdaten bzw. dem Manifest.
   - Straßen und Gleise werden ausnahmslos als zusammenhängende Quad-Strips entlang fester Punkt-Arrays (`points`) gespannt.
   - Bahngleise (`RailTracks`) besitzen immer Vorrang; keine Gebäude-Bounding-Box darf Schienen-Splines schneiden.
