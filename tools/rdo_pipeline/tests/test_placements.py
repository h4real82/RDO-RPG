from rdo_pipeline.placements import adapt_rdo_placements


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
