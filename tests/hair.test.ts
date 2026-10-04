import { expect,test } from 'vitest';
import { generateHair, hairPoint } from '../src/hair';
const guideCount=4;
const tailGuide=new Float32Array([0,1,0,-.3,1,0,-.6,1,0,-1,1,0, 0,1.1,0,-.3,1.1,0,-.6,1.1,0,-1,1.1,0]);
const guide={tailGuide,guideCount,mesh:{frameCount:2,cycleSeconds:.62}};
test('hair generation is seeded, tapered, length-varied and finite',()=>{
 const a=generateHair(200,32,71),b=generateHair(200,32,71);
 expect(a).toEqual(b);expect(a.positions.length).toBe(200*32*3);
 expect(a.strand.every(Number.isFinite)).toBe(true);
 expect(new Set(a.strand.filter((_,i)=>i%4===1)).size).toBeGreaterThan(100);
 expect(()=>generateHair(0,32)).toThrow();expect(()=>generateHair(10,1)).toThrow();
});
test('strand roots remain anchored and the gait loop is continuous',()=>{
 const hair=generateHair(10,32);
 const root=hairPoint(guide,0,0,hair.strand.slice(0,4));
 expect(root[1]).toBeCloseTo(1,5);
 expect(hairPoint(guide,.62,0,hair.strand.slice(0,4))).toEqual(root);
 const tip=hairPoint(guide,0,1,hair.strand.slice(0,4));expect(tip.every(Number.isFinite)).toBe(true);
 expect(tip[1]).toBeLessThan(root[1]);
 const a=hairPoint(guide,.62-1e-8,1,hair.strand.slice(0,4)),b=hairPoint(guide,1e-8,1,hair.strand.slice(0,4));
 expect(Math.hypot(...a.map((x,i)=>x-b[i]))).toBeLessThan(.00001);
});

test('hair renderer shares force uniforms, adapts complete strands, and releases its scene resources',async()=>{
 const THREE=await import('three');const {createHair}=await import('../src/hair');
 const scene=new THREE.Scene(),shared={wakePointer:{value:new THREE.Vector3()},wakeDirection:{value:new THREE.Vector3()},wakeStrength:{value:0}};
 const anatomy={...guide,faceWeights:new Float32Array(),featureWeights:new Float32Array(),tailMask:new Uint8Array(),landmarks:{eyes:[4279,5441],nostrils:[3333,4547],jaws:[3543,4758],ears:[3876,5088]},mesh:{...guide.mesh,vertexCount:3,triangleCount:1,positions:new Float32Array(18),topology:new Uint32Array([0,1,2])}} as Parameters<typeof createHair>[1];
 const renderer=createHair(scene,anatomy,shared);
 expect(scene.children).toContain(renderer.points);
 renderer.update(.2,{point:new THREE.Vector3(1,2,3),direction:new THREE.Vector3(1,0,0),strength:.8},1.5);
 expect(renderer.material.uniforms.wakePointer).toBe(shared.wakePointer);
 expect(shared.wakePointer.value.x).toBe(1);
 expect(renderer.material.uniforms.hairTime.value).toBe(.2);
 renderer.update(NaN,undefined,NaN);expect(renderer.material.uniforms.hairTime.value).toBe(0);
 renderer.setQuality(.5);expect(renderer.geometry.drawRange.count).toBe(320*48);
 renderer.setQuality(NaN);expect(renderer.geometry.drawRange.count).toBe(640*48);
 renderer.dispose();expect(scene.children).toHaveLength(0);
});
test('hair coordinates reject nonfinite times and clamp strand endpoints',()=>{
 const strand=generateHair(1,2).strand;
 expect(()=>hairPoint(guide,NaN,1,strand)).toThrow();expect(()=>hairPoint(guide,0,NaN,strand)).toThrow();
 expect(hairPoint(guide,0,-1,strand)).toEqual(hairPoint(guide,0,0,strand));
 expect(hairPoint(guide,0,2,strand)).toEqual(hairPoint(guide,0,1,strand));
});
