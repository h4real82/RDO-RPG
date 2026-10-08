# Terrain grounding verification — 2026-10-08

The local preview now samples loaded, visible terrain meshes after the manifest
transform. It no longer holds the player at the spawn elevation everywhere.
Hidden source LODs are excluded. Height queries are cached while stationary and
invalidated when a terrain chunk loads or unloads. Missing terrain returns no
height; it is not replaced with fabricated geometry.

Browser observation at localhost:3000 after walking forward:

| State | X | Y | Z |
| --- | ---: | ---: | ---: |
| Before | -324.8453 | 115.541071 | 760.5540 |
| After | -324.8453 | 115.751951 | 759.3540 |

Verification: 33 client tests passed, workspace build passed, browser smoke test
passed (movement, blur, POI interaction and menu movement suppression), five
reference views captured. This is functional evidence, not graphical acceptance
or a performance certification. The game-playtest skill required browser checks
and screenshot inspection rather than relying only on unit tests.

Remaining: incomplete terrain coverage and materials, helper geometry rendered
as opaque surfaces, simplified building collision and no separate walkable
boardwalk/interior surface solver. On missing terrain the previous elevation is
retained; this does not establish walkability or accurate ground there.

## Coverage follow-up

The existing `l_09__hd_0_0_0` geometry probe is now integrated using its original
`l_09__strm_0_ymap.xml` transform. The local manifest contains five terrain tiles
and 599 total placements. No additional geometry was generated.

The adjacent `l_09__hd_0_-1_-1` is present as an HD entity in that YMAP at
approximately game XY (-288, 736). Its initially missing export was supplied
by the user and converted from the 626464-byte `.ydr.full`, preserving 24 source
color channels on six meshes. Integration uses the original YMAP transform;
the manifest now contains six terrain tiles and 600 total placements. Raw files
remain unchanged. Additional neighbouring tiles may still be required for full
camera coverage; terrain material fidelity remains unresolved.
