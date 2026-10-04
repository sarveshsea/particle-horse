import type { Equine } from './equine';
export const EQUINE_LANDMARKS = {
 eyes: [4279,5441], nostrils:[3333,4547], jaws:[3543,4758], ears:[3876,5088],
} as const;
export type Anatomy = Readonly<{
 mesh:Equine; faceWeights:Float32Array; featureWeights:Float32Array;
 tailMask:Uint8Array; tailGuide:Float32Array; guideCount:number;
 landmarks:typeof EQUINE_LANDMARKS;
}>;
const smooth=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const feature=(p:Float32Array,v:number,ids:readonly number[],r:readonly number[])=>Math.max(...ids.map(id=>{
 let d=0;for(let a=0;a<3;a++)d+=((p[v*3+a]-p[id*3+a])/r[a])**2;
 return Math.exp(-d*2);
}));
export function refineAnatomy(source:Equine):Anatomy{
 if(source.vertexCount!==8431||source.positions.length!==source.vertexCount*source.frameCount*3)throw new RangeError('Anatomical landmarks require the credited 8431-vertex equine asset');
 const faceWeights=new Float32Array(source.vertexCount),featureWeights=new Float32Array(source.vertexCount*4),tailMask=new Uint8Array(source.vertexCount);
 const positions=source.positions.slice();
 for(let v=0;v<source.vertexCount;v++){
  const x=source.positions[v*3],y=source.positions[v*3+1],z=source.positions[v*3+2];
  const mask=smooth(.55,.83,x)*smooth(1.4,1.58,y);faceWeights[v]=mask;
  const eye=feature(source.positions,v,EQUINE_LANDMARKS.eyes,[.045,.033,.036]);
  const nostril=feature(source.positions,v,EQUINE_LANDMARKS.nostrils,[.034,.023,.024]);
  const jaw=feature(source.positions,v,EQUINE_LANDMARKS.jaws,[.12,.09,.07]);
  const ear=feature(source.positions,v,EQUINE_LANDMARKS.ears,[.04,.08,.04]);
  featureWeights.set([eye,nostril,jaw,ear],v*4);
  if(v>=7562&&v<=8429)tailMask[v]=1;
  if(mask===0)continue;
  for(let f=0;f<source.frameCount;f++){
   const offset=(f*source.vertexCount+v)*3;
   const side=Math.sign(source.positions[offset+2]);
   // Small recesses and a tapered muzzle sharpen existing source anatomy.
   const muzzle=smooth(.9,1.045,x)*(1-smooth(1.72,1.88,y));
   positions[offset+2]+=mask*(-side*(eye*.009+nostril*.010+muzzle*.003)+side*ear*.002);
   positions[offset+1]+=mask*(-jaw*.004+ear*.002);
   positions[offset]+=mask*muzzle*.003;
  }
  if(!Number.isFinite(z))throw new RangeError('Non-finite anatomical source');
 }
 const body:number[]=[];
 for(let t=0;t<source.topology.length;t+=3){
  const ids=source.topology.subarray(t,t+3);
  if(ids.every(id=>tailMask[id]===0))body.push(...ids);
 }
 const topology=new Uint32Array(body),guideCount=9;
 const groups=Array.from({length:guideCount},()=>[] as number[]);
 const tailIds=Array.from({length:868},(_,i)=>i+7562);
 const maxX=Math.max(...tailIds.map(id=>source.positions[id*3])),minX=Math.min(...tailIds.map(id=>source.positions[id*3]));
 for(const id of tailIds){
  const u=(maxX-source.positions[id*3])/(maxX-minX);
  groups[Math.min(guideCount-1,Math.floor(u*guideCount))].push(id);
 }
 if(groups.some(g=>g.length===0))throw new RangeError('Incomplete tail centerline');
 const tailGuide=new Float32Array(source.frameCount*guideCount*3);
 for(let f=0;f<source.frameCount;f++)for(let g=0;g<guideCount;g++)for(let a=0;a<3;a++){
  tailGuide[(f*guideCount+g)*3+a]=g===0
   ? source.positions[(f*source.vertexCount+10)*3+a]
   : groups[g].reduce((sum,id)=>sum+source.positions[(f*source.vertexCount+id)*3+a],0)/groups[g].length;
 }
 for(let f=0;f<source.frameCount;f++){
  const root=f*guideCount*3,rootY=tailGuide[root+1];
  for(let g=1;g<guideCount;g++){
   const u=g/(guideCount-1),offset=root+g*3;
   const rise=tailGuide[offset+1]-rootY;
   const dock=smooth(0,.4,u);
   const transition=smooth(.25,.6,u);
   tailGuide[offset+1]=rootY+.035*Math.tanh(rise/.035)*(1-transition)+rise*(.12+.38*dock)*transition;
   tailGuide[offset+2]*=smooth(0,.6,u);
  }
 }
 return {mesh:{...source,positions,topology,triangleCount:topology.length/3},faceWeights,featureWeights,tailMask,tailGuide,guideCount,landmarks:EQUINE_LANDMARKS};
}
