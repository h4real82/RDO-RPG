# Valentine route coverage audit — 2026-10-09

This is a source-data audit, not a playable-route acceptance. Coordinates below
are Three.js X/Z from the local manifest, derived from exported RDR YMAPs.

| Landmark | Source model | X | Z | Current limitation |
| --- | --- | ---: | ---: | --- |
| Station | `val_trainstn_int_em_hd` | -180.84 | 626.55 | Surrounding terrain is incomplete |
| Sheriff | `val_shrffhs` | -259.02 | 741.37 | Only one nearby POI is defined |
| Saloon near Sheriff | `val_saloon2` | -242.49 | 769.55 | Not yet route-tested |
| Other saloon | `val_03_saloon_ext` | -309.17 | 807.59 | Distinct building, not a duplicate position |
| Church area | `val_vfx_rain_church_ext` | -226.13 | 805.14 | This is an effect, not proof of a church model; a nearby `val_05__em001_slod` is only a coarse LOD |

The original `l_09__strm_0_ymap.xml` places the following HD ground tiles
between the station tile at (-160, 608) and the village tile at (-288, 736):

| Source drawable | YMAP X/Z center | Raw `.ydr.full` | Runtime GLB |
| --- | --- | --- | --- |
| `l_09__hd_0_-2_1` | -160, 672 | exported | converted and placed |
| `l_09__hd_0_-2_0` | -224, 672 | exported | converted and placed |
| `l_09__hd_0_-1_0` | -224, 736 | exported | converted and placed |

Imported locally on 2026-10-09: all three source `.ydr.full` files were
converted with exact vertex-color preservation and source YMAP positions. The
preview manifest then had 603 placements, including nine HD terrain tiles.
`validate-valentine`, the workspace build, and the browser smoke test pass.
Headless screenshots at all three tile centers show loaded ground geometry and
the player being grounded by the new meshes without browser errors. This is
tile-level evidence only; it does not prove a continuous walk between them.
These checks do **not** establish a continuous playable route. The conversion
bound 0 single-diffuse textures across these three models (33 shaders total);
the separate four-layer preview now covers 32 materials. Final UV scaling and
terrain material fidelity remain open visual issues. The raw and
local-preview data are intentionally Git-ignored and remain local.

## Browser ground probe — station approach

On 2026-10-09 the browser was teleported to sampled points of the exported
`valentine:road:0062` trace. Initially the loaded terrain raycast found **no
ground** at (-238.7, 600.4), (-219.5, 621.8), or (-208.1, 634.3). The source
`l_09__strm_0_ymap.xml` places `l_09__hd_0_-3_0` at about (-224, 608). Its
already-exported `.ydr.full` was located under the user's raw model directory,
converted with 44 exact source vertex-color channels on 11 meshes, and added
at the source YMAP transform. The local preview now has **ten** HD terrain tiles
and **604** total placements. After import, all ten sampled points from
(-180.8, 626.5) via (-219.5, 621.8) to (-238.7, 600.4) had terrain heights
in the browser; there were no page errors. This confirms sampled ground
coverage, **not** a continuous walk free of collision or the full circuit.
Movement now stops at absent terrain instead of continuing at the previous
valid elevation; other walkable surfaces will need explicit source-grounded
treatment later.

## Keyboard route probe

A headless Chromium playtest used real WASD input to follow consecutive source
points of `valentine:road:0062`. From point 12 at (-200.4, 646.7), every
checkpoint through point 20 at (-247.7, 747.9) was reached without a stall.
A second run reached points 21–35 through approximately (-271.5, 831.9),
then stopped before point 36 (-272.1, 838.3) at (-272.4, 831.9). There were
no page errors. Screenshots are in the local, Git-ignored `test-artifacts`
directory (`station-walk-probe.png`, `town-walk-probe.png`). The latter shows
obvious missing ground/visual context and a large dark foreground obstruction;
this is not a visual acceptance. The block is consistent with the absent HD
terrain north of the current tiles, but should be rechecked after import.

The same source YMAP places `l_09__hd_0_1_-1` at (-288, 864), covering the
next road segment. Its raw drawable is not in the local model export directory;
an exact OpenIV export has been requested. No substitute terrain or road was
fabricated. This test establishes one successful street segment, not the
user-requested full station–church–saloon–station loop.

The route check is repeatable with `npx pnpm test:route 12 20`; it boots an
isolated local browser preview, reads the exported road trace, moves with
WASD, and writes a screenshot plus the last reached source index. To check the
currently missing northern segment, use `npx pnpm test:route 20 36` after
the next OpenIV import. The test fails on a stall or browser exception.

The terrain PNGs are under `data/raw/terrain/l_09/textures`, not the general
`data/raw/textures` folder. Terrain materials are resolved by the exact
`lookuptexture` and `diffusetexture_layer0..3` parameter hashes. OpenIV's
sanitized `l_09_hi` folder is treated as the exported `l_09_+hi` package, while
arbitrary duplicate names remain rejected. The browser preview now blends the
four source diffuse layers using lookup/vertex controls derived from the
Sollumz_RDR reference implementation. It is explicitly a preview, not proof of
Rockstar's complete shader equation or final UV/detail scaling. Across the
three new tiles, 32 of 33 materials resolve completely; the remaining two-layer
variant stays neutral rather than receiving invented layers.

These are the minimum *candidate* exports for the direct station-to-Sheriff
corridor, not proof of exact road alignment or complete camera coverage. They
were exported from the OpenIV **main archive view** using **Save content/Export**;
Extract from search results would only copy encrypted resources. Test an actual
continuous walk before considering the corridor done. Paths, rails, vegetation and the
return leg remain unverified; do not synthesize them from this tile grid.

The user-described “circus tent” is not identified by these names. Map-facing
landmark order must be verified against `Media/Valentine MAP.jpg` and source
YMAPs before changing building placement.

## Preview spawn correction

The old preview spawned at the first non-terrain manifest placement: a hotel
interior proxy. The `main-street-s-curve` camera target (-306.4235, 771.1453)
is also **not** a walkable road point: it coincides with the bank shell and
reflection proxy at approximately (-306.43, 771.19). Browser collision probes
confirmed both source meshes at that point; the bank shell must remain solid.

The preview now starts at source road trace `valentine:road:0059`, point 18,
(-310.1441, 788.7001), recorded in `apps/client/src/game/data/preview-spawn.json`.
The terrain mesh supplies its height after chunk load. Browser checks found
movement in all four cardinal directions at this point and the first-frame
screenshot shows the marker between buildings. This validates a local starting
point only, **not** the full station-to-town route. The bank reflection helper
is omitted from rendering/collision, but the physical bank shell remains.

## Three-tile import after OpenIV export

Run from the Codex worktree root only after all three `.ydr.full` files exist.
The preflight reads raw exports without changing them; Blender never overwrites
an existing GLB. The manifest writer deduplicates the six existing tiles.

```powershell
$rawModelRoot = 'D:/Projects/RDO-RPG/data/raw/terrain/l_09/models'
$ymap = 'D:/Projects/RDO-RPG/data/raw/terrain/jklm_07_10/metadata/l_09__strm_0_ymap.xml'
$runtime = 'data/runtime/valentine/local-preview'
$models = @('l_09__hd_0_-2_1', 'l_09__hd_0_-2_0', 'l_09__hd_0_-1_0')
foreach ($model in $models) {
  $exports = @(Get-ChildItem -LiteralPath $rawModelRoot -Recurse -File -Filter "$model.ydr.full")
  if ($exports.Count -ne 1) { throw "Expected one .ydr.full for $model, found $($exports.Count)" }
}
& 'D:/Projects/RDO-RPG/apps/tools/Blender/blender-3.2.2-windows-x64/blender.exe' `
  --background --python tools/convert_models_blender.py -- `
  --input-dir $rawModelRoot --output-dir "$runtime/rebuild-four-layer" `
  --texture-root 'D:/Projects/RDO-RPG/data/raw/terrain/l_09/textures' `
  --terrain-texture-output-dir "$runtime/textures/terrain" `
  --only $models[0] --only $models[1] --only $models[2]
if ($LASTEXITCODE -ne 0) { throw 'Blender terrain conversion failed' }
foreach ($model in $models) {
  $generated = "$runtime/rebuild-four-layer/$model.glb"
  if (-not (Test-Path -LiteralPath $generated)) { throw "Missing converted GLB: $model" }
  Copy-Item -LiteralPath $generated -Destination "$runtime/models/valentine/$model.glb" -Force
}
$env:PYTHONPATH = (Resolve-Path 'tools/rdo_pipeline/src').Path
& tools/rdo_pipeline/.venv/Scripts/python.exe -m rdo_pipeline.cli add-terrain-tiles `
  --asset-root "$runtime/models/valentine" --runtime-root $runtime --ymap $ymap `
  --model $models[0] --model $models[1] --model $models[2]
if ($LASTEXITCODE -ne 0) { throw 'Terrain manifest integration failed' }
& tools/rdo_pipeline/.venv/Scripts/python.exe -m rdo_pipeline.cli validate-valentine --runtime-root $runtime
if ($LASTEXITCODE -ne 0) { throw 'Terrain runtime validation failed' }
npx pnpm -r build
node scripts/e2e-check.mjs
```

The import is not an acceptance test. Confirm the source hashes, rendered
terrain, continuous station-to-town walk, and absence of new collision or
material regressions before calling the route playable.
