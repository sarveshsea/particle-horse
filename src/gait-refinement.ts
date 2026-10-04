import {type Equine} from './equine';
import {createContactTimeline} from './contacts';
import {extractHooves,hoofAt,GROUND_SPEED} from './forces';
const clamp=(value:number,limit:number)=>Math.max(-limit,Math.min(limit,value));
const smooth=(value:number)=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
export function stanceCorrection(elapsed:number,duration:number,height:number,currentX:number,targetX:number):Readonly<{x:number;y:number}>{
 if(![elapsed,duration,height,currentX,targetX].every(Number.isFinite)||duration<=0)throw new RangeError('Invalid stance correction');
 if(elapsed<=0||elapsed>=duration)return {x:0,y:0};
 const weight=smooth(elapsed/(duration*.2))*smooth((duration-elapsed)/(duration*.2));
 return {x:clamp(targetX-currentX,.16)*weight,y:clamp(-height,.085)*weight};
}
/** The supplied 24 frames contain two distinct support cycles. Keep the less abrupt second one. */
export function refineGait(source:Equine):Equine {
 if(source.frameCount!==24)throw new RangeError('Grounded gait requires the authored 24-frame sequence');
 const positions=new Float32Array(source.positions.length),width=source.vertexCount*3;
 for(let frame=0;frame<24;frame++){
  const a=12+Math.floor(frame/2),b=12+((Math.floor(frame/2)+1)%12),mix=(frame%2)*.5;
  for(let coordinate=0;coordinate<width;coordinate++)positions[frame*width+coordinate]=source.positions[a*width+coordinate]*(1-mix)+source.positions[b*width+coordinate]*mix;
 }
 const cycle={...source,positions},tracks=extractHooves(cycle),timeline=createContactTimeline(cycle);
 const corrected=positions.slice();
 for(let frame=0;frame<24;frame++){
  const time=frame*source.cycleSeconds/24;
  const shifts=tracks.map((track,hoof)=>{
   const strike=timeline.strikes.find(event=>event.hoof===hoof)!;
   const elapsed=(time-strike.phase+source.cycleSeconds)%source.cycleSeconds;
   const point=hoofAt(cycle,track,time);
   const middle=hoofAt(cycle,track,strike.phase+strike.contactDuration*.5);
   return {point,shift:stanceCorrection(elapsed,strike.contactDuration,point.y,point.x,middle.x-GROUND_SPEED*(elapsed-strike.contactDuration*.5))};
  });
  for(let vertex=0;vertex<source.vertexCount;vertex++){
   const offset=frame*width+vertex*3,x=positions[offset],y=positions[offset+1],z=positions[offset+2];
   if(y>=1.25)continue;
   let closest=0,distance=Infinity;
   shifts.forEach(({point},index)=>{const next=(x-point.x)**2+((z-point.z)*2)**2;if(next<distance){distance=next;closest=index;}});
   const radius=.32+y*.6;
   const radial=1-smooth((Math.sqrt(distance)-.18)/radius);
   const vertical=1-smooth((y-.18)/1.07);
   const weight=tracks[closest].vertices.includes(vertex)?1:radial*vertical;
   corrected[offset]+=shifts[closest].shift.x*weight;
   corrected[offset+1]+=shifts[closest].shift.y*weight;
  }
 }
 return {...source,positions:corrected};
}
