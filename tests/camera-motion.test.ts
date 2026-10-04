import { describe, expect, it } from 'vitest';
import { PerspectiveCamera } from 'three';
import { cameraTarget, stepCamera, createCameraMotion } from '../src/camera-motion';

describe('camera motion', () => {
  it('has a seamless twenty-second arc with safe framing', () => {
    expect(cameraTarget(0, 1.44)).toEqual(cameraTarget(20, 1.44));
    for (let t = 0; t < 20; t += .1) {
      const pose = cameraTarget(t, 1.44);
      expect(pose.yaw).toBeGreaterThanOrEqual(.18);
      expect(pose.yaw).toBeLessThanOrEqual(.62);
      expect(pose.elevation).toBeGreaterThan(.1);
    }
    expect(cameraTarget(0, .46).radius).toBeGreaterThan(cameraTarget(0, 1.44).radius);
  });
  it('damps continuously and respects camera limits', () => {
    const a = { yaw: .3, elevation: .16, radius: 7 };
    const target = { yaw: 10, elevation: -10, radius: 9 };
    const full = stepCamera(a, target, .04);
    const halves = stepCamera(stepCamera(a, target, .02), target, .02);
    expect(full.yaw).toBeCloseTo(halves.yaw, 10);
    expect(full.elevation).toBeCloseTo(halves.elevation, 10);
    expect(full.yaw).toBeLessThan(.9);
    expect(full.elevation).toBeGreaterThan(.08);
    expect(stepCamera(a, target, 0)).toEqual(a);
    expect(() => cameraTarget(NaN, 1)).toThrow();
    expect(() => stepCamera(a, target, -1)).toThrow();
  });
  it('keeps reduced motion still and allows clean drag takeover and settling', () => {
    class Canvas extends EventTarget {
      style = { touchAction: '' };
      setPointerCapture() {}
      releasePointerCapture() {}
      hasPointerCapture() { return true; }
    }
    const canvas = new Canvas();
    const camera = new PerspectiveCamera(34, 1.44);
    let taps = 0;
    const control = createCameraMotion(camera, canvas as unknown as HTMLCanvasElement, () => taps++);
    const pointer = (type: string, values = {}) => {
      const event = new Event(type);
      Object.assign(event, { pointerId: 1, clientX: 100, clientY: 100, pointerType: 'touch', button: 0, ...values });
      canvas.dispatchEvent(event);
    };
    control.update(0, .016, true);
    const still = camera.position.clone();
    control.update(10, .016, true);
    expect(camera.position.equals(still)).toBe(true);
    pointer('pointerdown');
    pointer('pointerup');
    expect(taps).toBe(0);
    control.update(10, .016, false);
    pointer('pointerdown');
    pointer('pointerup');
    expect(taps).toBe(1);
    pointer('pointerdown');
    pointer('pointermove', { clientX: 220 });
    expect(control.dragging).toBe(true);
    control.update(10.2, .016, false);
    pointer('pointerup', { clientX: 220 });
    expect(control.dragging).toBe(false);
    for (let i = 0; i < 600; i++) control.update(10.2 + i / 60, 1 / 60, false);
    expect(Number.isFinite(camera.position.x)).toBe(true);
    pointer('pointerdown');
    pointer('pointercancel');
    expect(control.dragging).toBe(false);
    control.dispose();
    pointer('pointerdown');
    expect(control.dragging).toBe(false);
  });
});
