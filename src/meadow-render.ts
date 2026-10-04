import * as THREE from 'three';
import { generateMeadow, type MeadowRoot } from './meadow';
import { botanicalColor,grassBlade,petalSurface,leafSurface,type BotanicalKind } from './botany';
import { BRUSH_GLSL } from './brush';
import type { ContactEvent } from './contacts';
import { WIND_GLSL } from './forces';
import { TERRAIN_GLSL } from './terrain';
const vertex=`
attribute vec3 root;attribute float seed;attribute float kind;attribute vec3 botanicalColor;
attribute float plantHeight;varying vec3 pigment;
uniform float time;uniform float pixelRatio;uniform vec4 strikes[16];uniform float still;
varying float alpha;varying float type;
${WIND_GLSL}
${TERRAIN_GLSL}
${BRUSH_GLSL}
void main(){
 vec3 r=root;r.x=mod(root.x-time*6.+18.,36.)-18.;r.y=terrainHeightAt(r.xz,time);vec3 p=position;
 vec2 gradient=vec2(terrainMaterialHeight(root.x+.05,root.z)-terrainMaterialHeight(root.x-.05,root.z),terrainMaterialHeight(root.x,root.z+.05)-terrainMaterialHeight(root.x,root.z-.05))/.1;
 vec3 normal=normalize(vec3(-gradient.x,1.,-gradient.y));
 vec3 tangent=normalize(vec3(1.,gradient.x,0.));vec3 bitangent=cross(tangent,normal);
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
 float height=max(p.y,0.);float along=clamp(height/max(.03,plantHeight),0.,1.);
 vec2 sway=(windAt(r,time).xz*.07+vec2(sin(time*1.1+root.x*.7+root.z*.3+seed*6.28),cos(time*.8+root.x*.4+seed*4.))*.06)*height*(1.-still);
 p.xz+=sway+bend*along;p.y*=1.-flatten*.84;
 vec3 world=r+tangent*p.x+normal*p.y+bitangent*p.z;
 vec3 brush=brushForce(world)*(1.-still);float flex=along*along;
 world+=brush*flex*(kind>1.5&&kind<2.5?.0042:.0023);
 vec4 view=modelViewMatrix*vec4(world,1.);
 gl_Position=projectionMatrix*view;gl_PointSize=clamp((kind>2.5?6.:kind>1.5?15.:16.+seed*6.)*pixelRatio/max(.1,-view.z),1.,3.2*pixelRatio);
 float edge=1.-smoothstep(13.,18.,abs(r.x));float depth=exp(-length(r.xz)*.065);
 alpha=(kind<.5?.56:kind<1.5?.88:kind>2.5?.78:.96)*edge*depth*(.65+seed*.35);type=kind;
 pigment=botanicalColor*(.82+.18*along);
 if(kind>2.5&&seed>.997) pigment=mix(pigment,vec3(.8),.4);
}`;
const lineFragment=`varying float alpha;varying float type;varying vec3 pigment;void main(){gl_FragColor=vec4(pigment,alpha*(type>.5&&type<1.5?.55:1.));
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
const pointFragment=`varying float alpha;varying vec3 pigment;void main(){float r=length((gl_PointCoord-.5)*2.);if(r>1.)discard;float core=1.-smoothstep(.38,.82,r);gl_FragColor=vec4(pigment,alpha*(core*.9+exp(-r*r*8.)*.1));
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
type BufferSet={positions:number[];roots:number[];seeds:number[];kinds:number[];colors:number[];heights:number[]};
const empty=():BufferSet=>({positions:[],roots:[],seeds:[],kinds:[],colors:[],heights:[]});
function push(buffer:BufferSet,r:MeadowRoot,p:readonly number[],kind:number,colorKind:BotanicalKind=kind===0||kind===3?'grass':kind===2?'petal':'leaf',species=0){buffer.colors.push(...botanicalColor(colorKind,species,p[1]/r.height,r.seed));buffer.heights.push(r.height);buffer.positions.push(...p);buffer.roots.push(r.x,r.y,r.z);buffer.seeds.push(r.seed);buffer.kinds.push(kind);}
function segment(buffer:BufferSet,r:MeadowRoot,a:readonly number[],b:readonly number[],kind:number){push(buffer,r,a,kind,kind===1?'stem':'grass');push(buffer,r,b,kind,kind===1?'stem':'grass');}
function geometry(buffer:BufferSet){
 const g=new THREE.BufferGeometry();g.setAttribute('botanicalColor',new THREE.Float32BufferAttribute(buffer.colors,3));g.setAttribute('plantHeight',new THREE.Float32BufferAttribute(buffer.heights,1));g.setAttribute('position',new THREE.Float32BufferAttribute(buffer.positions,3));g.setAttribute('root',new THREE.Float32BufferAttribute(buffer.roots,3));g.setAttribute('seed',new THREE.Float32BufferAttribute(buffer.seeds,1));g.setAttribute('kind',new THREE.Float32BufferAttribute(buffer.kinds,1));return g;
}
export function createMeadow(scene:THREE.Scene,compact=false,sharedUniforms:Record<string,THREE.IUniform>={}){
 const meadow=generateMeadow(compact?4200:9000,compact?90:180,compact?36:72),lines=empty(),points=empty();
 for(const r of meadow.grass){
  for(let i=0;i<4;i++)segment(lines,r,grassBlade(r.height,r.seed,i/4,0),grassBlade(r.height,r.seed,(i+1)/4,0),0);
 }
 for(const [index,r] of meadow.flowers.entries()){
  segment(lines,r,[0,0,0],[0,r.height,0],1);
  const size=Math.hypot(r.petals[0].x,r.petals[0].z);
  for(let petal=0;petal<5;petal++)for(const u of [.22,.4,.58,.76,.94])for(const v of [-.65,0,.65])push(points,r,petalSurface(size,r.height,petal,u,v),2,'petal',index%4);
  for(let i=0;i<7;i++){const a=i*2.399,radius=Math.sqrt(i/7)*.007;push(points,r,[Math.cos(a)*radius,r.height+.004,Math.sin(a)*radius],2,'pollen');}
 }
 for(const r of meadow.bushes){
  for(const [branchIndex,branch] of r.branches.entries()){
   segment(lines,r,[0,0,0],[branch.x*.35,branch.y*.6,branch.z*.35],1);
   segment(lines,r,[branch.x*.35,branch.y*.6,branch.z*.35],[branch.x,branch.y,branch.z],1);
   for(let leaf=0;leaf<4;leaf++){
    const at=.45+leaf*.17,anchor=[branch.x*at,branch.y*at,branch.z*at] as const;
    const angle=branchIndex*2.399+leaf*Math.PI,length=.035+r.seed*.026;
    for(const u of [.12,.32,.52,.72,.92])for(const v of [-.65,0,.65])push(points,r,leafSurface(anchor,length,angle,u,v),1,'leaf');
   }
  }
 }
 for(const r of meadow.grass)for(const u of [.35,.68,1])for(const v of [-.65,0,.65])push(points,r,grassBlade(r.height,r.seed,u,v),3);
 const uniforms={brushStart:{value:Array.from({length:8},()=>new THREE.Vector4())},brushEnd:{value:Array.from({length:8},()=>new THREE.Vector4())},brushDirection:{value:Array.from({length:8},()=>new THREE.Vector4())},brushView:{value:new THREE.Vector3(0,0,-1)},brushCount:{value:0},...sharedUniforms,time:{value:0},pixelRatio:{value:1},still:{value:0},strikes:{value:Array.from({length:16},()=>new THREE.Vector4(0,0,-100,0))}};
 const lineGeometry=geometry(lines),pointGeometry=geometry(points);
 const material=(fragmentShader:string)=>new THREE.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader,transparent:true,depthWrite:false,depthTest:true,blending:THREE.NormalBlending});
 const lineMaterial=material(lineFragment),pointMaterial=material(pointFragment),grass=new THREE.LineSegments(lineGeometry,lineMaterial),leaves=new THREE.Points(pointGeometry,pointMaterial);
 grass.frustumCulled=false;leaves.frustumCulled=false;grass.renderOrder=2;leaves.renderOrder=2;scene.add(grass,leaves);
 let events:readonly ContactEvent[]=[];
 return {
  diagnostics:{get brushCount(){return uniforms.brushCount.value;},grass:meadow.grass.length,flowers:meadow.flowers.length,bushes:meadow.bushes.length,lineVertices:lines.seeds.length,leafParticles:points.seeds.length},
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
   lineGeometry.setDrawRange(0,grassVertices+details);const plantParticles=points.seeds.length-meadow.grass.length*9;
   pointGeometry.setDrawRange(0,plantParticles+Math.floor(meadow.grass.length*9*q));
  },
  dispose(){scene.remove(grass,leaves);lineGeometry.dispose();pointGeometry.dispose();lineMaterial.dispose();pointMaterial.dispose();},
 };
}
