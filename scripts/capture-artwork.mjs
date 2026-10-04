import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const url = process.env.ARTWORK_URL ?? 'http://127.0.0.1:4175';
const docs = fileURLToPath(new URL('../docs/', import.meta.url));
const videoPath = '/tmp/particle-horse-av.webm';
const browser = await chromium.launch({ headless: true, args: process.platform === 'darwin' ? ['--use-angle=metal'] : [] });
const errors = [];
const watch = page => {
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
};
try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  const page = await desktop.newPage();
  watch(page);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__ARTWORK?.frames > 2);
  await page.mouse.click(30, 30);
  await page.mouse.move(-10, -10);
  await page.waitForFunction(() => window.__ARTWORK.audio?.status === 'ready');
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const artwork = window.__ARTWORK;
    const source = document.querySelector('canvas');
    // This detached canvas fixes capture dimensions while adaptive DPR changes the source.
    const capture = document.createElement('canvas');
    capture.width = 1440; capture.height = 1000;
    const context = capture.getContext('2d');
    const stream = capture.captureStream(30);
    const audio = artwork.captureAudio();
    if (!audio?.getAudioTracks().length) throw new Error('Artwork audio capture track unavailable');
    for (const track of audio.getAudioTracks()) stream.addTrack(track);
    const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type));
    if (!mimeType) throw new Error('WebM MediaRecorder unavailable');
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000, audioBitsPerSecond: 128_000 });
    const snapshot = () => ({ audio: { ...artwork.audio }, strikeCount: artwork.strikeCount, impacts: artwork.impacts, frames: artwork.frames, time: artwork.time, quality: artwork.quality });
    const start = snapshot();
    const chunks = [];
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    let copying = true;
    const copy = () => { if (copying) { context.drawImage(source, 0, 0, 1440, 1000); requestAnimationFrame(copy); } };
    context.drawImage(source, 0, 0, 1440, 1000);
    const began = performance.now();
    let hovering = false;
    const input = setInterval(() => {
      const elapsed = (performance.now() - began) / 1000;
      if (elapsed >= 3 && elapsed < 5) {
        hovering = true;
        const rect = source.getBoundingClientRect();
        source.dispatchEvent(new PointerEvent('pointermove', {
          pointerId: 1, pointerType: 'mouse', isPrimary: true, bubbles: true,
          clientX: rect.left + rect.width * (.5 + .22 * Math.sin((elapsed - 3) * 5)),
          clientY: rect.top + rect.height * (.49 + .12 * Math.sin((elapsed - 3) * 8)),
        }));
      } else if (hovering) {
        hovering = false;
        source.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
      }
    }, 16);
    window.__CAPTURE_RESULT = new Promise((resolve, reject) => {
      recorder.onerror = event => reject(new Error(`Recorder failed: ${event.error?.message ?? 'unknown'}`));
      recorder.onstop = async () => {
        copying = false;
        clearInterval(input);
        for (const track of stream.getVideoTracks()) track.stop();
        const blob = new Blob(chunks, { type: mimeType });
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let binary = '';
        for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
        resolve({ base64: btoa(binary), mimeType, bytes: bytes.length, elapsedMs: performance.now() - began, start, end: snapshot(), audioTracks: audio.getAudioTracks().map(track => ({ kind: track.kind, enabled: track.enabled, readyState: track.readyState })) });
      };
    });
    recorder.start(250);
    requestAnimationFrame(copy);
    setTimeout(() => recorder.stop(), 10_000);
  });
  await page.waitForTimeout(6000);
  await page.mouse.move(800, 470);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++) {
    await page.mouse.move(800 - i * 8, 470 + i);
    await page.waitForTimeout(45);
  }
  await page.mouse.up();
  await page.mouse.move(-10, -10);
  const recording = await page.evaluate(() => window.__CAPTURE_RESULT);
  await writeFile(videoPath, Buffer.from(recording.base64, 'base64'));
  const { base64, ...measurements } = recording;
  const report = { date: new Date().toISOString(), url, output: videoPath, choreography: '0–3s gallop;3–5s mouse wake;5–6s return;6–7s drag;7–10s idle', ...measurements };
  await page.screenshot({ path: `${docs}artwork.png` });
  for (let i = 1; i <= 4; i++) {
    await page.waitForTimeout(225);
    await page.screenshot({ path: `${docs}gallop-${i}.png` });
  }
  await page.screenshot({ path: `${docs}head-12.png`, clip: { x: 780, y: 160, width: 390, height: 380 } });
  await page.screenshot({ path: `${docs}tail-12.png`, clip: { x: 220, y: 280, width: 430, height: 350 } });
  await desktop.close();
  const portrait = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'no-preference' });
  const mobile = await portrait.newPage();
  watch(mobile);
  await mobile.goto(url, { waitUntil: 'networkidle' });
  await mobile.waitForFunction(() => window.__ARTWORK?.frames > 2);
  await mobile.waitForTimeout(3000);
  await mobile.screenshot({ path: `${docs}portrait.png` });
  await portrait.close();
  report.errors = [...new Set(errors)];
  await writeFile(`${docs}audio-measurements-12.json`, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Saved ${videoPath}, artwork/gait/detail/portrait screenshots, and audio measurements.`);
  console.log(`Recorded audio impacts: ${report.end.audio.playedImpacts - report.start.audio.playedImpacts}; strikes: ${report.end.strikeCount - report.start.strikeCount}.`);
  if (report.errors.length || report.end.audio.playedImpacts <= report.start.audio.playedImpacts) process.exitCode = 1;
} finally {
  await browser.close();
}
