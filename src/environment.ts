import * as THREE from 'three';
import { generateSand } from './sand';
import { createWind } from './wind';
import type { Equine } from './equine';
import { advanceImpacts, contactStrength, extractHooves, hoofAt, IMPACT_LIMIT, WIND_GLSL, type HoofTrack, type Impact } from './forces';
export const GROUND_SPEED = 6;
const SPRAY_PER_IMPACT=256;
const fragmentShader=`varying float alpha;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(vec3(1.),exp(-r*r*3.6)*alpha);}`;
export function createEnvironment(scene: THREE.Scene) {
 const compact=innerWidth<600;
 const wind=createWind(scene,GROUND_SPEED);
 const {positions,seeds,sizes}=generateSand(compact?45000:90000);
 const uniforms={time:{value:0},pixelRatio:{value:1},speed:{value:GROUND_SPEED},impacts:{value:Array.from({length:IMPACT_LIMIT},()=>new THREE.Vector4(0,0,-100,0))},pointer:{value:new THREE.Vector4(0,0,0,0)}};
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
 geometry.setAttribute('seed',new THREE.BufferAttribute(seeds,1));
 geometry.setAttribute('size',new THREE.BufferAttribute(sizes,1));
 const material=new THREE.ShaderMaterial({uniforms,vertexShader:`
 attribute float seed;attribute float size;uniform float time;uniform float pixelRatio;uniform float speed;uniform vec4 impacts[24];uniform vec4 pointer;varying float alpha;
 ${WIND_GLSL}
 void main(){vec3 p=position;p.x=mod(p.x-time*speed+18.,36.)-18.;vec3 wind=windAt(p,time);
 p.z+=wind.z*.025*sin(seed*73.+time*.8);p.y+=.004*sin(p.x*2.+p.z*1.7-time*.7);
 for(int i=0;i<24;i++){
 vec4 hit=impacts[i];float age=time-hit.z;
 if(age>=0.&&age<1.7&&hit.w>0.){
 vec2 origin=vec2(hit.x-age*speed,hit.y);vec2 delta=p.xz-origin;
 float radius=.13+age*.65;float energy=exp(-dot(delta,delta)/(radius*radius))*hit.w*exp(-age*1.6);
 vec2 outward=delta/max(length(delta),.05);
 p.xz+=outward*energy*.12+vec2(-energy*.17,0.);
 p.y+=sin(length(delta)*22.-age*10.)*energy*.026;
 }}
 vec2 d=p.xz-pointer.xz;float wake=exp(-dot(d,d)*5.)*pointer.w;
 p.xz+=d*min(wake,.6);p.y+=wake*.03;
 vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;
 gl_PointSize=clamp((12.+size*6.)*pixelRatio/-view.z,.65,2.8*pixelRatio);
 alpha=(.44+seed*.40)*exp(-length(p.xz)*.08)*(1.-smoothstep(7.,11.,abs(p.z)))*(1.-smoothstep(12.,18.,abs(p.x)));
 }`,fragmentShader,transparent:true,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending});
 const sand=new THREE.Points(geometry,material);sand.renderOrder=1;sand.frustumCulled=false;scene.add(sand);
 const dust=generateSand(IMPACT_LIMIT*SPRAY_PER_IMPACT,731);
 const sprayGeometry=new THREE.BufferGeometry();
 sprayGeometry.setAttribute('position',new THREE.BufferAttribute(dust.positions,3));
 sprayGeometry.setAttribute('seed',new THREE.BufferAttribute(dust.seeds,1));
 sprayGeometry.setAttribute('impactId',new THREE.BufferAttribute(Float32Array.from(dust.seeds,(_,i)=>i%IMPACT_LIMIT),1));
 const sprayMaterial=new THREE.ShaderMaterial({uniforms,vertexShader:`
 attribute float seed;attribute float impactId;uniform vec4 impacts[24];uniform float time;uniform float speed;uniform float pixelRatio;varying float alpha;
 ${WIND_GLSL}
 void main(){vec4 hit=impacts[int(impactId)];float age=time-hit.z;
 float life=.36+seed*.38;float live=step(0.,age)*(1.-step(life,age))*hit.w;
 float angle=seed*117.3;float radial=.4+fract(seed*71.)*1.2;
 vec3 origin=vec3(hit.x,0.,hit.y);
 vec3 velocity=vec3(-1.3+cos(angle)*radial,.9+fract(seed*19.)*1.7,sin(angle)*radial*.65);
 vec3 p=origin+velocity*age+vec3(-speed*age,-4.9*age*age,0.)+windAt(origin,time)*age*age*.7;
 p.y=max(p.y,.005);vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=live>0.?projectionMatrix*view:vec4(2.,2.,2.,1.);
 gl_PointSize=clamp((8.+seed*6.)*pixelRatio/max(-view.z,.1),.7,2.4*pixelRatio);
 alpha=live*(1.-smoothstep(life*.4,life,age))*(.25+seed*.35);
 }`,fragmentShader,transparent:true,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending});
 const spray=new THREE.Points(sprayGeometry,sprayMaterial);spray.renderOrder=3;spray.frustumCulled=false;scene.add(spray);
 let tracks:readonly HoofTrack[]|undefined,events:readonly Impact[]=[],lastImpact=[-100,-100,-100,-100],lastTime=0,slot=0;
 const slots=new WeakMap<Impact,number>();
 const update=(time:number,mesh:Equine)=>{
  tracks??=extractHooves(mesh);
  const added:Impact[]=[];
  if(time<lastTime){events=[];lastImpact=[-100,-100,-100,-100];}
  tracks.forEach((track,i)=>{
   const hoof=hoofAt(mesh,track,time),strength=contactStrength(hoof,track);
   if(strength>.12&&time-lastImpact[i]>.07){
    const previous=hoofAt(mesh,track,time-.008);
    const downward=Math.max(0,(previous.y-hoof.y)/.008);
    added.push({x:hoof.x,z:hoof.z,born:time,strength:Math.min(1,strength*(.6+downward*.25))});
    lastImpact=lastImpact.map((value,index)=>index===i?time:value);
   }
  });
  added.forEach(event=>{slots.set(event,slot);slot=(slot+1)%IMPACT_LIMIT;});
  events=advanceImpacts(events,added,time);lastTime=time;uniforms.time.value=time;
  uniforms.impacts.value.forEach(uniform=>uniform.set(0,0,-100,0));
  events.forEach(event=>uniforms.impacts.value[slots.get(event)!].set(event.x,event.z,event.born,event.strength));
 };
 return {materials:[material,sprayMaterial,wind.material],update,get impactCount(){return events.length;},
  setPointer:(point:THREE.Vector3,strength:number)=>uniforms.pointer.value.set(point.x,point.y,point.z,Math.max(0,Math.min(strength,1))),
  setQuality:(quality:number)=>{
   wind.setQuality(quality);
   geometry.setDrawRange(0,Math.floor(seeds.length*Math.max(.5,quality)));
   // Dust is inexpensive and degrades before the anatomical surface.
   sprayGeometry.setDrawRange(0,Math.floor(dust.seeds.length*Math.max(.25,quality*quality)));
  }
 };
}
