from pathlib import Path

import pytest

from rdo_pipeline.metadata_batch import audit_ymap_batch


def xml(tmp_path: Path, name: str, content: str) -> Path:
    path = tmp_path / name
    path.write_text(content, encoding='utf-8')
    return path


def test_empty_placement_maps_are_valid_but_instanced_grass_is_not_a_normal_entity(tmp_path):
    empty = xml(tmp_path, 'a.xml', '<CMapData><name>0x11111111</name><entities/></CMapData>')
    grass = xml(tmp_path, 'b.xml', '''<CMapData><name>0x22222222</name><entities/>
      <instancedData><GrassInstanceList><Item><archetypeName>0x12345678</archetypeName>
      <position x="0" y="0" z="0"/><rotation x="0" y="0" z="0" w="0"/>
      <InstanceList><Item><Position content="short_array">12 34 56</Position></Item></InstanceList>
      </Item></GrassInstanceList></instancedData></CMapData>''')
    result = audit_ymap_batch([empty, grass], expected_count=2)
    assert result['summary'] == {'files': 2, 'emptyMaps': 1, 'entityRecords': 0,
                                 'grassBatches': 1, 'grassInstances': 1, 'propInstances': 0}
    assert result['files'][1]['grass'][0]['archetype'] == '0x12345678'
    assert result['files'][1]['grass'][0]['renderable'] is False
    assert len(result['files'][0]['sha256']) == 64


def test_a_batch_with_repeated_internal_map_identity_is_rejected(tmp_path):
    first = xml(tmp_path, 'a.xml', '<CMapData><name>0x12345678</name></CMapData>')
    duplicate = xml(tmp_path, 'b.xml', '<CMapData><name>0x12345678</name></CMapData>')
    with pytest.raises(ValueError, match='duplicate map identity'):
        audit_ymap_batch([first, duplicate], expected_count=2)


def test_wrong_xml_type_or_incomplete_batch_cannot_be_accepted(tmp_path):
    wrong = xml(tmp_path, 'a.xml', '<CMapTypes/>')
    with pytest.raises(ValueError, match='expected 8'):
        audit_ymap_batch([wrong], expected_count=8)
    with pytest.raises(ValueError, match='CMapData'):
        audit_ymap_batch([wrong], expected_count=1)
