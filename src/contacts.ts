import type { Equine } from './equine';
import { extractHooves, hoofAt } from './forces';
export type ContactEvent = Readonly<{
 id:string;hoof:number;born:number;x:number;y:number;z:number;strength:number;contactDuration:number;
}>;
export type ContactStrike = Readonly<Omit<ContactEvent,'id'|'born'> & { phase:number }>;
export type ContactTimeline = Readonly<{cycleSeconds:number;strikes:readonly ContactStrike[]}>;

export function createContactTimeline(mesh:Equine):ContactTimeline{
 const strikes=extractHooves(mesh).map((track,hoof)=>{
  const samples=Array.from({length:mesh.frameCount},(_,frame)=>hoofAt(mesh,track,frame*mesh.cycleSeconds/mesh.frameCount));
  const minimum=samples.reduce((best,sample,index)=>sample.y<samples[best].y?index:best,0);
  const phase=minimum*mesh.cycleSeconds/mesh.frameCount,point=samples[minimum];
  let contactFrames=1;
  while(contactFrames<mesh.frameCount/2&&samples[(minimum+contactFrames)%mesh.frameCount].y<track.floor+.065)contactFrames++;
  const previous=hoofAt(mesh,track,phase-mesh.cycleSeconds/mesh.frameCount);
  const landingSpeed=Math.max(0,(previous.y-point.y)*mesh.frameCount/mesh.cycleSeconds);
  return {...point,hoof,phase,strength:Math.min(1,.72+landingSpeed*.18),contactDuration:contactFrames*mesh.cycleSeconds/mesh.frameCount};
 }).sort((a,b)=>a.phase-b.phase);
 return {cycleSeconds:mesh.cycleSeconds,strikes};
}

export function contactsBetween(timeline:ContactTimeline,previous:number,time:number):readonly ContactEvent[]{
 if(!Number.isFinite(previous)||!Number.isFinite(time))throw new RangeError('Contact window must be finite');
 if(time<=previous)return [];
 const start=Math.max(previous,time-timeline.cycleSeconds*64),events:ContactEvent[]=[];
 for(let cycle=Math.floor(start/timeline.cycleSeconds);cycle<=Math.floor(time/timeline.cycleSeconds);cycle++){
  for(const strike of timeline.strikes){
   const born=cycle*timeline.cycleSeconds+strike.phase;
   if(born>start&&born<=time){
    const {phase,...point}=strike;
    events.push({...point,id:`hoof-${strike.hoof}-stride-${cycle}`,born});
   }
  }
 }
 return events;
}
