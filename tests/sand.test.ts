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

test('terrain forms deep contours outside a calibrated hoof corridor',async()=>{
 const {terrainHeight,generateSandLayer}=await import('../src/sand');
 for(let x=-9;x<9;x+=.25){expect(terrainHeight(x,.15)).toBeGreaterThan(-.024);expect(terrainHeight(x,.15)).toBeLessThan(-.016);}
 const layer=generateSandLayer(3000,'near',17),heights=[];
 for(let i=0;i<3000;i++)if(Math.abs(layer.positions[i*3+2])>.5)heights.push(layer.positions[i*3+1]);
 expect(Math.max(...heights)-Math.min(...heights)).toBeGreaterThan(.07);expect(Math.max(...heights)).toBeLessThan(0);
 expect(()=>terrainHeight(NaN,0)).toThrow(RangeError);expect(()=>terrainHeight(0,Infinity)).toThrow(RangeError);
});

test('seeded grain patches have a denser spacing distribution than uniform coverage',async()=>{
 const {generateSandLayer}=await import('../src/sand');const patch=generateSandLayer(1000,'near',29),uniform=generateSand(1000,29);
 const nearest=(points:Float32Array,scaleX=1,scaleZ=1)=>Array.from({length:100},(_,i)=>{let distance=Infinity;for(let j=0;j<1000;j++){if(i===j)continue;distance=Math.min(distance,Math.hypot((points[i*3]-points[j*3])*scaleX,(points[i*3+2]-points[j*3+2])*scaleZ));}return distance;}).sort((a,b)=>a-b);
 const a=nearest(patch.positions),b=nearest(uniform.positions,.5,2.1/11);expect(a[50]).toBeLessThan(b[50]*.7);expect(a[90]).toBeGreaterThan(a[10]*3);
});
