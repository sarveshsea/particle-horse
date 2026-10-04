import * as THREE from 'three';
import type { WakePointer } from './particle-wake';
import { appendBrush,brushSegment,bridgeBrush,type BrushHit,type BrushSegment,type Vec3 } from './brush';
import { frameAt,type Equine } from './equine';
import { terrainHeight } from './sand';

export function createInteraction(camera:THREE.PerspectiveCamera,canvas:HTMLCanvasElement,mesh:Equine){
 let cursor:Readonly<{x:number;y:number;at:number;speed:number}>|undefined;
 let tapped=false,pending=false,history:readonly BrushSegment[]=[],previous:BrushHit|undefined;
 let hit:'horse'|'terrain'|'none'='none';
 const ray=new THREE.Raycaster(),view=new THREE.Vector3();
 const animated=new Float32Array(mesh.vertexCount*3);
 const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),intersection=new THREE.Vector3();
 const bounds=new THREE.Box3(new THREE.Vector3(-2.5,-.25,-.8),new THREE.Vector3(2.5,3,.8));
 const move=(event:PointerEvent)=>{
  if(event.pointerType==='touch'&&!tapped)return;
  const at=performance.now()/1000,rect=canvas.getBoundingClientRect();
  const x=(event.clientX-rect.left)/rect.width*2-1,y=1-(event.clientY-rect.top)/rect.height*2;
  const elapsed=cursor?Math.max(.008,at-cursor.at):.016;
  cursor={x,y,at,speed:cursor?Math.min(4,Math.hypot(x-cursor.x,y-cursor.y)/elapsed):0};pending=true;
 };
 const clear=()=>{cursor=undefined;tapped=false;previous=undefined;};
 const leave=(event:PointerEvent)=>{if(event.pointerType!=='touch')clear();};
 canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerleave',leave);canvas.addEventListener('pointercancel',clear);
 function pick(time:number):Vec3|undefined{
  if(!cursor)return;
  ray.setFromCamera(new THREE.Vector2(cursor.x,cursor.y),camera);
  const origin=ray.ray.origin.toArray() as Vec3,direction=ray.ray.direction.toArray() as Vec3;
  const f=frameAt(time,mesh.frameCount,mesh.cycleSeconds);
  let nearest=Infinity;
  if(ray.ray.intersectsBox(bounds)){
   for(let i=0;i<animated.length;i++)animated[i]=mesh.positions[f.a*animated.length+i]*(1-f.mix)+mesh.positions[f.b*animated.length+i]*f.mix;
   for(let i=0;i<mesh.topology.length;i+=3){
    a.fromArray(animated,mesh.topology[i]*3);b.fromArray(animated,mesh.topology[i+1]*3);c.fromArray(animated,mesh.topology[i+2]*3);
    if(ray.ray.intersectTriangle(a,b,c,false,intersection)){const distance=ray.ray.origin.distanceTo(intersection);if(distance<nearest)nearest=distance;}
   }
  }
  hit=Number.isFinite(nearest)?'horse':'none';
  if(direction[1]<-.0001){let ground=-origin[1]/direction[1];for(let i=0;i<4;i++)ground=(terrainHeight(origin[0]+direction[0]*ground,origin[2]+direction[2]*ground)-origin[1])/direction[1];if(ground>0&&ground<nearest){nearest=ground;hit='terrain';}}
  if(!Number.isFinite(nearest))return;
  return [origin[0]+direction[0]*nearest,origin[1]+direction[1]*nearest,origin[2]+direction[2]*nearest];
 }
 return {
  tap(event:PointerEvent){tapped=true;move(event);},
  update(disabled:boolean,time=0):WakePointer{
   if(disabled){clear();history=[];pending=false;}
   history=history.filter(s=>time-s.born<.65);
   if(pending&&!disabled){const point=pick(time);if(point){history=appendBrush(history,brushSegment(bridgeBrush(previous,point,hit),point,tapped?4:cursor?.speed??0,time));previous={point,target:hit};}else previous=undefined;pending=false;}
   camera.getWorldDirection(view);
   const last=history.at(-1),age=last?Math.max(0,time-last.born):2;
   return {point:new THREE.Vector3(...(last?.end??[100,100,100])),direction:new THREE.Vector3(...(last?.direction??[0,0,0])),strength:last?last.strength*Math.exp(-age*7):0,segments:history,view:view.clone()};
  },
  inspect(){return {count:history.length,hit,segments:history};},
  dispose(){canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerleave',leave);canvas.removeEventListener('pointercancel',clear);},
 };
}
