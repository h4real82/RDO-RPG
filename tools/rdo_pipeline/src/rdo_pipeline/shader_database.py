"""Bounded diagnostic scan of named SGD1 programs, not a full FXDB parser.

Record framing and Oodle wrapper were verified against a local OpenIV export.
Effects, passes, indices and resource metadata are deliberately not inferred.
The user-installed Oodle DLL is loaded only when explicitly requested; it is
neither copied nor distributed by this module.
"""
import ctypes
from hashlib import sha256
import json
import re
import struct
from pathlib import Path


def scan_programs(data: bytes) -> list[dict]:
    if len(data) < 8 or data[:4] != b'SGD1':
        raise ValueError('expected SGD1 database')
    result = []
    # Zero-width lookahead preserves a match when the preceding length byte
    # itself happens to be an ASCII identifier character.
    for match in re.finditer(rb'(?=([A-Za-z_][A-Za-z0-9_]{1,253})\x00)', data):
        name = match.group(1)
        offset = match.start() - 1
        if offset < 8 or data[offset] != len(name) + 1:
            continue
        end = match.start() + len(name) + 1
        if end + 5 > len(data):
            raise ValueError('program header outside bounds')
        size = struct.unpack_from('<I', data, end + 1)[0]
        start = end + 5
        signature = data[start:start + 4]
        if signature not in (b'DXBC', b'\xe7\xdc\x08\x00'):
            continue
        compressed = signature != b'DXBC'
        raw_size = size
        if compressed:
            if start + 12 > len(data):
                raise ValueError('compressed header outside bounds')
            encoded_size, raw_size = struct.unpack_from('<II', data, start + 4)
            if encoded_size != size:
                raise ValueError('compressed length mismatch')
            start += 12
        if size == 0 or raw_size == 0 or raw_size > 64 * 1024 * 1024:
            raise ValueError('invalid program length')
        if start + size > len(data):
            raise ValueError('program payload outside bounds')
        result.append({'name': name.decode('ascii'), 'recordOffset': offset,
                       'payloadOffset': start, 'encodedSize': size,
                       'decodedSize': raw_size, 'compressed': compressed,
                       'profileByte': data[end]})
    return result


def decode_program(data: bytes, program: dict, decompress=None) -> bytes:
    start, size = program['payloadOffset'], program['encodedSize']
    if start < 0 or size <= 0 or start + size > len(data):
        raise ValueError('program payload outside bounds')
    decoded = data[start:start + size]
    if program['compressed']:
        if decompress is None:
            raise ValueError('compressed program requires explicit decompressor')
        decoded = decompress(decoded, program['decodedSize'])
    if len(decoded) != program['decodedSize']:
        raise ValueError('decoded program length mismatch')
    if len(decoded) < 32 or decoded[:4] != b'DXBC':
        raise ValueError('expected DXBC program')
    total, count = struct.unpack_from('<II', decoded, 24)
    if total != len(decoded) or 32 + count * 4 > total:
        raise ValueError('invalid DXBC length or chunk table')
    for index in range(count):
        chunk = struct.unpack_from('<I', decoded, 32 + index * 4)[0]
        if chunk < 32 + count * 4 or chunk + 8 > total:
            raise ValueError('DXBC chunk outside bounds')
        length = struct.unpack_from('<I', decoded, chunk + 4)[0]
        if chunk + 8 + length > total:
            raise ValueError('DXBC chunk outside bounds')
    return decoded


def export_matching_programs(data: bytes, output: Path, name_filter: str,
                             source_name: str, decompress=None) -> dict:
    """Export matched, validated DXBC blobs with their source and byte hashes."""
    if not name_filter:
        raise ValueError('program name filter must not be empty')
    output.mkdir(parents=True, exist_ok=True)
    programs = []
    for program in scan_programs(data):
        if name_filter.casefold() not in program['name'].casefold():
            continue
        decoded = decode_program(data, program, decompress)
        filename = f"{program['name']}_{program['recordOffset']:08x}.dxbc"
        (output / filename).write_bytes(decoded)
        programs.append({'name': program['name'], 'recordOffset': program['recordOffset'],
                         'file': filename, 'compressed': program['compressed'],
                         'encodedSize': program['encodedSize'],
                         'decodedSize': len(decoded), 'sha256': sha256(decoded).hexdigest()})
    report = {'version': 1, 'sourceFile': source_name,
              'sourceSha256': sha256(data).hexdigest(), 'nameFilter': name_filter,
              'programCount': len(programs), 'programs': programs}
    (output / 'shader-programs.json').write_text(
        json.dumps(report, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    return report


class LocalOodleDecoder:
    """Explicit local Windows dependency; no DLL installation or copying."""
    def __init__(self, path):
        self.library = ctypes.WinDLL(str(path))
        self.function = self.library.OodleLZ_Decompress
        self.function.restype = ctypes.c_ssize_t
        self.function.argtypes = [
            ctypes.c_void_p, ctypes.c_ssize_t, ctypes.c_void_p, ctypes.c_ssize_t,
            ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_void_p,
            ctypes.c_ssize_t, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p,
            ctypes.c_ssize_t, ctypes.c_int]

    def __call__(self, encoded, expected):
        if expected <= 0 or expected > 64 * 1024 * 1024:
            raise ValueError('invalid decompressed length')
        source = ctypes.create_string_buffer(encoded)
        target = ctypes.create_string_buffer(expected)
        actual = self.function(source, len(encoded), target, expected,
                               1, 0, 0, None, 0, None, None, None, 0, 3)
        if actual != expected:
            raise ValueError('Oodle decompressed length mismatch')
        return target.raw
