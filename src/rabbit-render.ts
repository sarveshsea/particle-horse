import * as THREE from 'three';
import {BRUSH_GLSL} from './brush';
import {generateRabbit,rabbitRoute} from './rabbit';
const vertex=`
attribute vec3 surfaceNormal;attribute float part;attribute float seed;attribute float rabbitId;
uniform vec4 rabbitRoots[3];uniform vec4 rabbitMotion[3];uniform float time;uniform float pixelRatio;uniform float still;
varying float alpha;varying float shade;
${BRUSH_GLSL}
void main(){
 int id=int(rabbitId);vec4 root=rabbitRoots[id],motion=rabbitMotion[id];
 float phase=fract((time+motion.w)/.55);float bounce=.135*pow(sin(3.14159265*phase),2.)*(1.-still);
 float pitch=sin(phase*6.2831853)*.08*(1.-still);vec3 p=position;
 if(part>=2.){
  float i=part-2.;float q=fract(phase+(i<2.?.27:0.)+mod(i,2.)*.035);float hipX=i<2.?-.14:.14;
  float swing=(q-.2)/.8;float stroke=motion.y*.55*.2;float footX=q<.2?hipX-stroke*.5+q/.2*stroke:hipX+stroke*.5-stroke*swing;
  float footY=q<.2?0.:.075*sin(3.14159265*swing);float side=(mod(i,2.)<.5?-1.:1.)*.075;
  p=vec3(mix(hipX,footX,position.y)+position.x,mix(.21+bounce,footY,position.y),side+position.z);
 }else{p.xy=mat2(cos(pitch),sin(pitch),-sin(pitch),cos(pitch))*p.xy;p.y+=bounce;}
 vec3 n=surfaceNormal;
 if(part<2.)n.xy=mat2(cos(pitch),sin(pitch),-sin(pitch),cos(pitch))*n.xy;
 n.xy=mat2(cos(motion.x),sin(motion.x),-sin(motion.x),cos(motion.x))*n.xy;
 p.xy=mat2(cos(motion.x),sin(motion.x),-sin(motion.x),cos(motion.x))*p.xy;p+=root.xyz;
 vec3 displacement=brushForce(p)*.014*(1.-still);p+=displacement*.32/max(.32,length(displacement));
 vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;
 gl_PointSize=clamp((5.+seed*4.)*pixelRatio/max(.1,-view.z),.7,2.1*pixelRatio);
 float eye=length(vec2((position.x+.223)/.012,(position.y-.311)/.011));
 float eyeRecess=part>.5&&part<1.5&&abs(position.z)>.05&&eye<1.?0.:1.;
 vec3 viewNormal=normalize(normalMatrix*n),viewDirection=normalize(-view.xyz);
 float facing=dot(viewNormal,viewDirection);
 float light=.34+.66*max(0.,dot(normalize(n),normalize(vec3(-.4,.8,.5))));
 alpha=root.w*(.65+.35*seed)*eyeRecess*smoothstep(-.08,.22,facing);shade=light*(.8+.2*seed);
}`;
const fragment=`varying float alpha;varying float shade;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;float core=1.-smoothstep(.3,.85,r);gl_FragColor=vec4(vec3(shade),alpha*core);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
export function createRabbits(scene:THREE.Scene,compact=false,sharedUniforms:Record<string,THREE.IUniform>={},ground:(x:number,z:number,time:number)=>number=()=>0){
 const count=compact?2:3,perRabbit=compact?6000:12000;
 const normal=new Float32Array(count*perRabbit*3),position=new Float32Array(count*perRabbit*3),part=new Float32Array(count*perRabbit),seed=new Float32Array(count*perRabbit),rabbitId=new Float32Array(count*perRabbit);
 for(let id=0;id<count;id++){const cloud=generateRabbit(perRabbit,613+id*137);for(let i=0;i<perRabbit;i++){const at=i*count+id;position.set(cloud.positions.subarray(i*3,i*3+3),at*3);normal.set(cloud.normals.subarray(i*3,i*3+3),at*3);part[at]=cloud.parts[i];seed[at]=cloud.seeds[i];rabbitId[at]=id;}}
 const geometry=new THREE.BufferGeometry();for(const [name,array,size] of [['surfaceNormal',normal,3],['position',position,3],['part',part,1],['seed',seed,1],['rabbitId',rabbitId,1]] as const)geometry.setAttribute(name,new THREE.BufferAttribute(array,size));
 const uniforms={brushStart:{value:Array.from({length:8},()=>new THREE.Vector4())},brushEnd:{value:Array.from({length:8},()=>new THREE.Vector4())},brushDirection:{value:Array.from({length:8},()=>new THREE.Vector4())},brushView:{value:new THREE.Vector3(0,0,-1)},brushCount:{value:0},...sharedUniforms,rabbitRoots:{value:Array.from({length:3},()=>new THREE.Vector4())},rabbitMotion:{value:Array.from({length:3},()=>new THREE.Vector4())},time:{value:0},pixelRatio:{value:1},still:{value:0}};
 const material=new THREE.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,blending:THREE.NormalBlending});const points=new THREE.Points(geometry,material);points.frustumCulled=false;scene.add(points);
 let positions:readonly Readonly<{x:number;y:number;z:number;speed:number}>[]=[];
 return {points,diagnostics:()=>({count,particles:count*perRabbit,positions}),
  update(time:number,pixelRatio:number,reduced=false){if(!Number.isFinite(time)||!Number.isFinite(pixelRatio))throw new RangeError('Invalid rabbit frame');uniforms.time.value=time;uniforms.pixelRatio.value=pixelRatio;uniforms.still.value=reduced?1:0;
   positions=Array.from({length:count},(_,id)=>{const r=rabbitRoute(reduced?1.5:time,id),y=ground(r.x,r.z,time);const slope=(ground(r.x+.04,r.z,time)-ground(r.x-.04,r.z,time))/.08;uniforms.rabbitRoots.value[id].set(r.x,y,r.z,r.alpha);uniforms.rabbitMotion.value[id].set(Math.atan(slope),2.6+id*.5,0,id*.173);return {x:r.x,y,z:r.z,speed:reduced?0:r.speed};});
  },
  setQuality(q:number){if(!Number.isFinite(q))throw new RangeError('Invalid rabbit quality');geometry.setDrawRange(0,Math.floor(count*perRabbit*Math.max(.55,Math.min(1,q))));},
  dispose(){scene.remove(points);geometry.dispose();material.dispose();}
 };
}
