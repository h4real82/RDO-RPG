from rdo_pipeline import placements
import pytest


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
