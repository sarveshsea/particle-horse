import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';
import type { sampleSurface } from './equine';
import { WIND_GLSL } from './forces';
import { BRUSH_GLSL,validBrushSegments,type BrushSegment } from './brush';
type Cloud = ReturnType<typeof sampleSurface>;
export interface WakePointer { point: THREE.Vector3; direction: THREE.Vector3; strength: number; segments?: readonly BrushSegment[]; view?: THREE.Vector3 }
type AtlasUniforms = {
 atlas: {value: THREE.DataTexture}; atlasSize:{value:THREE.Vector2};
 vertexCount:{value:number}; frame:{value:THREE.Vector3};
};
export const wakeShader = `
attribute vec2 wakeUv;
uniform sampler2D wakeTexture;
uniform float wakeEnabled;
uniform vec3 wakePointer;
uniform vec3 wakeDirection;
uniform float wakeStrength;
uniform float wakeTime;
${WIND_GLSL}
${BRUSH_GLSL}
vec3 particleOffset(vec3 anchor,float particleSeed){
 if(wakeEnabled>.5)return texture2D(wakeTexture,wakeUv).xyz;
 vec3 displacement=brushForce(anchor)*.016;
 return displacement*.8/max(.8,length(displacement));
}
`;
const shared = `
uniform sampler2D triangleData;
uniform sampler2D weightData;
uniform sampler2D atlas;
uniform vec2 atlasSize;
uniform float vertexCount;
uniform vec3 frame;
uniform float stepTime;
uniform float time;
uniform vec3 pointer;
uniform vec3 direction;
uniform float strength;
uniform float simulationCount;
vec3 at(float index,float pose){float id=index+pose*vertexCount;return texture2D(atlas,(vec2(mod(id,atlasSize.x),floor(id/atlasSize.x))+.5)/atlasSize).xyz;}
vec3 animated(float id){return mix(at(id,frame.x),at(id,frame.y),frame.z);}
${WIND_GLSL}
${BRUSH_GLSL}
vec3 acceleration(vec2 uv,vec3 offset,vec3 velocity){
 if(brushCount<.5&&dot(offset,offset)<1e-8&&dot(velocity,velocity)<1e-8)return vec3(0.);
 vec3 tri=texture2D(triangleData,uv).xyz;
 vec2 w=texture2D(weightData,uv).xy;
 vec3 anchor=animated(tri.x)*w.x+animated(tri.y)*w.y+animated(tri.z)*(1.-w.x-w.y);
 vec3 force=brushForce(anchor+offset);
 float detached=smoothstep(.015,.2,length(offset));
 vec3 wind=windAt(anchor+offset,time);
 return force+wind*detached-offset*48.-velocity*13.;
}
`;
export function createParticleWake(renderer:THREE.WebGLRenderer,count:number,cloud:Cloud,atlasUniforms:AtlasUniforms){
 if(!Number.isInteger(count)||count<1||count>200000||cloud.seeds.length!==count)throw new RangeError("Invalid wake particle count");
 const width=Math.ceil(Math.sqrt(count)),height=Math.ceil(count/width);
 const uv=new Float32Array(count*2);
 for(let i=0;i<count;i++){uv[i*2]=(i%width+.5)/width;uv[i*2+1]=(Math.floor(i/width)+.5)/height;}
 const blank=new THREE.DataTexture(new Float32Array(4),1,1,THREE.RGBAFormat,THREE.FloatType);
 blank.needsUpdate=true;
 const uniforms={wakeTexture:{value:blank as THREE.Texture},wakeEnabled:{value:0},wakePointer:{value:new THREE.Vector3(100,100,100)},wakeDirection:{value:new THREE.Vector3()},wakeStrength:{value:0},wakeTime:{value:0},brushStart:{value:Array.from({length:8},()=>new THREE.Vector4())},brushEnd:{value:Array.from({length:8},()=>new THREE.Vector4())},brushDirection:{value:Array.from({length:8},()=>new THREE.Vector4())},brushView:{value:new THREE.Vector3(0,0,-1)},brushCount:{value:0}};
 const simulationCount={value:count};
 const ownedTextures:THREE.DataTexture[]=[];
 let gpu:GPUComputationRenderer|undefined,offset:ReturnType<GPUComputationRenderer['addVariable']>|undefined;
 let velocity:ReturnType<GPUComputationRenderer['addVariable']>|undefined;
 let initial:THREE.DataTexture|undefined,accumulator=0,activeUntil=-Infinity,wasActive=false;
 if(renderer.extensions.has('EXT_color_buffer_float')){
  gpu=new GPUComputationRenderer(width,height,renderer);
  initial=gpu.createTexture();
  const triangles=gpu.createTexture(),weights=gpu.createTexture();
  ownedTextures.push(triangles,weights);
  const td=triangles.image.data as Float32Array,wd=weights.image.data as Float32Array;
  for(let i=0;i<count;i++){td.set(cloud.triangles.subarray(i*3,i*3+3),i*4);wd.set(cloud.weights.subarray(i*2,i*2+2),i*4);}
  offset=gpu.addVariable('offsetState',`${shared}void main(){if((gl_FragCoord.y-.5)*resolution.x+gl_FragCoord.x-.5>=simulationCount){gl_FragColor=vec4(0.);return;}vec2 uv=gl_FragCoord.xy/resolution.xy;vec3 p=texture2D(offsetState,uv).xyz,v=texture2D(velocityState,uv).xyz;v+=acceleration(uv,p,v)*stepTime;v*=8./max(8.,length(v));p+=v*stepTime;p*=.8/max(.8,length(p));gl_FragColor=vec4(p,1.);}`,initial);
  velocity=gpu.addVariable('velocityState',`${shared}void main(){if((gl_FragCoord.y-.5)*resolution.x+gl_FragCoord.x-.5>=simulationCount){gl_FragColor=vec4(0.);return;}vec2 uv=gl_FragCoord.xy/resolution.xy;vec3 p=texture2D(offsetState,uv).xyz,v=texture2D(velocityState,uv).xyz;v+=acceleration(uv,p,v)*stepTime;v*=8./max(8.,length(v));gl_FragColor=vec4(v,1.);}`,initial);
  for(const variable of [offset,velocity]){
   gpu.setVariableDependencies(variable,[offset,velocity]);
   Object.assign(variable.material.uniforms,atlasUniforms,{brushStart:uniforms.brushStart,brushEnd:uniforms.brushEnd,brushDirection:uniforms.brushDirection,brushView:uniforms.brushView,brushCount:uniforms.brushCount},{triangleData:{value:triangles},weightData:{value:weights},simulationCount,stepTime:{value:1/60},time:uniforms.wakeTime,pointer:uniforms.wakePointer,direction:uniforms.wakeDirection,strength:uniforms.wakeStrength});
  }
  if(gpu.init()===null){uniforms.wakeEnabled.value=1;uniforms.wakeTexture.value=gpu.getCurrentRenderTarget(offset).texture;}
  else {gpu.dispose();gpu=undefined;}
 }
 function update(time:number,dt:number,pointer:WakePointer){
  uniforms.wakeTime.value=Number.isFinite(time)?time:uniforms.wakeTime.value;
  const segments=validBrushSegments(pointer.segments??[],uniforms.wakeTime.value);
  uniforms.brushCount.value=segments.length;
  if(pointer.view)uniforms.brushView.value.copy(pointer.view);
  segments.forEach((s,i)=>{uniforms.brushStart.value[i].set(...s.start,s.radius);uniforms.brushEnd.value[i].set(...s.end,s.strength);uniforms.brushDirection.value[i].set(...s.direction,Math.max(0,time-s.born));});
  const elapsed=Number.isFinite(dt)?Math.max(0,Math.min(dt,.05)):0;
  const pointerFinite=[...pointer.point.toArray(),...pointer.direction.toArray()].every(Number.isFinite);
  const requested=Number.isFinite(pointer.strength)&&pointerFinite?Math.max(0,Math.min(1,pointer.strength)):0;
  if(requested>0){
   uniforms.wakePointer.value.copy(pointer.point);
   uniforms.wakeDirection.value.copy(pointer.direction).clampLength(0,1);
  }
  uniforms.wakeStrength.value=requested>0?requested:uniforms.wakeStrength.value*Math.exp(-elapsed*7);
  if(requested>0)activeUntil=uniforms.wakeTime.value+2;
  const active=uniforms.wakeTime.value<activeUntil;
  if(!active){if(wasActive)reset();wasActive=false;return;}
  wasActive=true;
  if(!gpu||!offset)return;
  accumulator+=elapsed;
  let steps=0;
  while(accumulator>=1/60&&steps<3){gpu.compute();accumulator-=1/60;steps++;}
  uniforms.wakeTexture.value=gpu.getCurrentRenderTarget(offset).texture;
 }
 function reset(){
  accumulator=0;uniforms.brushCount.value=0;uniforms.wakeStrength.value=0;activeUntil=-Infinity;wasActive=false;
  if(gpu&&initial&&offset&&velocity)for(const variable of [offset,velocity])for(const target of variable.renderTargets)gpu.renderTexture(initial,target);
 }
 function maximumDisplacement(){
  if(!gpu||!offset)return 0;
  const pixels=new Float32Array(width*height*4);
  renderer.readRenderTargetPixels(gpu.getCurrentRenderTarget(offset),0,0,width,height,pixels);
  let maximum=0;
  for(let i=0;i<count;i++)maximum=Math.max(maximum,Math.hypot(pixels[i*4],pixels[i*4+1],pixels[i*4+2]));
  return maximum;
 }
 return {setQuality(quality:number){simulationCount.value=Math.floor(count*Math.max(.35,Math.min(1,Number.isFinite(quality)?quality:1)));},clearForce(){uniforms.wakeStrength.value=0;uniforms.brushCount.value=0;},get active(){return wasActive;},maximumDisplacement,dispose(){gpu?.dispose();blank.dispose();for(const texture of ownedTextures)texture.dispose();},uniforms,uv,supported:uniforms.wakeEnabled.value===1,update,reset,get texture(){return uniforms.wakeTexture.value;}};
}
