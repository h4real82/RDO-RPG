from __future__ import annotations

import json
import shutil
from hashlib import sha256
from pathlib import Path
from typing import Any, Mapping, Sequence

from .inventory import AssetInventory

CHUNK_SIZE = 250.0
_LAYERS = {'terrain', 'roadsAndRails', 'boardwalks', 'buildings'}


def _chunk_id(position: Mapping[str, float]) -> str:
    return f"{int(position['x'] // CHUNK_SIZE)}:{int(position['z'] // CHUNK_SIZE)}"


def _placement_id(placement: Mapping[str, Any]) -> str:
    canonical = json.dumps(_world_key(placement), sort_keys=True, separators=(',', ':'), ensure_ascii=True)
    return f"valentine:{sha256(canonical.encode('utf-8')).hexdigest()[:16]}"


def _world_key(placement: Mapping[str, Any]) -> dict[str, Any]:
    return {key: placement[key] for key in ('asset', 'position', 'rotation', 'scale', 'layer', 'lod', 'interior')}


def build_manifest(inventory: AssetInventory, placement_sources: Sequence[Mapping[str, Any]]) -> dict[str, Any]:
    model_paths = {item.path for item in inventory.items if item.category == 'model'}
    placements: list[dict[str, Any]] = []
    seen: set[str] = set()
    for source in placement_sources:
        asset = source['asset']
        if asset not in model_paths:
            raise ValueError(f'asset missing from inventory: {asset}')
        if source['layer'] not in _LAYERS:
            raise ValueError(f"invalid layer: {source['layer']}")
        key = json.dumps(_world_key(source), sort_keys=True, separators=(',', ':'), ensure_ascii=True)
        if key in seen:
            continue
        seen.add(key)
        position = source['position']
        placements.append({
            'id': _placement_id(source),
            'asset': asset,
            'position': position,
            'rotation': source['rotation'],
            'scale': source['scale'],
            'layer': source['layer'],
            'chunkId': _chunk_id(position),
            'lod': source['lod'],
            'tags': ['interior'] if source.get('interior') else ['exterior'],
        })
    placements.sort(key=lambda placement: placement['id'])
    return {'version': 1, 'world': 'valentine', 'placements': placements}


def _atomic_json(path: Path, payload: Mapping[str, Any]) -> None:
    temporary = path.with_suffix(f'{path.suffix}.tmp')
    temporary.write_text(f'{json.dumps(payload, indent=2, sort_keys=True)}\n', encoding='utf-8')
    temporary.replace(path)


def write_runtime_manifest(
    manifest: Mapping[str, Any], inventory: AssetInventory, runtime_root: Path, *, asset_root: Path | None = None,
    placement_inputs: Sequence[Path] = (),
) -> None:
    runtime_root.mkdir(parents=True, exist_ok=True)
    if asset_root is not None:
        source_root = asset_root.resolve()
        inventory_by_path = {item.path: item for item in inventory.items}
        for placement in manifest['placements']:
            relative = Path(placement['asset'])
            item = inventory_by_path.get(placement['asset'])
            if item is None:
                raise ValueError(f'asset missing from inventory: {relative.as_posix()}')
            source_relative = Path(item.source_path or item.path)
            source = (source_root / source_relative).resolve()
            if source_root not in source.parents or not source.is_file():
                raise ValueError(f'asset missing from asset root: {source_relative.as_posix()}')
            destination = runtime_root / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
    _atomic_json(runtime_root / 'rdo_world_manifest.json', manifest)
    from .validate import validate_runtime
    validation = validate_runtime(runtime_root)
    _atomic_json(runtime_root / 'provenance.json', {
        'manifestVersion': manifest['version'],
        'world': manifest['world'],
        'toolVersion': '0.1.0',
        'assets': [{'path': item.path, 'sha256': item.sha256} for item in inventory.items],
        'placementInputs': [{'path': path.name, 'sha256': sha256(path.read_bytes()).hexdigest()} for path in placement_inputs],
        'validation': {'valid': validation.valid, 'errors': list(validation.errors)},
    })
    if not validation.valid:
        raise ValueError(f"runtime validation failed: {','.join(validation.errors)}")
