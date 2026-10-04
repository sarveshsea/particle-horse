import * as THREE from "three";
import { generateSand } from "./sand";
export const GROUND_SPEED = 6;
export function createEnvironment(scene: THREE.Scene) {
  const { positions, seeds, sizes } = generateSand(
    innerWidth < 600 ? 45000 : 90000,
  );
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("seed", new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      pixelRatio: { value: 1 },
      speed: { value: GROUND_SPEED },
    },
    vertexShader: `
 attribute float seed;attribute float size;uniform float time;uniform float pixelRatio;uniform float speed;varying float alpha;
 void main(){vec3 p=position;p.x=mod(p.x-time*speed+18.,36.)-18.;
 float close=exp(-pow(p.x/4.,2.)-pow(p.z/2.2,2.));
 p.y+=sin(time*2.+seed*60.)*.004*close;
 vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;
 gl_PointSize=clamp((12.+size*6.)*pixelRatio/-view.z,.65,2.8*pixelRatio);
 alpha=(.44+seed*.40)*exp(-length(p.xz)*.08)*(1.-smoothstep(7.,11.,abs(p.z)))*(1.-smoothstep(12.,18.,abs(p.x)));
 }`,
    fragmentShader: `varying float alpha;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(vec3(1.),exp(-r*r*3.6)*alpha);}`,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });
  const sand = new THREE.Points(geometry, material);
  sand.renderOrder = 1;
  sand.frustumCulled = false;
  scene.add(sand);
  return {
    materials: [material],
    setQuality: (quality: number) =>
      geometry.setDrawRange(
        0,
        Math.floor(seeds.length * Math.max(0.5, quality)),
      ),
  };
}
