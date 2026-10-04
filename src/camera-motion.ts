import type { PerspectiveCamera } from "three";
import { worldHeight } from "./terrain";

export interface CameraPose {
  readonly yaw: number;
  readonly elevation: number;
  readonly radius: number;
}
const clamp = (value: number, low: number, high: number) =>
  Math.max(low, Math.min(high, value));

export function cameraTarget(time: number, aspect: number): CameraPose {
  if (!Number.isFinite(time) || !Number.isFinite(aspect) || aspect <= 0)
    throw new Error("Invalid camera time or aspect");
  const phase = (((time % 20) + 20) % 20) * Math.PI / 10;
  return {
    yaw: .4 + .22 * Math.sin(phase),
    elevation: .12 + .018 * (1 - Math.cos(phase)),
    radius: 7.1 * Math.max(1, .9 / aspect),
  };
}

export function stepCamera(current: CameraPose, target: CameraPose, dt: number): CameraPose {
  if (!Number.isFinite(dt) || dt < 0) throw new Error("Invalid camera timestep");
  const weight = 1 - Math.exp(-5 * dt);
  return {
    yaw: current.yaw + (clamp(target.yaw, -.55, .9) - current.yaw) * weight,
    elevation: current.elevation + (clamp(target.elevation, .08, .38) - current.elevation) * weight,
    radius: current.radius + (target.radius - current.radius) * weight,
  };
}

export function createCameraMotion(
  camera: PerspectiveCamera,
  canvas: HTMLCanvasElement,
  onTap?: (event: PointerEvent) => void,
) {
  let pose = cameraTarget(0, camera.aspect);
  let manual = pose;
  let active: Readonly<{ id: number; x: number; y: number; startX: number; startY: number; moved: boolean }> | undefined;
  let time = 0;
  let lastInput = -Infinity;
  let reduced = false;
  canvas.style.touchAction = "none";
  const apply = () => {
    const horizontal = pose.radius * Math.cos(pose.elevation);
    const targetHeight=1.07+worldHeight(0,0,reduced?0:time);
    camera.position.set(-.2 + horizontal * Math.sin(pose.yaw), targetHeight + pose.radius * Math.sin(pose.elevation), horizontal * Math.cos(pose.yaw));
    camera.lookAt(-.2, targetHeight, 0);
  };
  const down = (event: PointerEvent) => {
    if (event.button !== 0 || reduced || active) return;
    active = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false };
    manual = pose;
    lastInput = time;
    canvas.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent) => {
    if (!active || event.pointerId !== active.id) return;
    const moved = active.moved || Math.hypot(event.clientX - active.startX, event.clientY - active.startY) > 5;
    manual = { ...manual, yaw: clamp(manual.yaw - (event.clientX - active.x) * .004, -.55, .9), elevation: clamp(manual.elevation + (event.clientY - active.y) * .002, .08, .38) };
    active = { ...active, x: event.clientX, y: event.clientY, moved };
    lastInput = time;
  };
  const finish = (event: PointerEvent) => {
    if (!active || event.pointerId !== active.id) return;
    const tap = !active.moved && event.type === "pointerup" && event.pointerType === "touch";
    active = undefined;
    lastInput = time;
    if (canvas.hasPointerCapture(event.pointerId))
      canvas.releasePointerCapture(event.pointerId);
    if (tap) onTap?.(event);
  };
  const events = [
    ["pointerdown", down], ["pointermove", move],
    ["pointerup", finish], ["pointercancel", finish],
    ["lostpointercapture", finish],
  ] as const;
  for (const [name, handler] of events) canvas.addEventListener(name, handler);
  return {
    get dragging() { return active !== undefined; },
    update(now: number, dt: number, still: boolean) {
      time = now;
      reduced = still;
      if (still) {
        active = undefined;
        pose = cameraTarget(0, camera.aspect);
      } else {
        const automatic = cameraTarget(now, camera.aspect);
        const target = active || now - lastInput < 3
          ? { ...manual, radius: automatic.radius }
          : automatic;
        pose = stepCamera(pose, target, dt);
      }
      apply();
    },
    dispose() {
      for (const [name, handler] of events) canvas.removeEventListener(name, handler);
      active = undefined;
    },
  };
}
