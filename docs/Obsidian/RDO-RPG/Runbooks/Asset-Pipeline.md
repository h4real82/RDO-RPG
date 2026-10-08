# Asset-Pipeline

Die Pipeline inventarisiert nur lesend und schreibt Runtime-Artefakte nur unter `data/runtime/`.

```powershell
tools/rdo_pipeline/.venv/Scripts/python.exe -m rdo_pipeline.cli build-valentine --asset-root D:\Projects\RDO-RPG\data\processed\models_glb --placements D:\Projects\RDO-RPG\data\valentine_placements.json --runtime-root data\runtime\valentine\local-preview --allow-incomplete
tools/rdo_pipeline/.venv/Scripts/python.exe -m rdo_pipeline.cli validate-valentine --runtime-root data\runtime\valentine\local-preview
```

`--allow-incomplete` ist nur für eine klar gekennzeichnete lokale Vorschau zulässig. Ein regulärer Build verweigert unaufgelöste Modelle. Details: [Versioniertes Pipeline-Runbook](../../../runbooks/asset-pipeline.md).
