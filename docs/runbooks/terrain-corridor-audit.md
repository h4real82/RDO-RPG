# Southern terrain corridor source audit

This bounds-only gate identifies missing exports around the southern return
and Magic Lantern. It never claims that a YTYP box is a walkable mesh.

```powershell
tools/rdo_pipeline/.venv/Scripts/python.exe -m rdo_pipeline.cli audit-terrain-corridor --definition data/reference/valentine/southern-terrain-checkpoints.json --ymap D:/Projects/RDO-RPG/data/raw/terrain/jklm_07_10/metadata/l_09__strm_0_ymap.xml --ytyp-root D:/Projects/RDO-RPG/data/raw/terrain/jklm_07_10/metadata --placements D:/Projects/RDO-RPG/data/valentine_placements.json --raw-root D:/Projects/RDO-RPG/data/raw --runtime-root data/runtime/valentine/local-preview
```

The report `terrain-corridor-export-targets.json` records input hashes,
source YMAP/YTYP names, transformed bounds, checkpoint identities and missing
models. Coordinates come from indexed source-road spans and the exact
Magic-Lantern exterior entity. Candidate names must match source HD YMAP
hashes and YTYP records; missing metadata fails.

On 2026-10-15, 13 of 33 source checkpoints lay outside already-exported
tile bounds. The targeted exports are:

| Model | Source checkpoints requiring it |
| --- | --- |
| `l_09__hd_0_-3_-1` | road 0059 indices 0–3 and road 0060 indices 9–13 |
| `l_09__hd_0_-2_-1` | road 0059 indices 4–6 |
| `l_09__hd_0_-2_-2` | Magic Lantern exterior origin |

All three bounds come from
`jklm_7_10_lod_combine_metadata_005_strm_ytyp.xml`; transforms come from
`l_09__strm_0_ymap.xml`. Twenty other checkpoints are only
`exported-bounds-only`, not mesh-ground verified. These road spans are
candidate audit corridors, not acceptance of the complete circuit or proof
that the road reference avoids every building collision.

After import, regenerate the report and require browser ground probes plus
real WASD walks. An empty export target list does not prove route completion.
