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
  const step=mesh.cycleSeconds/mesh.frameCount, threshold=track.floor+.025;
  let first=minimum;
  const sample=(index:number)=>samples[(index%mesh.frameCount+mesh.frameCount)%mesh.frameCount];
  while(minimum-first<mesh.frameCount/2&&sample(first-1).y<=threshold)first--;
  const before=sample(first-1),after=sample(first);
  let low=(first-1)*step,high=first*step;
  for(let iteration=0;iteration<18;iteration++) {
   const middle=(low+high)/2;
   if(hoofAt(mesh,track,middle).y>threshold)low=middle;else high=middle;
  }
  const rawPhase=(low+high)/2;
  const phase=(rawPhase%mesh.cycleSeconds+mesh.cycleSeconds)%mesh.cycleSeconds,point=hoofAt(mesh,track,phase);
  let release=minimum+1;
  while(release-minimum<mesh.frameCount/2&&sample(release).y<track.floor+.065)release++;
  const landingSpeed=Math.max(0,(before.y-after.y)/step);
  const contactDuration=Math.min(mesh.cycleSeconds*.49,Math.max(step,release*step-rawPhase));
  return {...point,hoof,phase,strength:Math.min(1,.72+landingSpeed*.18),contactDuration};
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
