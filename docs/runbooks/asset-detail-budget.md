# Detail audit — 2026-10-08

User priority: retain visual quality and map fidelity while reducing token-heavy
investigation. Use one agent and bounded, measurable comparisons before broader work.

## Measured current state

The orthographic camera uses a 90-unit vertical span. At the reference viewport
of 1280 × 720 and DPR 1 this is 8 pixels/metre for screen-aligned dimensions.
Actual projected dimensions depend on orientation; higher resolution and future
zoom change the budget. A 5 cm feature spans at most 0.4 pixels at this scale.

Current manifest: 598 placements, 407 unique GLBs, 408 interior-tagged placements.
38 placements have names suggesting shadow/reflection/AMV helper geometry.
Names alone do not prove those objects can be removed. These counts describe
the manifest, not simultaneously visible draw calls.

| Source asset | Triangles in current highest-detail GLB |
| --- | ---: |
| val_03_saloon_ext | 73,355 |
| val_bank | 50,548 |
| val_hotel_ext | 30,670 |
| l_09__hd_0_0_-1 | 12,467 |
| l_09__hd_0_-3_1 | 11,153 |
| p_valhot_curtain_new | 460 |

Runtime `selectHighestDrawableLod` always selects the best available level;
there is no screen-size-based LOD selection yet.

The staged textured saloon GLB is 25,101,080 bytes. Of this, 13,817,600 bytes
are four FLOAT RGBA vertex channels, currently unused by its explicitly marked
diffuse-preview materials. Embedded PNGs occupy 2,527,793 bytes. Keeping source
shader masks in raw/intermediate files does not require shipping every mask in
each preview asset.

Diagnostic glTF Transform weld + simplify, ratio 0.35/error 0.001, yielded
72,903 triangles from 73,355 (0.62% reduction). It did not reach the requested
ratio. No simplified asset was promoted; no visual equivalence is claimed.
The simplifier's error is geometric, not a screen-pixel quality guarantee.

## Recommended sequence

1. Strip only attributes unused by the chosen runtime material; retain source
   data and an explicit material/attribute dependency record.
2. Load interiors according to entry/visibility; verify helper render-pass
   semantics before excluding those meshes.
3. Compare existing original LODs using projected size and maximum supported
   zoom. Protect silhouettes, roofs, signs, boardwalks and terrain boundaries.
4. Then evaluate geometry simplification with fixed-camera image comparisons.
   Do not assume a global 50–75% reduction is safe.
5. Deduplicate shared textures and set texture budgets from projected use.

The visible neutral surfaces and gaps also reflect missing materials/assets;
they are not evidence that polygon count alone causes the current poor image.
No frame-rate diagnosis has been made in this audit.

## Implemented preview optimization

`scripts/strip-preview-masks.mjs INPUT OUTPUT` removes COLOR attributes only
from converter-labelled diffuse/neutral preview materials. Authored materials
and accessors still used elsewhere remain intact. Output must be a separate
path under data/runtime. Full intermediate GLBs retain the source masks.

Measured saloon result: 25,101,080 -> 11,270,980 bytes (55.1% smaller).
All 73,355 triangle indices, non-color attributes and twelve embedded textures
were compared byte-for-byte and remained unchanged.

The optimized textured exteriors for saloon, bank, hotel and general store were
applied to the local runtime with `rdo-pipeline apply-material-preview`.
The command preserves the manifest, updates asset hashes, and keeps prior GLBs
in the ignored runtime asset-backups directory. The conversion batch continues
separately; this checkpoint does not claim complete materials or world coverage.

Reproduce each completed model with:

```powershell
node scripts/strip-preview-masks.mjs data/runtime/valentine/material-preview/val_03_saloon_ext.glb data/runtime/valentine/material-runtime/val_03_saloon_ext.glb
& tools/rdo_pipeline/.venv/Scripts/python.exe -m rdo_pipeline.cli apply-material-preview --asset-root data/runtime/valentine/material-runtime --runtime-root data/runtime/valentine/local-preview
```

When rebuilding the world, include the verified preview directory in the same
command. Otherwise the base inventory deliberately replaces generated models,
which can restore the old untextured GLBs:

```powershell
& tools/rdo_pipeline/.venv/Scripts/python.exe -m rdo_pipeline.cli build-valentine --asset-root D:/Projects/RDO-RPG/data/processed/models_glb --placements D:/Projects/RDO-RPG/data/valentine_placements.json --runtime-root data/runtime/valentine/local-preview --material-preview-root data/runtime/valentine/material-runtime --allow-incomplete
```

Re-add the source-backed terrain tiles afterwards as documented by the terrain
pipeline. `material-preview-report.json` records replaced assets and hashes;
`provenance.json` must contain the final textured asset hashes. A regression test
rebuilds twice and verifies that the texture preview survives both runs.
