import {describe,it,expect} from 'vitest';
import {dirtLaunch,dirtPoint,dirtPigment} from '../src/dirt';
import {worldHeight} from '../src/terrain';
describe('soil clods',()=>{
 it('uses predominantly low clods with scrape and sparse tall grain populations',()=>{let low=0,scrape=0,tall=0;for(let i=0;i<1000;i++){const p=dirtLaunch(i/1000,1);expect(p.x).toBeLessThan(0);if(p.y<1.2)scrape++;else if(p.y<=3)low++;else tall++;}expect(scrape).toBe(200);expect(low).toBe(650);expect(tall).toBe(150);});
 it('launches from actual terrain and settles on advected hills',()=>{const hit={x:.5,z:.2,born:2,strength:.8};for(const seed of [.05,.7,.9]){const p=dirtPoint(hit,0,seed);expect(p.y).toBeCloseTo(worldHeight(hit.x,hit.z,hit.born)+.004);const settled=dirtPoint(hit,1.5,seed);expect(settled.y).toBeCloseTo(worldHeight(settled.x,settled.z,3.5)+.002);expect(settled.x).toBeLessThan(hit.x-9);expect(Object.values(settled).every(Number.isFinite)).toBe(true);}});
 it('pigments fragments green or warm earth without white bleaching',()=>{for(let i=0;i<100;i++){const c=dirtPigment(i/100);expect(c.every(v=>Number.isFinite(v)&&v>=0&&v<.5)).toBe(true);}expect(dirtPigment(.9)[0]).toBeGreaterThan(dirtPigment(.9)[2]);});
 it('rejects invalid coordinates, energy and lifetime inputs',()=>{expect(()=>dirtPoint({x:NaN,z:0,born:0,strength:1},.2,.2)).toThrow();expect(()=>dirtLaunch(.2,Infinity)).toThrow();expect(()=>dirtPoint({x:0,z:0,born:0,strength:1},-.1,.2)).toThrow();expect(()=>dirtPigment(2)).toThrow();});
});
