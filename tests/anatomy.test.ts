import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { decodeEquine } from '../src/equine';
import { refineAnatomy } from '../src/anatomy';
export function asset() {
 const meta=JSON.parse(readFileSync(new URL('../public/equine/metadata.json',import.meta.url),'utf8'));
 const p=readFileSync(new URL('../public/equine/frames.f32',import.meta.url));
 const t=readFileSync(new URL('../public/equine/topology.u32',import.meta.url));
 return decodeEquine(meta,new Float32Array(p.buffer,p.byteOffset,p.byteLength/4),new Uint32Array(t.buffer,t.byteOffset,t.byteLength/4));
}
test('refinement preserves source body and correspondence without mutating its arrays',()=>{
 const source=asset(), before=source.positions.slice(), result=refineAnatomy(source);
 expect(source.positions).toEqual(before);
 expect(result.mesh.vertexCount).toBe(source.vertexCount);
 expect(result.mesh.positions.every(Number.isFinite)).toBe(true);
 let changed=0, bodyIdentical=true;
 for(let f=0;f<source.frameCount;f++)for(let v=0;v<source.vertexCount;v++){
  const offset=(f*source.vertexCount+v)*3;
  if(result.faceWeights[v]===0){for(let axis=0;axis<3;axis++)bodyIdentical &&= result.mesh.positions[offset+axis]===before[offset+axis];}
  else if(result.mesh.positions[offset+2]!==before[offset+2])changed++;
 }
 expect(bodyIdentical).toBe(true);
 expect(changed).toBeGreaterThan(1000);
});
test('tail surface is excluded from both particle and depth topology',()=>{
 const result=refineAnatomy(asset());
 expect(result.tailMask.reduce((a,b)=>a+b,0)).toBe(868);
 expect(result.mesh.triangleCount).toBeLessThan(16843);
 expect(result.mesh.topology.every(id=>result.tailMask[id]===0)).toBe(true);
 expect(result.tailGuide.length).toBe(24*result.guideCount*3);
 expect(result.tailGuide.every(Number.isFinite)).toBe(true);
});
test('facial landmarks and feature weights are local and bilateral',()=>{
 const result=refineAnatomy(asset());
 expect(result.landmarks.eyes).toHaveLength(2);
 expect(result.landmarks.nostrils).toHaveLength(2);
 expect(result.featureWeights.length).toBe(8431*4);
 expect(result.featureWeights.every(x=>x>=0&&x<=1)).toBe(true);
 for(const id of [...result.landmarks.eyes,...result.landmarks.nostrils])expect(result.faceWeights[id]).toBeGreaterThan(.5);
 expect(()=>refineAnatomy({...asset(),vertexCount:10})).toThrow();
});

test('tail guide roots attach exactly to the preserved moving body cap', () => {
 const source=asset(),result=refineAnatomy(source);
 for(let frame=0;frame<source.frameCount;frame++) {
  const root=(frame*result.guideCount)*3;
  const attachment=(frame*source.vertexCount+8430)*3;
  expect(result.tailGuide.slice(root,root+3)).toEqual(source.positions.slice(attachment,attachment+3));
 }
});

test('tail originates on central dorsal croup and its proximal dock stays near attachment height',()=>{
 const source=asset(),result=refineAnatomy(source);
 for(let f=0;f<source.frameCount;f++){
  const root=(f*source.vertexCount+10)*3,guide=f*result.guideCount*3;
  for(let a=0;a<3;a++)expect(result.tailGuide[guide+a]).toBe(source.positions[root+a]);
  expect(Math.abs(result.tailGuide[guide+2])).toBeLessThan(.02);
  for(let g=1;g<=2;g++)expect(Math.abs(result.tailGuide[guide+g*3+1]-result.tailGuide[guide+1])).toBeLessThan(.04);
 }
});
