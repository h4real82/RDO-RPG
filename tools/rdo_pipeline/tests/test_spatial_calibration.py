import json
import math

import pytest

from rdo_pipeline.spatial_calibration import load_spatial_anchors, verify_spatial_anchors


def _anchor(index: int) -> dict[str, object]:
    return {
        'id': f'anchor-{index}',
        'label': f'Reference {index}',
        'sourceKind': 'placement',
        'sourceFile': 'val_test_ymap.xml',
        'model': f'model_{index}',
        'position': {'x': float(index), 'gameY': float(index % 2), 'elevation': 100.0 + index},
        'exterior': True,
    }


def _write_fixture(tmp_path, anchors):
    path = tmp_path / 'anchors.json'
    path.write_text(json.dumps({'version': 1, 'anchors': anchors}), encoding='utf-8')
    return path


def test_loader_rejects_duplicate_anchor_ids(tmp_path) -> None:
    anchors = [_anchor(index) for index in range(5)]
    anchors[4]['id'] = anchors[0]['id']

    with pytest.raises(ValueError, match='duplicate spatial anchor id'):
        load_spatial_anchors(_write_fixture(tmp_path, anchors))


@pytest.mark.parametrize('value', [math.nan, math.inf, -math.inf])
def test_loader_rejects_non_finite_positions(tmp_path, value) -> None:
    anchors = [_anchor(index) for index in range(5)]
    anchors[2]['position']['x'] = value

    with pytest.raises(ValueError, match='non-finite anchor position'):
        load_spatial_anchors(_write_fixture(tmp_path, anchors))


def test_loader_requires_five_non_collinear_exterior_anchors(tmp_path) -> None:
    anchors = [_anchor(index) for index in range(4)]

    with pytest.raises(ValueError, match='at least five non-collinear exterior anchors'):
        load_spatial_anchors(_write_fixture(tmp_path, anchors))

    collinear = [_anchor(index) for index in range(5)]
    for index, anchor in enumerate(collinear):
        anchor['position']['gameY'] = float(index * 2)
    with pytest.raises(ValueError, match='at least five non-collinear exterior anchors'):
        load_spatial_anchors(_write_fixture(tmp_path, collinear))


def test_source_verification_rejects_an_unknown_placement_record(tmp_path) -> None:
    anchors_payload = [_anchor(index) for index in range(5)]
    anchors = load_spatial_anchors(_write_fixture(tmp_path, anchors_payload))
    entities = [{
        'modelName': anchor['model'],
        'sourceFile': anchor['sourceFile'],
        'position': [anchor['position']['x'], anchor['position']['gameY'], anchor['position']['elevation']],
        'isInterior': False,
    } for anchor in anchors_payload]
    entities[3]['modelName'] = 'different_model'
    placements = tmp_path / 'placements.json'
    placements.write_text(json.dumps({'entities': entities}), encoding='utf-8')

    with pytest.raises(ValueError, match='unknown spatial anchor source: anchor-3'):
        verify_spatial_anchors(anchors, placements)


def test_source_verification_accepts_exact_exported_records(tmp_path) -> None:
    anchors_payload = [_anchor(index) for index in range(5)]
    anchors = load_spatial_anchors(_write_fixture(tmp_path, anchors_payload))
    placements = tmp_path / 'placements.json'
    placements.write_text(json.dumps({'entities': [{
        'modelName': anchor['model'],
        'sourceFile': anchor['sourceFile'],
        'position': [anchor['position']['x'], anchor['position']['gameY'], anchor['position']['elevation']],
        'isInterior': False,
    } for anchor in anchors_payload]}), encoding='utf-8')

    verify_spatial_anchors(anchors, placements)

    assert anchors[0].label == 'Reference 0'
    assert anchors[0].position.elevation == 100.0
