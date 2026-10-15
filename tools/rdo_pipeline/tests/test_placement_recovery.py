import importlib
import pytest
from rdo_pipeline.placements import _joaat


def audit(root):
    return importlib.import_module('rdo_pipeline.placement_recovery').audit_landmark_sources(root, ['church'])


def entity(model='church', position='<position x="1" y="2" z="3"/>'):
    return f'''<Item type="CEntityDef"><archetypeName>{model}</archetypeName>{position}
      <rotation x="0" y="0" z="0" w="1"/><scaleXY value="1"/><scaleZ value="1"/>
      <id value="123"/><lodLevel>LODTYPES_DEPTH_HD</lodLevel></Item>'''


def test_model_export_and_rain_anchor_do_not_prove_exterior_placement(tmp_path):
    (tmp_path / 'church.ydr.full').write_bytes(b'original-model')
    (tmp_path / 'vfx.xml').write_text(f'<CMapData><entities>{entity("rain_church")}</entities></CMapData>')
    item = audit(tmp_path)['models'][0]
    assert item['status'] == 'source-link-missing'
    assert item['worldPlacements'] == []
    assert item['fullExports'][0]['path'] == 'church.ydr.full'


def test_direct_hash_reference_preserves_source_transform_and_provenance(tmp_path):
    (tmp_path / 'map.xml').write_text(f'<CMapData><entities>{entity(_joaat("church"))}</entities></CMapData>')
    result = audit(tmp_path)
    item = result['models'][0]
    assert item['status'] == 'source-placement-found'
    record = item['worldPlacements'][0]
    assert record['position'] == [1, 2, 3]
    assert record['sourceFile'] == 'map.xml'
    assert record['entityIndex'] == 0
    assert len(result['inputs'][0]['sha256']) == 64


def test_archetype_alias_requires_exact_drawable_binding(tmp_path):
    (tmp_path / 'types.xml').write_text('''<CMapTypes><archetypes>
      <Item type="CBaseArchetypeDef"><name>shell_alias</name>
      <assetType>ASSET_TYPE_DRAWABLE</assetType><assetName>church</assetName></Item>
      </archetypes></CMapTypes>''')
    (tmp_path / 'map.xml').write_text(f'<CMapData><entities>{entity("shell_alias")}</entities></CMapData>')
    item = audit(tmp_path)['models'][0]
    assert item['status'] == 'source-placement-found'
    assert item['worldPlacements'][0]['bindingFiles'] == ['types.xml']


def test_mlo_child_does_not_become_world_placement(tmp_path):
    (tmp_path / 'types.xml').write_text(f'''<CMapTypes><archetypes><Item type="CMloArchetypeDef">
      <name>interior</name><entities>{entity()}</entities></Item></archetypes></CMapTypes>''')
    item = audit(tmp_path)['models'][0]
    assert item['status'] == 'local-member-only'
    assert len(item['mloMembers']) == 1
    assert item['worldPlacements'] == []


def test_conflicting_alias_is_not_accepted(tmp_path):
    for i, asset in enumerate(['church', 'other']):
        (tmp_path / f'types{i}.xml').write_text(f'''<CMapTypes><archetypes>
        <Item type="CBaseArchetypeDef"><name>alias</name><assetType>ASSET_TYPE_DRAWABLE</assetType>
        <assetName>{asset}</assetName></Item></archetypes></CMapTypes>''')
    (tmp_path / 'map.xml').write_text(f'<CMapData><entities>{entity("alias")}</entities></CMapData>')
    item = audit(tmp_path)['models'][0]
    assert item['status'] == 'ambiguous-archetype'
    assert item['worldPlacements'] == []


def test_matching_entity_without_complete_transform_is_rejected(tmp_path):
    (tmp_path / 'map.xml').write_text(f'<CMapData><entities>{entity(position="")}</entities></CMapData>')
    with pytest.raises(ValueError, match='position'):
        audit(tmp_path)
