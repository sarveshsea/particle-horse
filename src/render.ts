import * as THREE from 'three';
import { generateHorse } from './horse';
const vertexShader = `
attribute float bone;
attribute float kind;
attribute float brightness;
attribute float seed;
uniform mat4 bones[14];
uniform float time;
uniform float pixelRatio;
varying float light;
void main() {
 vec3 p = position;
 if (kind > .5 && kind < 1.5) {
  float strand = seed;
  p.x -= strand * .48;
  p.y += sin(time*14.0+seed*40.0+position.y*4.0)*.065*strand;
  p.z += sin(time*9.0+seed*30.0)*.06*strand;
 }
 if (kind > 1.5) {
  float stretch = clamp((-p.x-1.4)/1.42,0.0,1.0);
  p.y += sin(time*11.0+stretch*6.0+seed*3.0)*.16*stretch;
  p.z += sin(time*8.0+stretch*5.0)*.19*stretch;
 }
 vec4 world = bones[int(bone)]*vec4(p,1.0);
 vec4 view = modelViewMatrix*world;
 gl_Position = projectionMatrix*view;
 gl_PointSize = clamp((17.0+seed*8.0)*pixelRatio / -view.z, 1.0, 5.0*pixelRatio);
 light = brightness * (.63 + .37 * smoothstep(-.5,.5,world.z));
}`;
const fragmentShader = `
varying float light;
void main() {
 float r=length(gl_PointCoord-.5)*2.0;
 if (r>1.0) discard;
 float core=exp(-r*r*3.2);
 gl_FragColor=vec4(vec3(light),core*.74);
}`;
export function createArtwork() {
 const renderer = new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'high-performance'});
 renderer.setClearColor(0x000000,1);
 document.body.append(renderer.domElement);
 const scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(34,1,.1,120);
 camera.position.set(5.3,3.0,10.9); camera.lookAt(0,2.05,0);
 const cloud=generateHorse(76000);
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.BufferAttribute(cloud.positions,3));
 for(const [name,data] of Object.entries({bone:cloud.bones,kind:cloud.kinds,brightness:cloud.brightness,seed:cloud.seeds})) geometry.setAttribute(name,new THREE.BufferAttribute(data,1));
 const matrices=Array.from({length:14},()=>new THREE.Matrix4());
 const material=new THREE.ShaderMaterial({vertexShader,fragmentShader,uniforms:{bones:{value:matrices},time:{value:0},pixelRatio:{value:1}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
 const horse=new THREE.Points(geometry,material); horse.frustumCulled=false; scene.add(horse);
 const axis=new THREE.Vector3(0,1,0);
 function segment(index:number,start:THREE.Vector3,end:THREE.Vector3) {
  const direction=end.clone().sub(start);
  matrices[index].compose(start,new THREE.Quaternion().setFromUnitVectors(axis,direction.clone().normalize()),new THREE.Vector3(1,direction.length(),1));
 }
 function staticPose() {
  for(let leg=0;leg<4;leg++) {
   const x=leg<2?.78:-1.02,z=leg%2===0?.32:-.32;
   const start=new THREE.Vector3(x,2.23,z),knee=new THREE.Vector3(x-.12,1.25,z),ankle=new THREE.Vector3(x+.04,.28,z),hoof=new THREE.Vector3(x+.15,.08,z);
   segment(2+leg*3,start,knee); segment(3+leg*3,knee,ankle); segment(4+leg*3,ankle,hoof);
  }
 }
 function resize() {
  const width=innerWidth,height=innerHeight;
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75)); renderer.setSize(width,height);
  material.uniforms.pixelRatio.value=renderer.getPixelRatio();
  camera.aspect=width/height;
  camera.position.set(5.3,3.0,10.9).multiplyScalar(Math.max(1,1.15/camera.aspect));
  camera.lookAt(0,2.05,0);camera.updateProjectionMatrix();
 }
 resize();staticPose();renderer.render(scene,camera);
 window.addEventListener('resize',resize);
 return {renderer,scene,camera,geometry,material,matrices,segment,horse};
}
