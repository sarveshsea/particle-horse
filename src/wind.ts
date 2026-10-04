import * as THREE from 'three';
import { randomSource } from './equine';
import { WIND_GLSL } from './forces';

export function generateWind(count:number,seed=419){
 if(!Number.isInteger(count)||count<1||count>20000)throw new RangeError('Wind population must be an integer from 1 to 20000');
 const random=randomSource(seed),positions=new Float32Array(count*3),phases=new Float32Array(count),streams=new Float32Array(count);
 const heights=[.12,.22,.4,.65,.95,1.35],lanes=[-.85,.95,-1.7,1.9,-3.1,3.4];
 for(let i=0;i<count;i++){
  const stream=i%6;
  positions.set([(random()-.5)*36,heights[stream]+(random()-.5)*.055,lanes[stream]+(random()-.5)*.12],i*3);
  phases[i]=random();streams[i]=stream;
 }
 return {positions,phases,streams};
}

export function createWind(scene:THREE.Scene,speed=6){
 const population=innerWidth<600?1024:2048;
 const cloud=generateWind(population);
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.BufferAttribute(cloud.positions,3));
 geometry.setAttribute('phase',new THREE.BufferAttribute(cloud.phases,1));
 geometry.setAttribute('stream',new THREE.BufferAttribute(cloud.streams,1));
 const material=new THREE.ShaderMaterial({
  uniforms:{time:{value:0},pixelRatio:{value:1},speed:{value:speed}},
  vertexShader:`
  attribute float phase;attribute float stream;uniform float time;uniform float pixelRatio;uniform float speed;varying vec2 direction;varying float alpha;
  ${WIND_GLSL}
  vec3 streamPoint(vec3 anchor,float t){
   vec3 p=anchor;p.x=mod(anchor.x-t*speed+18.,36.)-18.;
   vec3 wind=windAt(p,t);p.x+=wind.x*.28;
   p.z+=sin(p.x*.78-t*.45+stream*1.73)*.17+wind.z*.2;
   p.y+=sin(p.x*.67-t*.61+stream*2.1)*.055+wind.y*.15;
   return p;
  }
  void main(){
   vec3 p=streamPoint(position,time),next=streamPoint(position,time+.012);
   vec4 view=modelViewMatrix*vec4(p,1.),clip=projectionMatrix*view;
   vec4 nextClip=projectionMatrix*modelViewMatrix*vec4(next,1.);
   vec2 delta=(nextClip.xy/max(nextClip.w,.1)-clip.xy/max(clip.w,.1));
   direction=delta/max(length(delta),.00001);
   gl_Position=clip;gl_PointSize=clamp((44.+phase*22.)*pixelRatio/max(-view.z,.1),1.8,9.*pixelRatio);
   alpha=(.13+phase*.07)*exp(-length(p.xz)*.055)*(1.-smoothstep(10.,18.,abs(p.x)));
  }`,
  fragmentShader:`varying vec2 direction;varying float alpha;
  void main(){vec2 p=(gl_PointCoord-.5)*2.;vec2 across=vec2(-direction.y,direction.x);
   float along=dot(p,direction),width=dot(p,across);float radius=along*along+width*width*32.;
   if(radius>1.)discard;gl_FragColor=vec4(vec3(1.),exp(-radius*3.)*alpha);
  }`,transparent:true,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending,
 });
 const points=new THREE.Points(geometry,material);points.frustumCulled=false;points.renderOrder=3;scene.add(points);
 return {material,setQuality:(quality:number)=>geometry.setDrawRange(0,Math.floor(population*Math.max(.25,Math.min(1,quality*quality))))};
}
