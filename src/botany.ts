export type BotanicalKind='grass'|'leaf'|'stem'|'petal'|'pollen';
type Vec3=readonly [number,number,number];
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
function finite(...values:number[]){if(!values.every(Number.isFinite))throw new RangeError('Botanical inputs must be finite');}
const linear=(v:number)=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);
const blooms:readonly Vec3[]=[[.96,.92,.78],[.96,.73,.19],[.68,.53,.84],[.82,.44,.52]];
export function botanicalColor(kind:BotanicalKind,species:number,height:number,seed:number):Vec3{
 finite(species,height,seed);const h=clamp(height),s=clamp(seed);
 const base:Vec3=kind==='petal'?blooms[((Math.floor(species)%4)+4)%4]:kind==='pollen'?[.98,.76,.23]:kind==='stem'?[.28,.43,.15]:kind==='leaf'?[.19,.43,.24]:s<.5?[.28,.57,.29]:[.47,.54,.22];
 const light=(kind==='petal'||kind==='pollen'?.78:.55)+h*.22+s*.08;
 return base.map(c=>linear(clamp(c*light))) as unknown as Vec3;
}
export function grassBlade(height:number,seed:number,u:number,across:number):Vec3{
 finite(height,seed,u,across);const t=clamp(u),a=seed*Math.PI*2,curve=.025+seed*.055,width=(t===0||t===1?0:Math.sin(t*Math.PI))*.0025*across;
 if(t===0)return [0,0,0];
 return [Math.cos(a)*curve*t*t-Math.sin(a)*width,height*t,Math.sin(a)*curve*t*t+Math.cos(a)*width];
}
export function petalSurface(size:number,height:number,petal:number,u:number,v:number):Vec3{
 finite(size,height,petal,u,v);const t=clamp(u),angle=petal*Math.PI*2/5,radius=size*t,width=Math.sin(Math.PI*t)*size*.38*v;
 const x=Math.cos(angle)*radius-Math.sin(angle)*width,z=Math.sin(angle)*radius+Math.cos(angle)*width;
 return [x,height+z*.72+size*(.12*t*t+.14*v*v*Math.sin(Math.PI*t)),z*.58];
}
export function leafSurface(anchor:Vec3,length:number,angle:number,u:number,v:number):Vec3{
 finite(...anchor,length,angle,u,v);const t=clamp(u),width=(t===0||t===1?0:Math.sin(Math.PI*t))*length*.28*v;
 if(t===0)return anchor;
 return [anchor[0]+Math.cos(angle)*length*t-Math.sin(angle)*width,anchor[1]+length*(.25*t+.08*Math.sin(Math.PI*t)*(1-v*v)),anchor[2]+Math.sin(angle)*length*t+Math.cos(angle)*width];
}
