# Valentine circuit coverage audit

The requested circuit is recorded as five named segments in
`data/reference/valentine/annotated-circuit.json`. These are navigation intent,
not fabricated road centerlines. Each segment remains unverified until its
source path and a real WASD walk are measured.

Run from the restart worktree:

```powershell
tools/rdo_pipeline/.venv/Scripts/python.exe -m rdo_pipeline.cli audit-valentine-circuit --circuit data/reference/valentine/annotated-circuit.json --placements D:/Projects/RDO-RPG/data/valentine_placements.json --raw-root D:/Projects/RDO-RPG/data/raw --runtime-root data/runtime/valentine/local-preview
```

This writes `route-critical-export-targets.json` beside the runtime manifest.
Exit zero means the audit was generated; inspect `ready` and `gates` to assess
the slice. The audit does not assert walkability from asset presence.
Input hashes identify the circuit fixture, placement source and runtime
manifest used. Re-run after each source import or runtime rebuild.

The landmark check resolves source names and JOAAT hashes, excludes interior
records, and compares runtime position, rotation and scale against the shared
game-to-Three projection. Raw `.ydr` copies are distinguished from `.ydr.full`
exports. An existing full export results in an integration action rather than
a request to export the same asset again.

## Measured on 2026-10-15

Seven required exterior landmarks match their source transforms: sheriff,
second saloon, main saloon, hotel, bank, stable and Magic Lantern.
The station exterior (`val_01_trainstn_ext`) and church exterior
(`val_05_church_ext`) both already have full exports and converted GLBs.
Their exact exterior placement records are absent from the currently loaded
source snapshot. More geometry exports of these two models will not resolve
this missing source link. Recover the associated YMAP/archetype relationship;
do not assign the VFX position or interior proxy position as a substitute.

The earlier `station-shell` calibration anchor identifies a station MLO
instance. It remains useful for checking the coordinate basis, but does not
prove the placement of the station's separate exterior drawable.

The terrain-continuity, source road/boardwalk geometry, rail-complex and
walkable-circuit gates remain `not-verified`. This report is a partial
implementation of the spatial recovery coverage gate, not map acceptance.
