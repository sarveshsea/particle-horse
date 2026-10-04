import { defineConfig } from "vitest/config";
export default defineConfig({
  base: "./",
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/equine.ts", "src/dynamics.ts", "src/sand.ts", "src/forces.ts", "src/wake.ts", "src/camera-motion.ts"],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
});
