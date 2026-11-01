# ADR-0005: Tripo3D Asset-Decimation Pipeline, Friedhofs-Monument & Animal-/NPC-Ingestion

## Status
Angenommen & Implementiert (Ticket H4R-128 & H4R-127 Folgeschritte)

## Kontext
1. Der Benutzer hat hochauflösende 3D-Assets aus Tripo3D bereitgestellt:
   - Friedhofs-Statue (`Buddah_Statue.glb`, 66.9 MB, 821.982 Dreiecke, untexturiert).
   - Wild- und Haustiere (`Male elk`, `wolf`, `horse`, `doberman dog`, `fluffy dog`, `domestic cat`, `hedgehog` mit jeweils 40MB–78MB und bis zu 1.9 Millionen Polygonen).
   - Town-NPCs und Charaktere (`fantasy gunslinger`, `thai waitress`, `female archer`, `tribal shaman`, `steampunk masked figure` mit jeweils 50MB–68MB).
2. Diese enormen Polygon- und Texturdaten würden den WebGL-Frame-Budget (60 FPS) und Ladezeiten im Browser massiv überlasten, wenn sie roh importiert würden.
3. Die Friedhofs-Statue soll zentral zwischen den Grabsteinen des Valentine-Friedhofs platziert werden, etwas größer sein als die Grabsteine (~1.85m–2.0m) und in Richtung des Saints Hotel blicken.
4. Tripo Web Studio Automatisierung über Chrome DevTools erfordert eine Erklärung bezüglich Browser-Port `--remote-debugging-port=9222`.

## Architekturentscheidung

### 1. Meshopt Sloppy & Sharp Texture Optimization Pipeline
- **Script**: `scripts/ingest-tripo-assets.mjs` und `scripts/prepare-cemetery-statue.mjs`.
- **Texturen**: Automatisches Herunterskalieren großer 4K/8K Texturen auf 2048x2048 bzw. 1024x1024 JPEG (Qualität 85) mittels `sharp`.
- **Topologie & Dezimierung**:
  - `prune`, `dedup`, `weld` und `resample`.
  - `MeshoptSimplifier.simplifySloppy` reduziert dichte 1.9M Meshes gezielt auf das 40k–48k Triangles WebGL-Budget bei Erhaltung markanter Silhouetten und minimalem geometrischen Fehler (< 0.01).
  - `compactPrimitive` und anschließendes `prune` entfernen unreferenzierte Vertex-Puffer.
- **Ergebnisse**:
  - `Buddah_Statue.glb`: Von 66.9 MB (821.982 Tris) auf **1.16 MB (41.262 Tris)** reduziert.
  - `Male elk.glb`: Von 57.6 MB (1.896.131 Tris) auf **1.61 MB (43.010 Tris)**.
  - `horse.glb`: Von 36.2 MB (982.259 Tris) auf **2.48 MB (43.554 Tris)**.
  - `doberman-dog.glb`: Von 76.9 MB (1.965.748 Tris) auf **2.08 MB (38.977 Tris)**.
  - `fantasy gunslinger.glb`: Von 56.8 MB (1.877.954 Tris) auf **1.98 MB (46.063 Tris)**.
  - `thai waitress.glb`: Von 67.6 MB (1.913.464 Tris) auf **1.83 MB (47.085 Tris)**.
  - `female archer.glb`: Von 61.7 MB (1.992.128 Tris) auf **2.85 MB (46.500 Tris)**.

### 2. Cylindrical UV Generation & PBR Albedo Texturierung
- Da rohe Scan-Modelle oft keine Textur-Koordinaten besitzen (`TEXCOORD_0` fehlt), generiert `prepare-cemetery-statue.mjs` prozedurale zylindrische UVs:
  $$u = \frac{\text{atan2}(x, z)}{2\pi} + 0.5, \quad v = y \cdot 2.0$$
- Einbindung einer verwitterten Albedo-Textur (`hea_dirt_stones_je_02_abte.png`) mit PBR-Parametern (`roughness: 0.88`, `metalness: 0.04`).

### 3. Friedhofs-Platzierung & Ausrichtung
- **Koordinaten Verified Scene**: `x: -224.0, y: 123.5, z: -808.0` in `data/reference/valentine/map-completion.json`.
- **Koordinaten ValentineCity 3D**: `statueGroup` im Friedhofszentrum bei `x: 0.0, y: 0.22, z: 0.9` zwischen den Grabsteinreihen.
- **Blickrichtung Saints Hotel**:
  - Hotel liegt südwestlich bei `x: -326.5, z: -765.2`.
  - Berechneter Yaw-Winkel: $\text{atan2}(\Delta x, \Delta z) = \text{atan2}(-102.5, +42.8) \approx -1.175$ rad bzw. $-0.75$ rad in Stadtkoordinaten.
- **Zweistufiger Sockel**:
  - Unterer Plinth: 1.2m x 0.24m x 1.2m Sandstein.
  - Oberer Plinth: 0.9m x 0.20m x 0.9m Sandstein mit bronzener Gedenktafel.
  - Gesamthöhe ~1.85m–2.0m (etwas größer als die ~0.9m–1.1m Grabsteine).

### 4. Tripo Web Studio DevTools Automatisierung
- Standard-Browser-Instanzen isolieren Tabs aus Sicherheitsgründen. Um Chrome über Chrome DevTools MCP vollautomatisch steuern zu lassen, wird Chrome mit folgendem Startparameter gestartet:
  `chrome.exe --remote-debugging-port=9222`
- Damit kann der Agent die geöffnete Tripo-Sitzung direkt fernsteuern, Prompts absetzen und Resultate herunterladen.

## Konsequenzen
- Gewaltige Performance-Verbesserung: Speicher- und Mesh-Reduktion um über 90%.
- Friedhof verfügt nun über ein markantes Zentrum mit historisch-atmosphärischem Monument.
- Alle 121 Testdateien (628 Tests) und `npx pnpm -r build` kompilieren mit Exit Code 0.
