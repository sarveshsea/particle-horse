import { randomSource } from "./equine";
export function generateSand(count: number, seed = 108) {
  if (!Number.isInteger(count) || count < 1 || count > 150000)
    throw new RangeError("Sand population must be an integer from 1 to 150000");
  const random = randomSource(seed),
    positions = new Float32Array(count * 3),
    seeds = new Float32Array(count),
    sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const x = (random() - 0.5) * 36,
      z = (random() - 0.5) * 22;
    const y =
      -0.032 +
      0.012 * Math.sin(x * 0.9 + z * 0.7) +
      0.008 * Math.sin(x * 2.3 - z * 1.1);
    positions.set([x, y, z], i * 3);
    seeds[i] = random();
    sizes[i] = 0.6 + random() * 0.8;
  }
  return { positions, seeds, sizes };
}

export type SandLayer = 'near'|'middle'|'far';
export function terrainHeight(x:number,z:number):number{
 if(!Number.isFinite(x)||!Number.isFinite(z))throw new RangeError('Terrain coordinates must be finite');
 const offset=Math.max(0,Math.min(1,(Math.abs(z)-.4)/.8));
 const envelope=offset*offset*(3-2*offset);
 const ridge=.5+.5*Math.sin(x*.62+z*.83+.32*Math.sin(x*.19-z*.41));
 const trough=.032+.10*ridge*ridge;
 return -.02-envelope*trough+.002*Math.sin(x*1.3+z*.9);
}
export function generateSandLayer(count:number,layer:SandLayer,seed=108){
 const source=generateSand(count,seed),random=randomSource(seed^0x64921);
 const bounds=layer==='near'?[0,2.1,9]:layer==='middle'?[2.1,6.5,14]:[6.5,11,18];
 const centers=Array.from({length:Math.max(8,Math.ceil(count/48))},()=>({
  x:(random()-.5)*bounds[2]*1.94,
  z:(bounds[0]+.16+random()*(bounds[1]-bounds[0]-.32))*(random()<.5?-1:1),
 }));
 const positions=new Float32Array(count*3);
 for(let i=0;i<count;i++){
  const center=centers[Math.floor(random()*centers.length)];
  const radius=(.05+random()*.10)*Math.sqrt(random()),angle=random()*Math.PI*2;
  const uniform=i%3===2;
  const x=uniform?(random()-.5)*bounds[2]*2:Math.max(-bounds[2]+.001,Math.min(bounds[2]-.001,center.x+Math.cos(angle)*radius));
  const z=uniform?(bounds[0]+random()*(bounds[1]-bounds[0]))*(random()<.5?-1:1):center.z+Math.sin(angle)*radius;
  positions.set([x,terrainHeight(x,z)+(random()-.5)*.012,z],i*3);
 }
 return {...source,positions};
}
