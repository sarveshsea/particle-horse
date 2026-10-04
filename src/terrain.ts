/** Periodic material coordinates keep hills continuous as the scene scrolls. */
export const TERRAIN_PERIOD=36;
export const TERRAIN_SPEED=6;
export type TerrainPoint=Readonly<{x:number;y:number;z:number}>;
const frequency=2*Math.PI/TERRAIN_PERIOD;
function finite(...values:number[]){if(values.some(value=>!Number.isFinite(value)))throw new RangeError('Terrain coordinates must be finite');}
export function materialHeight(x:number,z:number):number{
 finite(x,z);
 return .23*Math.sin(frequency*x+.4)*Math.cos(z*.13)+.075*Math.sin(frequency*x*2-z*.16+.9)+.035*Math.cos(frequency*x*3+z*.2);
}
function slope(x:number,z:number){
 return {x:.23*frequency*Math.cos(frequency*x+.4)*Math.cos(z*.13)+.15*frequency*Math.cos(frequency*x*2-z*.16+.9)-.105*frequency*Math.sin(frequency*x*3+z*.2),z:-.23*.13*Math.sin(frequency*x+.4)*Math.sin(z*.13)-.075*.16*Math.cos(frequency*x*2-z*.16+.9)-.035*.2*Math.sin(frequency*x*3+z*.2)};
}
export function worldHeight(x:number,z:number,time:number):number{finite(x,z,time);return materialHeight(x+TERRAIN_SPEED*time,z);}
export function terrainNormal(x:number,z:number):TerrainPoint{finite(x,z);const s=slope(x,z),length=Math.hypot(s.x,1,s.z);return {x:-s.x/length,y:1/length,z:-s.z/length};}
export function horseTerrainPose(time:number):Readonly<{height:number;pitch:number}>{finite(time);return {height:worldHeight(0,0,time),pitch:Math.atan(slope(TERRAIN_SPEED*time,0).x)};}
export function transformTerrainPoint(point:TerrainPoint,time:number):TerrainPoint{finite(point.x,point.y,point.z,time);const pose=horseTerrainPose(time),c=Math.cos(pose.pitch),s=Math.sin(pose.pitch);return {x:c*point.x-s*point.y,y:s*point.x+c*point.y+pose.height,z:point.z};}
export const TERRAIN_GLSL=`
float terrainMaterialHeight(float x,float z){float f=.1745329252;return .23*sin(f*x+.4)*cos(z*.13)+.075*sin(f*x*2.-z*.16+.9)+.035*cos(f*x*3.+z*.2);}
float terrainHeightAt(vec2 p,float t){return terrainMaterialHeight(p.x+6.*t,p.y);}
vec3 terrainPosePoint(vec3 p,float t){float x=6.*t,f=.1745329252;float derivative=.23*f*cos(f*x+.4)+.15*f*cos(f*x*2.+.9)-.105*f*sin(f*x*3.);float angle=atan(derivative),c=cos(angle),s=sin(angle);return vec3(c*p.x-s*p.y,s*p.x+c*p.y+terrainHeightAt(vec2(0.),t),p.z);}
`;
