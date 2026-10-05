# CC0 PBR Asset Pipeline (ambientCG / Poly Haven Standard)

This directory hosts optional CC0 PBR material texture sets for the Valentine 3D World.
Supported texture conventions:
- **Albedo / Diffuse**: `[name]_diffuse.jpg` or `[name]_Color.jpg`
- **Normal Map**: `[name]_normal.jpg` or `[name]_NormalGL.jpg`
- **Roughness Map**: `[name]_roughness.jpg` or `[name]_Roughness.jpg`
- **Ambient Occlusion (AO)**: `[name]_ao.jpg` or `[name]_AO.jpg` (optional)

### Supported Keys in `TextureGenerator`:
- `mud_street`
- `ground`
- `wood_dark`
- `wood_honey`
- `boardwalk`
- `roof_shingles`
- `corrugated_metal`
- `red_brick`
- `clapboard_sage_green`
- `clapboard_aged_white`

If no external texture files are placed here, `TextureGenerator` automatically uses the ultra-fast procedural PBR fallback tiles without blocking the simulation or frame rate.
