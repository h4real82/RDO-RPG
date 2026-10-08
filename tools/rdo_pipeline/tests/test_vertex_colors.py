import importlib
import struct

import pytest


def fixture_buffer():
    data = bytearray(600)
    struct.pack_into('<I', data, 8, 2)
    struct.pack_into('<Q', data, 24, 0x50000200)
    struct.pack_into('<Q', data, 56, 0x50000080)
    struct.pack_into('<I', data, 128 + 25 * 4, 0)
    data[128 + 208 + 25] = 4
    data[128 + 260 + 25] = 28
    data[512:520] = bytes([0, 64, 128, 255, 255, 128, 64, 0])
    return data


def decoder():
    module = importlib.import_module('rdo_pipeline.vertex_colors')
    return module.decode_vertex_colors


def test_decoder_preserves_absent_channels_and_exact_float32_unorm():
    read = decoder()
    result = read(bytes(fixture_buffer()), 0)
    assert result['vertexCount'] == 2
    assert [c['channel'] for c in result['channels']] == [1]
    rounded = lambda x: struct.unpack('<f', struct.pack('<f', x / 255))[0]
    assert result['channels'][0]['values'] == [
        [rounded(v) for v in [0, 64, 128, 255]],
        [rounded(v) for v in [255, 128, 64, 0]],
    ]


def test_decoder_rejects_unsupported_present_color_format():
    data = fixture_buffer()
    data[128 + 260 + 25] = 30
    with pytest.raises(ValueError, match='unsupported'):
        decoder()(bytes(data), 0)


def test_decoder_rejects_color_data_outside_resource():
    data = fixture_buffer()
    struct.pack_into('<I', data, 128 + 25 * 4, 100)
    with pytest.raises(ValueError, match='bounds'):
        decoder()(bytes(data), 0)


def test_decoder_rejects_non_system_pointer():
    data = fixture_buffer()
    struct.pack_into('<Q', data, 24, 0x60000200)
    with pytest.raises(ValueError, match='system'):
        decoder()(bytes(data), 0)


def test_drawable_reader_preserves_geometry_identity_and_color_presence():
    module = importlib.import_module('rdo_pipeline.vertex_colors')
    data = fixture_buffer()
    data.extend(bytes(700))
    data[1024:1088] = data[:64]
    for offset, target in [(80, 700), (700, 720), (720, 740),
                           (748, 820), (820, 840), (848, 1024)]:
        struct.pack_into('<Q', data, offset, 0x50000000 | target)
    struct.pack_into('<H', data, 708, 1)
    struct.pack_into('<H', data, 756, 1)
    result = module.decode_drawable_vertex_colors(bytes(data))
    assert len(result) == 1
    assert (result[0]['lod'], result[0]['model'], result[0]['geometry']) == (0, 0, 0)
    assert result[0]['vertexCount'] == 2
    assert [c['channel'] for c in result[0]['channels']] == [1]
