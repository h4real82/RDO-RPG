from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class AnchorPosition:
    x: float
    game_y: float
    elevation: float | None


@dataclass(frozen=True)
class SpatialAnchor:
    id: str
    label: str
    source_kind: str
    source_file: str
    model: str
    position: AnchorPosition
    exterior: bool
    source_index: int | None = None


def _required_text(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f'invalid spatial anchor {field}')
    return value.strip()


def _finite(value: Any, *, optional: bool = False) -> float | None:
    if optional and value is None:
        return None
    if not isinstance(value, (int, float)) or isinstance(value, bool) or not math.isfinite(value):
        raise ValueError('non-finite anchor position')
    return float(value)


def _has_non_collinear_points(anchors: list[SpatialAnchor]) -> bool:
    points = [(anchor.position.x, anchor.position.game_y) for anchor in anchors if anchor.exterior]
    if len(points) < 5:
        return False
    origin = points[0]
    second = next((point for point in points[1:] if point != origin), None)
    if second is None:
        return False
    ax, ay = second[0] - origin[0], second[1] - origin[1]
    return any(abs(ax * (point[1] - origin[1]) - ay * (point[0] - origin[0])) > 1e-7
               for point in points[1:])


def load_spatial_anchors(path: Path) -> tuple[SpatialAnchor, ...]:
    payload = json.loads(path.read_text(encoding='utf-8'))
    if not isinstance(payload, dict) or payload.get('version') != 1 or not isinstance(payload.get('anchors'), list):
        raise ValueError('invalid spatial anchor document')
    anchors: list[SpatialAnchor] = []
    ids: set[str] = set()
    for value in payload['anchors']:
        if not isinstance(value, dict) or not isinstance(value.get('position'), dict):
            raise ValueError('invalid spatial anchor record')
        anchor_id = _required_text(value.get('id'), 'id')
        if anchor_id in ids:
            raise ValueError(f'duplicate spatial anchor id: {anchor_id}')
        ids.add(anchor_id)
        source_kind = _required_text(value.get('sourceKind'), 'sourceKind')
        if source_kind not in {'placement', 'road'}:
            raise ValueError(f'invalid spatial anchor sourceKind: {source_kind}')
        position = value['position']
        source_index = value.get('sourceIndex')
        if source_kind == 'road' and (not isinstance(source_index, int) or isinstance(source_index, bool) or source_index < 0):
            raise ValueError('invalid spatial anchor sourceIndex')
        anchors.append(SpatialAnchor(
            id=anchor_id,
            label=_required_text(value.get('label'), 'label'),
            source_kind=source_kind,
            source_file=_required_text(value.get('sourceFile'), 'sourceFile'),
            model=_required_text(value.get('model'), 'model'),
            position=AnchorPosition(
                x=_finite(position.get('x')),
                game_y=_finite(position.get('gameY')),
                elevation=_finite(position.get('elevation'), optional=True),
            ),
            exterior=value.get('exterior') is True,
            source_index=source_index if isinstance(source_index, int) else None,
        ))
    if not _has_non_collinear_points(anchors):
        raise ValueError('at least five non-collinear exterior anchors are required')
    return tuple(anchors)


def _same_number(left: Any, right: float | None) -> bool:
    if right is None:
        return left is None
    return isinstance(left, (int, float)) and math.isfinite(left) and abs(float(left) - right) <= 1e-4


def verify_spatial_anchors(
    anchors: tuple[SpatialAnchor, ...], placement_source: Path, trace_source: Path | None = None,
) -> None:
    placement_payload = json.loads(placement_source.read_text(encoding='utf-8'))
    entities = placement_payload.get('entities', []) if isinstance(placement_payload, dict) else []
    traces: dict[str, Any] = {}
    if trace_source is not None:
        trace_payload = json.loads(trace_source.read_text(encoding='utf-8'))
        if isinstance(trace_payload, dict):
            traces = {trace.get('id'): trace for trace in trace_payload.get('traces', []) if isinstance(trace, dict)}
    for anchor in anchors:
        found = False
        if anchor.source_kind == 'placement':
            for entity in entities:
                position = entity.get('position', []) if isinstance(entity, dict) else []
                if (isinstance(position, list) and len(position) == 3
                        and entity.get('sourceFile') == anchor.source_file
                        and anchor.model in {str(entity.get('modelName')), str(entity.get('archetype'))}
                        and entity.get('isInterior') is not True
                        and _same_number(position[0], anchor.position.x)
                        and _same_number(position[1], anchor.position.game_y)
                        and _same_number(position[2], anchor.position.elevation)):
                    found = True
                    break
        elif trace_source is not None:
            trace = traces.get(anchor.model)
            points = trace.get('points', []) if isinstance(trace, dict) else []
            index = anchor.source_index
            if (trace.get('kind') == 'road' and isinstance(index, int) and index < len(points)
                    and anchor.source_file == trace_source.name):
                point = points[index]
                found = (_same_number(point.get('x'), anchor.position.x)
                         and _same_number(point.get('z'), anchor.position.game_y)
                         and anchor.position.elevation is None)
        if not found:
            raise ValueError(f'unknown spatial anchor source: {anchor.id}')
