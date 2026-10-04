export type Vec3 = readonly [number,number,number];
export type BrushSegment = Readonly<{start:Vec3;end:Vec3;direction:Vec3;radius:number;strength:number;born:number}>;
const sub=(a:Vec3,b:Vec3):Vec3=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const dot=(a:Vec3,b:Vec3)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a:Vec3,b:Vec3):Vec3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const scale=(a:Vec3,n:number):Vec3=>[a[0]*n,a[1]*n,a[2]*n];
const cap=(a:Vec3,n:number):Vec3=>scale(a,Math.min(1,n/Math.max(1e-8,Math.hypot(...a))));
export function brushSegment(start:Vec3,end:Vec3,speed:number,born:number):BrushSegment{
 if(![...start,...end,speed,born].every(Number.isFinite))throw new RangeError('Invalid brush sample');
 const direction=cap(sub(end,start),1),length=Math.hypot(...direction);
 return {start:[...start],end:[...end],direction:length>1e-8?scale(direction,1/length):[1,0,0],radius:.35+.3*Math.min(1,Math.max(0,speed)/4),strength:.3+.7*Math.min(1,Math.max(0,speed)/4),born};
}
export type BrushHit = Readonly<{point:Vec3;target:'horse'|'terrain'|'none'}>;
export function bridgeBrush(previous:BrushHit|undefined,point:Vec3,target:BrushHit['target']):Vec3{
 return previous&&previous.target===target&&target!=='none'&&Math.hypot(...sub(point,previous.point))<=1.2?previous.point:point;
}
export function validBrushSegments(segments:readonly BrushSegment[],time:number):readonly BrushSegment[]{
 return segments.filter(s=>[...s.start,...s.end,...s.direction,s.radius,s.strength,s.born].every(Number.isFinite)&&s.radius>=.35&&s.radius<=.65+1e-8&&s.strength>=0&&time>=s.born&&time-s.born<=.65).slice(-8).map(s=>({...s,strength:Math.min(1,s.strength),direction:cap(s.direction,1)}));
}
export function appendBrush(history:readonly BrushSegment[],segment:BrushSegment):readonly BrushSegment[]{return [...history.slice(-7),segment];}
export function brushForce(point:Vec3,segments:readonly BrushSegment[],time:number,view:Vec3):Vec3{
 let result:Vec3=[0,0,0];
 for(const s of segments){const age=Math.max(0,time-s.born);if(age>.65)continue;const axis=sub(s.end,s.start),t=Math.max(0,Math.min(1,dot(sub(point,s.start),axis)/Math.max(1e-8,dot(axis,axis))));const delta=sub(point,[s.start[0]+axis[0]*t,s.start[1]+axis[1]*t,s.start[2]+axis[2]*t]);const distance=Math.hypot(...delta),depth=Math.max(0,dot(delta,view)),e=(Math.max(0,1-distance/s.radius)**2)*s.strength*Math.exp(-age*7)*Math.exp(-depth*5);const curl=cross(s.direction,delta);result=result.map((v,i)=>v+(s.direction[i]*64+delta[i]/Math.max(.06,distance)*12+curl[i]*55)*e) as unknown as Vec3;}
 return cap(result,100);
}
export function rayTriangleDistance(origin:Vec3,direction:Vec3,a:Vec3,b:Vec3,c:Vec3):number|null{
 const e1=sub(b,a),e2=sub(c,a),p=cross(direction,e2),det=dot(e1,p);if(Math.abs(det)<1e-9)return null;const s=sub(origin,a),u=dot(s,p)/det;if(u<0||u>1)return null;const q=cross(s,e1),v=dot(direction,q)/det;if(v<0||u+v>1)return null;const distance=dot(e2,q)/det;return distance>=0?distance:null;
}
export function springStep(state:Readonly<{position:Vec3;velocity:Vec3}>,force:Vec3,dt:number):Readonly<{position:Vec3;velocity:Vec3}>{
 if(![...state.position,...state.velocity,...force].every(Number.isFinite))throw new RangeError('Invalid spring state');
 const step=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0));const velocity=cap(state.velocity.map((v,i)=>v+(force[i]-state.position[i]*48-v*13)*step) as unknown as Vec3,8);return {velocity,position:cap(state.position.map((p,i)=>p+velocity[i]*step) as unknown as Vec3,.8)};
}
export const BRUSH_GLSL=`
uniform vec4 brushStart[8];
uniform vec4 brushEnd[8];
uniform vec4 brushDirection[8];
uniform vec3 brushView;
uniform float brushCount;
vec3 brushForce(vec3 point){
 vec3 force=vec3(0.);
 for(int i=0;i<8;i++){
  if(float(i)>=brushCount)break;
  vec3 axis=brushEnd[i].xyz-brushStart[i].xyz;
  float t=clamp(dot(point-brushStart[i].xyz,axis)/max(1e-8,dot(axis,axis)),0.,1.);
  vec3 delta=point-mix(brushStart[i].xyz,brushEnd[i].xyz,t);
  float distance=length(delta);
  float e=pow(max(0.,1.-distance/brushStart[i].w),2.)*brushEnd[i].w*exp(-brushDirection[i].w*7.)*exp(-max(0.,dot(delta,brushView))*5.);
  force+=(brushDirection[i].xyz*64.+delta/max(.06,distance)*12.+cross(brushDirection[i].xyz,delta)*55.)*e;
 }
 return force*min(1.,100./max(1e-8,length(force)));
}`;
