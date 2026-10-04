import { defineConfig } from 'vitest/config';
export default defineConfig({ base: './', test: { include: ['tests/**/*.test.ts'], coverage: { provider: 'v8', include: ['src/horse.ts', 'src/gait.ts', 'src/dynamics.ts'], thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 } } } });
