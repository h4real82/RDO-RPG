---
name: rdo-map-reconstruction
description: Use for RDO-RPG world geometry, map alignment, manifest placement, chunk streaming, or validation against the extracted Rockstar data and reference media.
---

# RDO ground-truth reconstruction

## Non-negotiable rules

1. `apps/client/src/world/data/rdo_world_manifest.json` is the single source of truth for runtime placement. Do not invent world geometry, roads, rails, landmarks, or buildings with procedural randomness or image-only estimates.
2. Use the verified CRS conversion for map-backed placement:

   ```text
   game_x = (lng - 111.29) / 0.01552
   game_y = (lat - (-63.6)) / 0.01552
   Three.js X = game_x, Y = elevation, Z = game_y
   ```

3. Keep these fixed height layers to prevent Z-fighting: terrain `Y = 0.000`; roads and rails `Y = 0.002`; boardwalks `Y = 0.0035`; buildings and foundations `Y = 0.005`.
4. Build roads and rails as continuous `THREE.BufferGeometry` quad strips from verified point arrays. Rails have collision and clearance priority.
5. Stream deterministic `250m × 250m` chunks through `WorldChunkManager` and dispose unloaded resources.
6. Roof overhangs are at most `0.5` units past the facade. Geometry that blocks the camera-to-player line must fade smoothly to `opacity: 0.15` with `depthWrite = false`.

## Validation sequence

1. Read the relevant manifest slice, raw placement data, and reference images.
2. Confirm orientation, elevation, rail clearance, and height-layer assignment.
3. Verify the result in the client without replacing source data by heuristics.
4. Run `npx pnpm -r build` after code changes and record the result in the local Obsidian vault.
