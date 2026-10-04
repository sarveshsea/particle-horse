import { defineConfig } from "vitest/config";
export default defineConfig({
  base: "./",
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/terrain.ts", "src/gait-refinement.ts", "src/dirt.ts", "src/rabbit.ts", "src/rabbit-render.ts", "src/botany.ts", "src/brush.ts", "src/equine.ts", "src/dynamics.ts", "src/sand.ts", "src/forces.ts", "src/wake.ts", "src/camera-motion.ts", "src/wind.ts", "src/contacts.ts", "src/anatomy.ts", "src/hair.ts", "src/audio-events.ts", "src/audio.ts", "src/audio-mix.ts", "src/meadow.ts", "src/meadow-render.ts"],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
});
