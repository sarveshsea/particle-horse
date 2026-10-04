import * as THREE from 'three';
import { generateMeadow, type MeadowRoot } from './meadow';
import { randomSource } from './equine';
import type { ContactEvent } from './contacts';
import { WIND_GLSL } from './forces';
const vertex=`
attribute vec3 root;attribute float seed;attribute float kind;
uniform float time;uniform float pixelRatio;uniform vec4 strikes[16];uniform float still;
varying float alpha;varying float type;
${WIND_GLSL}
void main(){
 vec3 r=root;r.x=mod(root.x-time*6.+18.,36.)-18.;vec3 p=position;
 float flatten=0.;vec2 bend=vec2(0.);
 if(abs(r.z)<1.25)for(int i=0;i<16;i++){
  float age=time-strikes[i].z;
  if(age>=0.&&age<3.){
   vec2 delta=r.xz-vec2(strikes[i].x-age*6.,strikes[i].y);float distance=length(delta);
   float force=max(0.,1.-distance/.75)*exp(-age*2.8)*strikes[i].w*(1.-still);
   flatten=max(flatten,force);bend+=(delta/(distance+.04)-vec2(.65,0.))*force*.35;
  }
 }
 float bendLength=length(bend);if(bendLength>1.)bend/=bendLength;
 float height=max(p.y,0.);float along=clamp(height/max(.03,(kind<.5||kind>2.5)?.15:.45),0.,1.);
 vec2 sway=(windAt(r,time).xz*.07+vec2(sin(time*1.1+root.x*.7+root.z*.3+seed*6.28),cos(time*.8+root.x*.4+seed*4.))*.06)*height*(1.-still);
 p.xz+=sway+bend*along;p.y*=1.-flatten*.84;
 vec3 world=r+p;vec4 view=modelViewMatrix*vec4(world,1.);
 gl_Position=projectionMatrix*view;gl_PointSize=clamp((kind>2.5?6.:kind>1.5?15.:16.+seed*6.)*pixelRatio/max(.1,-view.z),1.,3.2*pixelRatio);
 float edge=1.-smoothstep(13.,18.,abs(r.x));float depth=exp(-length(r.xz)*.065);
 alpha=(kind<.5?.20:kind<1.5?.80:kind>2.5?.60:.96)*edge*depth*(.65+seed*.35);type=kind;
}`;
const lineFragment='varying float alpha;varying float type;void main(){gl_FragColor=vec4(vec3(1.),alpha*(type>.5&&type<1.5?.20:1.));}';
const pointFragment=`varying float alpha;void main(){float r=length((gl_PointCoord-.5)*2.);if(r>1.)discard;float core=1.-smoothstep(.38,.82,r);gl_FragColor=vec4(vec3(1.),alpha*(core*.9+exp(-r*r*8.)*.1));}`;
type BufferSet={positions:number[];roots:number[];seeds:number[];kinds:number[]};
const empty=():BufferSet=>({positions:[],roots:[],seeds:[],kinds:[]});
function push(buffer:BufferSet,r:MeadowRoot,p:readonly number[],kind:number){buffer.positions.push(...p);buffer.roots.push(r.x,r.y,r.z);buffer.seeds.push(r.seed);buffer.kinds.push(kind);}
function segment(buffer:BufferSet,r:MeadowRoot,a:readonly number[],b:readonly number[],kind:number){push(buffer,r,a,kind);push(buffer,r,b,kind);}
function geometry(buffer:BufferSet){
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(buffer.positions,3));g.setAttribute('root',new THREE.Float32BufferAttribute(buffer.roots,3));g.setAttribute('seed',new THREE.Float32BufferAttribute(buffer.seeds,1));g.setAttribute('kind',new THREE.Float32BufferAttribute(buffer.kinds,1));return g;
}
export function createMeadow(scene:THREE.Scene,compact=false){
 const meadow=generateMeadow(compact?4200:9000,compact?90:180,compact?36:72),random=randomSource(591),lines=empty(),points=empty();
 for(const r of meadow.grass){
  const angle=r.seed*Math.PI*2,curve=.035+r.seed*.04;
  for(let i=0;i<4;i++){
   const at=(u:number)=>[Math.cos(angle)*curve*u*u,r.height*u,Math.sin(angle)*curve*u*u];
   segment(lines,r,at(i/4),at((i+1)/4),0);
  }
 }
 for(const r of meadow.flowers){
  segment(lines,r,[0,0,0],[0,r.height,0],1);
  for(const petal of r.petals){
   // Discrete petal grains retain five lobes without adding a solid surface.
   for(const factor of [.65,.82,1,1.12,1.22]){
    const tilt=petal.y-r.height;
    push(points,r,[petal.x*factor,r.height+tilt*factor+.002*Math.sin(factor*3),petal.z*factor],2);
   }
  }
  push(points,r,[0,r.height+.004,0],2);
 }
 for(const r of meadow.bushes){
  for(const branch of r.branches){
   segment(lines,r,[0,0,0],[branch.x*.35,branch.y*.6,branch.z*.35],1);
   segment(lines,r,[branch.x*.35,branch.y*.6,branch.z*.35],[branch.x,branch.y,branch.z],1);
   for(let i=0;i<48;i++){
    const azimuth=random()*Math.PI*2,vertical=random()*2-1,radius=Math.cbrt(random()),spread=.025+random()*.025;
    const ring=Math.sqrt(1-vertical*vertical)*radius;
    push(points,r,[branch.x+Math.cos(azimuth)*ring*spread*1.5,branch.y+vertical*radius*spread*.65,branch.z+Math.sin(azimuth)*ring*spread],1);
   }
  }
 }
 for(const r of meadow.grass){
  const angle=r.seed*Math.PI*2,curve=.035+r.seed*.04;
  for(const u of [.35,.68,1])push(points,r,[Math.cos(angle)*curve*u*u,r.height*u,Math.sin(angle)*curve*u*u],3);
 }
 const uniforms={time:{value:0},pixelRatio:{value:1},still:{value:0},strikes:{value:Array.from({length:16},()=>new THREE.Vector4(0,0,-100,0))}};
 const lineGeometry=geometry(lines),pointGeometry=geometry(points);
 const material=(fragmentShader:string)=>new THREE.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader,transparent:true,depthWrite:false,depthTest:true,blending:THREE.NormalBlending});
 const lineMaterial=material(lineFragment),pointMaterial=material(pointFragment),grass=new THREE.LineSegments(lineGeometry,lineMaterial),leaves=new THREE.Points(pointGeometry,pointMaterial);
 grass.frustumCulled=false;leaves.frustumCulled=false;grass.renderOrder=2;leaves.renderOrder=2;scene.add(grass,leaves);
 let events:readonly ContactEvent[]=[];
 return {
  diagnostics:{grass:meadow.grass.length,flowers:meadow.flowers.length,bushes:meadow.bushes.length,lineVertices:lines.seeds.length,leafParticles:points.seeds.length},
  update(time:number,contacts:readonly ContactEvent[],pixelRatio:number,reduced=false){
   if(!Number.isFinite(time)||!Number.isFinite(pixelRatio))throw new RangeError('Meadow frame must be finite');
   events=reduced?[]:[...events.filter(e=>time-e.born<=3),...contacts.filter(e=>Number.isFinite(e.born)&&Number.isFinite(e.x)&&Number.isFinite(e.z)&&Number.isFinite(e.strength))].filter((e,i,a)=>a.findIndex(v=>v.id===e.id)===i).slice(-16);
   uniforms.time.value=time;uniforms.pixelRatio.value=Math.max(.5,Math.min(3,pixelRatio));uniforms.still.value=reduced?1:0;
   uniforms.strikes.value.forEach((v,i)=>{const e=events[i];v.set(e?.x??0,e?.z??0,e?.born??-100,e?Math.max(0,Math.min(1,e.strength)):0);});
  },
  setQuality(quality:number){
   if(!Number.isFinite(quality))throw new RangeError('Meadow quality must be finite');
   const q=Math.max(.45,Math.min(1,quality)),grassVertices=meadow.grass.length*8,details=lines.seeds.length-grassVertices;
   // Grass is first in the buffer; preserve every flower and bush scaffold by drawing all lines.
   lineGeometry.setDrawRange(0,grassVertices+details);const plantParticles=points.seeds.length-meadow.grass.length*3;
   pointGeometry.setDrawRange(0,plantParticles+Math.floor(meadow.grass.length*3*q));
  },
  dispose(){scene.remove(grass,leaves);lineGeometry.dispose();pointGeometry.dispose();lineMaterial.dispose();pointMaterial.dispose();},
 };
}
