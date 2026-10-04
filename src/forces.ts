import { frameAt, type Equine } from './equine';
export type HoofTrack = Readonly<{ vertices: readonly number[]; floor: number }>;
export type HoofPosition = Readonly<{ x: number; y: number; z: number }>;
export type Impact = Readonly<{ x: number; z: number; born: number; strength: number }>;
export const IMPACT_LIMIT = 24;
export const IMPACT_LIFETIME = 1.7;
export const WIND_GLSL = `
vec3 windAt(vec3 p,float t){
 float gust=.65+.35*sin(t*.71+1.08);
 float curl=sin(p.x*.8+p.z*1.1-t*1.4+2.71);
 return vec3(-1.3*gust+.28*curl,.12*sin(p.z*1.3-t*.9),.34*cos(p.x*.7-t*1.1)*gust);
}`;
export function extractHooves(mesh: Equine): readonly HoofTrack[] {
 const candidates: { vertex: number; meanY: number; quadrant: number }[]=[];
 for(let vertex=0;vertex<mesh.vertexCount;vertex++){
  let x=0,y=0,z=0,minY=Infinity;
  for(let f=0;f<mesh.frameCount;f++){
   const offset=(f*mesh.vertexCount+vertex)*3;
   x+=mesh.positions[offset];y+=mesh.positions[offset+1];z+=mesh.positions[offset+2];
   minY=Math.min(minY,mesh.positions[offset+1]);
  }
  if(minY<.10)candidates.push({vertex,meanY:y/mesh.frameCount,quadrant:(x/mesh.frameCount>-.35?2:0)+(z>0?1:0)});
 }
 return Array.from({length:4},(_,quadrant)=>{
  const vertices=candidates.filter(c=>c.quadrant===quadrant).sort((a,b)=>a.meanY-b.meanY).slice(0,16).map(c=>c.vertex);
  if(vertices.length<16)throw new RangeError('Incomplete anatomical hoof tracks');
  const track={vertices,floor:0};
  const floor=Math.min(...Array.from({length:mesh.frameCount},(_,f)=>hoofAt(mesh,track,f*mesh.cycleSeconds/mesh.frameCount).y));
  return {...track,floor};
 });
}
export function hoofAt(mesh: Equine,track: HoofTrack,time: number): HoofPosition {
 const frame=frameAt(time,mesh.frameCount,mesh.cycleSeconds);
 let x=0,y=0,z=0;
 for(const vertex of track.vertices){
  const a=(frame.a*mesh.vertexCount+vertex)*3,b=(frame.b*mesh.vertexCount+vertex)*3;
  x+=mesh.positions[a]*(1-frame.mix)+mesh.positions[b]*frame.mix;
  y+=mesh.positions[a+1]*(1-frame.mix)+mesh.positions[b+1]*frame.mix;
  z+=mesh.positions[a+2]*(1-frame.mix)+mesh.positions[b+2]*frame.mix;
 }
 return {x:x/track.vertices.length,y:y/track.vertices.length,z:z/track.vertices.length};
}
export function contactStrength(hoof: HoofPosition,track: HoofTrack): number {
 const height=Math.max(0,hoof.y-track.floor);
 const contact=Math.max(0,1-height/.065);
 return contact*contact*(3-2*contact);
}
export function advanceImpacts(previous: readonly Impact[],added: readonly Impact[],time: number): readonly Impact[] {
 if(!Number.isFinite(time))throw new RangeError('Impact time must be finite');
 return [...previous,...added].filter(impact=>time-impact.born<IMPACT_LIFETIME).slice(-IMPACT_LIMIT);
}
