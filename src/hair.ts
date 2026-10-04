import * as THREE from 'three';
import { frameAt,randomSource } from './equine';
import type { Anatomy } from './anatomy';
import { WIND_GLSL } from './forces';
import type { WakePointer } from './particle-wake';
type HairGuide=Readonly<{tailGuide:Float32Array;guideCount:number;mesh:Readonly<{frameCount:number;cycleSeconds:number}>}>;
export function generateHair(count=640,samples=48,seed=107){
 if(!Number.isInteger(count)||count<1||count>2000||!Number.isInteger(samples)||samples<2||samples>128)throw new RangeError('Invalid strand count or samples');
 const random=randomSource(seed),positions=new Float32Array(count*samples*3),strand=new Float32Array(count*samples*4),parameter=new Float32Array(count*samples);
 for(let i=0;i<count;i++){
  const values=[random()*Math.PI*2,.63+random()*.37,.45+random()*.55,random()];
  for(let j=0;j<samples;j++){strand.set(values,(i*samples+j)*4);parameter[i*samples+j]=j/(samples-1);}
 }
 return {positions,strand,parameter,count,samples};
}
export function hairPoint(anatomy:HairGuide,time:number,u:number,strand:ArrayLike<number>):readonly number[]{
 if(!Number.isFinite(time)||!Number.isFinite(u))throw new RangeError('Invalid hair time or coordinate');
 const t=Math.max(0,Math.min(1,u)),length=t*strand[1],frame=frameAt(time-t*.048,anatomy.mesh.frameCount,anatomy.mesh.cycleSeconds);
 const at=length*(anatomy.guideCount-1),a=Math.floor(at),mix=at-a;
 const ids=[Math.max(0,a-1),a,Math.min(a+1,anatomy.guideCount-1),Math.min(a+2,anatomy.guideCount-1)];
 const out=[0,0,0];
 for(let axis=0;axis<3;axis++){
  const q=ids.map(id=>anatomy.tailGuide[(frame.a*anatomy.guideCount+id)*3+axis]*(1-frame.mix)+anatomy.tailGuide[(frame.b*anatomy.guideCount+id)*3+axis]*frame.mix);
  out[axis]=.5*((2*q[1])+(-q[0]+q[2])*mix+(2*q[0]-5*q[1]+4*q[2]-q[3])*mix*mix+(-q[0]+3*q[1]-3*q[2]+q[3])*mix*mix*mix);
 }
 const phase=2*Math.PI*((time%anatomy.mesh.cycleSeconds)/anatomy.mesh.cycleSeconds);
 out[0]-=.32*t*t;out[1]-=.22*t*t;
 const rootSpread=.021*strand[2]*(1-t)**2;
 out[0]-=.004*(1-t);out[1]+=.005*(1-t)+Math.abs(Math.sin(strand[0]))*rootSpread*.35;
 out[2]+=Math.cos(strand[0])*rootSpread;
 const width=(.014+.106*t)*strand[2];
 out[1]+=Math.sin(strand[0])*width*t+Math.sin(phase-t*5+strand[0])*.028*t*t;
 out[2]+=Math.cos(strand[0])*width*t+Math.sin(phase-t*4+strand[3]*6)*.045*t*t;
 return out;
}
const vertexShader=`
attribute vec4 strand;
attribute float parameter;
uniform sampler2D hairAtlas;
uniform float guideCount;
uniform float hairFrames;
uniform float cycleSeconds;
uniform float hairTime;
uniform float hairPixelRatio;
uniform vec3 wakePointer;
uniform vec3 wakeDirection;
uniform float wakeStrength;
uniform sampler2D wakeTexture;
uniform float wakeEnabled;
uniform vec2 hairRootWakeUv;
varying float hairLight;
varying float taper;
${WIND_GLSL}
vec3 guide(float index,float pose){return texture2D(hairAtlas,(vec2(index,pose)+.5)/vec2(guideCount,hairFrames)).xyz;}
vec3 tailAt(float u,float delayed){
 float phase=mod(mod(delayed,cycleSeconds)+cycleSeconds,cycleSeconds)/cycleSeconds*hairFrames;
 float fa=floor(phase),fb=mod(fa+1.,hairFrames),blend=fract(phase);
 float along=u*(guideCount-1.),a=floor(along),b=min(a+1.,guideCount-1.);
 float c=max(0.,a-1.),d=min(a+2.,guideCount-1.),s=fract(along);
 vec3 q0=mix(guide(c,fa),guide(c,fb),blend),q1=mix(guide(a,fa),guide(a,fb),blend);
 vec3 q2=mix(guide(b,fa),guide(b,fb),blend),q3=mix(guide(d,fa),guide(d,fb),blend);
 return .5*(2.*q1+(-q0+q2)*s+(2.*q0-5.*q1+4.*q2-q3)*s*s+(-q0+3.*q1-3.*q2+q3)*s*s*s);
}
vec3 rootOffset(vec3 root){
 if(wakeEnabled>.5&&hairRootWakeUv.x>=0.)return texture2D(wakeTexture,hairRootWakeUv).xyz;
 vec3 delta=root-wakePointer;float distance=length(delta);
 float influence=pow(max(0.,1.-distance/.8),2.)*wakeStrength;
 vec3 displacement=(delta/max(distance,.06)*.5+wakeDirection*.8)*influence;
 displacement+=windAt(root,hairTime)*.06*influence;
 return displacement*.8/max(.8,length(displacement));
}
void main(){
 float u=parameter;vec3 p=tailAt(u*strand.y,hairTime-u*.048);
 float width=(.014+.106*u)*strand.z;
 p.x-=.32*u*u;p.y-=.22*u*u;
 float rootSpread=.021*strand.z*pow(1.-u,2.);
 p.x-=.004*(1.-u);p.y+=.005*(1.-u)+abs(sin(strand.x))*rootSpread*.35;p.z+=cos(strand.x)*rootSpread;
 p+=rootOffset(tailAt(0.,hairTime))*(1.-.35*u);
 p.y+=sin(strand.x)*width*u;p.z+=cos(strand.x)*width*u;
 vec3 wind=windAt(p+vec3(strand.w*.2),hairTime);
 p+=wind*.11*u*u;
 p.y+=sin(hairTime*10.1-u*5.+strand.x)*.026*u*u;
 p.z+=sin(hairTime*8.7-u*4.+strand.w*6.)*.035*u*u;
 vec3 delta=p-wakePointer;float d=length(delta);
 float force=pow(max(0.,1.-d/.8),2.)*wakeStrength*u*u;
 p+=(delta/max(d,.06)*.28+wakeDirection*.36)*force;
 vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;
 taper=1.-u*.85;gl_PointSize=clamp((5.2+strand.w*3.)*hairPixelRatio/-view.z,.7,2.3*hairPixelRatio)*(.65+.35*taper);
 hairLight=(.33+strand.w*.42)*(.42+.58*taper);
}`;
const fragmentShader=`varying float hairLight;varying float taper;
void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(vec3(hairLight),(.70*(1.-smoothstep(.15,.46,r))+.10*exp(-r*r*6.))*(.20+.08*taper));}`;
export function createHair(scene:THREE.Scene,anatomy:Anatomy,sharedUniforms:Record<string,THREE.IUniform>){
 const cloud=generateHair(),data=new Float32Array(anatomy.guideCount*anatomy.mesh.frameCount*4);
 for(let i=0;i<anatomy.tailGuide.length/3;i++)data.set(anatomy.tailGuide.subarray(i*3,i*3+3),i*4);
 const atlas=new THREE.DataTexture(data,anatomy.guideCount,anatomy.mesh.frameCount,THREE.RGBAFormat,THREE.FloatType);
 atlas.needsUpdate=true;atlas.minFilter=atlas.magFilter=THREE.NearestFilter;
 const uniforms={...sharedUniforms,hairAtlas:{value:atlas},guideCount:{value:anatomy.guideCount},hairFrames:{value:anatomy.mesh.frameCount},cycleSeconds:{value:anatomy.mesh.cycleSeconds},hairTime:{value:0},hairPixelRatio:{value:1},
 hairRootWakeUv:sharedUniforms.hairRootWakeUv??{value:new THREE.Vector2(-1,-1)},wakeEnabled:sharedUniforms.wakeEnabled??{value:0},wakeTexture:sharedUniforms.wakeTexture??{value:atlas},
 wakePointer:sharedUniforms.wakePointer??{value:new THREE.Vector3(100,100,100)},wakeDirection:sharedUniforms.wakeDirection??{value:new THREE.Vector3()},wakeStrength:sharedUniforms.wakeStrength??{value:0}};
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(cloud.positions,3));geometry.setAttribute('strand',new THREE.BufferAttribute(cloud.strand,4));geometry.setAttribute('parameter',new THREE.BufferAttribute(cloud.parameter,1));
 const material=new THREE.ShaderMaterial({uniforms,vertexShader,fragmentShader,transparent:true,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending});
 const points=new THREE.Points(geometry,material);points.frustumCulled=false;points.renderOrder=3;scene.add(points);
 const lineGeometry=new THREE.BufferGeometry();
 for(const [name,attribute] of Object.entries(geometry.attributes))lineGeometry.setAttribute(name,attribute);
 const indices=new Uint32Array(cloud.count*(cloud.samples-1)*2);
 for(let strand=0;strand<cloud.count;strand++)for(let sample=0;sample<cloud.samples-1;sample++){
  const offset=(strand*(cloud.samples-1)+sample)*2,vertex=strand*cloud.samples+sample;
  indices[offset]=vertex;indices[offset+1]=vertex+1;
 }
 lineGeometry.setIndex(new THREE.BufferAttribute(indices,1));
 const lineMaterial=new THREE.ShaderMaterial({uniforms,vertexShader,
  fragmentShader:'varying float hairLight;varying float taper;void main(){gl_FragColor=vec4(vec3(hairLight),.038*(.38+.62*taper));}',
  transparent:true,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending});
 const lines=new THREE.LineSegments(lineGeometry,lineMaterial);lines.frustumCulled=false;lines.renderOrder=2.5;scene.add(lines);
 return {points,lines,geometry,material,
  update(time:number,pointer:WakePointer|undefined,pixelRatio:number){
   uniforms.hairTime.value=Number.isFinite(time)?time:0;uniforms.hairPixelRatio.value=Number.isFinite(pixelRatio)?pixelRatio:1;
   if(pointer){uniforms.wakePointer.value.copy(pointer.point);uniforms.wakeDirection.value.copy(pointer.direction);uniforms.wakeStrength.value=pointer.strength;}
  },
  setQuality(quality:number){const q=Math.max(.35,Math.min(1,Number.isFinite(quality)?quality:1));const visible=Math.floor(cloud.count*q);geometry.setDrawRange(0,visible*cloud.samples);lineGeometry.setDrawRange(0,visible*(cloud.samples-1)*2);},
  dispose(){scene.remove(points,lines);geometry.dispose();lineGeometry.dispose();material.dispose();lineMaterial.dispose();atlas.dispose();},
 };
}
