import { describe,it,expect } from 'vitest';
import { generateMeadow, meadowPoint, meadowBend } from '../src/meadow';
import { terrainHeight } from '../src/sand';
const strike={id:'hoof-0-stride-0',hoof:0,born:0,x:0,y:0,z:0,strength:1,contactDuration:.18} as const;
describe('particle meadow',()=>{
 it('seeds grass, five-petal flowers and branching shrubs deterministically',()=>{
  const a=generateMeadow(80,12,6,71),b=generateMeadow(80,12,6,71);
  expect(a).toEqual(b);expect(a.grass.length).toBe(80);expect(a.flowers.length).toBe(12);expect(a.bushes.length).toBe(6);
  expect(a.flowers.every(f=>f.petals.length===5)).toBe(true);
  expect(a.bushes.every(b=>b.branches.length>=4)).toBe(true);
  for(const root of [...a.grass,...a.flowers,...a.bushes])expect(root.y).toBeCloseTo(terrainHeight(root.x,root.z),6);
 });
 it('limits populations and rejects non-finite geometry',()=>{
  expect(()=>generateMeadow(-1,2,1)).toThrow();expect(()=>generateMeadow(20001,1,1)).toThrow();
  expect(()=>generateMeadow(1,NaN,1)).toThrow();expect(()=>meadowPoint(NaN,0,0)).toThrow();
  expect(()=>meadowBend(0,0,NaN,[])).toThrow();
 });
 it('scrolls roots with terrain without changing the source',()=>{
  const source=generateMeadow(1,1,1).grass[0],before={...source};
  const at=meadowPoint(source.x,source.z,.25);expect(at.x).toBeCloseTo(source.x-1.5);expect(at.y).toBeCloseTo(terrainHeight(source.x,source.z));expect(source).toEqual(before);
  const loop=meadowPoint(source.x,source.z,6);expect(loop.x).toBeCloseTo(source.x);
 });
 it('bends locally around advected hoof strikes and recovers',()=>{
  const near=meadowBend(-.6,0,.1,[strike]),far=meadowBend(8,8,.1,[strike]);
  expect(near.flatten).toBeGreaterThan(.5);expect(far.flatten).toBe(0);expect(Math.hypot(near.x,near.z)).toBeLessThanOrEqual(1);
  const restored=meadowBend(-18,0,3,[strike]);expect(restored.flatten).toBeLessThan(.01);
  expect(meadowBend(0,0,0,[{...strike,strength:Infinity}])).toEqual({x:0,z:0,flatten:0});
 });
 it('keeps every seeded branch and petal finite and shrub heights low',()=>{
  const meadow=generateMeadow(500,60,25);
  for(const b of meadow.bushes){expect(b.height).toBeGreaterThanOrEqual(.2);expect(b.height).toBeLessThanOrEqual(.45);for(const p of b.branches)expect([p.x,p.y,p.z].every(Number.isFinite)).toBe(true);}
  for(const f of meadow.flowers)for(const p of f.petals)expect([p.x,p.y,p.z].every(Number.isFinite)).toBe(true);
 });
});
