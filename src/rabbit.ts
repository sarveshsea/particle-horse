import {randomSource} from './equine';
import type {Vec3} from './brush';
export const RABBIT_CYCLE=.55;
const wrap=(x:number,n:number)=>((x%n)+n)%n;
export function rabbitFrame(time:number,speed=2.6){
 if(!Number.isFinite(time))throw new RangeError('Rabbit time must be finite');
 const phase=wrap(time,RABBIT_CYCLE)/RABBIT_CYCLE;
 const bounce=.135*Math.sin(Math.PI*phase)**2;
 const feet=Array.from({length:4},(_,i):Vec3=>{
  const p=wrap(phase+(i<2?.27:0)+(i%2)*.035,1),stance=.2,stroke=speed*RABBIT_CYCLE*stance;
  const x=i<2?-.14:.14;
  if(p<stance)return [x-stroke*.5+p/stance*stroke,0,(i%2===0?-1:1)*.075];
  const swing=(p-stance)/(1-stance);
  return [x+stroke*.5-stroke*swing,.075*Math.sin(Math.PI*swing),(i%2===0?-1:1)*.075];
 });
 return {phase,bounce,pitch:Math.sin(phase*Math.PI*2)*.08,feet};
}
export function rabbitPoint(point:Vec3,part:number,time:number):Vec3{
 const frame=rabbitFrame(time);
 if(part>=2&&part<=5){const i=part-2,foot=frame.feet[i],hip:Vec3=[i<2?-.14:.14,.21+frame.bounce,(i%2===0?-1:1)*.075];const u=Math.max(0,Math.min(1,point[1]));return [hip[0]*(1-u)+foot[0]*u+point[0],hip[1]*(1-u)+foot[1]*u,hip[2]+point[2]];}
 return [point[0]*Math.cos(frame.pitch)-point[1]*Math.sin(frame.pitch),point[0]*Math.sin(frame.pitch)+point[1]*Math.cos(frame.pitch)+frame.bounce,point[2]];
}
export function generateRabbit(count=12000,seed=613){
 if(!Number.isInteger(count)||count<1||count>48000||!Number.isFinite(seed))throw new RangeError('Invalid rabbit count or seed');
 const random=randomSource(seed),positions=new Float32Array(count*3),normals=new Float32Array(count*3),parts=new Float32Array(count),seeds=new Float32Array(count);
 const volumes=[
  {center:[0,.205,0],scale:[.225,.12,.105],weight:.36,part:0},
  {center:[.14,.185,0],scale:[.115,.145,.115],weight:.20,part:0},
  {center:[-.20,.29,0],scale:[.083,.077,.067],weight:.15,part:1},
  {center:[-.26,.255,0],scale:[.058,.044,.05],weight:.04,part:1},
  {center:[-.17,.415,-.043],scale:[.018,.125,.026],weight:.065,part:1},
  {center:[-.17,.415,.043],scale:[.018,.125,.026],weight:.065,part:1},
  {center:[.255,.245,0],scale:[.042,.044,.042],weight:.03,part:0},
 ];
 for(let i=0;i<count;i++){
  const choice=random(),angle=random()*Math.PI*2,z=random()*2-1,r=Math.sqrt(1-z*z);let cumulative=0,volume=volumes[0];
  if(choice>=.91){const leg=Math.floor(random()*4);positions.set([Math.cos(angle)*.013,random(),Math.sin(angle)*.013],i*3);parts[i]=2+leg;normals.set([Math.cos(angle),0,Math.sin(angle)],i*3);}
  else{for(const v of volumes){cumulative+=v.weight;if(choice<cumulative){volume=v;break;}}positions.set([volume.center[0]+volume.scale[0]*r*Math.cos(angle),volume.center[1]+volume.scale[1]*z,volume.center[2]+volume.scale[2]*r*Math.sin(angle)],i*3);parts[i]=volume.part;const n=[r*Math.cos(angle)/volume.scale[0],z/volume.scale[1],r*Math.sin(angle)/volume.scale[2]],length=Math.hypot(...n);normals.set(n.map(v=>v/length),i*3);}
  seeds[i]=random();
 }
 return {positions,normals,parts,seeds,count};
}
export function rabbitRoute(time:number,index:number){
 if(!Number.isFinite(time)||!Number.isInteger(index)||index<0||index>2)throw new RangeError('Invalid rabbit route');
 const speed=-8.6-index*.5,x=16-wrap(time*-speed+index*10.7,32),z=index===0?-1.35:index===1?1.65:-2.05;
 const alpha=Math.max(0,Math.min(1,(15-Math.abs(x))/3));
 return {x,z,speed,alpha,phase:time+index*.173};
}
