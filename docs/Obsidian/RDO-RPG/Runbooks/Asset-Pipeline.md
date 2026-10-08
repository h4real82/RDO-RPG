# Asset-Pipeline

Die Pipeline inventarisiert nur lesend und schreibt Runtime-Artefakte nur unter `data/runtime/`.

```powershell
tools/rdo_pipeline/.venv/Scripts/python.exe -m rdo_pipeline.cli build-valentine --asset-root D:\Projects\RDO-RPG\data\processed\models_glb --placements D:\Projects\RDO-RPG\data\valentine_placements.json --runtime-root data\runtime\valentine\local-preview --allow-incomplete
tools/rdo_pipeline/.venv/Scripts/python.exe -m rdo_pipeline.cli validate-valentine --runtime-root data\runtime\valentine\local-preview
tools/rdo_pipeline/.venv/Scripts/python.exe -m rdo_pipeline.cli extract-valentine-traces --runtime-root data\runtime\valentine\local-preview --roads tools\cache_jeanropke\road_new_hanover.json --rails data\raw\collectors\railroads.json
```

`extract-valentine-traces` transformiert ausschließlich die vorhandenen GeoJSON-Linien mit der Jean-Röpke-CRS und schreibt `ground-truth-traces.json`. Ohne im Quellmaterial belegte Breite und Höhenprofil bleiben diese Traces absichtlich nicht renderbar; das verhindert erfundene Straßen- oder Gleisribbons.

`--allow-incomplete` ist nur für eine klar gekennzeichnete lokale Vorschau zulässig. Ein regulärer Build verweigert unaufgelöste Modelle. Details: [Versioniertes Pipeline-Runbook](../../../runbooks/asset-pipeline.md).
