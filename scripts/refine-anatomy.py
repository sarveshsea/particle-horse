#!/usr/bin/env python3
"""Document authored facial corrections and inspect the credited source tail."""
import hashlib
import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
source = ROOT / 'public/equine/frames.f32'
metadata = json.loads((ROOT / 'public/equine/metadata.json').read_text())
raw = source.read_bytes()
positions = struct.unpack(f'<{len(raw)//4}f', raw)
vertex_count = metadata['vertexCount']
assert vertex_count == 8431
landmarks = {'eyes': [4279, 5441], 'nostrils': [3333, 4547],
             'jaws': [3543, 4758], 'ears': [3876, 5088]}
notice = {
    'description': 'Artist-authored localized refinement of credited Poser/DAZ horse; not a scan or measured animal.',
    'source': metadata['source'], 'sourceSha256': hashlib.sha256(raw).hexdigest(),
    'sourceVertexCount': vertex_count, 'sourceFrameCount': metadata['frameCount'],
    'landmarkVertexIds': landmarks,
    'tailMaskInclusive': [7562, 8429], 'tailVertexCount': 868,
    'preservedRootCapVertex': 8430,
    'tailGuideCount': 9,
    'correctionsRenderingUnits': {'eyeRecess': .009, 'nostrilRecess': .010,
                                 'muzzleNarrowing': .003, 'jawDefinition': .004,
                                 'earRidge': .002},
    'implementation': 'src/anatomy.ts; guide centroids use fixed first-pose length bins, same vertex IDs in every frame.',
    'restLandmarkPositions': {
        name: [list(positions[v*3:v*3+3]) for v in vertices]
        for name, vertices in landmarks.items()
    },
}
(ROOT / 'public/equine/anatomy.json').write_text(json.dumps(notice, indent=2) + '\n')
print('Wrote anatomical provenance and stable source-vertex landmarks.')
