import { createArtwork } from "./render";
import { createEnvironment, GROUND_SPEED } from "./environment";
import { qualityForFrame } from "./dynamics";
async function start() {
  const art = await createArtwork(),
    environment = createEnvironment(art.scene);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let time = 0,
    last = 0,
    frame = 0,
    total = 0,
    samples = 0,
    quality = 1,
    raf = 0,
    lost = false;
  const diagnostics = {
    time: 0,
    frames: 0,
    quality: 1,
    averageFrameMs: 0,
    paused: false,
    contextLost: false,
    particles: art.geometry.getAttribute("position").count,
    groundDistance: 0,
  };
  Object.defineProperty(window, "__ARTWORK", { value: diagnostics });
  function draw() {
    art.setTime(time);
    for (const material of environment.materials) {
      material.uniforms.time.value = time;
      if (material.uniforms.pixelRatio)
        material.uniforms.pixelRatio.value = art.renderer.getPixelRatio();
    }
    art.renderer.render(art.scene, art.camera);
    diagnostics.time = time;
    diagnostics.groundDistance = time * GROUND_SPEED;
    diagnostics.frames++;
  }
  function animate(now: number) {
    raf = 0;
    if (document.hidden || lost || reduced.matches) return;
    if (last) {
      time += Math.min((now - last) / 1000, 0.05);
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
    total = 0;
    samples = 0;
    diagnostics.paused = document.hidden || reduced.matches || lost;
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
    diagnostics.contextLost = false;
    restart();
  });
  restart();
}
start().catch((error) =>
  console.error("Unable to initialize particle horse", error),
);
