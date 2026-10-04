import {expect,test} from 'vitest';
import {particleAge,qualityForFrame,gridOffset} from '../src/dynamics';
test('particle lifetimes wrap and remain bounded',()=>{
 for(let t=-2;t<5;t+=.02){const age=particleAge(t,.31,.65);expect(age).toBeGreaterThanOrEqual(0);expect(age).toBeLessThan(.65);}
 expect(particleAge(.2,.3,.5)).toBeCloseTo(particleAge(.7,.3,.5));
});
test.each([0,-1,Infinity,NaN])('rejects invalid lifetime %s',n=>expect(()=>particleAge(1,0,n)).toThrow());
test('quality falls on slow frames and recovers conservatively',()=>{
 expect(qualityForFrame(1,40)).toBeLessThan(1);
 expect(qualityForFrame(.5,12)).toBeGreaterThan(.5);
 expect(qualityForFrame(.5,20)).toBe(.5);
 expect(qualityForFrame(.35,100)).toBe(.35);
 expect(qualityForFrame(1,10)).toBe(1);
 expect(qualityForFrame(.5,NaN)).toBe(.5);
});
test('grid wraps without escaping its finite domain',()=>{
 for(let t=-3;t<10;t+=.1){expect(gridOffset(t,18)).toBeGreaterThanOrEqual(-9);expect(gridOffset(t,18)).toBeLessThan(9);}
 expect(gridOffset(0,18)).toBeCloseTo(gridOffset(18/12,18));
});
