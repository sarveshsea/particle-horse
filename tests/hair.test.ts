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
 expect(root[1]).toBeGreaterThan(1);expect(root[1]).toBeLessThan(1.03);
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
 expect(renderer.lines.material.blending).toBe(THREE.NormalBlending);
 expect(renderer.material.blending).toBe(THREE.NormalBlending);
 const highlights=renderer.geometry.getAttribute('highlight');
 expect(highlights).toBeDefined();
 expect(Array.from(highlights.array).filter(value=>value>0).length).toBeLessThan(640*48*.15);
 expect(renderer.lines.geometry.getIndex()!.count).toBe(640*47*2);
 expect(renderer.lines.material.uniforms.hairTime).toBe(renderer.material.uniforms.hairTime);
 expect(renderer.lines.material.uniforms.hairAtlas).toBe(renderer.material.uniforms.hairAtlas);
 renderer.update(.2,{point:new THREE.Vector3(1,2,3),direction:new THREE.Vector3(1,0,0),strength:.8},1.5);
 expect(renderer.material.uniforms.wakePointer).toBe(shared.wakePointer);
 expect(shared.wakePointer.value.x).toBe(1);
 expect(renderer.material.uniforms.hairTime.value).toBe(.2);
 renderer.update(NaN,undefined,NaN);expect(renderer.material.uniforms.hairTime.value).toBe(0);
 renderer.setQuality(.5);expect(renderer.geometry.drawRange.count).toBe(320*48);expect(renderer.lines.geometry.drawRange.count).toBe(320*47*2);
 renderer.setQuality(NaN);expect(renderer.geometry.drawRange.count).toBe(640*48);
 renderer.dispose();expect(scene.children).toHaveLength(0);
});
test('hair coordinates reject nonfinite times and clamp strand endpoints',()=>{
 const strand=generateHair(1,2).strand;
 expect(()=>hairPoint(guide,NaN,1,strand)).toThrow();expect(()=>hairPoint(guide,0,NaN,strand)).toThrow();
 expect(hairPoint(guide,0,-1,strand)).toEqual(hairPoint(guide,0,0,strand));
 expect(hairPoint(guide,0,2,strand)).toEqual(hairPoint(guide,0,1,strand));
});

test('root bundle grows from a small croup footprint while neighboring strand samples are continuous',()=>{
 const cloud=generateHair(32,48),roots=[];
 for(let i=0;i<32;i++){
  const strand=cloud.strand.slice(i*48*4,i*48*4+4),root=hairPoint(guide,0,0,strand);
  roots.push(root.join(','));
  expect(Math.hypot(root[0],root[1]-1,root[2])).toBeLessThan(.03);
  expect(root[1]).toBeGreaterThanOrEqual(1);
  const next=hairPoint(guide,0,.001,strand);
  expect(Math.hypot(...next.map((x,a)=>x-root[a]))).toBeLessThan(.003);
 }
 expect(new Set(roots).size).toBe(32);
});

test('proximal strands spread before the long trailing hair without collapsing into a cord',()=>{
 const cloud=generateHair(100,48);let minZ=Infinity,maxZ=-Infinity;
 for(let i=0;i<100;i++){const strand=cloud.strand.slice(i*48*4,i*48*4+4);const point=hairPoint(guide,0,.2,strand);minZ=Math.min(minZ,point[2]);maxZ=Math.max(maxZ,point[2]);}
 expect(maxZ-minZ).toBeGreaterThan(.07);
});

test('hair opens into a continuous bundle immediately beyond the dock',()=>{
 const cloud=generateHair(200,48);let minZ=Infinity,maxZ=-Infinity;
 for(let i=0;i<200;i++){const strand=cloud.strand.slice(i*48*4,i*48*4+4);const point=hairPoint(guide,0,.1,strand);minZ=Math.min(minZ,point[2]);maxZ=Math.max(maxZ,point[2]);
 expect(Math.abs(point[2])).toBeLessThan(.15);}
 expect(maxZ-minZ).toBeGreaterThan(.05);
});
