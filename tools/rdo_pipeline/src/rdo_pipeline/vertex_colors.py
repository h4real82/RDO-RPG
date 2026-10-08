"""Decode present RDR3 RGBA8_UNORM vertex colors, without shader assumptions.

Layout: librdr3 vertexdata.hpp/vertexdata.cpp. Only system-resource data is
supported here; unsupported formats fail explicitly rather than becoming zeros.
"""
import struct


def decode_vertex_colors(data: bytes, vertex_buffer: int) -> dict:
    def read(fmt, offset):
        if offset < 0 or offset + struct.calcsize(fmt) > len(data):
            raise ValueError('vertex color read outside resource bounds')
        return struct.unpack_from(fmt, data, offset)[0]

    def pointer(offset):
        raw = read('<Q', offset)
        if raw >> 28 != 5:
            raise ValueError('expected system resource pointer')
        target = raw & 0x0fffffff
        if not target or target >= len(data):
            raise ValueError('vertex color pointer outside resource bounds')
        return target

    count = read('<I', vertex_buffer + 8)
    start = pointer(vertex_buffer + 24)
    declaration = pointer(vertex_buffer + 56)
    channels = []
    for channel in range(4):
        attribute = 24 + channel
        offset = read('<I', declaration + attribute * 4)
        size = read('<B', declaration + 208 + attribute)
        kind = read('<B', declaration + 260 + attribute)
        if size == 0 and kind == 0:
            continue
        if (size, kind) != (4, 28):
            raise ValueError('unsupported vertex color format')
        if start + offset + count * size > len(data):
            raise ValueError('vertex color array outside resource bounds')
        values = [[struct.unpack('<f', struct.pack('<f', value / 255.0))[0]
                   for value in data[start + offset + i * size:start + offset + (i + 1) * size]]
                  for i in range(count)]
        channels.append({'channel': channel, 'format': kind, 'values': values})
    return {'vertexCount': count, 'channels': channels}


def decode_drawable_vertex_colors(data: bytes) -> list[dict]:
    def read(fmt, offset):
        if offset < 0 or offset + struct.calcsize(fmt) > len(data):
            raise ValueError('drawable vertex read outside resource bounds')
        return struct.unpack_from(fmt, data, offset)[0]

    def pointer(offset, nullable=False):
        raw = read('<Q', offset)
        if raw == 0 and nullable:
            return 0
        if raw >> 28 != 5:
            raise ValueError('expected system resource pointer')
        target = raw & 0x0fffffff
        if not target or target >= len(data):
            raise ValueError('drawable vertex pointer outside resource bounds')
        return target

    geometries = []
    for lod_index in range(4):
        lod = pointer(80 + lod_index * 8, nullable=True)
        if not lod:
            continue
        model_count = read('<H', lod + 8)
        models = pointer(lod, nullable=model_count == 0)
        for model_index in range(model_count):
            model = pointer(models + model_index * 8)
            count = read('<H', model + 16)
            array = pointer(model + 8, nullable=count == 0)
            for geometry_index in range(count):
                geometry = pointer(array + geometry_index * 8)
                vertex_buffer = pointer(geometry + 8)
                geometries.append({'lod': lod_index, 'model': model_index,
                                   'geometry': geometry_index,
                                   **decode_vertex_colors(data, vertex_buffer)})
    return geometries
