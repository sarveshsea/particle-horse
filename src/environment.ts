import * as THREE from 'three';
import { randomSource } from './horse';
const dotFragment=`varying float alpha; void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(vec3(.72,.78,.86),alpha*exp(-r*r*4.));}`;
export function createEnvironment(scene:THREE.Scene) {
 const random=randomSource(108), count=8500;
 const positions=new Float32Array(count*3), seeds=new Float32Array(count);
 for(let i=0;i<count;i++) {
  // A wide ground lattice with deliberately missing nodes fades into the void.
  const x=(i%100-50)*.32,z=(Math.floor(i/100)-42)*.32;
  positions.set([x, -.11+(random()-.5)*.035,z],i*3);seeds[i]=random();
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('seed',new THREE.BufferAttribute(seeds,1));
 const material=new THREE.ShaderMaterial({uniforms:{time:{value:0},pixelRatio:{value:1}},vertexShader:`
 attribute float seed; uniform float time; uniform float pixelRatio; varying float alpha;
 void main(){vec3 p=position;p.x=mod(p.x-time*12.+16.,32.)-16.;
 float nearHorse=exp(-pow(p.x/3.,2.)-pow(p.z/1.4,2.));
 p.y+=sin(p.x*1.6-time*7.+p.z*2.)*.075*nearHorse;
 vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;
 gl_PointSize=clamp(22.*pixelRatio/-view.z,1.,2.5*pixelRatio);
 alpha=(.36+.22*nearHorse)*exp(-length(p.xz)*.09)*step(.18,seed);}`,fragmentShader:dotFragment,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
 const grid=new THREE.Points(geometry,material);grid.frustumCulled=false;scene.add(grid);
 const trailCount=2600,trailPositions=new Float32Array(trailCount*3),trailSeeds=new Float32Array(trailCount);
 for(let i=0;i<trailCount;i++){trailPositions.set([random(),random(),random()],i*3);trailSeeds[i]=random();}
 const trailGeometry=new THREE.BufferGeometry();trailGeometry.setAttribute('position',new THREE.BufferAttribute(trailPositions,3));trailGeometry.setAttribute('seed',new THREE.BufferAttribute(trailSeeds,1));
 const trailMaterial=new THREE.ShaderMaterial({uniforms:{time:{value:0},pixelRatio:{value:1}},vertexShader:`
 attribute float seed;uniform float time;uniform float pixelRatio;varying float alpha;
 void main(){float age=mod(time+seed*.72,.72);float life=age/.72;
 vec3 p=vec3(-1.45-life*4.3,2.25+(position.y-.5)*.82+sin(seed*60.+life*4.)*.12,(position.z-.5)*.74);
 p.y-=life*life*.65; vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;
 gl_PointSize=clamp(13.*pixelRatio/-view.z,1.,3.*pixelRatio);
 alpha=pow(1.-life,2.)*.14*step(.45,position.x);}`,fragmentShader:dotFragment,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
 const trail=new THREE.Points(trailGeometry,trailMaterial);trail.frustumCulled=false;scene.add(trail);
 const impactCount=1200,impactPositions=new Float32Array(impactCount*3),impactSeeds=new Float32Array(impactCount);
 for(let i=0;i<impactCount;i++){impactPositions.set([Math.floor(i/300),random(),random()],i*3);impactSeeds[i]=random();}
 const impactGeometry=new THREE.BufferGeometry();impactGeometry.setAttribute('position',new THREE.BufferAttribute(impactPositions,3));impactGeometry.setAttribute('seed',new THREE.BufferAttribute(impactSeeds,1));
 const impactMaterial=new THREE.ShaderMaterial({uniforms:{time:{value:0},pixelRatio:{value:1}},vertexShader:`
 attribute float seed;uniform float time;uniform float pixelRatio;varying float alpha;
 void main(){float leg=position.x;float phase=leg<.5?0.:leg<1.5?.11:leg<2.5?.48:.59;
 float age=mod(time/.58+phase,1.)*.58;float life=age/.22;
 float x=leg<1.5?1.6:-.20;float z=mod(leg,2.)<.5?.32:-.32;
 vec3 p=vec3(x-age*(8.+seed*6.),.035+sin(position.y*3.14159)*age*2.-age*age*5.,z+(position.z-.5)*age*2.);
 vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;
 gl_PointSize=clamp(18.*pixelRatio/-view.z,1.,3.*pixelRatio);
 alpha=pow(max(0.,1.-life),2.)*.35;}`,fragmentShader:dotFragment,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
 const impacts=new THREE.Points(impactGeometry,impactMaterial);impacts.frustumCulled=false;scene.add(impacts);
 return {material,trailMaterial,impactMaterial};
}
