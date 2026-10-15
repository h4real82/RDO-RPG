from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import PurePosixPath
from typing import Any, Mapping, Sequence


@dataclass(frozen=True)
class WorldStateSelection:
    accepted: tuple[dict[str, Any], ...]
    excluded: tuple[dict[str, Any], ...]


_DETAIL_SUFFIX = re.compile(r'(?:_em_hd|_em_slod|_slod\d*|_lod\d*)$')
_SECTOR_PREFIX = re.compile(r'^val_(?:\d+_)?')


def _model(placement: Mapping[str, Any]) -> str:
    return PurePosixPath(str(placement.get('asset', ''))).stem.lower()


def _family(model: str) -> str:
    return _DETAIL_SUFFIX.sub('', _SECTOR_PREFIX.sub('', model))


def _detail_rank(model: str) -> int:
    if model.endswith('_em_slod') or re.search(r'_slod\d*$', model):
        return 3
    if re.search(r'_lod\d*$', model):
        return 2
    if model.endswith('_em_hd'):
        return 1
    return 0


def _position_key(placement: Mapping[str, Any]) -> tuple[float, float, float]:
    position = placement.get('position', {})
    return tuple(round(float(position[axis]), 4) for axis in ('x', 'y', 'z'))


def _explicit_exclusion(placement: Mapping[str, Any], model: str) -> str | None:
    source = str(placement.get('source', '')).lower()
    if placement.get('interior') is True or 'interior' in placement.get('tags', []):
        return 'interior-placement'
    if any(token in model for token in ('reflection_proxy', '_ref_pxy', '_int_ref')):
        return 'reflection-helper'
    if source.startswith('val_vfx') or model.startswith('val_vfx_') or '_vfx_' in model or '_rain_' in model:
        return 'vfx-helper'
    if 'lockdown' in model:
        return 'inactive-lockdown-variant'
    if 'shadowproxy' in model or 'shadow_proxy' in model:
        return 'shadow-helper'
    # Verified source volume: 24 vertices, 65.6 x 17.3 x 79.8 metres,
    # checker-textured light holder, not physical lamp geometry. Keep this
    # exact allowlist narrow; other light-named models are not classified.
    if model == 'val_lights_holder_05':
        return 'verified-light-volume-helper'
    return None


def select_world_state(
    placements: Sequence[Mapping[str, Any]], *, state: str = 'default_day',
) -> WorldStateSelection:
    if state != 'default_day':
        raise ValueError(f'unsupported world state: {state}')

    candidates: list[tuple[dict[str, Any], str]] = []
    excluded: list[dict[str, Any]] = []
    for source in placements:
        placement = dict(source)
        model = _model(placement)
        reason = _explicit_exclusion(placement, model)
        if reason is not None:
            excluded.append({'placement': placement, 'reason': reason})
        else:
            candidates.append((placement, model))

    best_rank: dict[tuple[tuple[float, float, float], str], int] = {}
    for placement, model in candidates:
        key = (_position_key(placement), _family(model))
        best_rank[key] = min(best_rank.get(key, 99), _detail_rank(model))

    accepted: list[dict[str, Any]] = []
    for placement, model in candidates:
        key = (_position_key(placement), _family(model))
        if _detail_rank(model) > best_rank[key]:
            excluded.append({'placement': placement, 'reason': 'duplicate-lower-detail-shell'})
        else:
            accepted.append(placement)
    return WorldStateSelection(tuple(accepted), tuple(excluded))
