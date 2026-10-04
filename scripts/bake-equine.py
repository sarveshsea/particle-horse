#!/usr/bin/env python3
"""Bake the credited Sumner horse-gallop OBJ sequence without changing its poses."""
import argparse
import json
import math
from pathlib import Path
import struct

SOURCE = 'https://people.csail.mit.edu/sumner/research/deftransfer/data/horse-gallop.zip'


def read_obj(path):
    vertices, indices = [], []
    for line in path.read_text().splitlines():
        fields = line.split()
        if not fields:
            continue
        if fields[0] == 'v':
            vertex = tuple(map(float, fields[1:4]))
            if len(vertex) != 3 or not all(map(math.isfinite, vertex)):
                raise ValueError(f'Invalid vertex in {path}')
            vertices.append(vertex)
        elif fields[0] == 'f':
            if len(fields) != 4:
                raise ValueError(f'Non-triangle in {path}')
            indices.extend(int(item.split('/')[0]) - 1 for item in fields[1:])
    if not vertices or not indices or any(i < 0 or i >= len(vertices) for i in indices):
        raise ValueError(f'Invalid geometry in {path}')
    return vertices, indices


def bake(source, output, scale=2.6):
    paths = sorted(source.glob('horse-gallop-[0-9][0-9].obj'))
    if len(paths) != 48:
        raise ValueError('Expected all 48 numbered source frames')
    meshes = [read_obj(path) for path in paths]
    vertex_count = len(meshes[0][0])
    topology = meshes[0][1]
    if any(len(v) != vertex_count or t != topology for v, t in meshes):
        raise ValueError('Sequence must share vertex correspondence and topology')
    duplicate_deltas = [abs(a - b) for j in range(24)
                        for v, w in zip(meshes[j][0], meshes[j + 24][0])
                        for a, b in zip(v, w)]
    if max(duplicate_deltas) > 0.001:
        raise ValueError('Expected two near-identical source strides')
    duplicate_rms = math.sqrt(sum(d * d for d in duplicate_deltas) / len(duplicate_deltas))
    meshes = meshes[:24]
    paths = paths[:24]
    ground = min(v[1] for vertices, _ in meshes for v in vertices)
    frames = [coordinate for vertices, _ in meshes for x, y, z in vertices
              for coordinate in (z * scale, (y - ground) * scale, -x * scale)]
    bounds = {'min': [min(frames[a::3]) for a in range(3)],
              'max': [max(frames[a::3]) for a in range(3)]}
    metadata = {
        'vertexCount': vertex_count, 'frameCount': len(meshes),
        'triangleCount': len(topology) // 3, 'scale': scale,
        'source': SOURCE, 'cycleSeconds': 0.9, 'bounds': bounds,
        'format': 'Little-endian float32 XYZ, frame-major; little-endian uint32 triangle indices',
        'groundOffset': -ground * scale,
        'sourceFrames': [p.name for p in paths],
        'stridesPerSequence': 1,
        'sourceFrameCount': 48,
        'discardedDuplicateStrideMaxDelta': max(duplicate_deltas),
        'discardedDuplicateStrideRmsDelta': duplicate_rms,
        'axisTransform': 'worldX = sourceZ * scale; worldY = (sourceY - globalMinY) * scale; worldZ = -sourceX * scale',
    }
    output.mkdir(parents=True, exist_ok=True)
    frame_bytes = struct.pack(f'<{len(frames)}f', *frames)
    topology_bytes = struct.pack(f'<{len(topology)}I', *topology)
    assert len(frame_bytes) == len(meshes) * vertex_count * 3 * 4
    assert len(topology_bytes) == metadata['triangleCount'] * 3 * 4
    assert all(math.isfinite(value) for value in struct.unpack(f'<{len(frames)}f', frame_bytes))
    (output / 'frames.f32').write_bytes(frame_bytes)
    (output / 'topology.u32').write_bytes(topology_bytes)
    (output / 'metadata.json').write_text(json.dumps(metadata, indent=2) + '\n')
    print(json.dumps({k: metadata[k] for k in ('vertexCount', 'frameCount', 'triangleCount', 'bounds')}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path, help='Extracted horse-gallop folder')
    parser.add_argument('--output', type=Path, default=Path('public/equine'))
    args = parser.parse_args()
    bake(args.source, args.output)
