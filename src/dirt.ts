import {worldHeight,TERRAIN_GLSL} from './terrain';
export type SoilImpact=Readonly<{x:number;z:number;born:number;strength:number}>;
const fract=(v:number)=>v-Math.floor(v);
function validate(seed:number,strength=1){if(!Number.isFinite(seed)||seed<0||seed>1||!Number.isFinite(strength)||strength<0||strength>1)throw new RangeError('Invalid soil grain');}
export function dirtLaunch(seed:number,strength:number){
 validate(seed,strength);const cluster=Math.floor(seed*32),local=fract(seed*181.23),side=Math.sin(cluster*2.399),jitter=fract(seed*59.17),factor=.7+.3*strength;
 const vertical=fract(seed*97.71),up=seed<.2?.3+vertical*.89:seed<.85?1.2+vertical*1.8:4+vertical;
 return {x:(-1.7-fract(cluster*.618)*1.6-(local-.5)*1.5)*factor,y:up*factor,z:(side*.8+(jitter-.5)*1.1)*factor};
}
export function dirtPigment(seed:number):readonly[number,number,number]{validate(seed);return seed<.68?[.055+.06*seed,.13+.12*seed,.025+.025*seed]:[.22+.10*seed,.115+.065*seed,.047+.025*seed];}
export function dirtPoint(hit:SoilImpact,age:number,seed:number){
 validate(seed,hit.strength);if(!Number.isFinite(age)||age<0||![hit.x,hit.z,hit.born].every(Number.isFinite))throw new RangeError('Invalid soil trajectory');
 const v=dirtLaunch(seed,hit.strength),flight=(v.y+Math.sqrt(v.y*v.y+2*9.81*.002))/9.81,moving=Math.min(age,flight),t=hit.born+moving,gust=.65+.35*Math.sin(t*.71+1.08),curl=Math.sin(hit.x*.8+hit.z*1.1-t*1.4+2.71);
 const x=hit.x-6*age+v.x*moving+(-1.3*gust+.28*curl)*moving*moving*.13,z=hit.z+v.z*moving+.34*Math.cos(hit.x*.7-t*1.1)*gust*moving*moving*.13;
 return {x,y:Math.max(worldHeight(x,z,hit.born+age)+.002,age>=flight?-Infinity:worldHeight(hit.x,hit.z,hit.born)+.004+v.y*age-4.905*age*age),z};
}
export const DIRT_GLSL=`
${TERRAIN_GLSL}
vec3 dirtLaunch(float seed,float strength){
 float cluster=floor(seed*32.),local=fract(seed*181.23),side=sin(cluster*2.399),jitter=fract(seed*59.17),factor=.7+.3*strength;
 float vertical=fract(seed*97.71),up=seed<.2?.3+vertical*.89:(seed<.85?1.2+vertical*1.8:4.+vertical);
 return vec3(-1.7-fract(cluster*.618)*1.6-(local-.5)*1.5,up,side*.8+(jitter-.5)*1.1)*factor;
}
vec3 dirtPigment(float seed){return seed<.68?vec3(.055+.06*seed,.13+.12*seed,.025+.025*seed):vec3(.22+.10*seed,.115+.065*seed,.047+.025*seed);}
vec3 sprayPoint(vec4 hit,float age,float seed,float t,float groundSpeed){
 vec3 origin=vec3(hit.x,terrainHeightAt(hit.xy,hit.z)+.004,hit.y);
 vec3 velocity=dirtLaunch(seed,hit.w);
 float flight=(velocity.y+sqrt(velocity.y*velocity.y+2.*9.81*.002))/9.81;
 float moving=min(age,flight);
 vec3 p=origin+velocity*moving+vec3(-groundSpeed*age,0.,0.)+windAt(origin,hit.z+moving)*moving*moving*.13;
 float floorHeight=terrainHeightAt(p.xz,t)+.002;
 p.y=age>=flight?floorHeight:max(origin.y+velocity.y*age-4.905*age*age,floorHeight);return p;
}`;
