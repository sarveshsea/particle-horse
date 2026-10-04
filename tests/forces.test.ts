import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { extractHooves, hoofAt, contactStrength, advanceImpacts } from '../src/forces';
import { decodeEquine } from '../src/equine';
const meta=JSON.parse(readFileSync('public/equine/metadata.json','utf8'));
const bytes=readFileSync('public/equine/frames.f32');
const indices=readFileSync('public/equine/topology.u32');
const mesh=decodeEquine(meta,new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),new Uint32Array(indices.buffer.slice(indices.byteOffset,indices.byteOffset+indices.byteLength)));
describe('hoof forces',()=>{
 it('extracts four independent anatomical tracks',()=>{const tracks=extractHooves(mesh);expect(tracks).toHaveLength(4);expect(new Set(tracks.flatMap(t=>t.vertices)).size).toBe(64);expect(extractHooves(mesh)).toEqual(tracks);});
 it('interpolates continuously across the stride seam',()=>{for(const track of extractHooves(mesh)){const a=hoofAt(mesh,track,0),b=hoofAt(mesh,track,mesh.cycleSeconds-1e-6);expect(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)).toBeLessThan(.001);}});
 it('has grounded forces and no airborne forces',()=>{for(const track of extractHooves(mesh)){let hits=0;for(let i=0;i<240;i++){const p=hoofAt(mesh,track,i*mesh.cycleSeconds/240);const f=contactStrength(p,track);expect(f).toBeGreaterThanOrEqual(0);expect(f).toBeLessThanOrEqual(1);if(p.y>track.floor+.08)expect(f).toBe(0);if(f>0)hits++;}expect(hits).toBeGreaterThan(0);expect(hits).toBeLessThan(240);}});
 it('bounds and expires impacts without mutating the old pool',()=>{const old=[{x:0,z:0,born:0,strength:1}];const added=Array.from({length:40},(_,i)=>({x:i,z:0,born:1,strength:1}));const result=advanceImpacts(old,added,1);expect(result).toHaveLength(24);expect(old).toHaveLength(1);expect(advanceImpacts(result,[],4)).toHaveLength(0);expect(()=>advanceImpacts([],[],NaN)).toThrow();});
 it('rejects invalid times',()=>{expect(()=>hoofAt(mesh,extractHooves(mesh)[0],NaN)).toThrow();});
});
