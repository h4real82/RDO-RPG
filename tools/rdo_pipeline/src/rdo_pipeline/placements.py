from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Mapping


@dataclass(frozen=True)
class PlacementAdaptation:
    placements: tuple[dict[str, Any], ...]
    missing_models: tuple[str, ...]


def _yaw(rotation: list[float]) -> float:
    x, y, z, w = (float(value) for value in rotation)
    return math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z))


def _joaat(name: str) -> str:
    value = 0
    for byte in name.lower().encode('utf-8'):
        value = (value + byte) & 0xffffffff
        value = (value + (value << 10)) & 0xffffffff
        value = (value ^ (value >> 6)) & 0xffffffff
    value = (value + (value << 3)) & 0xffffffff
    value = (value ^ (value >> 11)) & 0xffffffff
    value = (value + (value << 15)) & 0xffffffff
    return f'0x{value:08x}'


def adapt_rdo_placements(payload: Mapping[str, Any], available_models: set[str]) -> PlacementAdaptation:
    placements: list[dict[str, Any]] = []
    missing: set[str] = set()
    models_by_hash = {_joaat(model): model for model in available_models}
    for entity in payload.get('entities', []):
        model = str(entity['modelName'])
        asset_model = model if model in available_models else models_by_hash.get(model.lower())
        if asset_model is None:
            missing.add(model)
            continue
        x, game_y, elevation = (float(value) for value in entity['position'])
        scale_x, scale_y, scale_z = (float(value) for value in entity['scale'])
        interior = bool(entity.get('isInterior', False))
        placements.append({
            'source': str(entity['sourceFile']),
            'asset': f'models/valentine/{asset_model}.glb',
            'position': {'x': x, 'y': elevation, 'z': game_y},
            'rotation': {'x': 0.0, 'y': _yaw(entity['rotation']), 'z': 0.0},
            'scale': {'x': scale_x, 'y': scale_z, 'z': scale_y},
            'layer': 'buildings',
            'lod': 0,
            'interior': interior,
            'tags': ['interior' if interior else 'exterior'],
        })
    return PlacementAdaptation(tuple(placements), tuple(sorted(missing)))
