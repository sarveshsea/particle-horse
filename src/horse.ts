export type HorseCloud = Readonly<{
  positions: Float32Array; bones: Float32Array; kinds: Float32Array;
  brightness: Float32Array; seeds: Float32Array;
}>;
type Volume = readonly [number, number, number, number, number, number, number];
// Ellipsoids overlap to sculpt the barrel, haunches, sloping neck, jaw and muzzle.
const volumes: readonly Volume[] = [
  [-.15, 2.18, 0, 1.18, .56, .43, 0],
  [-1.04, 2.28, 0, .58, .64, .47, 0],
  [.78, 2.24, 0, .52, .66, .43, 0],
  [1.03, 2.79, 0, .37, .77, .31, -.48],
  [1.34, 3.18, 0, .30, .65, .25, -.52],
  [1.73, 3.49, 0, .31, .25, .205, -.38],
  [2.05, 3.29, 0, .43, .175, .16, -.38],
  [2.34, 3.16, 0, .17, .14, .145, -.25],
  [1.52, 3.87, -.145, .065, .20, .055, -.27],
  [1.60, 3.87, .145, .060, .19, .050, -.19],
];
export function randomSource(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let n = Math.imul(state ^ (state >>> 15), state | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
function inside(x: number, y: number, z: number, v: Volume): boolean {
  const dx = x-v[0], dy = y-v[1], c = Math.cos(v[6]), s = Math.sin(v[6]);
  return ((dx*c+dy*s)/v[3])**2 + ((-dx*s+dy*c)/v[4])**2 + ((z-v[2])/v[5])**2 < .94;
}
export function generateHorse(count: number, seed = 71): HorseCloud {
  if (!Number.isInteger(count) || count < 1 || count > 200000) throw new RangeError('Particle count must be an integer from 1 to 200000');
  const rng = randomSource(seed);
  const positions = new Float32Array(count*3), bones = new Float32Array(count);
  const kinds = new Float32Array(count), brightness = new Float32Array(count), seeds = new Float32Array(count);
  for (let i=0; i<count; i++) {
    const section = i/count;
    let x=0, y=0, z=0, bone=0, kind=0;
    if (section < .65) {
      // Discard buried shell samples rather than drawing seams at volume overlaps.
      let attempt=0;
      do {
        const weights = [4.5, 2.0, 1.7, 1.5, 1.0, .55, .38, .16, .055, .055];
        let pick = rng()*11.9, index = 0;
        while (index<weights.length-1 && (pick-=weights[index])>0) index++;
        const v = volumes[index];
        const az = rng()*Math.PI*2, h = rng()*2-1, radial = Math.sqrt(1-h*h);
        const shell = .93 + rng()*.07;
        const u = Math.cos(az)*radial*v[3]*shell, w = h*v[4]*shell;
        x = v[0]+u*Math.cos(v[6])-w*Math.sin(v[6]);
        y = v[1]+u*Math.sin(v[6])+w*Math.cos(v[6]);
        z = v[2]+Math.sin(az)*radial*v[5]*shell;
        if (!volumes.some((other,j) => j!==index && inside(x,y,z,other))) break;
      } while (++attempt<24);
      bone = y>2.75 ? 1 : 0;
    } else if (section < .88) {
      const segment = Math.floor(rng()*12), stage = segment%3;
      bone = segment+2;
      const angle=rng()*Math.PI*2, along=rng();
      const radius = stage===0 ? .13*(1-.45*along) : stage===1 ? .055 : .065+.03*along;
      x=Math.cos(angle)*radius; y=along; z=Math.sin(angle)*radius;
    } else if (section < .935) {
      kind=1; bone=1;
      const along=rng();
      x=.64+along*.78; y=2.85+along*.90; z=(rng()-.5)*.11;
    } else {
      kind=2;
      const along=rng();
      x=-1.40-along*1.42; y=2.57-along*.52; z=(rng()-.5)*(.09+along*.28);
    }
    positions.set([x,y,z],i*3); bones[i]=bone; kinds[i]=kind;
    brightness[i]=.42+rng()*.58; seeds[i]=rng();
  }
  return {positions,bones,kinds,brightness,seeds};
}
