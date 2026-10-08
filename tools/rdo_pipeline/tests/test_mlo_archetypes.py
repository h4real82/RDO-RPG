from rdo_pipeline import placements
import pytest
import math


ENTITY = '''<Item type="CEntityDef"><archetypeName>0xABCDEF12</archetypeName>
<position x="1" y="2" z="3"/><rotation x="0" y="0" z="0" w="1"/>
<scaleXY value="2"/><scaleZ value="3"/></Item>'''


def test_mlo_parser_preserves_local_transforms_and_separates_optional_sets(tmp_path):
    source = tmp_path / 'interior_ytyp.xml'
    source.write_text(f'''<CMapTypes><archetypes><Item type="CMloArchetypeDef">
<name>0x9F5729F9</name><entities>{ENTITY}</entities>
<entitySets><Item><name>0x12345678</name><entities>{ENTITY}</entities></Item></entitySets>
</Item></archetypes></CMapTypes>''')
    assert callable(getattr(placements, 'read_mlo_archetypes', None))
    archetypes = placements.read_mlo_archetypes([source])
    mlo = archetypes['0x9f5729f9']
    assert len(mlo['entities']) == 1
    assert mlo['entities'][0] == {
        'modelName': '0xabcdef12', 'position': [1, 2, 3],
        'rotation': [0, 0, 0, 1], 'scale': [2, 2, 3],
        'sourceFile': 'interior_ytyp.xml', 'isInterior': True,
    }
    assert mlo['entitySets'][0]['name'] == '0x12345678'
    assert len(mlo['entitySets'][0]['entities']) == 1


def test_mlo_parser_rejects_missing_transform_instead_of_guessing(tmp_path):
    source = tmp_path / 'broken_ytyp.xml'
    source.write_text('''<CMapTypes><archetypes><Item type="CMloArchetypeDef">
<name>0x12345678</name><entities><Item type="CEntityDef"><archetypeName>prop</archetypeName>
<rotation x="0" y="0" z="0" w="1"/><scaleXY value="1"/><scaleZ value="1"/>
</Item></entities></Item></archetypes></CMapTypes>''')
    assert callable(getattr(placements, 'read_mlo_archetypes', None))
    with pytest.raises(ValueError, match='position'):
        placements.read_mlo_archetypes([source])


def test_mlo_world_transform_scales_rotates_then_translates_child():
    assert callable(getattr(placements, 'compose_mlo_entity', None))
    half = math.sqrt(0.5)
    parent = {'position': [10, 20, 30], 'rotation': [0, 0, half, half], 'scale': [2, 2, 2]}
    child = {'modelName': 'prop', 'position': [1, 0, 3], 'rotation': [0, 0, 0, 1],
             'scale': [1, 1, 3], 'sourceFile': 'interior.xml', 'isInterior': True}
    world = placements.compose_mlo_entity(parent, child)
    assert world['position'] == pytest.approx([10, 22, 36])
    # Normal CEntityDef quaternions store inverse orientation; MLO roots do not.
    assert world['rotation'] == pytest.approx([0, 0, -half, half])
    assert world['scale'] == [2, 2, 6]
    assert child['position'] == [1, 0, 3]


def test_mlo_transform_rejects_nonuniform_parent_scale_that_can_introduce_shear():
    assert callable(getattr(placements, 'compose_mlo_entity', None))
    parent = {'position': [0, 0, 0], 'rotation': [0, 0, 0, 1], 'scale': [1, 1, 2]}
    child = {'position': [1, 0, 0], 'rotation': [0, 0, 0, 1], 'scale': [1, 1, 1]}
    with pytest.raises(ValueError, match='nonuniform'):
        placements.compose_mlo_entity(parent, child)
