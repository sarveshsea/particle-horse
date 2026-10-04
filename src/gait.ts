export const CYCLE = .58;
export type Vec3 = readonly [number,number,number];
export type Leg = Readonly<{ hip:Vec3; knee:Vec3; ankle:Vec3; hoof:Vec3; upper:number; lower:number; contact:boolean }>;
export type Pose = Readonly<{ legs:readonly Leg[]; bob:number; pitch:number; head:number }>;
const wrap=(v:number)=>((v%1)+1)%1;
function solveLeg(phase:number,index:number):Leg {
 const fore=index<2, x=fore?.78:-1.02, z=index%2===0?.32:-.32;
 const hip:Vec3=[x,fore?2.11:2.18,z];
 const contact=phase<.28, u=contact?phase/.28:(phase-.28)/.72;
 const footX=x+(contact?.82*Math.cos(Math.PI*u):-.82*Math.cos(Math.PI*u));
 const footY=.28+(contact?0:1.03*Math.sin(Math.PI*u)**2);
 const upper=fore?.96:1.02,lower=1.10;
 const dx=footX-x,dy=footY-hip[1],raw=Math.hypot(dx,dy);
 const length=Math.min(upper+lower-.001,Math.max(.15,raw));
 const vx=dx/raw,vy=dy/raw;
 const along=(upper*upper-lower*lower+length*length)/(2*length);
 const offset=Math.sqrt(Math.max(0,upper*upper-along*along));
 const bend=fore?1:-1;
 const knee:Vec3=[x+vx*along-vy*offset*bend,hip[1]+vy*along+vx*offset*bend,z];
 const ankle:Vec3=[x+vx*length,hip[1]+vy*length,z];
 const hoof:Vec3=[ankle[0]+.12,Math.max(.02,ankle[1]-.24),z];
 return {hip,knee,ankle,hoof,upper,lower,contact};
}
export function gait(time:number):Pose {
 if(!Number.isFinite(time))throw new RangeError('Time must be finite');
 const phase=wrap(time/CYCLE),angle=phase*Math.PI*2;
 return {legs:[0,.11,.48,.59].map((offset,i)=>solveLeg(wrap(phase+offset),i)),bob:.055+.075*Math.sin(angle*2),pitch:.028*Math.sin(angle),head:.022*Math.sin(angle+.8)};
}
