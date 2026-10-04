export type WakeVector = readonly [number, number, number];
export interface WakeState { readonly offset: WakeVector; readonly velocity: WakeVector }
function valid(...vectors: WakeVector[]) {
 if (!vectors.every(v => v.every(Number.isFinite))) throw new Error('Wake vectors must be finite');
}
export function advanceWake(state: WakeState, force: WakeVector, dt: number): WakeState {
 valid(state.offset,state.velocity,force);
 if (!Number.isFinite(dt)||dt<0||dt>1/30) throw new Error('Invalid wake timestep');
 const velocity = state.velocity.map((v,i)=>v+(force[i]-48*state.offset[i]-13*v)*dt) as unknown as WakeVector;
 const speed=Math.hypot(...velocity),velocityScale=8/Math.max(8,speed);
 const boundedVelocity=velocity.map(v=>v*velocityScale) as unknown as WakeVector;
 const position = state.offset.map((v,i)=>v+boundedVelocity[i]*dt);
 const length=Math.hypot(...position), scale=.8/Math.max(.8,length);
 return {offset:position.map(v=>v*scale) as unknown as WakeVector,velocity:boundedVelocity};
}
export function wakeForce(anchor: WakeVector, pointer: WakeVector, direction: WakeVector, strength: number): WakeVector {
 valid(anchor,pointer,direction);
 if (!Number.isFinite(strength)) throw new Error('Invalid wake strength');
 const delta=anchor.map((v,i)=>v-pointer[i]),distance=Math.hypot(...delta);
 const envelope=Math.max(0,1-distance/.65)**2*Math.max(0,Math.min(1,strength));
 return delta.map((v,i)=>(v/Math.max(distance,.06)*18+direction[i]*25)*envelope) as unknown as WakeVector;
}
