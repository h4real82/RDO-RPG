from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Iterable

SCALE_FACTOR = 0.01552
ORIGIN_LNG = 111.29
ORIGIN_LAT = -63.6


def _to_game(lng: float, lat: float) -> dict[str, float]:
    return {
        'x': round((lng - ORIGIN_LNG) / SCALE_FACTOR, 4),
        'z': round(-(lat - ORIGIN_LAT) / SCALE_FACTOR, 4),
    }


def _line_strings(payload: dict[str, Any]) -> Iterable[list[list[float]]]:
    for feature in payload.get('features', []):
        geometry = feature.get('geometry', {}) if isinstance(feature, dict) else {}
        if geometry.get('type') == 'LineString' and isinstance(geometry.get('coordinates'), list):
            yield geometry['coordinates']


def build_valentine_traces(roads_path: Path, rails_path: Path, *, bounds: tuple[float, float, float, float]) -> list[dict[str, Any]]:
    """Convert source GeoJSON to auditable CRS traces without inventing render widths or heights."""
    min_x, max_x, min_z, max_z = bounds
    traces: list[dict[str, Any]] = []
    for kind, source_path in (('road', roads_path), ('rail', rails_path)):
        payload = json.loads(source_path.read_text(encoding='utf-8'))
        for index, coordinates in enumerate(_line_strings(payload)):
            points = [_to_game(float(lng), float(lat)) for lng, lat in coordinates if isinstance(lng, (int, float)) and isinstance(lat, (int, float))]
            if len(points) < 2 or not any(min_x <= point['x'] <= max_x and min_z <= point['z'] <= max_z for point in points):
                continue
            traces.append({
                'id': f'valentine:{kind}:{index:04d}',
                'kind': kind,
                'points': points,
                'renderable': False,
                'reason': 'source does not provide an authoritative width and elevation profile',
                'source': {'path': source_path.name, 'featureIndex': index, 'crs': 'jean-ropke-v1'},
            })
    return sorted(traces, key=lambda trace: (trace['kind'], trace['id']))
