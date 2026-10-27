# Valentine local source expansion audit - 2026-10-19

Scope: H4R-27 / H4R-28; read-only original-source investigation. Current source promotion and runtime code remain owned by the coordinating task. No new OpenIV delivery is required for the 18-model shortlist.

## Confirmed cause and inventory

The active verified-scene manifest has 150 placements / 146 distinct models, including 25 terrain tiles. Its source audit enumerates only 160 model names. Assembly iterates that explicit model list, then admits only HD/ORPHANHD roots with actual .ydr.full resources and a staged GLB. Models present on disk but absent from the audit do not render. The broad inherited missing-model list is unresolved reference inventory, not a count of missing buildings.

Fresh audit of every local .ydr.full: 553 unique models; 261 source-placement-found, 219 local-member-only, 58 archetype-only, 15 source-link-missing. No ambiguous archetype was found. Many resources are interior members, LOD shells, effects, audio/light helpers or optional world-state variants; importing all 553 would be incorrect.

Existing assembler exclusions must remain: coarse LOD, inactive lockdown, reflection/shadow/VFX helpers, exact verified audio/light volumes and unknown optional activation. In particular, do not enable both magic-lantern curtain states or open emergency gates merely because they have HD roots.

## Original resources and provenance

`D:/Projects/RDO-RPG/data/raw/models/<model>_ydr/<model>.ydr.full` is the local unpacked OpenIV resource input. Companion `.sys` and `.gfx` remain untouched. Selected names also have compressed RSC8 resources under `data/raw/01-valentine-exteriors/val_01_.rpf/` or `val_05_.rpf/`. These are distinct export encodings; filename agreement is not a byte-equivalence claim. `D:/Projects/RDO-RPG/data/processed/models_glb/` contains generated derivatives and does not establish additional original provenance. The complete original nested game archive path is not established by a local `.rpf` folder alone: [FLAG: Data Missing].

The fresh audit records each metadata input and .ydr.full SHA-256, YMAP path/entity index, YTYP binding, original game-space position/quaternion/scale and LOD. Preserve those values. The coordinate conversion remains Three X=gameX, Y=elevation, Z=-gameY; reuse `_root_placement` / `_rotation_xyz` in the pipeline.

## Ready local batch

All listed names have actual local full resources and original HD/ORPHANHD root placement; no guessed model names or transforms. Material counts below refer to exact DiffuseTex resolution against the correct `raw/textures` root. They do not establish complete original shaders.

| Model | Source YMAP / index | Game position x,y,z | Exact diffuse bindings |
|---|---|---|---|
| val_01_aucbarns_barn2_dec_det | placement-recovery/levels_1/0x5B8D0DA4_ymap.xml / 146 | [-257.0598, 634.8114, 116.4484] | 3/3 |
| val_01_aucbarns_barn3_dec_det | placement-recovery/levels_1/0xC51CE0C2_ymap.xml / 195 | [-221.4827, 673.5181, 116.4484] | 4/4 |
| val_01_aucyard_p_barn_dec | placement-recovery/levels_1/0xC51CE0C2_ymap.xml / 59 | [-273.4284, 690.1792, 117.8085] | 4/4 |
| val_01_aucyard_shed_dcl | placement-recovery/levels_1/0x5B8D0DA4_ymap.xml / 148 | [-251.6151, 650.902, 114.3605] | 1/1 |
| val_01_aucyard_stable2_dcl | placement-recovery/levels_1/0x5B8D0DA4_ymap.xml / 144 | [-276.2809, 655.8752, 115.5556] | 5/5 |
| val_01_aucyard_stables_det | placement-recovery/levels_1/0xC51CE0C2_ymap.xml / 56 | [-248.8353, 693.7951, 116.1527] | 2/2 |
| val_01_shippingstand | placement-recovery/levels_1/0x5B8D0DA4_ymap.xml / 24 | [-178.1698, 647.2196, 113.8712] | 7/7 |
| val_01_trainstation_decal | placement-recovery/levels_1/0x5B8D0DA4_ymap.xml / 20 | [-179.8829, 633.7431, 114.9223] | 3/3 |
| val_05_pigpen_a | placement-recovery/levels_1/0x00344613_ymap.xml / 44 | [-293.6426, 842.509, 120.7691] | 3/6 |
| val_05_res_a | placement-recovery/levels_1/0x00344613_ymap.xml / 50 | [-288.9156, 870.5844, 124.6053] | 11/15 |
| val_05_res_a_dcl | placement-recovery/levels_1/0x00344613_ymap.xml / 49 | [-288.6588, 869.0622, 124.3874] | 2/2 |
| val_05_res_c | placement-recovery/levels_1/0x00344613_ymap.xml / 46 | [-259.3584, 845.5386, 124.2778] | 10/12 |
| val_05_res_c_dcl | placement-recovery/levels_1/0x00344613_ymap.xml / 45 | [-259.7002, 845.9883, 124.384] | 2/2 |
| val_06_auction_int | placement-recovery/levels_1/0x9346BF5F_ymap.xml / 2 | [-378.389, 916.8793, 117.5105] | 8/10 |
| val_06_auction_int_dc | placement-recovery/levels_1/0x9346BF5F_ymap.xml / 3 | [-378.3775, 916.8718, 117.511] | 7/8 |
| val_cattle_rmp_mud | placement-recovery/levels_1/0x5B8D0DA4_ymap.xml / 23 | [-197.6274, 605.0408, 115.0366] | 1/1 |
| val_fence_non_prop_01 | placement-recovery/levels_1/0x5B8D0DA4_ymap.xml / 86 | [-203.2152, 612.6515, 112.2576] | 1/1 |
| val_filler_fences | placement-recovery/levels_1/0x5B8D0DA4_ymap.xml / 241 | [-232.6777, 636.5826, 113.2242] | 1/1 |

Missing original diffuse references remain: `p_blanket08x_abal` in val_05_res_a; `val_wood_cs_beampainted07_ab` and `nbx_wood_beambare02b_ab` in val_06_auction_int; `rhodes_bank_decal_corner_trim_ab` in val_06_auction_int_dc. These are decoded texture reference names, not verified OpenIV filenames/archive paths. No fabricated export request follows. Unsupported diffuse slots require proper shader interpretation; they are not evidence of missing model geometry.

Initial high-value conversion command, from the restart root:

```powershell
& 'D:/Projects/RDO-RPG/apps/tools/Blender/blender-3.2.2-windows-x64/blender.exe' `
  --background --python-exit-code 1 --python tools/convert_models_blender.py -- `
  --input-dir 'D:/Projects/RDO-RPG/data/raw/models' `
  --output-dir data/runtime/valentine/area-expansion-2026-10-19/converted `
  --texture-root 'D:/Projects/RDO-RPG/data/raw/textures' `
  --only val_05_res_a --only val_05_res_c --only val_05_pigpen_a `
  --only val_01_shippingstand --only val_fence_non_prop_01 --only val_filler_fences
```

The full shortlist can be converted by appending `--only` for its model names. Existing outputs are deliberately not overwritten: use a fresh output directory for changed converter behavior. `--texture-root raw` incorrectly discovers duplicate names in unrelated export roots and introduces ambiguity. `raw/textures` resolves all 7 shippingstand slots and both fence slots.

Use `assembly-source-audit.json` (178 models) for the current160 UNION the18 additions. The 553-model audit is investigation evidence, not an approved world-state selection. The assembler does not have an arbitrary generated-model root argument: stage converted GLBs through the existing material overlay argument (which `_asset_path` checks by model name), preserve existing refined previews, then assemble to a new output directory before promotion. Do not silently discard the current issue-material-refined overrides.

## Terrain, road and rail findings

All 25 locally exported HD terrain meshes are already in verified-scene. The only additional terrain-named full resource is `l_09_02_decal_01`, a source ORPHANHD decal at game[-446.1169,749.4944,111.6074], entity21 in terrain/jklm_07_10/metadata/l_09__strm_0_ymap.xml. It does not fill ground coverage. No further existing local terrain tile can close the remaining holes. Use explicitly authored-gameplay terrain if extending without a new export; retain current original assets/provenance.

`ground-truth-traces.json` has37 road features and2 rail features. Existing extraction retains the WHOLE original LineString when any point intersects the broad scene bounds; it does not clip it. The rail trace0000 alone contains275 world-spanning points and none intersects the actual confirmed playable polygon. Rendering entire traces would create a large incorrect outside network.

`clipped-source-traces.json` intersects original linear source segments with the actual playable-boundary polygon:22 road portions and1 rail portion. It preserves sourceTrace, source segment index, fraction endpoints, source file/feature index and hashes. No smoothing or manually invented control points. The rail portion is trace0002 segments81-88, 180.460m,9 points. Its width, gauge/render profile, terrain elevation and authored approach remain gameplay choices because the GeoJSON contains only a centerline. Boundary registration uncertainty is preserved (8.286m).

Rail X/Z points: [-130.369448,-665.723388], [-140.5042,-659.3307], [-164.1631,-627.6176], [-178.2579,-608.489], [-189.8357,-593.3876], [-197.3864,-577.2793], [-200.4067,-555.1305], [-197.3864,-535.4986], [-179.368661,-516.594711].

Original road decals val_03_road_d_* already render as `roadsAndRails`, with source GBuffer0/albedo opacity0; their suppressed color is deliberate source shader behavior, not proof of absent roads. Readable authored road surface ribbons can follow the clipped centerlines with support sampling and clear authored labels.

## Environmental props

The553 actual local drawable names contain no standalone lamp, pole, barrel, tree, bush or grass models. Existing fence drawables include val_01_aucyard_01_fence_det, val_01_trainstn_fence and val_03_stables_fence (already present); the two standalone fence assemblies in the shortlist can be added immediately. val_p_fenceagate / _h / _post exist but require local-member/context placement evaluation. A light holder is not a lamp; val_lights_holder_05 remains a verified volume helper. Do not derive props from hash candidates or claim missing archive identity is known. Authored environmental geometry is allowed by current user directives when clearly labelled.

## Artifacts and validation boundary

All machine-readable investigation artifacts are under `data/runtime/valentine/area-expansion-2026-10-19/` (ignored): all-local-source-audit.json, shortlist-source-audit.json, assembly-source-audit.json, shortlist-material-audit.json, clipped-source-traces.json. Original inputs were not modified. No runtime model/manifest promotion or code edit was performed by this investigation. Build and rendered gameplay acceptance belong to the parent implementation task; these source/material audits do not prove walkability or visual acceptance.

## Follow-up: bounded source appearance implementation

The follow-up implements only `apps/client/src/game/world/SourceAppearance.ts` and its test. Runtime/Inspector wiring belongs to the parent task. No GLB, raw input or promoted manifest changed.

Root cause is confirmed in the actual five GLBs: unsupported material slots retain exporter baseColorFactor [0.8,0.8,0.8,1] without a map. The generic DiffuseTex decoder cannot resolve layered terrain bindings. Hash `0x435b4e43` is `terrain_uber_4lyr_spx_dm_hbb_1121`; source textures are dirt pebbles / grass / brick / straw. Its lookup `gav_mask_3x3` is missing locally, so the four-layer plan is unresolved. Hash `0x39dc7754` is `terrain_uber_2lyr_pxm_hbb`; its two actual native layers are `rr_template_hea_06_abte` and `rr_template_hea_05a_gravel_moss_abte`, while the existing preview requires four layers. These are separate causes, not absent geometry.

Shader identity and layered parameter roles were checked against local Sollumz RDR commit `3e4ddd0cc4e809843e09538baf32f1014fb301aa` and the current official [shader definitions](https://github.com/Sollumz/Sollumz_RDR/blob/main/cwxml/ModRDRShaders.xml), accessed 2026-10-19. The official [terrain material implementation](https://github.com/Sollumz/Sollumz_RDR/blob/main/ydr/shader_materials_RDR.py) is a tool-preview reference; this helper does not reproduce its complete blending or Rockstar Pxm/HBB/tint/normal semantics.

`await prepareSourceAppearance(root, { asset, loadTexture })` accepts the exact manifest-relative asset path, such as `models/valentine/l_09__hd_0_-3_1.glb`, and an optional async texture loader. Call once on the cached source before instance cloning. The function returns texturedMaterials, colorMaterials and textureFailures. It requires an exact five-tile allowlist, matching shader hash, unsupported-diffuse-binding status, missing existing map and source UVs. Other unsupported materials and existing original albedo stay unchanged.

The explicit authored approximation selects native dirt-pebbles layer0 for the two mixed-ground tiles and native gravel/moss layer1 for the three railway-ground tiles. Both selected texture files already exist in verified-scene/textures/terrain. All five resources decode the selected layer to source UV set1 with uvScaleBias [128,128,128,0]; cloned glTF sampler state uses repeat [128,128], offset [128,-127], flipY=false and sRGB. Neither UV geometry nor the caller's source texture is mutated. Native albedo uses white multiplier1, roughness1, metalness0; source vertex colors are control masks and are not multiplied into this single-layer appearance. The mixed dirt/grass/brick/straw material is deliberately not called railway ballast.

Original hash and unsupported status remain in userData. Additional rdo_appearance_* fields state authored-gameplay provenance, chosen source texture, single-layer selection and pending original shader semantics. An optional texture load failure is caught and produces a labelled authored ground color on these exact ground materials. It cannot abort the model/input loop. No general repainting of white building materials or global albedo grading is performed.

Detailed evidence: ignored `data/runtime/valentine/area-expansion-2026-10-19/unsupported-ground-material-audit.json` records original resources/hashes, material indices, all texture references, decoded UV constants and current runtime material metadata/hashes.

Validation: eight focused SourceAppearance tests pass. Six behavior assertions were observed failing against the initial no-op before implementation. Tests cover the known material cases, asset/hash/status/UV guards, original texture preservation, sampler ownership, failed texture loading and idempotence. Required `npx pnpm -r build` completed successfully (existing Vite CJS/chunk-size warnings). No GPU/browser acceptance was performed by this helper task; parent integration must verify the rendered result.
