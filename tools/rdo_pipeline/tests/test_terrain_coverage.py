from rdo_pipeline.terrain_coverage import terrain_world_bounds, audit_terrain_bounds


def tile(name, x=0, z=0, rotation=0):
    return {'asset': f'models/{name}.glb', 'position': {'x': x, 'y': 0, 'z': z},
            'scale': {'x': 1, 'y': 1, 'z': 1}, 'rotation': {'x': 0, 'y': rotation, 'z': 0}}


def test_bounds_transform_source_z_up_into_world_y_up_and_apply_rotation():
    import math
    bounds = terrain_world_bounds(tile('ground', x=10, z=-20, rotation=math.pi/2),
                                  {'x': -2, 'y': -1, 'z': 0}, {'x': 2, 'y': 1, 'z': 3})
    assert bounds == {'minX': 9, 'maxX': 11, 'minZ': -22, 'maxZ': -18}


def test_only_missing_source_tiles_covering_uncovered_points_are_requested():
    tiles = [{'model': name, 'bounds': {'minX': x, 'maxX': x+10, 'minZ': 0, 'maxZ': 10}}
             for name, x in [('present', 0), ('needed', 10), ('irrelevant', 100)]]
    points = [{'id': 'station', 'x': 5, 'z': 5}, {'id': 'west', 'x': 15, 'z': 5}]
    report = audit_terrain_bounds(tiles, points, {'present'})
    assert [item['model'] for item in report['exportTargets']] == ['needed']
    assert report['exportTargets'][0]['requiredBy'] == ['west']
    assert report['points'][0]['status'] == 'exported-bounds-only'
    assert report['meshGroundVerified'] is False


def test_no_source_tile_is_a_metadata_gap_not_a_guessed_export():
    report = audit_terrain_bounds([], [{'id': 'unknown', 'x': 1, 'z': 2}], set())
    assert report['exportTargets'] == []
    assert report['points'][0]['status'] == 'source-bounds-missing'


def test_terrain_bounds_require_matching_ymap_and_ytyp_evidence(tmp_path):
    from rdo_pipeline.terrain_coverage import read_source_terrain_bounds
    import pytest
    ymap, ytyp = tmp_path/'map.xml', tmp_path/'type.xml'
    ymap.write_text('''<CMapData><entities><Item type="CEntityDef">
      <archetypeName>0x095E97A2</archetypeName><position x="10" y="20" z="30"/>
      <rotation x="0" y="0" z="0" w="1"/><scaleXY value="1"/><scaleZ value="1"/>
      <lodLevel>LODTYPES_DEPTH_HD</lodLevel></Item></entities></CMapData>''')
    ytyp.write_text('''<CMapTypes><archetypes><Item><name>0x095E97A2</name>
      <bbMin x="-32" y="-32" z="-1"/><bbMax x="32" y="32" z="1"/>
      </Item></archetypes></CMapTypes>''')
    tiles = read_source_terrain_bounds([ymap], [ytyp], ['l_09__hd_0_0_-1'])
    assert tiles[0]['bounds'] == {'minX': -22, 'maxX': 42, 'minZ': -52, 'maxZ': 12}
    assert tiles[0]['sourceYtyp'] == 'type.xml'
    with pytest.raises(ValueError, match='YTYP bounds missing'):
        read_source_terrain_bounds([ymap], [], ['l_09__hd_0_0_-1'])
