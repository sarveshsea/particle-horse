import * as THREE from 'three';
import { generateSand, generateSandLayer, type SandLayer } from './sand';
import { createWind } from './wind';
import type { Equine } from './equine';
import { BRUSH_GLSL } from './brush';
import { TERRAIN_GLSL,worldHeight,transformTerrainPoint } from './terrain';
import { advanceImpacts, contactStrength, extractHooves, hoofAt, IMPACT_LIMIT, WIND_GLSL, SPRAY_GLSL, GROUND_SPEED, type HoofTrack, type Impact } from './forces';
import { contactsBetween, createContactTimeline, type ContactEvent, type ContactTimeline } from './contacts';
export { GROUND_SPEED } from './forces';
const PRESSURE_LIMIT=12;
const grainFragment=`varying float alpha;varying float tone;varying vec3 pigment;varying float grainSeed;
void main(){vec2 uv=(gl_PointCoord-.5)*2.;float angle=grainSeed*37.;mat2 rotation=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));uv=rotation*uv;
 float edge=max(abs(uv.x)*(.95+.16*grainSeed),abs(uv.y)*1.12);edge=max(edge,abs(uv.x*.7+uv.y*.65));if(edge>.88)discard;
 float coverage=alpha*(1.-smoothstep(.73,.89,edge));if(coverage<.08)discard;
 float facet=.72+.28*step(uv.x*.4+uv.y,grainSeed*.3-.15);
 gl_FragColor=vec4(pigment*tone*facet,coverage);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
const dustFragment=`varying float alpha;varying float tone;varying vec3 pigment;
void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(pigment*tone,exp(-r*r*3.6)*alpha);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
const groundVertex=`
attribute float seed;attribute float size;uniform float time;uniform float pixelRatio;uniform float speed;uniform float span;uniform float band;
uniform vec4 pressureHits[12];uniform int pressureCount;uniform vec4 hoofPressure[4];varying float alpha;varying float tone;varying vec3 pigment;varying float grainSeed;
${WIND_GLSL}
${TERRAIN_GLSL}
${BRUSH_GLSL}
void main(){vec3 p=position;p.x=mod(p.x-time*speed+span,span*2.)-span;
 p.y=terrainHeightAt(p.xz,time)+(seed-.5)*.002;
 float pressure=0.;float rake=0.;
 if(abs(p.z)<1.6){
 for(int i=0;i<4;i++){
  vec4 hoof=hoofPressure[i];vec2 delta=p.xz-hoof.xy;
  float load=exp(-dot(delta,delta)/.035)*hoof.w;
  p.xz+=vec2(-.025,delta.y*.14)*load;p.y-=load*.018;pressure+=load;
 }
 for(int i=0;i<12;i++){
  if(i>=pressureCount)break;
  vec4 hit=pressureHits[i];float age=time-hit.z;
  vec2 delta=p.xz-vec2(hit.x-age*speed,hit.y);
  float longitudinal=delta.x/(.2+age*.20),lateral=delta.y/.18;
  float energy=exp(-longitudinal*longitudinal-lateral*lateral)*hit.w*exp(-age*1.6);
  float clod=step(.55,fract(seed*31.))*fract(seed*73.);
  p.x-=energy*(.055+clod*.09);p.z+=sign(delta.y)*energy*clod*.04;
  p.y+=energy*(clod*.029-.014);pressure+=energy;rake+=energy;
 }
 }
 vec3 wake=brushForce(p)*.0016;p+=wake;
 vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;
 float scale=mix(14.,10.,band*.5)+size*5.;
 gl_PointSize=clamp(scale*pixelRatio/max(-view.z,.1),.8,(2.8-band*.4)*pixelRatio);
 float edges=(1.-smoothstep(span*.78,span,abs(p.x)))*(1.-smoothstep(9.,11.,abs(p.z)));
 alpha=mix(.82,.45,band*.5)*edges*(.84+.16*seed)*exp(-length(p.xz)*.021);
 vec3 emerald=vec3(.035,.19,.065),olive=vec3(.105,.16,.027);
 pigment=mix(emerald,olive,smoothstep(.2,.9,seed));pigment=mix(pigment,vec3(.14,.10,.037),min(.30,rake*.18));
 tone=.78+seed*.28+pressure*.08;grainSeed=seed;
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
 attribute float seed;attribute float impactId;uniform vec4 impacts[24];uniform float time;uniform float speed;uniform float pixelRatio;varying float alpha;varying float tone;varying vec3 pigment;varying float grainSeed;
 ${WIND_GLSL}
 ${SPRAY_GLSL}
 void main(){vec4 hit=impacts[int(impactId)];float age=time-hit.z;
 float life=${soft?'1.1+seed*.5':'1.+seed*.18'};float live=step(0.,age)*(1.-step(life,age))*hit.w;
 if(live<=0.){gl_Position=vec4(2.,2.,2.,1.);gl_PointSize=1.;alpha=0.;tone=0.;pigment=vec3(0.);grainSeed=seed;return;}
 ${soft?`
 float angle=seed*117.3,radial=.4+fract(seed*71.)*1.9;
 vec3 origin=vec3(hit.x,terrainHeightAt(hit.xy,hit.z)+.012,hit.y);
 vec3 velocity=vec3(-.6+cos(angle)*radial,.48+fract(seed*19.)*.72,sin(angle)*radial*.6)*(.7+hit.w*.3);
 vec3 p=origin+velocity*age+vec3(-speed*age,-1.4*age*age,0.)+windAt(origin,time)*age*age*.7;
 p.y=max(p.y,terrainHeightAt(p.xz,time)+.004);`:'vec3 p=sprayPoint(hit,age,seed,time,speed);'}
 vec4 view=modelViewMatrix*vec4(p,1.);
 gl_Position=live>0.?projectionMatrix*view:vec4(2.,2.,2.,1.);
 gl_PointSize=clamp((${soft?'20.+seed*22.':'18.+fract(seed*32.)*20.'})*pixelRatio/max(-view.z,.1),${soft?'1.2,5.':'.9,3.8'}*pixelRatio);
 ${soft?'':'gl_PointSize*=.55+.45*smoothstep(.015,.085,age);'}
 alpha=live*(1.-smoothstep(life*${soft?'.2':'.7'},life,age))*(${soft?'.018+seed*.025':'.82+seed*.18'});tone=${soft?'.55':'.78+seed*.22'};pigment=${soft?'vec3(.24,.19,.10)':'dirtPigment(seed)'};grainSeed=seed;
 }`;
 const material=new THREE.ShaderMaterial({uniforms,vertexShader,fragmentShader:soft?dustFragment:grainFragment,transparent:true,depthWrite:!soft,depthTest:true,blending:soft?THREE.AdditiveBlending:THREE.NormalBlending});
 const points=new THREE.Points(geometry,material);points.name=soft?'contact-dust':'contact-grains';points.renderOrder=3;points.frustumCulled=false;scene.add(points);
 return {geometry,material,count:cloud.seeds.length};
}

export function createEnvironment(scene:THREE.Scene,brushUniforms:Record<string,THREE.IUniform>={}){
 const compact=innerWidth<600,wind=createWind(scene,GROUND_SPEED),grainsPerStrike=compact?1024:1536;
 const uniforms={time:{value:0},pixelRatio:{value:1},speed:{value:GROUND_SPEED},impacts:{value:Array.from({length:IMPACT_LIMIT},()=>new THREE.Vector4(0,0,-100,0))},pressureHits:{value:Array.from({length:PRESSURE_LIMIT},()=>new THREE.Vector4(0,0,-100,0))},pressureCount:{value:0},hoofPressure:{value:Array.from({length:4},()=>new THREE.Vector4())},pointer:{value:new THREE.Vector4()},brushStart:{value:Array.from({length:8},()=>new THREE.Vector4())},brushEnd:{value:Array.from({length:8},()=>new THREE.Vector4())},brushDirection:{value:Array.from({length:8},()=>new THREE.Vector4())},brushView:{value:new THREE.Vector3(0,0,-1)},brushCount:{value:0},...brushUniforms};
 const layers=(['near','middle','far'] as const).map((layer,i)=>makeGround(scene,layer,(compact?[16000,8000,3500]:[32000,16000,7000])[i],uniforms,i));
 const spray=makeSpray(scene,uniforms,grainsPerStrike),dust=makeSpray(scene,uniforms,compact?128:256,true);
 let tracks:readonly HoofTrack[]|undefined,timeline:ContactTimeline|undefined,events:readonly Impact[]=[],lastTime=-1e-7,slot=0,strikeCount=0;
 let activeContacts:readonly ContactEvent[]=[];
 const slots=new WeakMap<Impact,number>();
 const update=(time:number,mesh:Equine):readonly ContactEvent[]=>{
  tracks??=extractHooves(mesh);timeline??=createContactTimeline(mesh);
  if(time<lastTime){events=[];activeContacts=[];lastTime=-1e-7;}
  const contacts=contactsBetween(timeline,lastTime,time).map(contact=>{const point=transformTerrainPoint(contact,contact.born);return {...contact,x:point.x,z:point.z,y:worldHeight(point.x,point.z,contact.born)};});
  const added=contacts.map(contact=>({x:contact.x,z:contact.z,born:contact.born,strength:contact.strength}));
  strikeCount+=contacts.length;
  activeContacts=[...activeContacts,...contacts].filter(contact=>time-contact.born<1.7).slice(-IMPACT_LIMIT);
  added.forEach(event=>{slots.set(event,slot);slot=(slot+1)%IMPACT_LIMIT;});
  events=advanceImpacts(events,added,time);lastTime=time;uniforms.time.value=time;
  uniforms.impacts.value.forEach(uniform=>uniform.set(0,0,-100,0));
  events.forEach(event=>uniforms.impacts.value[slots.get(event)!].set(event.x,event.z,event.born,event.strength));
  const pressure=events.slice(-PRESSURE_LIMIT);uniforms.pressureCount.value=pressure.length;
  uniforms.pressureHits.value.forEach((uniform,i)=>{const event=pressure[i];uniform.set(event?.x??0,event?.z??0,event?.born??-100,event?.strength??0);});
  tracks.forEach((track,i)=>{const authored=hoofAt(mesh,track,time),hoof=transformTerrainPoint(authored,time);uniforms.hoofPressure.value[i].set(hoof.x,hoof.z,0,contactStrength(authored,track));});
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
