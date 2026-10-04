import * as THREE from 'three';
import { createArtwork } from './render';
import { createEnvironment } from './environment';
import { gait } from './gait';
import { qualityForFrame } from './dynamics';
const art=createArtwork(),environment=createEnvironment(art.scene);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let time=0,last=0,frame=0,total=0,samples=0,quality=1,raf=0,lost=false;
const diagnostics={time:0,frames:0,quality:1,averageFrameMs:0,paused:false,contextLost:false,particles:76000};
Object.defineProperty(window,'__ARTWORK',{value:diagnostics});
function draw() {
 const pose=gait(time);
 const root=new THREE.Matrix4().makeRotationZ(pose.pitch); root.setPosition(0,pose.bob,0);
 art.matrices[0].copy(root);
 art.matrices[1].copy(root).multiply(new THREE.Matrix4().makeTranslation(1,2.7,0)).multiply(new THREE.Matrix4().makeRotationZ(pose.head)).multiply(new THREE.Matrix4().makeTranslation(-1,-2.7,0));
 pose.legs.forEach((leg,i)=>{
  const v=(p:readonly number[])=>new THREE.Vector3(...p as [number,number,number]);
  art.segment(2+i*3,v(leg.hip),v(leg.knee)); art.segment(3+i*3,v(leg.knee),v(leg.ankle)); art.segment(4+i*3,v(leg.ankle),v(leg.hoof));
  for(let j=0;j<3;j++)art.matrices[2+i*3+j].premultiply(root);
 });
 art.material.uniforms.time.value=time;
 for(const material of [environment.material,environment.trailMaterial]){material.uniforms.time.value=time;material.uniforms.pixelRatio.value=art.renderer.getPixelRatio();}
 art.renderer.render(art.scene,art.camera);
 diagnostics.time=time;diagnostics.frames++;
}
function animate(now:number) {
 raf=0;
 if(document.hidden||lost||reduced.matches)return;
 if(last){const dt=Math.min((now-last)/1000,.05);time+=dt;total+=now-last;samples++;}
 last=now;
 if(++frame%120===0&&samples){diagnostics.averageFrameMs=total/samples;quality=qualityForFrame(quality,total/samples);diagnostics.quality=quality;total=0;samples=0;}
 draw();raf=requestAnimationFrame(animate);
}
function restart() {
 cancelAnimationFrame(raf);raf=0;last=0;
 diagnostics.paused=document.hidden||reduced.matches||lost;
 if(!document.hidden&&!lost){draw();if(!reduced.matches)raf=requestAnimationFrame(animate);}
}
document.addEventListener('visibilitychange',restart);
reduced.addEventListener('change',restart);
window.addEventListener('resize',()=>{if(!lost)draw();});
art.renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;diagnostics.contextLost=true;restart();});
art.renderer.domElement.addEventListener('webglcontextrestored',()=>{lost=false;diagnostics.contextLost=false;restart();});
restart();
