import * as THREE from 'three';
import type { WakePointer } from './particle-wake';

/** Project hover onto a camera-facing plane through the running anatomy. */
export function createInteraction(camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement) {
  let cursor: Readonly<{x:number;y:number;at:number;speed:number;dx:number;dy:number}> | undefined;
  let tapped = false;
  const ray = new THREE.Raycaster(), plane = new THREE.Plane();
  const point = new THREE.Vector3(100,100,100), direction = new THREE.Vector3();
  const normal = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3();
  const move = (event: PointerEvent) => {
    if(event.pointerType === 'touch' && !tapped) return;
    const at=performance.now()/1000, rect=canvas.getBoundingClientRect();
    const x=(event.clientX-rect.left)/rect.width*2-1, y=1-(event.clientY-rect.top)/rect.height*2;
    const elapsed=cursor ? Math.max(.008,at-cursor.at):.016;
    const dx=cursor ? x-cursor.x:0,dy=cursor ? y-cursor.y:0;
    cursor={x,y,at,speed:Math.min(4,Math.hypot(dx,dy)/elapsed),dx,dy};
  };
  const clear=()=>{cursor=undefined;tapped=false;};
  canvas.addEventListener('pointermove',move);
  canvas.addEventListener('pointerleave',clear);
  canvas.addEventListener('pointercancel',clear);
  return {
    tap(event:PointerEvent){tapped=true;move(event);},
    update(disabled:boolean):WakePointer {
      let strength=0;
      if(cursor&&!disabled){
        const age=performance.now()/1000-cursor.at;
        camera.getWorldDirection(normal);
        plane.setFromNormalAndCoplanarPoint(normal,new THREE.Vector3(-.2,1.05,0));
        ray.setFromCamera(new THREE.Vector2(cursor.x,cursor.y),camera);
        if(ray.ray.intersectPlane(plane,point)){
          right.setFromMatrixColumn(camera.matrixWorld,0);up.setFromMatrixColumn(camera.matrixWorld,1);
          direction.copy(right).multiplyScalar(cursor.dx).addScaledVector(up,cursor.dy);
          if(direction.lengthSq()>.000001)direction.normalize();
          strength=(tapped?.85:.22+cursor.speed*.19)*Math.exp(-age*6);
          if(age>1.5)clear();
        }
      }
      return {point,direction,strength};
    },
    dispose(){canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerleave',clear);canvas.removeEventListener('pointercancel',clear);},
  };
}
