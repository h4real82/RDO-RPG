# Asset-Pipeline

Die Pipeline inventarisiert nur lesend und schreibt Runtime-Artefakte nur unter `data/runtime/`.

```powershell
tools/rdo_pipeline/.venv/Scripts/python.exe -m rdo_pipeline.cli build-valentine --asset-root D:\Projects\RDO-RPG\data\processed\models_glb --placements D:\Projects\RDO-RPG\data\valentine_placements.json --runtime-root data\runtime\valentine\local-preview --allow-incomplete
tools/rdo_pipeline/.venv/Scripts/python.exe -m rdo_pipeline.cli validate-valentine --runtime-root data\runtime\valentine\local-preview
tools/rdo_pipeline/.venv/Scripts/python.exe -m rdo_pipeline.cli extract-valentine-traces --runtime-root data\runtime\valentine\local-preview --roads tools\cache_jeanropke\road_new_hanover.json --rails data\raw\collectors\railroads.json
```

Falls der Standard-OpenIV-Konverter bei statischen Hilfsmodellen wegen einer defekten Armature scheitert, verwendet die Pipeline den versionierten Fallback ohne Skins oder Animationen. Er überschreibt keine vorhandene GLB:

```powershell
& "D:\Projects\RDO-RPG\apps\tools\Blender\blender-3.2.2-windows-x64\blender.exe" --background --python tools\convert_models_blender.py -- --input-dir D:\Projects\RDO-RPG\data\raw\models --output-dir D:\Projects\RDO-RPG\data\processed\models_glb
```

`extract-valentine-traces` transformiert ausschließlich die vorhandenen GeoJSON-Linien mit der Jean-Röpke-CRS und schreibt `ground-truth-traces.json`. Ohne im Quellmaterial belegte Breite und Höhenprofil bleiben diese Traces absichtlich nicht renderbar; das verhindert erfundene Straßen- oder Gleisribbons.

## Texturbelege prüfen

`texture-coverage` liest ausschließlich wörtliche Texturreferenzen aus den
exportierten YDR-Dateien. Es erzeugt keine Materialzuordnung: Die proprietäre
Shader-zu-Primitive-Beziehung ist im vorhandenen Export nicht belegt und darf
nicht geraten werden. Das Ergebnis `texture-coverage.json` trennt daher
nachweisbar verfügbare Texturen von noch fehlenden Exporten.

Die momentan verwendete RedDeadBlend2-Importbibliothek stellt UVs und
Vertexdaten bereit, aber keine Shader- oder Materialzuordnung pro Geometrie.
Ein zukünftig eingesetzter Importer muss diese Beziehung aus dem Originalformat
nachweisbar liefern, bevor die Runtime Albedo-, Normal- oder Maskentexturen
bindet.

```powershell
& 'tools/rdo_pipeline/.venv/Scripts/python.exe' -m rdo_pipeline.cli texture-coverage `
  --asset-root 'D:/Projects/RDO-RPG/data/processed/models_glb' `
  --model-root 'D:/Projects/RDO-RPG/data/raw/models' `
  --texture-root 'D:/Projects/RDO-RPG/data/raw/textures' `
  --runtime-root 'data/runtime/valentine/local-preview'
```

`--allow-incomplete` ist nur für eine klar gekennzeichnete lokale Vorschau zulässig. Ein regulärer Build verweigert unaufgelöste Modelle. Details: [Versioniertes Pipeline-Runbook](../../../runbooks/asset-pipeline.md).
