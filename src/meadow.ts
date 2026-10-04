import { randomSource } from './equine';
import { terrainHeight } from './sand';
import type { ContactEvent } from './contacts';
export type MeadowRoot=Readonly<{x:number;y:number;z:number;height:number;seed:number}>;
export type MeadowFlower=MeadowRoot&Readonly<{petals:readonly Readonly<{x:number;y:number;z:number}>[]}>;
export type MeadowBush=MeadowRoot&Readonly<{branches:readonly Readonly<{x:number;y:number;z:number}>[]}>;
const finite=(...values:number[])=>values.every(Number.isFinite);
export function generateMeadow(grassCount:number,flowerCount:number,bushCount:number,seed=71){
 for(const [count,max] of [[grassCount,20000],[flowerCount,1000],[bushCount,400]])if(!Number.isInteger(count)||count<0||count>max)throw new RangeError('Invalid meadow population');
 if(!finite(seed))throw new RangeError('Meadow seed must be finite');
 const random=randomSource(seed);
 const clusters=Array.from({length:72},()=>({x:(random()-.5)*36,z:(random()-.5)*14}));
 const root=(index:number,height:number):MeadowRoot=>{
  const c=clusters[index%clusters.length],angle=random()*Math.PI*2,radius=Math.sqrt(random())*.65;
  const x=Math.max(-17.8,Math.min(17.8,c.x+Math.cos(angle)*radius)),z=Math.max(-8.5,Math.min(8.5,c.z+Math.sin(angle)*radius));
  return {x,y:terrainHeight(x,z),z,height,seed:random()};
 };
 const grass=Array.from({length:grassCount},(_,i)=>{
  const source=root(i,.05+random()*.10);
  const x=i%3===0?(random()-.5)*36:source.x;
  const z=i%6===1?(random()-.5)*1.5:i%3===0?(random()-.5)*17:source.z;
  return {...source,x,z,y:terrainHeight(x,z),height:Math.abs(z)<.8?.055+random()*.035:source.height};
 });
 const flowers=Array.from({length:flowerCount},(_,i)=>{
  const source=root(i*7,.14+random()*.18),z=i%4===0?(random()-.5)*1.08:source.z;
  const r={...source,z,y:terrainHeight(source.x,z)},size=.035+random()*.025;
  const petals=Array.from({length:5},(_,p)=>({x:Math.cos(p*Math.PI*2/5)*size,y:r.height+Math.sin(p*Math.PI*2/5)*size*.7,z:Math.sin(p*Math.PI*2/5)*size*.5}));
  return {...r,petals};
 });
 const bushes=Array.from({length:bushCount},(_,i)=>{
  const source=root(i*13,.2+random()*.25),z=i%6===0?(i%12===0?1:-1)*(.5+random()*.3):source.z;
  const r={...source,z,y:terrainHeight(source.x,z)},branches=Array.from({length:7},(_,b)=>({x:Math.cos(b*2.399)*r.height*(.35+random()*.45),y:r.height*(.35+random()*.65),z:Math.sin(b*2.399)*r.height*(.35+random()*.45)}));
  return {...r,branches};
 });
 return {grass,flowers,bushes};
}
export function meadowPoint(x:number,z:number,time:number){
 if(!finite(x,z,time))throw new RangeError('Meadow coordinates and time must be finite');
 return {x:((x-time*6+18)%36+36)%36-18,y:terrainHeight(x,z),z};
}
export function meadowBend(x:number,z:number,time:number,contacts:readonly ContactEvent[]){
 if(!finite(x,z,time))throw new RangeError('Meadow bend inputs must be finite');
 let dx=0,dz=0,flatten=0;
 for(const c of contacts){
  const age=time-c.born;if(!finite(c.x,c.z,c.born,c.strength)||age<0||age>3)continue;
  const rx=x-(c.x-age*6),rz=z-c.z,distance=Math.hypot(rx,rz);
  const force=Math.max(0,1-distance/.75)*Math.exp(-age*2.8)*Math.min(1,Math.max(0,c.strength));
  flatten=Math.max(flatten,force);dx+=(rx/(distance+.04)-.65)*force*.35;dz+=rz/(distance+.04)*force*.35;
 }
 const magnitude=Math.hypot(dx,dz),scale=magnitude>1?1/magnitude:1;
 return {x:dx*scale,z:dz*scale,flatten};
}
