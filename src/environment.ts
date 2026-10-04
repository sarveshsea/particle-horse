import * as THREE from 'three';
import { generateSand, generateSandLayer, type SandLayer } from './sand';
import { createWind } from './wind';
import type { Equine } from './equine';
import { advanceImpacts, contactStrength, extractHooves, hoofAt, IMPACT_LIMIT, WIND_GLSL, SPRAY_GLSL, GROUND_SPEED, type HoofTrack, type Impact } from './forces';
import { contactsBetween, createContactTimeline, type ContactEvent, type ContactTimeline } from './contacts';
export { GROUND_SPEED } from './forces';
const PRESSURE_LIMIT=12;
const grainFragment=`varying float alpha;varying float tone;
void main(){vec2 uv=(gl_PointCoord-.5)*2.;float r=length(uv);if(r>.94)discard;
 float coverage=alpha*(1.-smoothstep(.57,.94,r));if(coverage<.12)discard;
 vec3 normal=vec3(uv,sqrt(max(0.,1.-r*r)));
 float lighting=.66+.34*max(0.,dot(normal,normalize(vec3(-.4,.7,.8))));
 gl_FragColor=vec4(vec3(tone*lighting),coverage);}`;
const dustFragment=`varying float alpha;varying float tone;
void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(vec3(tone),exp(-r*r*3.6)*alpha);}`;
const groundVertex=`
attribute float seed;attribute float size;uniform float time;uniform float pixelRatio;uniform float speed;uniform float span;uniform float band;
uniform vec4 pressureHits[12];uniform int pressureCount;uniform vec4 hoofPressure[4];uniform vec4 pointer;varying float alpha;varying float tone;
${WIND_GLSL}
void main(){vec3 p=position;p.x=mod(p.x-time*speed+span,span*2.)-span;vec3 wind=windAt(p,time);
 p.z+=wind.z*.018*sin(seed*73.+time*.8);
 float contour=sin(p.x*.9+p.z*.7)+.55*sin(p.x*2.3-p.z*1.1);
 p.y=position.y;
 float pressure=0.;
 for(int i=0;i<4;i++){
  vec4 hoof=hoofPressure[i];vec2 delta=p.xz-hoof.xy;
  float load=exp(-dot(delta,delta)/.035)*hoof.w;
  p.xz+=delta/max(length(delta),.03)*load*.065;p.y-=load*.014;pressure+=load;
 }
 for(int i=0;i<12;i++){
  if(i>=pressureCount)break;
  vec4 hit=pressureHits[i];float age=time-hit.z;
  vec2 delta=p.xz-vec2(hit.x-age*speed,hit.y);
  float radius=.16+age*.39,energy=exp(-dot(delta,delta)/(radius*radius))*hit.w*exp(-age*1.7);
  p.xz+=delta/max(length(delta),.05)*energy*.15+vec2(-energy*.13,0.);
  p.y+=sin(length(delta)*20.-age*9.)*energy*.021;pressure+=energy;
 }
 vec2 d=p.xz-pointer.xz;float wake=exp(-dot(d,d)*5.)*pointer.w;p.xz+=d*min(wake,.6);p.y+=wake*.03;
 vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;
 float scale=mix(25.,13.,band*.5)+size*8.;
 gl_PointSize=clamp(scale*pixelRatio/max(-view.z,.1),.7,(4.4-band*.9)*pixelRatio);
 float edges=(1.-smoothstep(span*.7,span,abs(p.x)))*(1.-smoothstep(8.,11.,abs(p.z)));
 float clumps=.74+.26*sin(p.x*3.1+p.z*2.7)*sin(p.z*4.3-p.x*.45);
 alpha=mix(.93,.45,band*.5)*edges*clumps*exp(-length(p.xz)*.035);
 tone=min(1.,.78+seed*.2+pressure*.16+contour*.018);
}`;

function makeGround(scene:THREE.Scene,layer:SandLayer,count:number,uniforms:Record<string,THREE.IUniform>,index:number){
 const cloud=generateSandLayer(count,layer,108+index*13),geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.BufferAttribute(cloud.positions,3));
 geometry.setAttribute('seed',new THREE.BufferAttribute(cloud.seeds,1));
 geometry.setAttribute('size',new THREE.BufferAttribute(cloud.sizes,1));
 const material=new THREE.ShaderMaterial({uniforms:{...uniforms,span:{value:[9,14,18][index]},band:{value:index}},vertexShader:groundVertex,fragmentShader:grainFragment,transparent:true,depthWrite:true,depthTest:true,blending:THREE.NormalBlending});
 const points=new THREE.Points(geometry,material);points.name=`sand-${layer}`;points.renderOrder=1;points.frustumCulled=false;scene.add(points);
 return {geometry,material,count};
}

function makeSpray(scene:THREE.Scene,uniforms:Record<string,THREE.IUniform>,perStrike:number,soft=false){
 const cloud=generateSand(IMPACT_LIMIT*perStrike,soft?894:731),geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.BufferAttribute(cloud.positions,3));
 geometry.setAttribute('seed',new THREE.BufferAttribute(cloud.seeds,1));
 geometry.setAttribute('impactId',new THREE.BufferAttribute(Float32Array.from(cloud.seeds,(_,i)=>i%IMPACT_LIMIT),1));
 const vertexShader=`
 attribute float seed;attribute float impactId;uniform vec4 impacts[24];uniform float time;uniform float speed;uniform float pixelRatio;varying float alpha;varying float tone;
 ${WIND_GLSL}
 ${SPRAY_GLSL}
 void main(){vec4 hit=impacts[int(impactId)];float age=time-hit.z;
 float life=${soft?'1.1+seed*.5':'1.+seed*.18'};float live=step(0.,age)*(1.-step(life,age))*hit.w;
 if(live<=0.){gl_Position=vec4(2.,2.,2.,1.);gl_PointSize=1.;alpha=0.;tone=0.;return;}
 ${soft?`
 float angle=seed*117.3,radial=.4+fract(seed*71.)*1.9;
 vec3 origin=vec3(hit.x,-.012,hit.y);
 vec3 velocity=vec3(-.6+cos(angle)*radial,.48+fract(seed*19.)*.72,sin(angle)*radial*.6)*(.7+hit.w*.3);
 vec3 p=origin+velocity*age+vec3(-speed*age,-1.4*age*age,0.)+windAt(origin,time)*age*age*.7;
 p.y=max(p.y,-.014);`:'vec3 p=sprayPoint(hit,age,seed,time,speed);'}
 vec4 view=modelViewMatrix*vec4(p,1.);
 gl_Position=live>0.?projectionMatrix*view:vec4(2.,2.,2.,1.);
 gl_PointSize=clamp((${soft?'28.+seed*32.':'17.+seed*13.'})*pixelRatio/max(-view.z,.1),${soft?'1.2,7.':'1.,4.'}*pixelRatio);
 alpha=live*(1.-smoothstep(life*${soft?'.2':'.7'},life,age))*(${soft?'.035+seed*.05':'.78+seed*.22'});tone=${soft?'1.':'.86+seed*.14'};
 }`;
 const material=new THREE.ShaderMaterial({uniforms,vertexShader,fragmentShader:soft?dustFragment:grainFragment,transparent:true,depthWrite:!soft,depthTest:true,blending:soft?THREE.AdditiveBlending:THREE.NormalBlending});
 const points=new THREE.Points(geometry,material);points.name=soft?'contact-dust':'contact-grains';points.renderOrder=3;points.frustumCulled=false;scene.add(points);
 return {geometry,material,count:cloud.seeds.length};
}

export function createEnvironment(scene:THREE.Scene){
 const compact=innerWidth<600,wind=createWind(scene,GROUND_SPEED),grainsPerStrike=compact?1024:1536;
 const uniforms={time:{value:0},pixelRatio:{value:1},speed:{value:GROUND_SPEED},impacts:{value:Array.from({length:IMPACT_LIMIT},()=>new THREE.Vector4(0,0,-100,0))},pressureHits:{value:Array.from({length:PRESSURE_LIMIT},()=>new THREE.Vector4(0,0,-100,0))},pressureCount:{value:0},hoofPressure:{value:Array.from({length:4},()=>new THREE.Vector4())},pointer:{value:new THREE.Vector4()}};
 const layers=(['near','middle','far'] as const).map((layer,i)=>makeGround(scene,layer,(compact?[26000,12000,6000]:[42000,26000,14000])[i],uniforms,i));
 const spray=makeSpray(scene,uniforms,grainsPerStrike),dust=makeSpray(scene,uniforms,compact?128:256,true);
 let tracks:readonly HoofTrack[]|undefined,timeline:ContactTimeline|undefined,events:readonly Impact[]=[],lastTime=-1e-7,slot=0,strikeCount=0;
 let activeContacts:readonly ContactEvent[]=[];
 const slots=new WeakMap<Impact,number>();
 const update=(time:number,mesh:Equine):readonly ContactEvent[]=>{
  tracks??=extractHooves(mesh);timeline??=createContactTimeline(mesh);
  if(time<lastTime){events=[];activeContacts=[];lastTime=-1e-7;}
  const contacts=contactsBetween(timeline,lastTime,time);
  const added=contacts.map(contact=>({x:contact.x,z:contact.z,born:contact.born,strength:contact.strength}));
  strikeCount+=contacts.length;
  activeContacts=[...activeContacts,...contacts].filter(contact=>time-contact.born<1.7).slice(-IMPACT_LIMIT);
  added.forEach(event=>{slots.set(event,slot);slot=(slot+1)%IMPACT_LIMIT;});
  events=advanceImpacts(events,added,time);lastTime=time;uniforms.time.value=time;
  uniforms.impacts.value.forEach(uniform=>uniform.set(0,0,-100,0));
  events.forEach(event=>uniforms.impacts.value[slots.get(event)!].set(event.x,event.z,event.born,event.strength));
  const pressure=events.slice(-PRESSURE_LIMIT);uniforms.pressureCount.value=pressure.length;
  uniforms.pressureHits.value.forEach((uniform,i)=>{const event=pressure[i];uniform.set(event?.x??0,event?.z??0,event?.born??-100,event?.strength??0);});
  tracks.forEach((track,i)=>{const hoof=hoofAt(mesh,track,time);uniforms.hoofPressure.value[i].set(hoof.x,hoof.z,0,contactStrength(hoof,track));});
  return contacts;
 };
 return {materials:[...layers.map(layer=>layer.material),spray.material,dust.material,wind.material],update,
  get impactCount(){return events.length;},
  get activeSpray(){return events.filter(event=>lastTime-event.born<1.18).length*grainsPerStrike;},
  get layerCounts(){return layers.map(layer=>Math.min(layer.count,layer.geometry.drawRange.count));},
  get contactEvents(){return activeContacts.map(contact=>({...contact}));},
  get contactTimeline(){return timeline?.strikes.map(strike=>({...strike}));},
  get strikeCount(){return strikeCount;},get burstCount(){return strikeCount*grainsPerStrike;},floorLayers:3,grainsPerStrike,
  setPointer:(point:THREE.Vector3,strength:number)=>uniforms.pointer.value.set(point.x,point.y,point.z,Math.max(0,Math.min(strength,1))),
  setQuality:(quality:number)=>{
   wind.setQuality(quality);
   layers.forEach((layer,i)=>layer.geometry.setDrawRange(0,Math.floor(layer.count*Math.max([.9,.45,.18][i],Math.min(1,quality**[.3,1.5,2.5][i])))));
   // Retain every strike's coarse grains; only the suspended dust thins out.
   dust.geometry.setDrawRange(0,Math.floor(dust.count*Math.max(.25,quality*quality)));
  }
 };
}
