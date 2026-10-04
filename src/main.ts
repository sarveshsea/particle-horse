import { createArtwork } from "./render";
import { createEnvironment, GROUND_SPEED } from "./environment";
import { qualityForFrame } from "./dynamics";
import { createCameraMotion } from "./camera-motion";
import { createInteraction } from "./interaction";
async function start() {
  const art = await createArtwork(),
    environment = createEnvironment(art.scene);
  const interaction = createInteraction(art.camera, art.renderer.domElement);
  const cameraMotion = createCameraMotion(art.camera, art.renderer.domElement, event => interaction.tap(event));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let time = 0,
    last = 0,
    frame = 0,
    total = 0,
    samples = 0,
    quality = 1,
    raf = 0,
    lost = false,
    elapsed = 0,
    lastWake = -10;
  const diagnostics = {
    time: 0,
    frames: 0,
    quality: 1,
    averageFrameMs: 0,
    paused: false,
    contextLost: false,
    particles: art.geometry.getAttribute("position").count,
    groundDistance: 0,
    impacts: 0,
    wakeStrength: 0,
    cameraYaw: 0,
    dragging: false,
    simulation: art.wake.supported ? "gpu" : "analytic",
    inspectWake: () => art.wake.maximumDisplacement(),
  };
  Object.defineProperty(window, "__ARTWORK", { value: diagnostics });
  function draw() {
    art.setTime(time);
    cameraMotion.update(time, elapsed, reduced.matches);
    const pointer = interaction.update(reduced.matches || cameraMotion.dragging);
    art.wake.update(time, reduced.matches ? 0 : elapsed, pointer);
    if (pointer.strength > .01) lastWake = time;
    art.scattered.visible = !reduced.matches && art.wake.active;
    environment.setPointer(pointer.point, pointer.strength);
    environment.update(time, art.mesh);
    diagnostics.impacts = environment.impactCount;
    diagnostics.wakeStrength = reduced.matches ? 0 : art.wake.uniforms.wakeStrength.value;
    diagnostics.cameraYaw = Math.atan2(art.camera.position.x + .2, art.camera.position.z);
    diagnostics.dragging = cameraMotion.dragging;
    for (const material of environment.materials) {
      material.uniforms.time.value = time;
      if (material.uniforms.pixelRatio)
        material.uniforms.pixelRatio.value = art.renderer.getPixelRatio();
    }
    art.renderer.render(art.scene, art.camera);
    elapsed = 0;
    diagnostics.time = time;
    diagnostics.groundDistance = time * GROUND_SPEED;
    diagnostics.frames++;
  }
  function animate(now: number) {
    raf = 0;
    if (document.hidden || lost || reduced.matches) return;
    if (last) {
      elapsed = Math.min((now - last) / 1000, 0.05);
      time += elapsed;
      total += now - last;
      samples++;
    }
    last = now;
    if (++frame % 90 === 0 && samples) {
      diagnostics.averageFrameMs = total / samples;
      quality = qualityForFrame(quality, total / samples, art.frameBudget);
      diagnostics.quality = quality;
      art.material.uniforms.density.value = quality;
      diagnostics.particles = Math.floor(
        art.geometry.getAttribute("position").count * quality,
      );
      art.geometry.setDrawRange(0, diagnostics.particles);
      environment.setQuality(quality);
      art.resize();
      total = 0;
      samples = 0;
    }
    draw();
    raf = requestAnimationFrame(animate);
  }
  function restart() {
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    elapsed = 0;
    total = 0;
    samples = 0;
    diagnostics.paused = document.hidden || reduced.matches || lost;
    if (reduced.matches && !lost) art.wake.reset();
    if (!document.hidden && !lost) {
      draw();
      if (!reduced.matches) raf = requestAnimationFrame(animate);
    }
  }
  document.addEventListener("visibilitychange", restart);
  reduced.addEventListener("change", restart);
  window.addEventListener("resize", () => {
    if (!lost) draw();
  });
  art.renderer.domElement.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    lost = true;
    diagnostics.contextLost = true;
    restart();
  });
  art.renderer.domElement.addEventListener("webglcontextrestored", () => {
    lost = false;
    elapsed = 0;
    lastWake = -10;
    art.wake.reset();
    diagnostics.contextLost = false;
    restart();
  });
  restart();
}
start().catch((error) =>
  console.error("Unable to initialize particle horse", error),
);
