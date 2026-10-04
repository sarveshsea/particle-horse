import { expect, test } from 'vitest';
import { gait, CYCLE } from '../src/gait';
const distance=(a:readonly number[],b:readonly number[])=>Math.hypot(...a.map((v,i)=>v-b[i]));
test('gallop loops continuously including every support/swing transition',()=>{
 for(const t of [0,.4*CYCLE,.12*CYCLE,.52*CYCLE,.56*CYCLE,.96*CYCLE,CYCLE]) {
  const a=gait(t-1e-6),b=gait(t+1e-6);
  for(let i=0;i<4;i++)expect(distance(a.legs[i].hoof,b.legs[i].hoof)).toBeLessThan(.001);
 }
 expect(gait(0)).toEqual(gait(CYCLE));
});
test('all joints remain finite and limb lengths remain constrained throughout a cycle',()=>{
 for(let t=0;t<CYCLE;t+=.005)for(const leg of gait(t).legs){
  expect([...leg.hip,...leg.knee,...leg.ankle,...leg.hoof].every(Number.isFinite)).toBe(true);
  expect(distance(leg.hip,leg.knee)).toBeCloseTo(leg.upper,6);
  expect(distance(leg.knee,leg.ankle)).toBeCloseTo(leg.lower,6);
  expect(leg.hoof[1]).toBeGreaterThanOrEqual(.02-1e-8);
 }
});
test('has contact, lifted legs and a full suspension phase',()=>{
 const poses=Array.from({length:200},(_,i)=>gait(i*CYCLE/200));
 expect(poses.some(p=>p.legs.every(l=>!l.contact))).toBe(true);
 expect(poses.some(p=>p.legs.some(l=>l.contact))).toBe(true);
 expect(poses.some(p=>p.legs.some(l=>l.hoof[1]>.6))).toBe(true);
});
test('does not share mutable pose state',()=>{expect(gait(.1)).not.toBe(gait(.1));});
test.each([NaN,Infinity,-Infinity])('rejects nonfinite time %s', t=>expect(()=>gait(t)).toThrow(RangeError));
test('negative time wraps to the same pose',()=>expect(gait(-CYCLE)).toEqual(gait(0)));
