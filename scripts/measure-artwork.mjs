import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const url = process.env.ARTWORK_URL ?? 'http://127.0.0.1:4175';
const warmupSeconds = 6;
const sampleSeconds = 6;
const output = fileURLToPath(new URL('../docs/performance-11.json', import.meta.url));
const profiles = [
  { profile: 'desktop', width: 1440, height: 1000, dpr: 1 },
  { profile: 'portrait', width: 390, height: 844, dpr: 2 },
];

/** Keep synthetic hover in-page to avoid measuring automation transport latency. */
async function installHover(page) {
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const began = performance.now();
    window.__BENCH_HOVER = setInterval(() => {
      const seconds = (performance.now() - began) / 1000;
      const rect = canvas.getBoundingClientRect();
      canvas.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
        clientX: rect.left + rect.width * (.5 + .22 * Math.sin(seconds * 5)),
        clientY: rect.top + rect.height * (.51 + .1 * Math.sin(seconds * 8)),
      }));
    }, 16);
  });
}

async function measure(browser, profile, interaction) {
  const context = await browser.newContext({
    viewport: { width: profile.width, height: profile.height },
    deviceScaleFactor: profile.dpr,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__ARTWORK?.frames > 2);
    await page.mouse.click(30, 30);
    await page.waitForFunction(() => window.__ARTWORK.audio?.status === 'ready');
    if (interaction) await installHover(page);
    await page.waitForTimeout(warmupSeconds * 1000);
    const result = await page.evaluate(async duration => {
      const canvas = document.querySelector('canvas');
      const gl = canvas.getContext('webgl2');
      const debug = gl?.getExtension('WEBGL_debug_renderer_info');
      const renderer = gl && debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl?.getParameter(gl.RENDERER);
      const diagnostics = () => {
        const state = window.__ARTWORK;
        return {
          time: state.time,
          frames: state.frames,
          quality: state.quality,
          particles: state.particles,
          averageFrameMs: state.averageFrameMs,
          simulation: state.simulation,
          audio: { ...state.audio },
          wakeStrength: state.wakeStrength,
          activeSpray: state.activeSpray,
          impacts: state.impacts,
          strikeCount: state.strikeCount,
          floorLayers: state.floorLayers,
          floor: state.inspectFloor?.(),
          cameraYaw: state.cameraYaw,
          paused: state.paused,
          contextLost: state.contextLost,
          drawingBuffer: { width: canvas.width, height: canvas.height },
        };
      };
      const began = performance.now();
      const start = diagnostics();
      const samples = [];
      const sampler = setInterval(() => samples.push({ elapsedMs: performance.now() - began, ...diagnostics() }), 1000);
      await new Promise(resolve => setTimeout(resolve, duration));
      clearInterval(sampler);
      const elapsedMs = performance.now() - began;
      const end = diagnostics();
      return {
        gpu: renderer ?? 'unavailable',
        webglVersion: gl?.getParameter(gl.VERSION) ?? 'unavailable',
        userAgent: navigator.userAgent,
        elapsedMs,
        framesRendered: end.frames - start.frames,
        fps: (end.frames - start.frames) * 1000 / elapsedMs,
        start,
        end,
        samples,
      };
    }, sampleSeconds * 1000);
    return { ...profile, interaction, ...result, errors: [...new Set(errors)] };
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true, args: process.platform === 'darwin' ? ['--use-angle=metal'] : [] });
try {
  const results = [];
  for (const profile of profiles) {
    for (const interaction of [false, true]) {
      const result = await measure(browser, profile, interaction);
      results.push(result);
      console.log(`${profile.profile} ${interaction ? 'heavy hover' : 'idle'}: ${result.fps.toFixed(2)} fps, quality ${result.end.quality.toFixed(3)}, ${result.end.particles} horse particles`);
    }
  }
  const sourceHashes = Object.fromEntries(await Promise.all(
    ['main', 'render', 'anatomy', 'hair', 'environment', 'contacts', 'sand', 'forces', 'audio', 'audio-events', 'particle-wake', 'camera-motion', 'interaction', 'wind', 'dynamics', 'equine'].map(async name => {
      const path = `src/${name}.ts`;
      return [path, createHash('sha256').update(await readFile(new URL(`../${path}`, import.meta.url))).digest('hex')];
    })
  ));
  const report = {
    sourceHashes,
    date: new Date().toISOString(),
    revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8' }).trim(),
    url,
    warmupSeconds,
    sampleSeconds,
    method: 'Sequential headless Chromium profiles. FPS uses artwork rendered-frame delta divided by actual browser wall-clock duration. Heavy hover dispatches mouse pointer events every 16 ms across the horse. Portrait is viewport/DPR emulation, not physical mobile hardware.',
    profiles: results,
  };
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Saved ${output}`);
  if (results.some(result => result.errors.length || result.end.contextLost || result.end.paused)) process.exitCode = 1;
} finally {
  await browser.close();
}
