import { scheduleContacts, type AudioContact } from './audio-events';
type AudioCamera = { position: { x: number; z: number } };
export function createHorseAudio(canvas: HTMLCanvasElement) {
  const supported = typeof AudioContext !== 'undefined';
  const diagnostics = { unlocked: false, muted: false, activeVoices: 0, playedImpacts: 0, status: supported ? 'waiting' : 'unavailable' };
  let context: AudioContext | undefined, master: GainNode | undefined;
  let capture: MediaStreamAudioDestinationNode | undefined;
  let paused = false, loading = false, ready = false, disposed = false;
  let seen: ReadonlySet<string> = new Set();
  const voices = new Map<AudioBufferSourceNode, () => void>();
  let buffers: readonly AudioBuffer[] = [];
  let ambience: AudioBufferSourceNode | undefined;
  let releaseAmbience: (() => void) | undefined;
  const startAmbience = () => {
    if (!context || !master || !ready || paused || ambience) return;
    ambience = context.createBufferSource(); ambience.buffer = buffers[8]; ambience.loop = true; ambience.playbackRate.value = .28;
    const filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 1800;
    const gain = context.createGain(); gain.gain.value = .012;
    ambience.connect(filter); filter.connect(gain); gain.connect(master); ambience.start();
    const source = ambience;
    releaseAmbience = () => { source.stop(); source.disconnect(); filter.disconnect(); gain.disconnect(); };
  };
  const stopVoices = () => {
    for (const [voice, release] of voices) { voice.onended = null; voice.stop(); release(); }
    voices.clear(); diagnostics.activeVoices = 0;
    if (ambience) { releaseAmbience!(); ambience = undefined; releaseAmbience = undefined; }
  };
  const load = async () => {
    if (!context || loading) return;
    loading = true; diagnostics.status = 'loading';
    try {
      const decoded = await Promise.all(Array.from({length:9}, async (_, i) => {
        const filename = i === 8 ? 'sand-air.wav' : `${i < 4 ? 'hoof' : 'sand'}-${i % 4}.wav`;
        const path = `${import.meta.env.BASE_URL}audio/${filename}`;
        const response = await fetch(path);
        if (!response.ok) throw new Error('Audio sample unavailable');
        return context!.decodeAudioData(await response.arrayBuffer());
      }));
      if (disposed) return;
      buffers = decoded; ready = true; diagnostics.status = 'ready'; startAmbience();
    } catch { diagnostics.status = 'unavailable'; }
  };
  const unlock = (event: Event) => {
    if (!event.isTrusted || !supported || disposed) return;
    if (!context) {
      context = new AudioContext();
      master = context.createGain(); master.gain.value = diagnostics.muted ? 0 : .8;
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -12; limiter.knee.value = 6; limiter.ratio.value = 12;
      limiter.attack.value = .003; limiter.release.value = .18;
      capture = context.createMediaStreamDestination();
      master.connect(limiter); limiter.connect(context.destination); limiter.connect(capture);
      void load();
    }
    diagnostics.unlocked = true;
    if (!paused) void context.resume().catch(() => { diagnostics.status = 'unavailable'; });
  };
  const mute = (event: Event) => {
    if (!(event as KeyboardEvent).key || (event as KeyboardEvent).key.toLowerCase() !== 'm') return;
    diagnostics.muted = !diagnostics.muted;
    if (master && context) master.gain.setTargetAtTime(diagnostics.muted ? 0 : .8, context.currentTime, .025);
  };
  canvas.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', mute);
  const play = (buffer: AudioBuffer, start: number, level: number, pan: number, rate: number, sand: boolean) => {
    if (!context || !master || voices.size >= 24) return;
    const source = context.createBufferSource(); source.buffer = buffer; source.playbackRate.value = rate;
    const gain = context.createGain(); gain.gain.value = level;
    const panner = context.createStereoPanner(); panner.pan.value = pan;
    let filter: BiquadFilterNode | undefined;
    if (sand) {
      filter = context.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 800;
      source.connect(filter); filter.connect(gain);
    } else source.connect(gain);
    gain.connect(panner); panner.connect(master);
    let released = false;
    const release = () => {
      if (released) return;
      released = true; source.disconnect(); gain.disconnect(); panner.disconnect(); filter?.disconnect();
      voices.delete(source); diagnostics.activeVoices = voices.size;
    };
    voices.set(source, release); diagnostics.activeVoices = voices.size;
    source.onended = release;
    source.start(start);
  };
  const update = (time: number, events: readonly AudioContact[], camera: AudioCamera) => {
    const scheduled = scheduleContacts(seen, events, time); seen = scheduled.seen;
    if (!context || !ready || paused || context.state !== 'running') return;
    startAmbience();
    for (const event of scheduled.events) {
      if (voices.size >= 24) break;
      const variant = Math.abs(Math.round(event.born * 100) + event.hoof) % 4;
      const strength = Math.min(1, Math.max(.1, event.strength));
      const cameraLength = Math.max(.1, Math.hypot(camera.position.x, camera.position.z));
      const pan = Math.max(-.65, Math.min(.65, (event.x * camera.position.z - event.z * camera.position.x) / cameraLength * .22));
      const now = context.currentTime;
      play(buffers[variant], now, .40 * strength, pan, .94 + variant * .035, false);
      play(buffers[4 + variant], now + .025, .18 * strength, pan, .91 + variant * .04, true);
      play(buffers[4 + (variant + 1) % 4], now + Math.min(.16,event.contactDuration), .045 * strength, pan * .8, .68, true);
      diagnostics.playedImpacts++;
    }
  };
  const setPaused = (value: boolean) => {
    if (paused === value) return;
    paused = value;
    if (value) { stopVoices(); if (context) void context.suspend().catch(() => {}); }
    else if (context && diagnostics.unlocked) void context.resume().catch(() => { diagnostics.status = 'unavailable'; });
  };
  const dispose = () => {
    disposed = true; stopVoices(); canvas.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', mute);
    if (context) void context.close().catch(() => {});
  };
  return { update, setPaused, diagnostics, dispose, captureStream: () => capture?.stream };
}
