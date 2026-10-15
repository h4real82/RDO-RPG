# H4R-27: comparison against the actual Sollumz_RDR XML reader

> Historical input set: the added levels_1 YMAPs proved both placements on 16.10.
> See [source recovery](station-church-source-recovery.md). The absence below
> applies to the earlier files and is no longer an export blocker.

Checked 2026-10-15 in the restart worktree, using the local reference checkout
`D:/Projects/RDO-RPG/tools/references/Sollumz_RDR`, clean Git commit
`3e4ddd0cc4e809843e09538baf32f1014fb301aa`.

## Method

Executed the actual `cwxml/ymap.py`, `cwxml/ytyp.py`, `cwxml/element.py`
and `tools/jenkhash.py` in installed Blender 3.2.2, using its real mathutils
and NumPy. The add-on was not registered or enabled. Namespace packages bypass
its UI initialization; the original SollumzGame enum and game-context functions
were extracted from the source AST and set to RDR. No XML-reader logic was
mocked, replaced or patched in the reference checkout. This verifies those
reader modules, not full add-on compatibility with this Blender version.

The ignored one-off diagnostic script and detailed report are:
- `data/runtime/valentine/placement-recovery/compare_sollumz.py`
- `data/runtime/valentine/placement-recovery/sollumz-reader-comparison.json`

The report records reader-file and input-file SHA-256 values. All 188 checked
YMAP/YTYP source files were rehashed afterwards and remain byte-identical.
Two other XML documents are archive metadata, outside this reader comparison.

## Results

| Checked data | Count | Result |
| --- | ---: | --- |
| YMAP documents | 92 | All root-entity lists compared after the one compatibility adapter below |
| YTYP documents | 96 | Archetype counts, name, assetName and assetType agree |
| Root entities, including MLO instances | 4,922 | Type, archetype, position, quaternion and scale agree |
| Archetypes | 8,274 | No compared-field mismatch |
| MLO base and optional-set members | 2,188 | Counts and member transforms agree |
| Maximum numeric deviation | 0.000060546875 | Expected float32/mathutils rounding, below 0.0001 comparison tolerance |

Both readers find the station exterior and church exterior in
`placement-recovery/patchpack006/0x4904B9D1_ytyp.xml`, at archetype indices 28
and 42. Names and assetName are respectively `0xBFEF411A` and `0xE945ACCD`.
Neither reader finds a matching root entity or MLO member in the available maps.
The existing source-recovery audit reports `archetype-only`, consistently.

## Native reader limitation found, not hidden

The unmodified full reader fails on `ymap/val_01__ymap.xml`:
`ValueError: non-hexadecimal number found in fromhex() arg at position 12`.

OpenIV emits `occludeModels/Item/verts content="char_array"` as decimal
byte tokens. Sollumz_RDR's `OccludeModel.VertsProperty.from_xml` expects
hexadecimal text. For the comparison only, 92 occluder byte arrays were converted
to hex in a deep copy in memory. Byte values were range-checked (0..255), lengths
checked against dataSize, and hex decoded back to assert exact byte equality.
The actual reader then parsed the document; every entity was compared against
the unchanged source XML. No source file, reference module, scene or manifest
was rewritten.

Therefore `nativeReaderPassedAllFiles` is false, while the explicitly adapted
field comparison passes with no remaining errors or differences. This does not
claim that the upstream reader accepts every original export without adaptation.

## Scope and limits

Six files produce reader warnings about extension types. Uncompared extension,
occlusion and auxiliary semantics are not declared equivalent. The upstream
YMAP reader leaves instanced_data disabled: eight grass batches remain outside
this comparison; no PropInstanceList batches or containerLods items were found.
This audit does not decode binary RPFs, prove visual fidelity, or pass the route.

The previous six hexadecimal YMAP filenames were inferred from internal map
identities and were not verified archive filenames. That export instruction
is withdrawn. No additional file search/export is requested by this audit.
The supported XML records show no evidence that our reader silently discarded
the station/church placements. Archive-version and actual filename provenance
still need resolution before requesting a specific missing source.

## Reproduce

From the restart worktree, while the ignored diagnostic script is retained:

```powershell
& 'D:/Projects/RDO-RPG/apps/tools/Blender/blender-3.2.2-windows-x64/blender.exe' --background --python-exit-code 1 --python data/runtime/valentine/placement-recovery/compare_sollumz.py
```

No code or geometry correction is justified solely by this comparison.
