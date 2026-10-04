# Particle Horse

A detailed equine surface reconstructed as a dense particle cloud, galloping through a white particle meadow in a black void. One canvas, no visible words or controls. Recorded hoof and sand sounds begin on the first click, tap, or drag; M toggles mute.

![Particle Horse](docs/artwork.png)

## Run

Use Node.js 22. Run `npm ci`, then `npm run dev`. Open the local URL printed by Vite. `npm run build` produces a static site in `dist/`.

## Anatomy and motion

The initial volume-built horse was replaced with a detailed equine mesh and authored gallop sequence from Sumner and Popović’s deformation-transfer research. The particle generator samples triangles by surface area, assigns fixed barycentric coordinates and interpolates corresponding vertices across a 24-frame stride. Particle positions therefore follow the source surface and its body deformation instead of an approximation built from ellipsoids and articulated tubes.

A GPU position atlas drives 140,000 particles on larger viewports and 68,000 on portrait screens. A depth-only surface hides far-side particles, allowing the chest, neck, knees, hocks and hooves to read as volumes. The underlying solid mesh never writes visible color. Smooth normals and surface-attached fiber shading emphasize the shoulder, barrel and hindquarter muscles as the model deforms. The stride takes 0.9 seconds. The camera follows a restrained 20-second side-to-three-quarter arc. Dragging takes over smoothly, then settles back after three seconds idle. White granular ground moves backward at 6 rendering units per second. Four immutable strike events per stride drive clustered sand eruptions, ballistic settling grains and propulsion pressure across three contoured depth bands; six peripheral wind streams share the same gust and curl field. No wire grid or solid floor is drawn.

A seeded particle meadow adds short curved grass, tilted five-petal flowers and low leafy bushes. Flowers and bushes regularly occupy the hoof corridor; strikes bend and flatten nearby growth while larger white grains launch above it. Terrain and vegetation stream backward together. The quieter ground bed keeps the horse and plants readable.

The source is an authored equine model, not a scan or a clinically validated anatomical reconstruction. [Source provenance, original notices and conversion details](docs/SOURCE.md) remain outside the artwork. The mesh data used in this project was made available by Robert Sumner and Jovan Popovic from the Computer Graphics Group at MIT.

## Interaction and forces

Hovering pulls local streams away from the moving anatomy. Pointer speed controls a bounded force; GPU offsets and velocities follow a damped restoring spring with a 0.8-unit displacement cap. Particles return to their current animated anchors, rather than a frozen pose. Attached particles use anatomical occlusion; detached particles blend into a separate pass that stays visible around the depth surface.

Touch taps create a local pulse; touch dragging steers the camera. Camera gestures suspend pointer forces. Devices without floating-point render targets use a bounded analytic disturbance. No controls or instructions appear on the canvas.

## Face, hair and recorded sound

Local facial masks refine the muzzle, jaw, ears, eyes and nostrils; facial sampling is denser and excludes body fiber shading. The original solid tail is removed from both surface sampling and depth rendering. 640 seeded strands follow nine animated guide points, with connected filaments and sparkling highlights, anchored roots, delayed tips, gravity and shared wind.

Short recorded hoof attacks and light grain releases use the same descending sole-contact events as the visual strikes. Samples play near their original speed, with low-mid resonance reduced and a quiet high-passed air bed. Camera-relative stereo placement stays restrained. The first trusted interaction activates sound; M mutes. Hidden tabs, reduced motion and context loss stop playback, and resuming starts at the current gait without queued impacts. Missing audio leaves the artwork running. [Recording provenance and processing](docs/audio-sources.md) document the CC0 sources.

## Rendering behavior

The canvas fills the viewport. Slow frames shorten draw ranges over randomly ordered surface and sand samples and reduce pixel ratio. This reduces actual GPU submissions while preserving the anatomical distribution. Resize preserves the performance budget. Hidden tabs pause. Reduced motion restores a complete still horse and disables orbit and disturbances. WebGL context restoration clears simulation state before resuming. Simulation runs at fixed 60 Hz, sleeps when settled, and adapts its active population alongside rendered draw ranges. Distant floor grains and wind degrade before the coarse strike grains. Drawing resolution stays above 84.85% of the capped pixel ratio to protect sparkle sharpness. The initial asset load shows only the black canvas. WebGL2 is required.

## Verification

- `npm run test:coverage`: source validation, shared topology, area-weighted deterministic particle sampling, smooth normals and fiber attachment, granular ground bounds, frame-loop continuity, invalid inputs and quality bounds. Generation and dynamics have 80% coverage thresholds.
- `npx playwright install chromium`, then `npm run test:e2e`: checks the production build for startup, wordless rendering, portrait framing, resize, reduced motion, hidden-tab pause/resume, context recovery, adaptive density/resolution and visible ground movement.
- GitHub Actions runs coverage, production browser checks and the dependency audit on every push.

[Performance observations and visual validation](docs/validation.md) cover the local test machine. Portrait browser emulation is not a physical-device benchmark.

## Published checkpoints

1. `checkpoint-1`: empty black canvas.
2. `checkpoint-2`: initial procedural horse anatomy.
3. `checkpoint-3`: initial gallop and particle lattice.
4. `checkpoint-4`: revised detailed equine surface, authored gallop and moving reconstruction grid.
5. `checkpoint-5`: white particle sand, natural gallop cadence and surface-attached muscle fiber shading.
6. `checkpoint-6`: hoof-driven sand, shared wind, and the interaction/camera foundation.
7. `checkpoint-7`: stronger sculptural scattering, verified reassembly, coherent wind tracers, and simulation performance refinement.
8. `checkpoint-8`: polished camera/touch gestures, fallback and lifecycle verification, final visual evidence and benchmarks.
9. `checkpoint-9`: layered clustered sand, calibrated terrain, distinct strikes and settling grains.
10. `checkpoint-10`: refined facial landmarks, sharper sparkle and a connected strand tail.
11. `checkpoint-11`: recorded contact-driven audio, lifecycle verification, audiovisual evidence and final measurements.
12. `checkpoint-12`: clean short contact audio, central tail dock, stronger touchdown kicks, grass, flowers and leafy bushes.

The earlier visual experiments remain in Git history; they are replaced in the final artwork. The history also retains failing regression tests and their fixes. Website deployment is separate.
