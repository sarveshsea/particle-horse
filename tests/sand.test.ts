import { expect, test } from "vitest";
import { generateSand } from "../src/sand";
test("white sand geometry is deterministic and irregular rather than a lattice", () => {
  const a = generateSand(1000, 17),
    b = generateSand(1000, 17),
    c = generateSand(1000, 18);
  expect(a).toEqual(b);
  expect(a.positions).not.toEqual(c.positions);
  expect(
    new Set(Array.from(a.positions).filter((_, i) => i % 3 === 0)).size,
  ).toBeGreaterThan(950);
});
test("grains stay within a finite shallow ground bed", () => {
  const sand = generateSand(1000, 19);
  expect(sand.positions.length).toBe(3000);
  expect([...sand.positions].every(Number.isFinite)).toBe(true);
  for (let i = 0; i < 1000; i++) {
    expect(Math.abs(sand.positions[i * 3])).toBeLessThan(18);
    expect(Math.abs(sand.positions[i * 3 + 2])).toBeLessThan(11);
    expect(sand.positions[i * 3 + 1]).toBeGreaterThan(-0.053);
    expect(sand.positions[i * 3 + 1]).toBeLessThan(0);
    expect(sand.sizes[i]).toBeGreaterThanOrEqual(0.6);
    expect(sand.sizes[i]).toBeLessThan(1.4);
  }
});
test.each([0, -1, NaN, 1.5, 150001])(
  "rejects invalid sand population %s",
  (count) => expect(() => generateSand(count, 1)).toThrow(),
);

test('three seeded depth bands preserve near-ground detail and distinct extents',async()=>{
 const {generateSandLayer}=await import('../src/sand');
 for(const layer of ['near','middle','far'] as const){
  const cloud=generateSandLayer(1000,layer,17);expect(cloud).toEqual(generateSandLayer(1000,layer,17));expect(cloud.positions.every(Number.isFinite)).toBe(true);
  for(let i=0;i<1000;i++){const z=Math.abs(cloud.positions[i*3+2]);if(layer==='near')expect(z).toBeLessThanOrEqual(2.1);else if(layer==='middle'){expect(z).toBeGreaterThanOrEqual(2.1);expect(z).toBeLessThanOrEqual(6.5);}else{expect(z).toBeGreaterThanOrEqual(6.5);expect(z).toBeLessThanOrEqual(11);}expect(cloud.positions[i*3+1]).toBeLessThan(0);}
 }
});
