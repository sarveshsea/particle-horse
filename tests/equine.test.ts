import { expect, test } from "vitest";
import { decodeEquine, sampleSurface, frameAt } from "../src/equine";
const metadata = {
  vertexCount: 4,
  triangleCount: 2,
  frameCount: 2,
  cycleSeconds: 0.62,
};
const positions = new Float32Array([
  0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0.1, 0, 1, 0.1, 0, 0, 1.1, 0, 1, 1.1,
  0,
]);
const topology = new Uint32Array([0, 1, 2, 1, 3, 2]);
const fixture = () => decodeEquine(metadata, positions, topology);
test("validates complete coherent animation topology", () => {
  expect(fixture().vertexCount).toBe(4);
  expect(() =>
    decodeEquine({ ...metadata, vertexCount: 3 }, positions, topology),
  ).toThrow();
  expect(() =>
    decodeEquine(metadata, positions, new Uint32Array([0, 1, 9, 1, 3, 2])),
  ).toThrow();
  const invalid = positions.slice();
  invalid[2] = NaN;
  expect(() => decodeEquine(metadata, invalid, topology)).toThrow();
});
test.each([0, -1, NaN, 65])("rejects invalid frame counts %s", (frameCount) =>
  expect(() =>
    decodeEquine({ ...metadata, frameCount }, positions, topology),
  ).toThrow(),
);
test.each([0, -1, Infinity])(
  "rejects invalid cycle duration %s",
  (cycleSeconds) =>
    expect(() =>
      decodeEquine({ ...metadata, cycleSeconds }, positions, topology),
    ).toThrow(),
);
test("seeded particles stay attached to triangle barycentric coordinates", () => {
  const a = sampleSurface(fixture(), 1000, 77),
    b = sampleSurface(fixture(), 1000, 77),
    c = sampleSurface(fixture(), 1000, 78);
  expect(a).toEqual(b);
  expect(a.seeds).not.toEqual(c.seeds);
  for (let i = 0; i < 1000; i++) {
    const u = a.weights[i * 2],
      v = a.weights[i * 2 + 1];
    expect(u).toBeGreaterThanOrEqual(0);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(u + v).toBeLessThanOrEqual(1.000001);
  }
  expect(new Set(a.triangles)).toEqual(new Set([0, 1, 2, 3]));
});
test("area sampling respects unequal triangle areas", () => {
  const p = new Float32Array([
    0, 0, 0, 1, 0, 0, 0, 1, 0, 3, 0, 0, 7, 0, 0, 3, 1, 0,
  ]);
  const m = decodeEquine(
    { vertexCount: 6, triangleCount: 2, frameCount: 1, cycleSeconds: 1 },
    p,
    new Uint32Array([0, 1, 2, 3, 4, 5]),
  );
  const cloud = sampleSurface(m, 10000, 21);
  let large = 0;
  for (let i = 0; i < 10000; i++) if (cloud.triangles[i * 3] >= 3) large++;
  expect(large / 10000).toBeCloseTo(0.8, 1);
});
test.each([0, -1, 1.5, NaN, 200001])("rejects invalid cloud size %s", (count) =>
  expect(() => sampleSurface(fixture(), count, 1)).toThrow(),
);
test("rejects a zero-area source", () => {
  const m = decodeEquine(
    { vertexCount: 3, triangleCount: 1, frameCount: 1, cycleSeconds: 1 },
    new Float32Array(9),
    new Uint32Array([0, 1, 2]),
  );
  expect(() => sampleSurface(m, 100, 1)).toThrow();
});
test("interpolation traverses every frame and joins the last to the first", () => {
  expect(frameAt(0, 24, 0.62)).toEqual({ a: 0, b: 1, mix: 0 });
  expect(frameAt(0.62, 24, 0.62)).toEqual({ a: 0, b: 1, mix: 0 });
  expect(frameAt(-0.01, 24, 0.62).a).toBe(23);
  const a = frameAt(0.62 - 1e-8, 24, 0.62),
    b = frameAt(0.62 + 1e-8, 24, 0.62);
  expect(a.mix).toBeGreaterThan(0.999);
  expect(b.mix).toBeLessThan(0.001);
});
test.each([NaN, Infinity])("rejects invalid animation time %s", (t) =>
  expect(() => frameAt(t, 24, 0.62)).toThrow(),
);

test("published equine assets preserve finite, shared topology across the entire stride", async () => {
  const { readFileSync } = await import("node:fs");
  const metadata = JSON.parse(
    readFileSync(
      new URL("../public/equine/metadata.json", import.meta.url),
      "utf8",
    ),
  );
  const p = readFileSync(
    new URL("../public/equine/frames.f32", import.meta.url),
  );
  const t = readFileSync(
    new URL("../public/equine/topology.u32", import.meta.url),
  );
  const mesh = decodeEquine(
    metadata,
    new Float32Array(p.buffer, p.byteOffset, p.byteLength / 4),
    new Uint32Array(t.buffer, t.byteOffset, t.byteLength / 4),
  );
  expect(mesh.frameCount).toBe(24);
  expect(mesh.vertexCount).toBe(8431);
  expect(mesh.positions.slice(0, mesh.vertexCount * 3)).not.toEqual(
    mesh.positions.slice(mesh.vertexCount * 3, mesh.vertexCount * 6),
  );
  const cloud = sampleSurface(mesh, 2000, 41);
  expect(cloud.triangles.length).toBe(6000);
});

test('surface samples carry finite smooth normals and attached fiber coordinates',()=>{
 const cloud=sampleSurface(fixture(),1000,19);
 expect(cloud.normalCoefficients.length).toBe(3000);
 expect(cloud.restPoints.length).toBe(3000);
 expect([...cloud.normalCoefficients,...cloud.restPoints].every(Number.isFinite)).toBe(true);
 for(let i=0;i<1000;i++)expect(Math.hypot(...cloud.normalCoefficients.slice(i*3,i*3+3))).toBeCloseTo(1,5);
});
