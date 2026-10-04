# Final visual and runtime validation

Validated October 3, 2026 (America/Chicago) against the production build in Chromium on the local macOS test machine.

The detailed equine surface runs through a 0.9-second authored gallop. Fixed barycentric coordinates keep surface particles and fine fiber shading attached through deformation. Smooth, transported normals emphasize the shoulder, barrel and hindquarter. A colorless depth pass hides far-side points; no solid horse is visibly drawn.

White granular ground replaces the previous wire grid. Seeded irregular grains, shallow height variation and faded edges form the bed. The ground flows backward at 6 rendering units per second. No visible text or controls are present.

## Checks

- 31 unit/integration tests pass. Surface generation, smooth-normal/fiber attachment, frame interpolation, source validation, granular ground bounds and quality policy have 100% statement, branch, function and line coverage.
- Seven production browser tests pass: startup/wordless rendering and resize; reduced motion; hidden-tab pause/resume; WebGL recovery; nonempty portrait rendering; sustained slow-frame adaptation including intercepted GPU draw calls and resolution retained after resize; measurable ground travel and lower-screen pixel changes.
- Slow frames shorten the draw range of randomly ordered surface samples and ground grains, reducing actual GPU submissions. Prefix samples remain distributed over the whole anatomy. Desktop and compact profiles target 60 and 30 fps respectively.
- Dependency audit reports zero vulnerabilities. Type checking and production build pass. Final review found no material issues.
- Desktop, portrait and 3840×2160 frames rendered without runtime or shader errors. Successive gait frames are below.

## Sustained rendering observation

Each profile warmed up for five seconds, then ran for eight seconds. Results use actual wall-clock elapsed time. Adaptive quality remained active. These observations are specific to the local test machine; portrait browser emulation is not a physical phone benchmark.

| Profile | Viewport | Device pixel ratio | Mean fps | Horse particles at end | Quality at end |
| --- | --- | --- | --- | --- | --- |
| desktop | 1440×1000 | 1, adaptively reduced | 58.66 | 103,600 | 0.740 |
| portrait | 390×844 | 2, capped at 1.75 | 57.86 | 68,000 | 1.000 |

Raw observations: [performance.json](performance.json). Motion preview: [preview.mp4](preview.mp4).

## Gait frames

![Frame 1](gallop-1.png)
![Frame 2](gallop-2.png)
![Frame 3](gallop-3.png)
![Frame 4](gallop-4.png)

![Portrait](portrait.png)
