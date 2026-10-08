from pathlib import Path
from rdo_pipeline import export_targets


def test_resolves_hash_to_name_and_retains_all_source_files(tmp_path: Path):
    (tmp_path / 'a.txt').write_text('val_trainstn_int_em_hd\n', encoding='utf-8')
    (tmp_path / 'b.txt').write_text('VAL_TRAINSTN_INT_EM_HD\nother\n', encoding='utf-8')
    report = export_targets.build_export_targets(['0x7fb016f7', '0x00000000'], tmp_path)
    assert report['targets'] == [
        {'model': '0x00000000', 'hash': '0x00000000', 'status': 'unknown', 'candidates': []},
        {'model': '0x7fb016f7', 'hash': '0x7fb016f7', 'status': 'name-candidate', 'candidates': [
            {'name': 'val_trainstn_int_em_hd', 'nameSources': ['a.txt', 'b.txt']},
        ]},
    ]
    assert report['summary'] == {'requested': 2, 'named': 1, 'ambiguous': 0, 'unknown': 1}


def test_content_changes_provenance_without_mutating_inputs(tmp_path: Path):
    source = tmp_path / 'names.txt'
    source.write_text('val_trainstn_int_em_hd\n', encoding='utf-8')
    before = source.read_bytes()
    first = export_targets.build_export_targets(['0x7fb016f7'], tmp_path)
    assert source.read_bytes() == before
    source.write_text('val_trainstn_int_em_hd\nother\n', encoding='utf-8')
    second = export_targets.build_export_targets(['0x7fb016f7'], tmp_path)
    assert first['nameDatabaseSha256'] != second['nameDatabaseSha256']
    assert first['targets'] == second['targets']


def test_rejects_absent_name_database(tmp_path: Path):
    import pytest
    with pytest.raises(ValueError, match='name database'):
        export_targets.build_export_targets([], tmp_path / 'absent')


def test_keeps_already_named_missing_model_without_inventing_archive(tmp_path: Path):
    report = export_targets.build_export_targets(['val_trainstn_int_em_hd'], tmp_path)
    assert report['targets'] == [{
        'model': 'val_trainstn_int_em_hd', 'hash': '0x7fb016f7',
        'status': 'name-candidate', 'candidates': [{
            'name': 'val_trainstn_int_em_hd', 'nameSources': ['placement:modelName'],
        }],
    }]


def test_preserves_real_hash_collision_instead_of_selecting_one_name(tmp_path: Path):
    (tmp_path / 'collision.txt').write_text(
        'cs_mp_alfredo_montez_ms1_eyelashes_000_c0_001_nm\nrcsp_ridethelightning_females_01\n',
        encoding='utf-8',
    )
    report = export_targets.build_export_targets(['0xa4fd4905'], tmp_path)
    assert report['targets'][0]['status'] == 'ambiguous'
    assert [c['name'] for c in report['targets'][0]['candidates']] == [
        'cs_mp_alfredo_montez_ms1_eyelashes_000_c0_001_nm', 'rcsp_ridethelightning_females_01',
    ]
    assert report['summary']['ambiguous'] == 1
    assert report['summary']['named'] == 0


def test_duplicate_request_order_does_not_change_report(tmp_path: Path):
    (tmp_path / 'names.txt').write_text('val_trainstn_int_em_hd\n', encoding='utf-8')
    first = export_targets.build_export_targets(['0x00000000', '0x7fb016f7'], tmp_path)
    second = export_targets.build_export_targets(['0x7fb016f7', '0x00000000', '0x7fb016f7'], tmp_path)
    assert first == second
