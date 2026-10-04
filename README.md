# Particle Horse

A detailed equine surface reconstructed as a dense particle cloud, galloping over flowing white particle sand in a black void. One canvas, no visible words, no controls, no sound.

![Particle Horse](docs/artwork.png)

## Run

Use Node.js 22. Run `npm ci`, then `npm run dev`. Open the local URL printed by Vite. `npm run build` produces a static site in `dist/`.

## Anatomy and motion

The initial volume-built horse was replaced with a detailed equine mesh and authored gallop sequence from Sumner and Popović’s deformation-transfer research. The particle generator samples triangles by surface area, assigns fixed barycentric coordinates and interpolates corresponding vertices across a 24-frame stride. Particle positions therefore follow the source surface and its body deformation instead of an approximation built from ellipsoids and articulated tubes.

A GPU position atlas drives 140,000 particles on larger viewports and 68,000 on portrait screens. A depth-only surface hides far-side particles, allowing the chest, neck, knees, hocks and hooves to read as volumes. The underlying solid mesh never writes visible color. Smooth normals and surface-attached fiber shading emphasize the shoulder, barrel and hindquarter muscles as the model deforms. The stride takes 0.9 seconds. The camera stays fixed while white granular ground particles travel backward at 6 rendering units per second, with shallow dune variation and softly fading edges. No wire grid or solid floor is drawn.

The source is an authored equine model, not a scan or a clinically validated anatomical reconstruction. [Source provenance, original notices and conversion details](docs/SOURCE.md) remain outside the artwork. The mesh data used in this project was made available by Robert Sumner and Jovan Popovic from the Computer Graphics Group at MIT.

## Rendering behavior

The canvas fills the viewport. Slow frames shorten draw ranges over randomly ordered surface and sand samples and reduce pixel ratio. This reduces actual GPU submissions while preserving the anatomical distribution. Resize preserves the performance budget. Hidden tabs pause, reduced motion freezes the composition, and WebGL context restoration resumes rendering. The initial asset load shows only the black canvas. WebGL2 is required.

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

The earlier visual experiments remain in Git history; they are replaced in the final artwork. The history also retains failing regression tests and their fixes. Website deployment is separate.
