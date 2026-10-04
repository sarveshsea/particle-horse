import {describe,it,expect} from 'vitest';
import {generateRabbit,rabbitFrame,rabbitPoint,rabbitRoute} from '../src/rabbit';
describe('particle rabbits',()=>{
 it('seeded anatomical surface is deterministic and bounded',()=>{const a=generateRabbit(300,19),b=generateRabbit(300,19);expect(a).toEqual(b);expect(a.positions.length).toBe(900);expect([...a.positions,...a.seeds,...a.parts].every(Number.isFinite)).toBe(true);expect(()=>generateRabbit(0)).toThrow();});
 it('bounding cycle is continuous and roots follow ground',()=>{for(let t=0;t<2;t+=.01){const f=rabbitFrame(t);expect(f.bounce).toBeGreaterThanOrEqual(0);expect(f.bounce).toBeLessThan(.16);for(const leg of f.feet)expect(leg[1]).toBeGreaterThanOrEqual(0);}expect(rabbitFrame(0)).toEqual(rabbitFrame(.55));const before=rabbitFrame(.55-1e-6),after=rabbitFrame(.55+1e-6);expect(Math.abs(before.bounce-after.bounce)).toBeLessThan(.0001);});
 it('finite posed surface maintains recognizable ear and torso scales',()=>{const a=generateRabbit(500);const points=Array.from({length:500},(_,i)=>rabbitPoint([a.positions[i*3],a.positions[i*3+1],a.positions[i*3+2]],a.parts[i],.19));expect(points.flat().every(Number.isFinite)).toBe(true);expect(Math.max(...points.map(p=>p[1]))).toBeGreaterThan(.4);expect(Math.max(...points.map(p=>p[1]))).toBeLessThan(.75);});
 it('routes move opposite the horse and fade entry instead of popping',()=>{const a=rabbitRoute(0,1),b=rabbitRoute(.01,1);expect(b.x).toBeLessThan(a.x);expect(a.speed).toBeLessThan(0);expect(a.z).toBeGreaterThan(.8);for(let t=0;t<30;t+=.1){const r=rabbitRoute(t,0);expect(r.alpha).toBeGreaterThanOrEqual(0);expect(r.alpha).toBeLessThanOrEqual(1);expect(Number.isFinite(r.x)).toBe(true);}expect(()=>rabbitRoute(NaN,0)).toThrow();});
});

import * as THREE from 'three';
import {createRabbits} from '../src/rabbit-render';
describe('rabbit meadow integration',()=>{
 it('tracks terrain, keeps all rabbits under adaptive density and disposes',()=>{const scene=new THREE.Scene(),r=createRabbits(scene,false,{},(x,z)=>x*.01+z*.02);r.update(1,2);const d=r.diagnostics();expect(d.count).toBe(3);expect(d.particles).toBe(36000);for(const p of d.positions)expect(p.y).toBeCloseTo(p.x*.01+p.z*.02);r.setQuality(.55);expect(r.points.geometry.drawRange.count).toBe(19800);r.update(5,1,true);expect(r.diagnostics().positions.every(p=>p.speed===0)).toBe(true);expect(()=>r.update(Infinity,1)).toThrow();expect(()=>r.setQuality(NaN)).toThrow();r.dispose();expect(scene.children).toHaveLength(0);});
 it('compact scene uses two rabbits with finite zero-terrain roots',()=>{const r=createRabbits(new THREE.Scene(),true);r.update(0,1);expect(r.diagnostics().count).toBe(2);expect(r.diagnostics().positions.every(p=>p.y===0)).toBe(true);r.dispose();});
 it('stance foot keeps material ground speed while root runs oppositely',()=>{const t=.03,a=rabbitFrame(t),b=rabbitFrame(t+.00001);expect((b.feet[2][0]-a.feet[2][0])/.00001).toBeCloseTo(2.6,4);expect(rabbitPoint([0,0,0],2,0).every(Number.isFinite)).toBe(true);expect(()=>rabbitFrame(NaN)).toThrow();expect(()=>generateRabbit(1,NaN)).toThrow();expect(()=>rabbitRoute(0,4)).toThrow();});
});

describe('rabbit anatomical depth',()=>{
 it('surface normals are deterministic finite unit vectors for all body parts',()=>{const a=generateRabbit(1600,29),b=generateRabbit(1600,29);expect(a.normals).toEqual(b.normals);expect(a.normals.length).toBe(4800);for(let i=0;i<1600;i++)expect(Math.hypot(...a.normals.subarray(i*3,i*3+3))).toBeCloseTo(1,5);});
});
it('reduced-motion rabbits remain within portrait horse framing',()=>{const r=createRabbits(new THREE.Scene(),true);r.update(0,1,true);expect(r.diagnostics().positions.some(p=>Math.abs(p.x)<1.8)).toBe(true);r.dispose();});
