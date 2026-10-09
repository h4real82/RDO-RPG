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
| `l_09__hd_0_-2_1` | -160, 672 | missing | missing |
| `l_09__hd_0_-2_0` | -224, 672 | missing | missing |
| `l_09__hd_0_-1_0` | -224, 736 | missing | missing |

These are the minimum *candidate* exports for the direct station-to-Sheriff
corridor, not proof of exact road alignment or complete camera coverage. Export
from the corresponding OpenIV **main archive view** using **Save content/Export**
to a dedicated raw terrain folder. Do not use Extract from search results, which
only copies encrypted resources. Retain source filenames and provenance. Convert
and integrate only after checking each export, then test an actual continuous
walk before considering the corridor done. Paths, rails, vegetation and the
return leg remain unverified; do not synthesize them from this tile grid.

The user-described “circus tent” is not identified by these names. Map-facing
landmark order must be verified against `Media/Valentine MAP.jpg` and source
YMAPs before changing building placement.
