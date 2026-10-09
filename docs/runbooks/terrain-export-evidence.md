# Valentine terrain export checkpoint — 2026-10-08

Raw exports remain read-only under `D:/Projects/RDO-RPG/data/raw/terrain`.

Reproducible source-color report (no Blender required):

```powershell
& tools/rdo_pipeline/.venv/Scripts/python.exe -m rdo_pipeline.cli inspect-vertex-colors --drawable 'D:/Projects/RDO-RPG/data/raw/terrain/l_09/models/l_09__hd_0_0_0_ydr/l_09__hd_0_0_0.ydr.full' --runtime-root data/runtime/valentine/terrain-probe/source-colors
```

The report records source SHA256, LOD/model/geometry identity, vertex counts and
only present RGBA8_UNORM channels. Unsupported formats and malformed resource
pointers fail explicitly. Output is restricted to repository data/runtime.
Verified on the source test drawable: ten geometries. Pipeline suite: 51 tests.

## Verified inputs

- `jklm_07_10/metadata`: terrain YMAP placements and YTYP archetypes.
- `l_09/models/l_09__hd_0_0_0_ydr`: full/sys/gfx source export.
- `l_09/collision/0x7B3A341E_ybn`: full/sys export; collision geometry not yet decoded.
- `l_09/Metadata/_manifest_ymf.xml`: 12 HD texture bindings, empty txdRelationships.
- `gtxd_terraing1/metadata/_manifest_ymf.xml`: explicitly binds heartlands1_l09 to heartlands1_l09+hi; txdRelationships empty.
- PNG folders: l_09_base (123), l_09_hi (110), l_09_hd_0_0_0 (6), bkt_1 (29/28), bkt_2 (50/44), bkt_3 (6/6), heartlands1_l09 (20/19). Counts in parentheses distinguish base/HD when paired.

## Exact test model provenance

### Reference-target coverage check

Axis-aligned XY bounds from the exported YTYPs, translated/scaled by original
identity-rotation YMAP entities, identify these HD tiles at the current reference
camera target points (Three.js X/Z converted to game X/Y):

| Reference target | Original HD drawable |
| --- | --- |
| station | l_09__hd_0_-3_1 |
| main-street-s-curve | l_09__hd_0_0_-1 |
| hotel-bank | l_09__hd_0_-1_-2 |
| saloon | l_09__hd_0_0_-1 |
| livery-barn | l_09__hd_0_0_-2 |

The exported test tile l_09__hd_0_0_0 does not cover these target points.
These are point-in-archetype-AABB matches, not triangle ground intersections or
coverage of entire camera frustums. Additional adjoining tiles may be needed.
l_09_heighttracks_decals01 overlaps the street/hotel target bounds as an
ORPHANHD entity; it must not be confused with an HD ground tile.

JOAAT `l_09__hd_0_0_0` = `0x7f5c1633`.
Archetype occurs in `jklm_7_10_lod_combine_metadata_005_strm_ytyp.xml`.
Texture dictionary `0xd656f662` resolves to `l_09__bkt_3` in the local OpenIV strings database.
YMAP `l_09__strm_0_ymap.xml` places it at game coordinates
(-224.0015, 799.9993, 124.5201), identity quaternion, unit scale,
HD level, parentIndex 62, lodDist 150.
Archetype local bounds approximately (-32.00293,-32.01196,-8.24098)
to (32.00293,32.01196,8.240982).

Material decoder reads 10 geometry bindings and 10 shaders.
All 61 distinct non-null named texture references now have a PNG counterpart
across raw inputs; this proves name coverage only, not correct resolution selection,
color space, channel interpretation, UV mapping or original shader blending.
The newly exported heartlands1_l09 packages closed the 19 remaining names.

## Geometry-only probe

Existing read-only Blender conversion command successfully exported the test
drawable to `data/runtime/valentine/terrain-probe/geometry/l_09__hd_0_0_0.glb`.
This probe deliberately does not bind the diffuse-only material fallback:
terrain requires multilayer semantics, not an arbitrary single texture.
No production manifest or source asset was changed by this probe.

## Remaining gates

### Collision header inspection

The first exported collision source has SHA256
`C1EB7CA3DF58C896E1D791DBD4B7CC800629BCCF9C240107C0ACC3D373747CFB`.
Reading the RDR3 phBound header with Cfx's RDR3 layout gives type byte 6
(Composite), AABB min approximately (-249.20914,511.99396,97.3062) and max
(0.006000519,704.7611,154.83084). This is a header inspection only; child bounds,
transforms, triangle vertices and material/collision flags remain unparsed.
These extents do not contain the main street reference target XY
(-306.4235,771.1453). This one exported source is therefore not evidence of
collision coverage for the main street. Do not substitute its AABB as ground.
Reference: https://github.com/citizenfx/fivem/blob/master/code/components/rage-formats-x/include/phBound.h

### Terrain shader identities

JOAAT verification against upstream librdr3 shadernames.hpp identifies all four
shader types used by the test drawable:

| Hash | Name |
| --- | --- |
| 0x770b903e | terrain_uber_4lyr_pxm_hbb |
| 0xa592dae9 | terrain_uber_4lyr_spx_dm_hbb_1111 |
| 0xa91fc138 | terrain_uber_4lyr_spx_dm_hbb |
| 0xa9b256d3 | terrain_uber_4lyr_mud_dm_hbb |

Recomputed parameter hashes identify DiffuseTexture_layer0..3,
BumpTexture_layer0..3, MaterialMapATexture_layer0..3, lookupTexture,
tintTexture and tintBumpTexture. Constants include lookupUVSet, uvSet,
clampLookupTexture, blendSoftness, HBBRangeScale1234/ HBBRangeBias1234,
PxmScales1234/PxmBiases1234 and per-layer detail settings.
The first shader has lookupUVSet=1 and uvSet=(1,1,1,1); other variants use
lookupUVSet=3 and some layer uvSet values of 2. These values do not yet prove
whether selection is one-based or how masks/heights/colors combine. Do not
replace the four-layer shader with a single diffuse map or guessed RGBA weights.

### UV channel mismatch in the browser preview — 2026-10-09

The converted `l_09__hd_0_-2_0.glb` preserves three UV attributes per mesh.
For mesh 0, the decoded GLB ranges are `TEXCOORD_0` U 0.573–0.620 / V
0.627–0.708, `TEXCOORD_1` U -163.54–67.71 / V -244.89–0.51, and
`TEXCOORD_2` U -0.660–-0.420 / V 1.460–1.881. These values came from
reading the GLB accessors and buffer views, not from judging a screenshot.
The matching first source shader has `lookupUVSet=1` and
`uvSet=(1,1,1,1)`; other material variants in the same source drawable use
`lookupUVSet=3` and one has `uvSet=(1,1,2,1)`. These constants were decoded
directly from its OpenIV `.ydr.full` by `decode_drawable_materials`.

The current browser four-layer preview samples lookup and all four diffuse
textures with `TEXCOORD_0`, ignoring these per-material UV-set constants.
The large, blurry texture forms in the browser are therefore **not evidence
that the source texture resolution is insufficient**. The original indexing
convention and texture-coordinate transforms remain unverified; changing to
`TEXCOORD_1` or `_2` without that proof could create a different false render.
Next visual gate: decode/verify the UV-set mapping against original shader
program inputs or another authoritative material implementation, propagate
the verified indices through material metadata, then compare screenshots.
Some texture parameters have null resource references (e.g. DetailTexArrayN);
61/61 named-reference coverage does not prove availability of global shader
resources or complete material fidelity.
References:
https://github.com/Sage-of-Mirrors/librdr3/blob/master/include/drawable/shadernames.hpp
https://github.com/Sage-of-Mirrors/librdr3/blob/master/include/drawable/shaderparamnames.hpp

### External RDR material reference (not original game shader proof)

Sollumz/Sollumz_RDR `ydr/shader_materials_RDR.py`, function
`RDR_create_terrain_shader`, contains an explicit four-layer Blender preview.
For non-mask-only terrain it mixes lookup RGB with vertex `Color 1` RGB using
that vertex color's alpha, then mixes diffuse 0/1 using inverse red,
diffuse 2/3 using green and the two results using blue. Normals use the same
mix chain. Lookup is connected to UV map 0. This is a concrete reference, not
proof of the original engine's complete material equation: the inspected terrain
function does not implement the exported HBBRange, blendSoftness, Pxm or
lookupUVSet selection; our test model's lookupUVSet values differ by variant.
Do not label that preview algorithm an original-faithful RDR shader port.
Source: https://github.com/Sollumz/Sollumz_RDR/blob/main/ydr/shader_materials_RDR.py

### Exported original shader database

OpenIV export `data/raw/shaders/sga_win32_60_final.fxdb` is an SGD1 database.
The local RDR2 install provides `oo2core_5_win64.dll`, which successfully
decompresses its wrapped payloads. The bounded scanner recognizes 11,598 named
program records, including 11,043 Oodle-compressed records. The reproducible
CLI exports and validates DXBC blobs with a source SHA256 and per-blob SHA256:

```powershell
& tools/rdo_pipeline/.venv/Scripts/python.exe -m rdo_pipeline.cli inspect-shader-database --database 'D:/Projects/RDO-RPG/data/raw/shaders/sga_win32_60_final.fxdb' --runtime-root data/runtime/valentine/terrain-probe/shaders --oodle-dll 'C:/Program Files/Rockstar Games/Red Dead Redemption 2/oo2core_5_win64.dll' --name-filter Terrain
```

The current name-filter exports 88 programs. Microsoft D3DDisassemble accepts
the extracted DXBC. The `terrain_uber_4lyr` family record has hash `0x2dd3` and
explicitly indexes five vertex and thirteen pixel program entries. Its vertex
indices resolve to named programs including `VS_TransformLit_Wrapped`; the
first pixel index resolves to `PS_PedTextured_Eight_Wrapped`. This directly
links the family record to program lists, but does not identify the exact active
pass or full material equation. Treat the extracted code as original bytecode
evidence, not a proven shader reconstruction. Oodle remains an external local
dependency and is not copied into the repo.

### Vertex channel investigation

The installed RedDeadBlend2 importer creates four FLOAT_COLOR/POINT attributes.
For the four exported terrain tiles, only channels 1 and 2 exist in the source;
channels 0 and 3 are zero placeholders. The production fallback converter now
checks every imported mesh identity, vertex count and RGBA value against the
source YDR before export. It temporarily exposes corner attributes to Blender
3.2's exporter and writes the verified values as FLOAT/VEC4 accessors; the
exporter patch is restored after each export. This preserves imported channel
values, but is not proof of the importer's decoder or original shader semantics.
The runtime disables vertex-color multiplication for neutral geometry preview
until the game blend is validated. Historical BYTE_COLOR/ushort results remain
diagnostic only and are superseded by the exact source-to-float32 comparison.

Direct binary check subsequently passed for every imported vertex in all ten
meshes: format attributes 25 and 26 are RGBA8_UNORM (type 28, size 4), attributes
24 and 27 are absent (size/type zero). Reading the resource vertex-buffer offset
arrays independently and converting each source byte to float32 byte/255 matches
the imported POINT values exactly. The absent attributes are importer-created
zero placeholders, not original color channels. The GLB probe preserves the two
real channels but still includes those placeholders; production should preserve
source presence metadata rather than silently treat all four as source data.
Layout references: librdr3 src/drawable/vertexdata.cpp, loddata.cpp and
include/drawable/vertexdata.hpp (upstream master inspected 2026-10-08).

Verify exact terrain shader semantics and texture selection, browser rendering
and reference alignment, then collision decoding. The four HD drawable exports
cover the reference targets, though point bounds are not full-frustum coverage.
Their matching HD YMAP transforms are read from
`data/raw/terrain/jklm_07_10/metadata/l_09__strm_0_ymap.xml`. The user-exported
`.ydr.full` and `.ydr.sys` files were found in nested
`data/raw/models/<drawable>_ydr/<drawable>_ydr/` folders; no separate `.gfx` was
needed. The converter now discovers this nested layout while keeping source
exports read-only.

## Current browser verification

On 2026-10-08, `pnpm test:e2e` passed the client boot, movement, orthographic
camera, POI fallback and render-loop smoke checks. The reference render command
captured all five fixed camera poses after adding the four terrain placements.
The local preview manifest now contains 598 placements; terrain is excluded
from spawn selection, player collision and camera occlusion. Visual inspection of
`data/runtime/valentine/test-artifacts/reference-renders/main-street-s-curve.png`
shows that ground geometry is now present, but it renders as neutral tan
surfaces without the original terrain material; the HUD still reports 1,581
missing models. These checks prove the client runs and controls respond, not
that the world slice is visually complete or ready for playtesting. Next gates
are exact terrain shader/texture binding and reducing critical missing models
for the reference views.
