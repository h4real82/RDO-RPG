# Valentine Spatial Calibration

Status: source fixture frozen on 2026-10-09. This gate exists to detect axis
swaps, reflections, per-model position patches, and incomplete world-state
selection before more OpenIV detail is exported.

## Coordinate contract

The fixture records unmodified game coordinates as `X = gameX`,
`gameY = gameY`, and `elevation = gameZ`. It does not encode a Three.js
projection. The calibrated shared projection is `Three X = gameX`,
`Three Y = elevation`, and `Three Z = -gameY`, a proper rotation with positive
determinant. Buildings, terrain, roads, collision, POIs, and the minimap must
all use this basis; reflective per-asset scale is forbidden.

The authoritative fixture is
`data/reference/valentine/spatial-anchors.json`. Placement anchors are exact
records from `D:/Projects/RDO-RPG/data/valentine_placements.json`; road anchors
are exact indexed points from
`data/runtime/valentine/local-preview/ground-truth-traces.json`. No coordinate
was moved by hand to better match the paper map.

The church building itself is deliberately not assigned a guessed coordinate.
The current placement export does not resolve `val_05_church_ext` to an exact
entity. Until that source record is recovered, `church-hill-road-turn` anchors
the source road beside the church precinct. A later church-shell anchor must
replace or complement it only after its YMAP entity is proven.

## Frozen source baseline

The current source/runtime audit found:

| Measure | Count |
| --- | ---: |
| Source exterior entities | 2,263 |
| Source interior entities | 2,188 |
| Rendered exterior placements | 186 |
| Rendered interior placements | 408 |
| Rendered terrain placements | 11 |
| Missing model references | 1,581 |

The discrepancy explains why the previous preview could contain detailed
models yet fail to read as Valentine: it rendered only a small exterior subset
while also admitting more interior than exterior placement records.

## Verification

From the repository worktree:

```powershell
tools/rdo_pipeline/.venv/Scripts/python.exe -c "from pathlib import Path; from rdo_pipeline.spatial_calibration import load_spatial_anchors, verify_spatial_anchors; a=load_spatial_anchors(Path('data/reference/valentine/spatial-anchors.json')); verify_spatial_anchors(a, Path(r'D:/Projects/RDO-RPG/data/valentine_placements.json'), Path('data/runtime/valentine/local-preview/ground-truth-traces.json')); print(f'verified {len(a)} spatial anchors')"
```

The fixture is accepted only when the loader finds at least five non-collinear
exterior anchors and every source record matches exactly. Visual acceptance
still requires a fixed north-up render and a readable asymmetric sign; data
verification alone cannot prove handedness.
