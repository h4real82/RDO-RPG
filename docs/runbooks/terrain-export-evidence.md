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
No FXDB/FXC/HLSL/CSO shader exports currently exist under data/raw.
Source: https://github.com/Sollumz/Sollumz_RDR/blob/main/ydr/shader_materials_RDR.py

### Vertex channel investigation

The installed RedDeadBlend2 importer creates four FLOAT_COLOR/POINT attributes.
On all ten meshes, color_1 and color_2 contain varying data; color_0 and color_3
are uniformly zero. The bundled Blender 3.2 glTF exporter enumerates legacy
mesh.vertex_colors, which excludes these attributes. Copying to FLOAT_COLOR/CORNER
still yields zero legacy layers. An isolated BYTE_COLOR/CORNER copy allows export
of COLOR_0 through COLOR_3. This is diagnostic only: byte storage/color-space
conversion may alter numeric weights. Do not promote this copy to production
without a source-to-export numeric comparison and established shader semantics.
Measured BYTE_COLOR round-trip maximum absolute channel error is
0.00401240587234497. A process-local exporter probe can bypass that staging
conversion when reading the channels, but a strict float32 GLB accessor assertion
then failed: the bundled exporter still packs colors into a non-float component
type. This probe is not lossless-verified; Blender also returns exit code zero
on this Python assertion failure, so its console error must not be ignored.
Probe script/report/GLB are under ignored data/runtime/valentine/terrain-probe.

A subsequent process-local probe bypasses both the byte staging read and ushort
accessor packing, writing FLOAT/VEC4 colors directly. All 40 channel/mesh checks
pass exact float value-set equality and exact (axis-transformed position, color)
pair-set equality against the imported POINT attributes. This proves preservation
of imported color data for this model, not fidelity of the importer's binary
decoder or shader semantics. No installed addon or production converter was
modified. Run Blender probes with `--python-exit-code 1` so Python failures are
reported as process failures. The diagnostic is not yet a production solution.

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

Verify vertex channels against source, exact terrain shader semantics and texture
selection, browser rendering and reference alignment, then collision decoding.
The single tile is not complete Valentine ground coverage and is not a playable
slice acceptance result. Further source exports should follow evidence from this
test rather than guessed archive names.
