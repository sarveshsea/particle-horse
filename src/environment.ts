import * as THREE from 'three';
import {randomSource} from './equine';
export function createEnvironment(scene:THREE.Scene) {
 const floorGeometry=new THREE.PlaneGeometry(70,40);floorGeometry.rotateX(-Math.PI/2);
 const floorMaterial=new THREE.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:`varying vec3 world;void main(){world=position;world.y=-.035;gl_Position=projectionMatrix*modelViewMatrix*vec4(world,1.);}`,fragmentShader:`
 uniform float time;varying vec3 world;
 float line(float coordinate){float d=abs(fract(coordinate+.5)-.5);return 1.-smoothstep(0.,fwidth(coordinate)*1.25,d);}
 void main(){
  vec2 p=world.xz;vec2 moving=vec2(p.x+time*12.,p.y);
  vec2 q=moving/.8;
  float grid=max(line(q.x),line(q.y));
  float major=max(line(q.x*.25),line(q.y*.25));
  vec2 cell=floor(q);float hash=fract(sin(dot(cell,vec2(12.9898,78.233)))*43758.5453);
  float breaks=step(.24,hash);
  float falloff=exp(-length(p*vec2(.105,.18)))*smoothstep(18.,3.,abs(p.y));
  float alpha=(grid*.095*breaks+major*.11)*falloff;
  gl_FragColor=vec4(vec3(.55,.64,.72),alpha);
 }`,transparent:true,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending});
 const floor=new THREE.Mesh(floorGeometry,floorMaterial);floor.renderOrder=1;floor.frustumCulled=false;scene.add(floor);
 const random=randomSource(108),count=18000,positions=new Float32Array(count*3),seeds=new Float32Array(count);
 for(let i=0;i<count;i++){positions.set([(i%200-100)*.20,-.024,(Math.floor(i/200)-45)*.20],i*3);seeds[i]=random();}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('seed',new THREE.BufferAttribute(seeds,1));
 const material=new THREE.ShaderMaterial({uniforms:{time:{value:0},pixelRatio:{value:1}},vertexShader:`
 attribute float seed;uniform float time;uniform float pixelRatio;varying float alpha;
 void main(){vec3 p=position;p.x=mod(p.x-time*12.+20.,40.)-20.;
 vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;
 gl_PointSize=clamp(9.*pixelRatio/-view.z,1.,2.5*pixelRatio);
 alpha=(.18+seed*.25)*exp(-length(p.xz)*.095)*step(.36,seed);}`,fragmentShader:`
 varying float alpha;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(vec3(.68,.76,.83),alpha*exp(-r*r*4.));}`,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
 const grid=new THREE.Points(geometry,material);grid.renderOrder=1;grid.frustumCulled=false;scene.add(grid);
 // Short horizontal traces make backward travel legible even in a static camera.
 const streakCount=650,streaks=new Float32Array(streakCount*6),streakSeeds=new Float32Array(streakCount*2);
 for(let i=0;i<streakCount;i++){const x=(random()-.5)*34,z=(random()-.5)*16,length=.10+random()*.32;streaks.set([x,-.019,z,x+length,-.019,z],i*6);streakSeeds.set([random(),random()],i*2);}
 const streakGeometry=new THREE.BufferGeometry();streakGeometry.setAttribute('position',new THREE.BufferAttribute(streaks,3));streakGeometry.setAttribute('seed',new THREE.BufferAttribute(streakSeeds,1));
 const streakMaterial=new THREE.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:`attribute float seed;uniform float time;varying float alpha;void main(){vec3 p=position;p.x=mod(p.x-time*12.+20.,40.)-20.;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);alpha=(.07+seed*.12)*exp(-length(p.xz)*.14);}`,fragmentShader:'varying float alpha;void main(){gl_FragColor=vec4(vec3(.62,.72,.80),alpha);}',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
 const traces=new THREE.LineSegments(streakGeometry,streakMaterial);traces.frustumCulled=false;traces.renderOrder=1;scene.add(traces);
 return {materials:[floorMaterial,material,streakMaterial]};
}
