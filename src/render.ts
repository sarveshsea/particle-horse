import * as THREE from "three";
import { TERRAIN_GLSL } from "./terrain";
import { refineGait } from "./gait-refinement";
import { refineAnatomy } from "./anatomy";
import { createHair } from "./hair";
import { drawingRatioScale } from "./dynamics";
import { createParticleWake, wakeShader } from "./particle-wake";
import {
  decodeEquine,
  sampleSurface,
  frameAt,
  type EquineMetadata,
} from "./equine";
const atlasShader = `
uniform sampler2D atlas;
uniform vec2 atlasSize;
uniform float vertexCount;
uniform vec3 frame;
uniform float terrainTime;
${TERRAIN_GLSL}
vec3 vertexAt(float index,float pose){float id=index+pose*vertexCount;vec2 uv=(vec2(mod(id,atlasSize.x),floor(id/atlasSize.x))+.5)/atlasSize;return texture2D(atlas,uv).xyz;}
vec3 animated(float index){return terrainPosePoint(mix(vertexAt(index,frame.x),vertexAt(index,frame.y),frame.z),terrainTime);}
`;
const vertexShader = `
attribute vec3 triangle;
attribute vec2 barycentric;
attribute vec3 normalCoefficients;
attribute vec3 restPoint;
attribute float seed;
attribute float brightness;
attribute float faceWeight;
attribute vec4 featureWeight;
uniform float density;
uniform float pixelRatio;
varying float light;
varying float opacity;
varying float detachment;
${wakeShader}
${atlasShader}
void main(){
 vec3 a=animated(triangle.x),b=animated(triangle.y),c=animated(triangle.z);
 vec3 p=a*barycentric.x+b*barycentric.y+c*(1.-barycentric.x-barycentric.y);
 vec3 n=cross(b-a,c-a);vec3 face=n*inversesqrt(max(dot(n,n),1e-10));
 vec3 edge=b-a;vec3 tangent=edge*inversesqrt(max(dot(edge,edge),1e-10));
 vec3 blended=tangent*normalCoefficients.x+cross(face,tangent)*normalCoefficients.y+face*normalCoefficients.z;
 vec3 normal=blended*inversesqrt(max(dot(blended,blended),1e-10));
 vec3 offset=particleOffset(p,seed);
 detachment=smoothstep(.018,.09,length(offset));
 vec4 view=modelViewMatrix*vec4(p+offset+normal*.002,1.);
 gl_Position=projectionMatrix*view;
 gl_PointSize=clamp((9.2+seed*6.8)*pixelRatio/-view.z,.8,3.0*pixelRatio);
 float diffuse=max(0.,dot(normal,normalize(vec3(-.25,.65,1.))))*.8+max(0.,dot(normal,normalize(vec3(1.,.3,.2))))*.2;
 float bodyPhase=(restPoint.y+.055*sin(restPoint.x*4.)+.13*restPoint.z)*190.;
 float neckPhase=(restPoint.x*.78+restPoint.y*.52+restPoint.z*.14)*205.;
 float limbPhase=(restPoint.x*.8+restPoint.z*.6)*230.;
 float phase=mix(limbPhase,bodyPhase,smoothstep(.45,.90,restPoint.y));
 float hindPhase=(restPoint.y*.72+restPoint.x*.40+.15*restPoint.z)*190.;
 phase=mix(phase,hindPhase,1.-smoothstep(-.75,-.15,restPoint.x));
 phase=mix(phase,neckPhase,smoothstep(.18,.55,restPoint.x)*smoothstep(1.1,1.65,restPoint.y));
 float fiber=pow(.5+.5*sin(phase),8.);
 float muscleMask=smoothstep(-1.3,-.9,restPoint.x)*(1.-faceWeight);
 float rim=pow(1.-abs(dot(normal,normalize(cameraPosition-p))),2.);
 light=brightness*(.42+diffuse*1.12+rim*.30)*mix(1.,.72+fiber*.40,muscleMask);
 float recess=max(featureWeight.x*.90,featureWeight.y*.96);
 float faceRelief=1.-recess;
 light*=mix(1.,faceRelief,faceWeight);
 light+=featureWeight.z*.07+featureWeight.w*.10;
 opacity=.90;
}`;
const fragmentShader = `varying float light;varying float opacity;varying float detachment;uniform float wakePass;
void main(){float visibility=mix(1.-detachment,detachment,wakePass);if(visibility<.01)discard;
float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(vec3(light),(.80*(1.-smoothstep(.32,.70,r))+.15*exp(-r*r*6.))*opacity*visibility);}`;
async function loadEquine() {
  const root = import.meta.env.BASE_URL + "equine/";
  const responses = await Promise.all(
    ["metadata.json", "frames.f32", "topology.u32"].map((file) =>
      fetch(root + file),
    ),
  );
  if (responses.some((response) => !response.ok))
    throw new Error("Equine asset request failed");
  const [meta, p, t] = await Promise.all([
    responses[0].json() as Promise<EquineMetadata>,
    responses[1].arrayBuffer(),
    responses[2].arrayBuffer(),
  ]);
  return decodeEquine(meta, new Float32Array(p), new Uint32Array(t));
}
export async function createArtwork() {
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 1);
  document.body.append(renderer.domElement);
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120);
  const anatomy = refineAnatomy(refineGait(await loadEquine()));
  const mesh = anatomy.mesh;
  const compact = innerWidth < 600;
  const count = compact ? 68000 : 140000;
  const cloud = sampleSurface(mesh, count, 71, Float32Array.from(anatomy.faceWeights, weight => 1 + 3 * weight));
  const width = 1024,
    height = Math.ceil((mesh.vertexCount * mesh.frameCount) / width),
    data = new Float32Array(width * height * 4);
  for (let i = 0; i < mesh.positions.length / 3; i++)
    data.set(mesh.positions.subarray(i * 3, i * 3 + 3), i * 4);
  const atlas = new THREE.DataTexture(
    data,
    width,
    height,
    THREE.RGBAFormat,
    THREE.FloatType,
  );
  atlas.needsUpdate = true;
  atlas.minFilter = THREE.NearestFilter;
  atlas.magFilter = THREE.NearestFilter;
  const uniforms = {
    atlas: { value: atlas },
    atlasSize: { value: new THREE.Vector2(width, height) },
    vertexCount: { value: mesh.vertexCount },
    frame: { value: new THREE.Vector3(0, 1, 0) },
    terrainTime: { value: 0 },
    pixelRatio: { value: 1 },
    density: { value: 1 },
  };
  const wake = createParticleWake(renderer, count, cloud, uniforms);
  const particleUniforms = { ...uniforms, ...wake.uniforms, wakePass: { value: 0 } };
  const dock = mesh.positions.subarray(10 * 3, 10 * 3 + 3);
  let rootParticle = 0, rootDistance = Infinity;
  for (let i = 0; i < Math.floor(count * .35); i++) {
    const distance = (cloud.restPoints[i * 3] - dock[0]) ** 2 +
      (cloud.restPoints[i * 3 + 1] - dock[1]) ** 2 +
      (cloud.restPoints[i * 3 + 2] - dock[2]) ** 2;
    if (distance < rootDistance) { rootParticle = i; rootDistance = distance; }
  }
  const hair = createHair(scene, anatomy, { ...particleUniforms,
    hairRootWakeUv: { value: new THREE.Vector2(wake.uv[rootParticle * 2], wake.uv[rootParticle * 2 + 1]) },
  });
  const faceWeight = new Float32Array(count), featureWeight = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const weights = [cloud.weights[i * 2], cloud.weights[i * 2 + 1], 1 - cloud.weights[i * 2] - cloud.weights[i * 2 + 1]];
    for (let corner = 0; corner < 3; corner++) {
      const id = cloud.triangles[i * 3 + corner], weight = weights[corner];
      faceWeight[i] += anatomy.faceWeights[id] * weight;
      for (let component = 0; component < 4; component++) featureWeight[i * 4 + component] += anatomy.featureWeights[id * 4 + component] * weight;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("faceWeight", new THREE.BufferAttribute(faceWeight, 1));
  geometry.setAttribute("featureWeight", new THREE.BufferAttribute(featureWeight, 4));
  geometry.setAttribute("wakeUv", new THREE.BufferAttribute(wake.uv, 2));
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(count * 3), 3),
  );
  geometry.setAttribute(
    "triangle",
    new THREE.BufferAttribute(cloud.triangles, 3),
  );
  geometry.setAttribute(
    "barycentric",
    new THREE.BufferAttribute(cloud.weights, 2),
  );
  geometry.setAttribute("seed", new THREE.BufferAttribute(cloud.seeds, 1));
  geometry.setAttribute(
    "normalCoefficients",
    new THREE.BufferAttribute(cloud.normalCoefficients, 3),
  );
  geometry.setAttribute(
    "restPoint",
    new THREE.BufferAttribute(cloud.restPoints, 3),
  );
  geometry.setAttribute(
    "brightness",
    new THREE.BufferAttribute(cloud.brightness, 1),
  );
  const material = new THREE.ShaderMaterial({
    uniforms: particleUniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });
  const horse = new THREE.Points(geometry, material);
  horse.frustumCulled = false;
  horse.renderOrder = 2;
  scene.add(horse);
  const scatteredMaterial = new THREE.ShaderMaterial({
    uniforms: { ...particleUniforms, wakePass: { value: 1 } },
    vertexShader, fragmentShader, transparent: true, depthWrite: false,
    depthTest: false, blending: THREE.AdditiveBlending,
  });
  const scattered = new THREE.Points(geometry, scatteredMaterial);
  scattered.frustumCulled = false;
  scattered.renderOrder = 4;
  scattered.visible = false;
  scene.add(scattered);
  // A depth-only surface hides far-side points so muscles read as volumes, not wire spheres.
  const surfaceGeometry = new THREE.BufferGeometry();
  surfaceGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(mesh.positions.slice(0, mesh.vertexCount * 3), 3),
  );
  surfaceGeometry.setAttribute(
    "vertexId",
    new THREE.BufferAttribute(
      Float32Array.from({ length: mesh.vertexCount }, (_, i) => i),
      1,
    ),
  );
  surfaceGeometry.setIndex(new THREE.BufferAttribute(mesh.topology, 1));
  const depthMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `attribute float vertexId;${atlasShader}void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(animated(vertexId),1.);}`,
    fragmentShader: "void main(){gl_FragColor=vec4(0.);}",
    colorWrite: false,
    depthWrite: true,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const depth = new THREE.Mesh(surfaceGeometry, depthMaterial);
  depth.frustumCulled = false;
  depth.renderOrder = 0;
  scene.add(depth);
  function resize() {
    renderer.setPixelRatio(
      Math.min(devicePixelRatio, 1.75) * drawingRatioScale(uniforms.density.value),
    );
    renderer.setSize(innerWidth, innerHeight);
    uniforms.pixelRatio.value = renderer.getPixelRatio();
    camera.aspect = innerWidth / innerHeight;
    camera.position
      .set(2.45, 1.8, 6.45)
      .multiplyScalar(Math.max(1, 0.9 / camera.aspect));
    camera.lookAt(-0.2, 1.07, 0);
    camera.updateProjectionMatrix();
  }
  function setTime(time: number) {
    uniforms.terrainTime.value = time;
    const frame = frameAt(time, mesh.frameCount, mesh.cycleSeconds);
    uniforms.frame.value.set(frame.a, frame.b, frame.mix);
    hair.update(time, undefined, renderer.getPixelRatio());
  }
  resize();
  setTime(0);
  renderer.render(scene, camera);
  window.addEventListener("resize", resize);
  return {
    renderer,
    scene,
    camera,
    geometry,
    material,
    horse,
    wake,
    hair,
    anatomy,
    scattered,
    resize,
    setTime,
    mesh,
    frameBudget: 1000 / (compact ? 30 : 60),
  };
}
