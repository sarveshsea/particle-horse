import { describe, expect, it } from 'vitest';
import { advanceWake, wakeForce } from '../src/wake';
describe('bounded particle wake', () => {
 it('rejects nonfinite state and time', () => {
 expect(()=>advanceWake({offset:[NaN,0,0],velocity:[0,0,0]},[0,0,0],.01)).toThrow();
 expect(()=>advanceWake({offset:[0,0,0],velocity:[0,0,0]},[0,0,0],-1)).toThrow();
 });
 it('caps displacement and settles within two seconds', () => {
 let state = {offset:[0,0,0] as readonly [number,number,number],velocity:[0,0,0] as readonly [number,number,number]};
 for(let i=0;i<60;i++) state=advanceWake(state,[100,70,-40],1/120);
 expect(Math.hypot(...state.offset)).toBeLessThanOrEqual(.800001);
 for(let i=0;i<240;i++) state=advanceWake(state,[0,0,0],1/120);
 expect(Math.hypot(...state.offset)).toBeLessThan(.003);
 });
 it('is local and finite at the pointer center',()=>{
 expect(wakeForce([2,0,0],[0,0,0],[1,0,0],1)).toEqual([0,0,0]);
 expect(wakeForce([0,0,0],[0,0,0],[1,0,0],1).every(Number.isFinite)).toBe(true);
 expect(wakeForce([.1,0,0],[0,0,0],[1,0,0],0)).toEqual([0,0,0]);
 });
 it('does not mutate its inputs and is consistent across small steps',()=>{
 const initial={offset:[.3,.1,0] as const,velocity:[0,0,0] as const};
 const a=advanceWake(initial,[0,0,0],1/120);
 expect(initial.offset).toEqual([.3,.1,0]);
 const b=advanceWake(advanceWake(initial,[0,0,0],1/240),[0,0,0],1/240);
 expect(Math.abs(a.offset[0]-b.offset[0])).toBeLessThan(.001);
 });
});
