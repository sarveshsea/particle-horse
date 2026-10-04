import { describe, it, expect, vi, afterEach } from 'vitest';
import { createHorseAudio } from '../src/audio';
afterEach(()=>vi.unstubAllGlobals());
describe('audio lifecycle',()=>{
 it('stays usable when Web Audio is unavailable',()=>{vi.stubGlobal('window',new EventTarget());const sound=createHorseAudio(new EventTarget() as HTMLCanvasElement);sound.update(1,[],{position:{x:0,z:6}});sound.setPaused(true);expect(sound.diagnostics.status).toBe('unavailable');sound.dispose();});
 it('only unlocks from a trusted user gesture',()=>{const win=new EventTarget();vi.stubGlobal('window',win);const canvas=new EventTarget();const sound=createHorseAudio(canvas as HTMLCanvasElement);canvas.dispatchEvent(new Event('pointerdown'));expect(sound.diagnostics.unlocked).toBe(false);sound.dispose();});
});
class Target {
 listeners = new Map<string,(e:Event)=>void>();
 addEventListener(type:string,fn:(e:Event)=>void){this.listeners.set(type,fn);}
 removeEventListener(type:string){this.listeners.delete(type);}
 send(type:string,e:unknown){this.listeners.get(type)?.(e as Event);}
}
class Node {
 gain={value:1,setTargetAtTime:vi.fn()}; pan={value:0}; playbackRate={value:1}; frequency={value:0}; threshold={value:0}; knee={value:0}; ratio={value:0}; attack={value:0}; release={value:0}; onended:(()=>void)|null=null;
 connect=vi.fn();disconnect=vi.fn();start=vi.fn();stop=vi.fn();
}
class Context {
 static last:Context; state='running'; currentTime=1; destination=new Node(); sources:Node[]=[];nodes:Node[]=[];
 constructor(){Context.last=this;}
 createGain(){const node=new Node();this.nodes.push(node);return node;} createDynamicsCompressor(){return new Node();} createMediaStreamDestination(){return {...new Node(),stream:{id:'capture'}};}
 createBufferSource(){const node=new Node();this.sources.push(node);return node;}
 createStereoPanner(){const node=new Node();this.nodes.push(node);return node;} createBiquadFilter(){const node=new Node();this.nodes.push(node);return node;}
 decodeAudioData=vi.fn().mockResolvedValue({duration:.2});
 resume=vi.fn().mockResolvedValue(undefined);suspend=vi.fn().mockResolvedValue(undefined);close=vi.fn().mockResolvedValue(undefined);
}
const setup=()=>{const win=new Target(),canvas=new Target();vi.stubGlobal('window',win);vi.stubGlobal('AudioContext',Context);vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)}));const sound=createHorseAudio(canvas as unknown as HTMLCanvasElement);return {win,canvas,sound};};
const ready=async()=>{await vi.waitFor(()=>expect(Context.last.decodeAudioData).toHaveBeenCalledTimes(9));await Promise.resolve();};
describe('unlocked recorded audio',()=>{
 it('loads once and captures a unique synchronized impact with bounded voices',async()=>{const {canvas,sound}=setup();canvas.send('pointerdown',{isTrusted:true});await ready();expect(sound.diagnostics.status).toBe('ready');canvas.send('pointerdown',{isTrusted:true});expect(sound.captureStream()).toEqual({id:'capture'});const event={id:'0',hoof:0,born:1,x:1,y:0,z:0,strength:1,contactDuration:.12};sound.update(1,[event],{position:{x:2,z:6}});sound.update(1,[event],{position:{x:2,z:6}});expect(sound.diagnostics.playedImpacts).toBe(1);expect(sound.diagnostics.activeVoices).toBe(3);Context.last.sources[1].onended?.();expect(sound.diagnostics.activeVoices).toBe(2);sound.dispose();expect(Context.last.close).toHaveBeenCalled();});
 it('mutes smoothly and pauses without queued replay',async()=>{const {canvas,win,sound}=setup();canvas.send('pointerdown',{isTrusted:true});await ready();win.send('keydown',{key:'x'});expect(sound.diagnostics.muted).toBe(false);win.send('keydown',{key:'M'});expect(sound.diagnostics.muted).toBe(true);sound.setPaused(true);sound.setPaused(true);expect(Context.last.suspend).toHaveBeenCalledTimes(1);const event={id:'paused',hoof:0,born:1,x:0,y:0,z:0,strength:1,contactDuration:.12};sound.update(1,[event],{position:{x:0,z:6}});sound.setPaused(false);sound.update(1,[event],{position:{x:0,z:6}});expect(sound.diagnostics.playedImpacts).toBe(0);sound.dispose();});
 it('handles unavailable assets without breaking the canvas',async()=>{const {canvas,sound}=setup();vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false}));canvas.send('pointerdown',{isTrusted:true});await vi.waitFor(()=>expect(sound.diagnostics.status).toBe('unavailable'));sound.dispose();});
 it('caps voices under dense input',async()=>{const {canvas,sound}=setup();canvas.send('pointerdown',{isTrusted:true});await ready();const events=Array.from({length:30},(_,i)=>({id:String(i),hoof:i%4,born:1,x:0,y:0,z:0,strength:1,contactDuration:.1}));sound.update(1,events,{position:{x:0,z:6}});expect(sound.diagnostics.activeVoices).toBe(24);sound.dispose();});
});

describe('audio node ownership',()=>{
 it('honors mute chosen before the first activation',async()=>{const {win,canvas,sound}=setup();win.send('keydown',{key:'m'});canvas.send('pointerdown',{isTrusted:true});await ready();expect(Context.last.nodes[0].gain.value).toBe(0);sound.dispose();});
 it('disconnects every per-voice and ambience node when paused',async()=>{const {canvas,sound}=setup();canvas.send('pointerdown',{isTrusted:true});await ready();sound.update(1,[{id:'release',hoof:0,born:1,x:0,y:0,z:0,strength:1,contactDuration:.12}],{position:{x:0,z:6}});sound.setPaused(true);for(const node of Context.last.nodes.slice(1))expect(node.disconnect).toHaveBeenCalledTimes(1);for(const source of Context.last.sources)expect(source.disconnect).toHaveBeenCalledTimes(1);sound.dispose();});
});

import { contactMix } from '../src/audio-mix';
describe('clean contact mix',()=>{
 it('keeps grit short and light without slowing recorded transients',()=>{for(let i=0;i<4;i++){const mix=contactMix(1,i);expect(mix.hoof.rate).toBeGreaterThanOrEqual(.98);expect(mix.sand.rate).toBeGreaterThanOrEqual(1);expect(mix.hoof.duration).toBeLessThanOrEqual(.15);expect(mix.sand.duration).toBeLessThanOrEqual(.19);expect(mix.sand.level).toBeLessThan(mix.hoof.level*.3);expect(mix.sand.delay).toBeGreaterThan(0);}});
 it('bounds gains and rejects nonfinite contact input',()=>{expect(contactMix(20,0)).toEqual(contactMix(1,0));expect(contactMix(-2,0).hoof.level).toBe(0);expect(()=>contactMix(NaN,0)).toThrow();expect(()=>contactMix(1,Infinity)).toThrow();});
});
