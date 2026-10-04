export type AudioContact = Readonly<{ id: string; hoof: number; born: number; x: number; y: number; z: number; strength: number; contactDuration: number }>;
export function scheduleContacts(previous: ReadonlySet<string>, contacts: readonly AudioContact[], time: number) {
  if (!Number.isFinite(time)) throw new Error('Invalid audio timeline');
  const seen = new Set([...previous].slice(-127));
  const events: AudioContact[] = [];
  for (const event of contacts) {
    if (seen.has(event.id)) continue;
    if (![event.born, event.x, event.y, event.z, event.strength, event.contactDuration].every(Number.isFinite)) continue;
    seen.add(event.id);
    if (time >= event.born && time - event.born <= .15 && event.strength > 0) events.push(event);
  }
  return { seen: new Set([...seen].slice(-128)), events };
}
