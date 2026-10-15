# H4R-27: Station and church exterior source recovery

2026-10-15, based on restart commit `2e4b2462`.

## Result (Updated 2026-10-16: PLACEMENT RECOVERED)

The raw export root `D:/Projects/RDO-RPG/data/raw` has been extended with the base game sector placements from `levels_1.rpf` (`jklm_7_10_area_lod_combine_metadata.rpf`).
Both target models have been conclusively identified with their original Rockstar world placements (HD depth, PRI_REQUIRED):

| Exterior model | JOAAT | Full resource SHA-256 | Source YMAP | Position [x, y, z] | Rotation [x, y, z, w] | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `val_01_trainstn_ext` | `0xbfef411a` | `c680406e690dfd19dce21ceced4b030f6136b8b0c3fbf0d47ce7d82a826af37b` | `0x5B8D0DA4_ymap.xml` | `[-177.0218, 633.8562, 119.2600]` | `[0.0, 0.0, 0.0, 1.0]` | source-placement-found |
| `val_05_church_ext` | `0xe945accd` | `e592166444a9fc5f451501400e63dc6b7c042ebe87dcdf7edb66d0a58461f1f4` | `0x00344613_ymap.xml` | `[-226.5936, 804.0024, 133.6269]` | `[0.0, 0.0, 0.0, 1.0]` | source-placement-found |

Both entities operate with scale `[1.0, 1.0, 1.0]`, identity rotation (quaternion `[0, 0, 0, 1]`), and represent primary exterior shells. No surrogate or interior coordinates required.

## Reproduce

Run in `C:/Users/h4rea/.codex/worktrees/rdo-restart-foundation/RDO-RPG`:

```powershell
tools/rdo_pipeline/.venv/Scripts/python.exe -m rdo_pipeline.cli audit-landmark-sources --raw-root D:/Projects/RDO-RPG/data/raw --runtime-root data/runtime/valentine/placement-recovery --model val_01_trainstn_ext --model val_05_church_ext
```

The ignored report `landmark-source-recovery.json` includes all input paths and
SHA-256 hashes, exact source transforms when found, alias ambiguities and model
resource evidence. Exit zero means the diagnostic completed; inspect each model's
status. It never writes a world manifest or promotes an object into the scene.
MLO members remain local members, not world placements. Conflicting aliases are
not accepted, and incomplete matching transforms fail explicitly.

## Fresh verification and remaining integration, 2026-10-16

Codex reran the audit: both models are `source-placement-found`;
209 XMLs, 110 YMAPs, 96 YTYPs, 6,613 root entities and 8,274 archetypes.
Station: entity 22; church: entity 53. Neither has ambiguous aliases or
MLO-only evidence. Source XML SHA-256:

- Station: `351f1890b2118fcfe2f66ae230ebb018f3a1555db796c1452fda260fa8b01f0e`
- Church: `96a9127d89961eccf5eb6c22bcb30a5359a8ebc461b6830b8e9260c7cb85e176`

The archive path above comes from the Gemini/user handoff. This audit checks
exported XMLs and does not reopen the original RPF archive.
116 pipeline tests, 48 client tests, 11 contract tests plus two Node checks,
runtime validation and `npx pnpm -r build` passed in the restart worktree.

The export/source-evidence sub-issue [H4R-52](https://linear.app/h4real82/issue/H4R-52)
is Done. No further OpenIV export is currently required for these two source
placements. The older missing-metadata conclusion is superseded.

The local-preview manifest still has 143 placements and neither exterior.
Apply the existing game-to-Three/GLB conversion and preserve source provenance
when integrating them. Rendered landmark checks, the Media comparison and full
circuit acceptance remain open under H4R-27/H4R-30. No scene placement or
browser acceptance was performed by this audit.
