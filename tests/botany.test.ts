import { describe,it,expect } from 'vitest';
import { botanicalColor, grassBlade, petalSurface, leafSurface } from '../src/botany';
describe('sculptural botanical sampling',()=>{
 it('seeds a bounded natural linear palette with distinct flower species',()=>{
  const colors=Array.from({length:4},(_,i)=>botanicalColor('petal',i,.8,.3));
  expect(new Set(colors.map(c=>c.join(','))).size).toBe(4);
  expect(botanicalColor('grass',0,.9,.4)).toEqual(botanicalColor('grass',0,.9,.4));
  for(const kind of ['grass','leaf','stem','petal','pollen'] as const)for(let i=0;i<4;i++)for(const h of [0,.5,1]){
   const color=botanicalColor(kind,i,h,.7);expect(color.every(v=>Number.isFinite(v)&&v>=0&&v<=1)).toBe(true);
  }
  const root=botanicalColor('grass',0,0,.4),tip=botanicalColor('grass',0,1,.4);
  expect(tip[1]).toBeGreaterThan(root[1]);expect(tip[1]).toBeGreaterThan(tip[0]);
 });
 it('anchors curved grass roots and tapers narrow blade samples',()=>{
  expect(grassBlade(.14,.3,0,0)).toEqual([0,0,0]);
  expect(grassBlade(.14,.3,1,1)).toEqual(grassBlade(.14,.3,1,-1));
  for(let i=0;i<=10;i++)expect(grassBlade(.14,.3,i/10,.5).every(Number.isFinite)).toBe(true);
 });
 it('samples five cupped petal surfaces and narrow elliptical leaves without spherical clouds',()=>{
  for(let petal=0;petal<5;petal++)for(const u of [0,.5,1])for(const v of [-1,0,1])expect(petalSurface(.045,.2,petal,u,v).every(Number.isFinite)).toBe(true);
  const root=leafSurface([.1,.2,.03],.05,.4,0,1),tip=leafSurface([.1,.2,.03],.05,.4,1,1);
  expect(root).toEqual([.1,.2,.03]);expect(tip).toEqual(leafSurface([.1,.2,.03],.05,.4,1,-1));
  expect(()=>grassBlade(NaN,.3,0,0)).toThrow();expect(()=>botanicalColor('grass',0,Infinity,.1)).toThrow();
 });
});
