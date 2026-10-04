import { describe,it,expect } from 'vitest';
import { generateWind } from '../src/wind';
describe('wind stream generation',()=>{
 it('generates deterministic seeded streams',()=>{expect(generateWind(128,71)).toEqual(generateWind(128,71));expect(generateWind(128,71).positions).not.toEqual(generateWind(128,72).positions);});
 it('keeps six finite peripheral stream anchors and bounded phases',()=>{const cloud=generateWind(2048);expect(cloud.positions).toHaveLength(6144);expect(cloud.phases).toHaveLength(2048);const streams=new Set<number>();for(let i=0;i<2048;i++){streams.add(cloud.streams[i]);expect(cloud.positions[i*3]).toBeGreaterThanOrEqual(-18);expect(cloud.positions[i*3]).toBeLessThan(18);expect(cloud.positions[i*3+1]).toBeGreaterThanOrEqual(.05);expect(cloud.positions[i*3+1]).toBeLessThanOrEqual(1.5);expect(Math.abs(cloud.positions[i*3+2])).toBeGreaterThan(.55);expect(Math.abs(cloud.positions[i*3+2])).toBeLessThan(5);expect(cloud.phases[i]).toBeGreaterThanOrEqual(0);expect(cloud.phases[i]).toBeLessThan(1);}expect([...streams].sort()).toEqual([0,1,2,3,4,5]);expect(cloud.positions.every(Number.isFinite)).toBe(true);});
 it('rejects invalid populations',()=>{for(const count of [0,-1,1.5,NaN,20001])expect(()=>generateWind(count)).toThrow(RangeError);});
});
