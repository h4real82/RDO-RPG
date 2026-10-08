from rdo_pipeline.placements import adapt_rdo_placements
import math
import pytest


@pytest.mark.parametrize('quaternion,expected', [
    ([math.sqrt(0.5), 0, 0, math.sqrt(0.5)], {'x': math.pi / 2, 'y': 0, 'z': 0}),
    ([0, math.sqrt(0.5), 0, math.sqrt(0.5)], {'x': 0, 'y': 0, 'z': -math.pi / 2}),
    ([0, 0, math.sqrt(0.5), math.sqrt(0.5)], {'x': 0, 'y': math.pi / 2, 'z': 0}),
    ([0.5, 0.5, 0.5, 0.5], {'x': math.pi / 2, 'y': 0, 'z': -math.pi / 2}),
])
def test_adapter_preserves_pitch_roll_and_heading_in_gltf_y_up_basis(quaternion, expected):
    payload = {'entities': [
        {'modelName': 'val_saloon', 'position': [1, 2, 3], 'rotation': quaternion,
         'scale': [1, 1, 1], 'sourceFile': 'val_03.xml'},
    ]}
    result = adapt_rdo_placements(payload, {'val_saloon'})
    assert result.placements[0]['rotation'] == pytest.approx(expected, abs=1e-7)


def test_adapter_maps_verified_glb_models_and_reports_missing_ones() -> None:
    payload = {'entities': [
        {'modelName': 'val_saloon', 'position': [1, 2, 3], 'rotation': [0, 0, 0, 1], 'scale': [1, 1, 1], 'sourceFile': 'val_03.xml', 'isInterior': False},
        {'modelName': 'missing_model', 'position': [1, 2, 3], 'rotation': [0, 0, 0, 1], 'scale': [1, 1, 1], 'sourceFile': 'val_03.xml', 'isInterior': True},
    ]}

    result = adapt_rdo_placements(payload, {'val_saloon'})

    assert result.placements[0]['asset'] == 'models/valentine/val_saloon.glb'
    assert result.placements[0]['position'] == {'x': 1.0, 'y': 3.0, 'z': 2.0}
    assert result.placements[0]['tags'] == ['exterior']
    assert result.missing_models == ('missing_model',)


def test_adapter_resolves_a_joaat_export_name_to_the_verified_glb_stem() -> None:
    payload = {'entities': [
        {'modelName': '0x7fb016f7', 'position': [1, 2, 3], 'rotation': [0, 0, 0, 1], 'scale': [1, 1, 1], 'sourceFile': 'station.xml', 'isInterior': False},
    ]}

    result = adapt_rdo_placements(payload, {'val_trainstn_int_em_hd'})

    assert result.placements[0]['asset'] == 'models/valentine/val_trainstn_int_em_hd.glb'
    assert result.missing_models == ()
