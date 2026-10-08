import importlib
import struct

import pytest


def api():
    return importlib.import_module('rdo_pipeline.shader_database')


def dxbc():
    # Minimal bounded DXBC container, not an executable shader.
    return b'DXBC' + bytes(16) + struct.pack('<III', 1, 32, 0)


def record(payload, size=None):
    name = b'PS_Terrain_Test\0'
    return bytes([len(name)]) + name + b'\x32' + struct.pack(
        '<I', len(payload) if size is None else size) + payload


def test_scan_keeps_named_raw_program_offsets_and_exact_bytes():
    data = b'SGD1' + bytes(4) + record(dxbc())
    result = api().scan_programs(data)
    assert len(result) == 1
    assert result[0]['name'] == 'PS_Terrain_Test'
    assert result[0]['recordOffset'] == 8
    assert api().decode_program(data, result[0]) == dxbc()


def test_compressed_payload_passes_only_encoded_bytes_and_checks_length():
    payload = struct.pack('<III', 0x8dce7, 3, 32) + b'abc'
    data = b'SGD1' + bytes(4) + record(payload, 3)
    result = api().scan_programs(data)
    def decompress(encoded, expected):
        assert encoded == b'abc'
        assert expected == 32
        return dxbc()
    assert api().decode_program(data, result[0], decompress) == dxbc()


def test_scan_rejects_truncated_recognized_payload():
    with pytest.raises(ValueError, match='bounds'):
        api().scan_programs(b'SGD1' + bytes(4) + record(dxbc(), 200))


def test_decoder_rejects_wrong_decompressed_length():
    payload = struct.pack('<III', 0x8dce7, 3, 32) + b'abc'
    data = b'SGD1' + bytes(4) + record(payload, 3)
    with pytest.raises(ValueError, match='length'):
        api().decode_program(data, api().scan_programs(data)[0], lambda *_: b'DXBC')


def test_scan_rejects_wrong_database_signature():
    with pytest.raises(ValueError, match='SGD1'):
        api().scan_programs(b'SGD2' + bytes(4) + record(dxbc()))


def test_scan_preserves_programs_without_stage_name_prefix():
    data = b'SGD1' + bytes(4) + record(dxbc()).replace(
        b'PS_Terrain_Test', b'ptfx_VS_Wrapped')
    assert api().scan_programs(data)[0]['name'] == 'ptfx_VS_Wrapped'


def test_decoder_rejects_invalid_dxbc_chunk_bounds():
    malformed = b'DXBC' + bytes(16) + struct.pack('<III', 1, 36, 1) + struct.pack('<I', 100)
    data = b'SGD1' + bytes(4) + record(malformed)
    with pytest.raises(ValueError, match='chunk'):
        api().decode_program(data, api().scan_programs(data)[0])


def test_export_matching_programs_writes_verified_dxbc_and_provenance(tmp_path):
    import hashlib
    import json
    raw = dxbc()
    data = b'SGD1' + bytes(4) + record(raw)
    output = tmp_path / 'runtime'
    report = api().export_matching_programs(
        data, output, 'Terrain', source_name='source.awc',
        decompress=None,
    )
    item = report['programs'][0]
    saved = (output / item['file']).read_bytes()
    assert saved == raw
    assert item['sha256'] == hashlib.sha256(raw).hexdigest()
    assert item['name'] == 'PS_Terrain_Test'
    assert json.loads((output / 'shader-programs.json').read_text()) == report


def test_export_matching_programs_does_not_write_unmatched_entries(tmp_path):
    data = b'SGD1' + bytes(4) + record(dxbc()).replace(b'Terrain', b'Other__')
    report = api().export_matching_programs(data, tmp_path, 'Terrain', 'x.awc')
    assert report['programs'] == []
    assert list(tmp_path.iterdir()) == [tmp_path / 'shader-programs.json']
