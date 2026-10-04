# Final visual and runtime validation

Validated October 3, 2026 (America/Chicago) against the production build in Chromium on the local macOS test machine.

The initial stylized volume model was replaced by the credited detailed equine surface and its authored gallop. Surface samples preserve barycentric attachment across all 24 frames, so limbs and body deform together. The visible surface is particles only; a colorless depth pass prevents the far side from showing through the body.

## Checks

- 22 unit/integration tests pass. Coverage for surface generation, frame interpolation, asset validation and quality policy is 100% for statements, branches, functions and lines.
- Seven production browser tests pass: startup/wordless canvas and resize; reduced motion; hidden-tab pause/resume; WebGL restoration; nonempty portrait rendering; sustained slow-frame density and drawing-buffer reduction retained across resize; measurable lower-screen pixel changes proving visible ground travel.
- Dependency audit reports zero vulnerabilities. Type checking and production build pass.
- Code review found no remaining material issues after the adaptive resize regression was fixed.
- Desktop, portrait and 3840×2160 frames were rendered without runtime errors. Four successive gait frames are saved below.

## Sustained rendering observation

Each profile was observed for eight seconds after startup, using actual wall-clock elapsed time rather than animation time. No runtime or shader errors were reported. The desktop run stayed near the 60 fps target; portrait browser emulation exceeded the 30 fps mobile target. Physical phones were not benchmarked.

| Profile | Viewport | Device pixel ratio | Mean fps | Horse particles | Quality |
| --- | --- | --- | --- | --- | --- |
| Desktop | 1440×1000 | 1 | 56.24 | 140,000 | 1 |
| Portrait emulation | 390×844 | 2, capped internally at 1.75 | 59.98 | 68,000 | 1 |

Raw observations: [performance.json](performance.json). Motion preview: [preview.mp4](preview.mp4).

## Gait frames

![Frame 1](gallop-1.png)
![Frame 2](gallop-2.png)
![Frame 3](gallop-3.png)
![Frame 4](gallop-4.png)

![Portrait](portrait.png)
