import { describe, it, expect, vi, afterEach } from 'vitest';
import { createHorseAudio } from '../src/audio';
afterEach(()=>vi.unstubAllGlobals());
describe('audio lifecycle',()=>{
 it('stays usable when Web Audio is unavailable',()=>{vi.stubGlobal('window',new EventTarget());const sound=createHorseAudio(new EventTarget() as HTMLCanvasElement);sound.update(1,[],{position:{x:0,z:6}});sound.setPaused(true);expect(sound.diagnostics.status).toBe('unavailable');sound.dispose();});
 it('only unlocks from a trusted user gesture',()=>{const win=new EventTarget();vi.stubGlobal('window',win);const canvas=new EventTarget();const sound=createHorseAudio(canvas as HTMLCanvasElement);canvas.dispatchEvent(new Event('pointerdown'));expect(sound.diagnostics.unlocked).toBe(false);sound.dispose();});
});
