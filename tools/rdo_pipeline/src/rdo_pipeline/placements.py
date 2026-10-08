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


def adapt_rdo_placements(payload: Mapping[str, Any], available_models: set[str]) -> PlacementAdaptation:
    placements: list[dict[str, Any]] = []
    missing: set[str] = set()
    for entity in payload.get('entities', []):
        model = str(entity['modelName'])
        if model not in available_models:
            missing.add(model)
            continue
        x, game_y, elevation = (float(value) for value in entity['position'])
        scale_x, scale_y, scale_z = (float(value) for value in entity['scale'])
        interior = bool(entity.get('isInterior', False))
        placements.append({
            'source': str(entity['sourceFile']),
            'asset': f'models/valentine/{model}.glb',
            'position': {'x': x, 'y': elevation, 'z': game_y},
            'rotation': {'x': 0.0, 'y': _yaw(entity['rotation']), 'z': 0.0},
            'scale': {'x': scale_x, 'y': scale_z, 'z': scale_y},
            'layer': 'buildings',
            'lod': 0,
            'interior': interior,
            'tags': ['interior' if interior else 'exterior'],
        })
    return PlacementAdaptation(tuple(placements), tuple(sorted(missing)))
