import importlib

import pytest


def api():
    return importlib.import_module('rdo_pipeline.terrain_placements')


def ymap(tmp_path, body):
    path = tmp_path / 'l_09__strm_0_ymap.xml'
    path.write_text(f'''<CMapData><entities>{body}</entities></CMapData>''', encoding='utf-8')
    return path


def entity(archetype, *, lod='LODTYPES_DEPTH_HD', position='x="-288" y="800" z="118"', scale='1'):
    return f'''<Item type="CEntityDef"><archetypeName>{archetype}</archetypeName>
      <position {position}/><rotation x="0" y="0" z="0" w="1"/>
      <scaleXY value="{scale}"/><scaleZ value="{scale}"/><lodLevel>{lod}</lodLevel>
    </Item>'''


def test_terrain_placements_resolve_exact_model_hash_and_game_axes(tmp_path):
    source = ymap(tmp_path, entity('0x095E97A2'))
    result = api().build_terrain_placements([source], ['l_09__hd_0_0_-1'])
    assert result == [{
        'source': 'l_09__strm_0_ymap.xml',
        'asset': 'models/valentine/l_09__hd_0_0_-1.glb',
        'position': {'x': -288.0, 'y': 118.0, 'z': 800.0},
        'rotation': {'x': 0.0, 'y': 0.0, 'z': 0.0},
        'scale': {'x': 1.0, 'y': 1.0, 'z': 1.0},
        'layer': 'terrain', 'lod': 0, 'interior': False,
    }]


def test_terrain_placements_ignore_non_hd_and_unrequested_entities(tmp_path):
    source = ymap(tmp_path, entity('0x095E97A2', lod='LODTYPES_DEPTH_ORPHANHD')
                  + entity('0x00000001'))
    with pytest.raises(ValueError, match='not found'):
        api().build_terrain_placements([source], ['l_09__hd_0_0_-1'])


def test_terrain_placements_reject_duplicate_tile_entities(tmp_path):
    source = ymap(tmp_path, entity('0x095E97A2') + entity('0x095E97A2'))
    with pytest.raises(ValueError, match='multiple HD placements'):
        api().build_terrain_placements([source], ['l_09__hd_0_0_-1'])


def test_terrain_placements_reject_unresolved_model_hashes(tmp_path):
    source = ymap(tmp_path, entity('0x095E97A2'))
    with pytest.raises(ValueError, match='not found'):
        api().build_terrain_placements([source], ['l_09__hd_0_0_-2'])
