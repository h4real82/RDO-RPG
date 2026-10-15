# Terrain preview rebuild — 2026-10-15

The fixed overview exposed two separate causes: six of eleven runtime tiles
had no materials, and the four-layer preview ignored source UV scale/bias.
The inspected source shaders specify `(128, 128, 128, 0)` rather than a
single diffuse texture sample across each tile.

The decoder now preserves exact float4 constants `uvScaleBias` (hash
`0xc8ccec64`) and `uvSet` (`0x724bed95`) in GLB material extras. The browser
uses the scale/bias for UV set 1 and the separate second/third source channels
for sets 2/3. The V scale/bias is conjugated through glTF's flipped-V basis;
PNG textures use `flipY = false`, consistent with GLTFLoader.

The one-based UV selector and scale/bias application follow the current
`RDR_link_terrain_uvs` implementation in
[Sollumz RDR](https://github.com/Sollumz/Sollumz_RDR/blob/main/ydr/shader_materials_RDR.py#L506),
inspected on 2026-10-15. This is an explicit tool-preview reference, not a
claim of reconstructing Rockstar's complete original material shader.
Original `lookupUVSet`, Pxm, normal/roughness and other blend semantics remain
open; lookup still follows the reference preview's first-channel rule.

## Reproduce

Run from the restart worktree after the eleven source-backed tiles have
been added to the local manifest:

```powershell
$terrainNames = (Get-Content data/runtime/valentine/local-preview/rdo_world_manifest.json -Raw | ConvertFrom-Json).placements |
  Where-Object layer -eq terrain |
  ForEach-Object { [IO.Path]::GetFileNameWithoutExtension($_.asset) } |
  Sort-Object -Unique
$terrainConversionArgs = @('--background', '--python', 'tools/convert_models_blender.py', '--',
  '--input-dir', 'D:/Projects/RDO-RPG/data/raw',
  '--output-dir', 'data/runtime/valentine/terrain-uv-runtime',
  '--texture-root', 'D:/Projects/RDO-RPG/data/raw/terrain/l_09/textures',
  '--terrain-texture-output-dir', 'data/runtime/valentine/terrain-uv-runtime/textures')
foreach ($terrainName in $terrainNames) { $terrainConversionArgs += @('--only', $terrainName) }
& 'D:/Projects/RDO-RPG/apps/tools/Blender/blender-3.2.2-windows-x64/blender.exe' @terrainConversionArgs
if ($LASTEXITCODE -ne 0) { throw 'Terrain conversion failed' }
tools/rdo_pipeline/.venv/Scripts/python.exe -m rdo_pipeline.cli apply-material-preview --asset-root data/runtime/valentine/terrain-uv-runtime --runtime-root data/runtime/valentine/local-preview --include-terrain
if ($LASTEXITCODE -ne 0) { throw 'Terrain promotion failed' }
node scripts/e2e-spatial-calibration.mjs
```

Existing staged GLBs are intentionally reused. For a changed converter, use
a fresh staging directory in both conversion and promotion commands rather
than expecting existing files to be overwritten.

Promotion validates referenced texture filenames and availability before
replacing models, refuses conflicting texture contents, keeps prior GLBs in
`asset-backups`, and records final model/texture hashes in `provenance.json`.
The world manifest remains unchanged. Textures are copied byte-for-byte from
the converter's source-selected staging output.

## Acceptance limits

Eleven tiles now provide 105 four-layer preview materials; five other
material slots remain explicitly unsupported. The six initially repaired
tiles had byte-identical POSITION and index accessor data before and after
conversion. The fixed overview shows fine terrain patterns instead of giant
grass blades. It still shows missing terrain, neutral unsupported road/decal
surfaces and incomplete town geometry. This is a verified rendering
improvement, not full visual or circuit acceptance.
