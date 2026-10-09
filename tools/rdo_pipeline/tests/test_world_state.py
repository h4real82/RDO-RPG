from rdo_pipeline.world_state import select_world_state


def placement(asset: str, *, source='val_03__strm_0_ymap.xml', interior=False, x=1.0, z=-2.0):
    return {
        'source': source,
        'asset': f'models/valentine/{asset}.glb',
        'position': {'x': x, 'y': 120.0, 'z': z},
        'rotation': {'x': 0.0, 'y': 0.0, 'z': 0.0},
        'scale': {'x': 1.0, 'y': 1.0, 'z': 1.0},
        'layer': 'buildings', 'lod': 0, 'interior': interior,
        'tags': ['interior' if interior else 'exterior'],
    }


def test_default_day_excludes_interior_optional_and_helper_records():
    values = [
        placement('val_genstore_ext'),
        placement('val_genstore_int_shell', interior=True),
        placement('val_genstore_int_ref'),
        placement('val_vfx_rain_genstore_ext', source='val_vfx__strm_0_ymap.xml'),
        placement('val_genstore_lockdown'),
        placement('val_genstore_shadowproxy'),
    ]

    result = select_world_state(values, state='default_day')

    assert [item['asset'] for item in result.accepted] == ['models/valentine/val_genstore_ext.glb']
    assert {item['reason'] for item in result.excluded} == {
        'interior-placement', 'reflection-helper', 'vfx-helper',
        'inactive-lockdown-variant', 'shadow-helper',
    }


def test_default_day_keeps_a_lone_hd_shell_but_rejects_duplicate_lower_shells():
    values = [
        placement('val_trainstn_int_em_hd', source='val_01__long_0_ymap.xml', x=-180, z=-626),
        placement('val_genstore_ext', x=-323, z=-799),
        placement('val_03_genstore_ext_em_hd', x=-323, z=-799),
        placement('val_03_genstore_ext_em_slod', x=-323, z=-799),
    ]

    result = select_world_state(values)

    assert [item['asset'] for item in result.accepted] == [
        'models/valentine/val_trainstn_int_em_hd.glb',
        'models/valentine/val_genstore_ext.glb',
    ]
    assert [item['reason'] for item in result.excluded] == [
        'duplicate-lower-detail-shell', 'duplicate-lower-detail-shell',
    ]


def test_selection_rejects_unknown_world_state():
    try:
        select_world_state([placement('val_genstore_ext')], state='night_lockdown')
    except ValueError as error:
        assert str(error) == 'unsupported world state: night_lockdown'
    else:
        raise AssertionError('unknown world state was accepted')
