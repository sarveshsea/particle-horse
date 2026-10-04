import { describe,it,expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { decodeEquine } from '../src/equine';
import { createContactTimeline, contactsBetween } from '../src/contacts';
const meta=JSON.parse(readFileSync('public/equine/metadata.json','utf8'));
const positions=readFileSync('public/equine/frames.f32'),topology=readFileSync('public/equine/topology.u32');
const mesh=decodeEquine(meta,new Float32Array(positions.buffer.slice(positions.byteOffset,positions.byteOffset+positions.byteLength)),new Uint32Array(topology.buffer.slice(topology.byteOffset,topology.byteOffset+topology.byteLength)));
describe('shared anatomical contact timeline',()=>{
 it('creates exactly one deterministic grounded strike per hoof per stride',()=>{const timeline=createContactTimeline(mesh);expect(timeline).toEqual(createContactTimeline(mesh));const events=contactsBetween(timeline,-1e-6,mesh.cycleSeconds-1e-6);expect(events).toHaveLength(4);expect(new Set(events.map(e=>e.hoof)).size).toBe(4);for(const e of events){expect(Number.isFinite(e.x+e.y+e.z+e.born+e.strength)).toBe(true);expect(e.y).toBeLessThan(.12);expect(e.strength).toBeGreaterThan(0);expect(e.strength).toBeLessThanOrEqual(1);expect(e.contactDuration).toBeGreaterThan(0);expect(e.contactDuration).toBeLessThan(mesh.cycleSeconds/2);}});
 it('never duplicates events across frame boundaries and preserves stride ids',()=>{const timeline=createContactTimeline(mesh);let events:ReturnType<typeof contactsBetween>=[];for(let i=0;i<180;i++)events=[...events,...contactsBetween(timeline,i*mesh.cycleSeconds/60-1e-7,(i+1)*mesh.cycleSeconds/60-1e-7)];expect(events).toHaveLength(12);expect(new Set(events.map(e=>e.id)).size).toBe(12);expect(events.map(e=>e.born)).toEqual([...events].sort((a,b)=>a.born-b.born).map(e=>e.born));});
 it('returns immutable event copies and handles rewind or idle without strikes',()=>{const timeline=createContactTimeline(mesh);expect(contactsBetween(timeline,.2,.2)).toEqual([]);expect(contactsBetween(timeline,1,0)).toEqual([]);const first=contactsBetween(timeline,0,1),again=contactsBetween(timeline,0,1);expect(first).toEqual(again);expect(first[0]).not.toBe(again[0]);});
 it('rejects invalid time windows and bounds catch-up after long gaps',()=>{const timeline=createContactTimeline(mesh);expect(()=>contactsBetween(timeline,NaN,1)).toThrow();expect(()=>contactsBetween(timeline,0,Infinity)).toThrow();expect(contactsBetween(timeline,0,1e8).length).toBeLessThanOrEqual(260);});
});
