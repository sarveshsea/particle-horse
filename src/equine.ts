export type EquineMetadata = Readonly<{
  vertexCount: number;
  triangleCount: number;
  frameCount: number;
  cycleSeconds: number;
}>;
export type Equine = EquineMetadata &
  Readonly<{ positions: Float32Array; topology: Uint32Array }>;
export function randomSource(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let n = Math.imul(state ^ (state >>> 15), state | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
export function decodeEquine(
  meta: EquineMetadata,
  positions: Float32Array,
  topology: Uint32Array,
): Equine {
  if (
    !Number.isInteger(meta.vertexCount) ||
    meta.vertexCount < 3 ||
    meta.vertexCount > 100000 ||
    !Number.isInteger(meta.triangleCount) ||
    meta.triangleCount < 1 ||
    meta.triangleCount > 200000 ||
    !Number.isInteger(meta.frameCount) ||
    meta.frameCount < 1 ||
    meta.frameCount > 64 ||
    !Number.isFinite(meta.cycleSeconds) ||
    meta.cycleSeconds <= 0
  )
    throw new RangeError("Invalid equine metadata");
  if (
    positions.length !== meta.vertexCount * meta.frameCount * 3 ||
    topology.length !== meta.triangleCount * 3
  )
    throw new RangeError("Incomplete equine asset");
  if (
    !positions.every(Number.isFinite) ||
    !topology.every((index) => index < meta.vertexCount)
  )
    throw new RangeError("Corrupt equine coordinates or topology");
  return { ...meta, positions, topology };
}
export function frameAt(
  time: number,
  frameCount: number,
  cycleSeconds: number,
) {
  if (!Number.isFinite(time)) throw new RangeError("Time must be finite");
  const phase =
    ((((time % cycleSeconds) + cycleSeconds) % cycleSeconds) / cycleSeconds) *
    frameCount;
  const a = Math.floor(phase);
  return { a, b: (a + 1) % frameCount, mix: phase - a };
}
type Vector = readonly [number, number, number];
const vectorAt = (values: Float32Array, index: number): Vector => [
  values[index * 3],
  values[index * 3 + 1],
  values[index * 3 + 2],
];
const dot = (a: Vector, b: Vector) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const subtract = (a: Vector, b: Vector): Vector => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
];
const cross = (a: Vector, b: Vector): Vector => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const normalize = (v: Vector): Vector => {
  const length = Math.max(Math.hypot(...v), 1e-10);
  return [v[0] / length, v[1] / length, v[2] / length];
};
function surfaceDistribution(mesh: Equine) {
  const cumulative = new Float64Array(mesh.triangleCount),
    normals = new Float32Array(mesh.vertexCount * 3);
  let total = 0;
  for (let i = 0; i < mesh.triangleCount; i++) {
    const ids = mesh.topology.subarray(i * 3, i * 3 + 3);
    const a = vectorAt(mesh.positions, ids[0]),
      b = vectorAt(mesh.positions, ids[1]),
      c = vectorAt(mesh.positions, ids[2]);
    const n = cross(subtract(b, a), subtract(c, a));
    total += Math.hypot(...n) / 2;
    cumulative[i] = total;
    for (const index of ids)
      for (let axis = 0; axis < 3; axis++) normals[index * 3 + axis] += n[axis];
  }
  if (total <= 0) throw new RangeError("Source surface has zero area");
  for (let i = 0; i < mesh.vertexCount; i++)
    normals.set(normalize(vectorAt(normals, i)), i * 3);
  return { cumulative, normals, total };
}
function attachedCoordinates(
  mesh: Equine,
  ids: Uint32Array,
  u: number,
  v: number,
  normals: Float32Array,
) {
  const a = vectorAt(mesh.positions, ids[0]),
    b = vectorAt(mesh.positions, ids[1]),
    c = vectorAt(mesh.positions, ids[2]);
  const tangent = normalize(subtract(b, a)),
    normal = normalize(cross(subtract(b, a), subtract(c, a))),
    bitangent = cross(normal, tangent);
  const na = vectorAt(normals, ids[0]),
    nb = vectorAt(normals, ids[1]),
    nc = vectorAt(normals, ids[2]),
    w = 1 - u - v;
  const smooth = normalize([
    na[0] * u + nb[0] * v + nc[0] * w,
    na[1] * u + nb[1] * v + nc[1] * w,
    na[2] * u + nb[2] * v + nc[2] * w,
  ]);
  return {
    rest: [
      a[0] * u + b[0] * v + c[0] * w,
      a[1] * u + b[1] * v + c[1] * w,
      a[2] * u + b[2] * v + c[2] * w,
    ],
    normal: [dot(smooth, tangent), dot(smooth, bitangent), dot(smooth, normal)],
  };
}
export function sampleSurface(mesh: Equine, count: number, seed = 71) {
  if (!Number.isInteger(count) || count < 1 || count > 200000)
    throw new RangeError("Particle count must be an integer from 1 to 200000");
  const { cumulative, normals, total } = surfaceDistribution(mesh);
  const triangles = new Float32Array(count * 3),
    weights = new Float32Array(count * 2),
    seeds = new Float32Array(count),
    brightness = new Float32Array(count),
    normalCoefficients = new Float32Array(count * 3),
    restPoints = new Float32Array(count * 3);
  const random = randomSource(seed);
  for (let i = 0; i < count; i++) {
    const area = random() * total;
    let low = 0,
      high = mesh.triangleCount - 1;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (cumulative[mid] < area) low = mid + 1;
      else high = mid;
    }
    const ids = mesh.topology.subarray(low * 3, low * 3 + 3);
    triangles.set(ids, i * 3);
    const root = Math.sqrt(random()),
      v = random(),
      u = 1 - root,
      w = root * v;
    weights.set([u, w], i * 2);
    seeds[i] = random();
    brightness[i] = 0.65 + random() * 0.35;
    const coordinates = attachedCoordinates(mesh, ids, u, w, normals);
    restPoints.set(coordinates.rest, i * 3);
    normalCoefficients.set(coordinates.normal, i * 3);
  }
  return {
    triangles,
    weights,
    seeds,
    brightness,
    normalCoefficients,
    restPoints,
  };
}
