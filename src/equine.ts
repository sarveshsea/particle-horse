export type EquineMetadata = Readonly<{vertexCount:number;triangleCount:number;frameCount:number;cycleSeconds:number}>;
export type Equine = EquineMetadata & Readonly<{positions:Float32Array;topology:Uint32Array}>;
export function randomSource(seed:number):()=>number {
 let state=seed>>>0;
 return ()=>{state=(state+0x6D2B79F5)>>>0;let n=Math.imul(state^(state>>>15),state|1);n^=n+Math.imul(n^(n>>>7),n|61);return ((n^(n>>>14))>>>0)/4294967296;};
}
export function decodeEquine(meta:EquineMetadata,positions:Float32Array,topology:Uint32Array):Equine {
 if(!Number.isInteger(meta.vertexCount)||meta.vertexCount<3||meta.vertexCount>100000||!Number.isInteger(meta.triangleCount)||meta.triangleCount<1||meta.triangleCount>200000||!Number.isInteger(meta.frameCount)||meta.frameCount<1||meta.frameCount>64||!Number.isFinite(meta.cycleSeconds)||meta.cycleSeconds<=0)throw new RangeError('Invalid equine metadata');
 if(positions.length!==meta.vertexCount*meta.frameCount*3||topology.length!==meta.triangleCount*3)throw new RangeError('Incomplete equine asset');
 if(!positions.every(Number.isFinite)||!topology.every(index=>index<meta.vertexCount))throw new RangeError('Corrupt equine coordinates or topology');
 return {...meta,positions,topology};
}
export function frameAt(time:number,frameCount:number,cycleSeconds:number) {
 if(!Number.isFinite(time))throw new RangeError('Time must be finite');
 const phase=((time%cycleSeconds)+cycleSeconds)%cycleSeconds/cycleSeconds*frameCount;
 const a=Math.floor(phase);
 return {a,b:(a+1)%frameCount,mix:phase-a};
}
export function sampleSurface(mesh:Equine,count:number,seed=71) {
 if(!Number.isInteger(count)||count<1||count>200000)throw new RangeError('Particle count must be an integer from 1 to 200000');
 const cumulative=new Float64Array(mesh.triangleCount);let total=0;
 for(let i=0;i<mesh.triangleCount;i++) {
  const a=mesh.topology[i*3]*3,b=mesh.topology[i*3+1]*3,c=mesh.topology[i*3+2]*3,p=mesh.positions;
  const ux=p[b]-p[a],uy=p[b+1]-p[a+1],uz=p[b+2]-p[a+2],vx=p[c]-p[a],vy=p[c+1]-p[a+1],vz=p[c+2]-p[a+2];
  total+=Math.hypot(uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx)/2;cumulative[i]=total;
 }
 if(total<=0)throw new RangeError('Source surface has zero area');
 const triangles=new Float32Array(count*3),weights=new Float32Array(count*2),seeds=new Float32Array(count),brightness=new Float32Array(count);
 const random=randomSource(seed);
 for(let i=0;i<count;i++) {
  const area=random()*total;let low=0,high=mesh.triangleCount-1;
  while(low<high){const mid=(low+high)>>>1;if(cumulative[mid]<area)low=mid+1;else high=mid;}
  triangles.set(mesh.topology.subarray(low*3,low*3+3),i*3);
  const root=Math.sqrt(random()),v=random();weights.set([1-root,root*v],i*2);
  seeds[i]=random();brightness[i]=.65+random()*.35;
 }
 return {triangles,weights,seeds,brightness};
}
