from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class PoiValidationReport:
    valid: bool
    errors: tuple[str, ...]


def validate_pois(runtime_root: Path) -> PoiValidationReport:
    manifest = json.loads((runtime_root / 'rdo_world_manifest.json').read_text(encoding='utf-8'))
    pois = json.loads((runtime_root / 'pois.json').read_text(encoding='utf-8'))
    placement_ids = {placement.get('id') for placement in manifest.get('placements', [])}
    errors: list[str] = []
    if not isinstance(pois, list):
        return PoiValidationReport(False, ('POI_SCHEMA_INVALID',))
    for poi in pois:
        if not isinstance(poi, dict):
            errors.append('POI_SCHEMA_INVALID')
            continue
        if poi.get('manifestRef') not in placement_ids:
            errors.append('POI_MANIFEST_REF_MISSING')
        radius = poi.get('radius')
        if not isinstance(radius, (int, float)) or not math.isfinite(radius) or radius <= 0:
            errors.append('POI_RADIUS_INVALID')
    return PoiValidationReport(not errors, tuple(dict.fromkeys(errors)))
