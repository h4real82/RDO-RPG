from rdo_pipeline.route_coverage import build_route_coverage


def fixture(model='church'):
    return {'landmarks': [{'id': 'church', 'label': 'Kirche', 'models': [model]}]}


def source(model='church', interior=False):
    return {'modelName': model, 'position': [10, 20, 30],
            'rotation': [0, 0, 0, 1], 'scale': [1, 1, 1],
            'sourceFile': 'town.xml', 'isInterior': interior}


def runtime(model='church', interior=False, x=10):
    return {'asset': f'models/valentine/{model}.glb',
            'position': {'x': x, 'y': 30, 'z': -20},
            'rotation': {'x': 0, 'y': 0, 'z': 0}, 'scale': {'x': 1, 'y': 1, 'z': 1},
            'tags': ['interior' if interior else 'exterior'], 'layer': 'buildings'}


def test_coverage_requires_source_position_not_just_a_matching_loaded_filename(tmp_path):
    result = build_route_coverage(fixture(), {'entities': [source()]},
                                 {'placements': [runtime(x=11)]}, tmp_path)
    assert result['ready'] is False
    assert result['landmarks'][0]['status'] == 'placement-mismatch'


def test_hash_resolved_active_exterior_is_covered_but_not_a_playable_circuit(tmp_path):
    # Hash recorded by the existing Valentine source inventory for val_saloon2.
    result = build_route_coverage(fixture('val_saloon2'), {'entities': [source('0x7078b8c7')]},
                                 {'placements': [runtime('val_saloon2')]}, tmp_path)
    assert result['landmarks'][0]['status'] == 'placed-exterior'
    assert result['landmarks'][0]['placements'][0]['sourceFile'] == 'town.xml'
    assert result['ready'] is False
    assert result['gates']['walkableCircuit'] == 'not-verified'


def test_missing_source_and_container_copy_do_not_become_ready_to_import(tmp_path):
    archive = tmp_path / 'val_05_.rpf'
    archive.mkdir()
    (archive / 'church.ydr').write_bytes(b'RSC8')
    result = build_route_coverage(fixture(), {'entities': []}, {'placements': []}, tmp_path)
    item = result['landmarks'][0]
    assert item['status'] == 'source-placement-missing'
    assert item['models'][0]['archiveCopies'] == ['val_05_.rpf/church.ydr']
    assert item['models'][0]['fullExports'] == []
    assert item['nextAction'] == 'recover-source-placement'


def test_interior_instance_does_not_satisfy_exterior_landmark(tmp_path):
    result = build_route_coverage(fixture(), {'entities': [source(interior=True)]},
                                 {'placements': [runtime(interior=True)]}, tmp_path)
    assert result['landmarks'][0]['status'] == 'source-placement-missing'


def test_complete_export_is_reused_when_only_conversion_is_missing(tmp_path):
    model = tmp_path / 'models/church_ydr'
    model.mkdir(parents=True)
    (model / 'church.ydr.full').write_bytes(b'converted-resource')
    result = build_route_coverage(fixture(), {'entities': [source()]},
                                 {'placements': []}, tmp_path)
    item = result['landmarks'][0]
    assert item['status'] == 'runtime-placement-missing'
    assert item['models'][0]['fullExports'] == ['models/church_ydr/church.ydr.full']
    assert item['nextAction'] == 'convert-or-integrate-existing-export'


def test_mirrored_scale_or_wrong_heading_cannot_satisfy_landmark_gate(tmp_path):
    for field, value in [('scale', {'x': 1, 'y': 1, 'z': -1}),
                         ('rotation', {'x': 0, 'y': 1, 'z': 0})]:
        loaded = runtime()
        loaded[field] = value
        report = build_route_coverage(fixture(), {'entities': [source()]},
                                      {'placements': [loaded]}, tmp_path)
        assert report['landmarks'][0]['status'] == 'placement-mismatch'
        assert report['gates']['landmarkPlacements'] is False
