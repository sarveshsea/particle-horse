import { frameAt, type Equine } from './equine';
export type HoofTrack = Readonly<{ vertices: readonly number[]; floor: number }>;
export type HoofPosition = Readonly<{ x: number; y: number; z: number }>;
export type Impact = Readonly<{ x: number; z: number; born: number; strength: number }>;
export const GROUND_SPEED=6;
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
 let x=0,y=Infinity,z=0;
 for(const vertex of track.vertices){
  const a=(frame.a*mesh.vertexCount+vertex)*3,b=(frame.b*mesh.vertexCount+vertex)*3;
  x+=mesh.positions[a]*(1-frame.mix)+mesh.positions[b]*frame.mix;
  y=Math.min(y,mesh.positions[a+1]*(1-frame.mix)+mesh.positions[b+1]*frame.mix);
  z+=mesh.positions[a+2]*(1-frame.mix)+mesh.positions[b+2]*frame.mix;
 }
 return {x:x/track.vertices.length,y,z:z/track.vertices.length};
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

export const SPRAY_GLSL=`
vec3 sprayPoint(vec4 hit,float age,float seed,float t,float groundSpeed){
 float angle=seed*117.3,radial=.4+fract(seed*71.)*1.9;
 vec3 origin=vec3(hit.x,-.012,hit.y);
 vec3 velocity=vec3(-.6+cos(angle)*radial,3.8+fract(seed*19.)*2.0,sin(angle)*radial*.6)*(.7+hit.w*.3);
 vec3 p=origin+velocity*age+vec3(-groundSpeed*age,-10.0*age*age,0.)+windAt(origin,t)*age*age*.7;
 p.y=max(p.y,-.014);return p;
}`;
export function sprayPoint(contact:Impact,age:number,seed:number):HoofPosition{
 if(!Number.isFinite(age)||age<0||!Number.isFinite(seed)||seed<0||seed>1||![contact.x,contact.z,contact.born,contact.strength].every(Number.isFinite))throw new RangeError('Invalid spray parameters');
 const time=contact.born+age,gust=.65+.35*Math.sin(time*.71+1.08),curl=Math.sin(contact.x*.8+contact.z*1.1-time*1.4+2.71);
 const wind={x:-1.3*gust+.28*curl,y:.12*Math.sin(contact.z*1.3-time*.9),z:.34*Math.cos(contact.x*.7-time*1.1)*gust};
 const fract=(value:number)=>value-Math.floor(value),angle=seed*117.3,radial=.4+fract(seed*71)*1.9,factor=.7+contact.strength*.3;
 return {
  x:contact.x+(-.6+Math.cos(angle)*radial)*factor*age-GROUND_SPEED*age+wind.x*age*age*.7,
  y:Math.max(-.014,-.012+(3.8+fract(seed*19)*2.0)*factor*age-10.0*age*age+wind.y*age*age*.7),
  z:contact.z+Math.sin(angle)*radial*.6*factor*age+wind.z*age*age*.7,
 };
}
