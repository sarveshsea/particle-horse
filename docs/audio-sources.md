# Recorded sound sources

The soundtrack uses real recorded horse and sand samples. There is no independently timed gallop loop: the four authored contact events per stride trigger individual hoof transients and a light grain release, above a very quiet original-speed air bed. First trusted pointer interaction unlocks Web Audio; M mutes. Hidden, reduced-motion, and context-loss pauses stop voices. No catch-up impacts play on resume.

## Horse

[Horse gallop by Max_Headroom](https://freesound.org/people/Max_Headroom/sounds/175356/), Creative Commons Zero. The public author page links the [CC0 dedication](https://creativecommons.org/publicdomain/zero/1.0/).

Downloaded public high-quality preview: `https://cdn.freesound.org/previews/175/175356_2861652-hq.mp3`. This is a compressed source preview, not the original recorder master. SHA256: `ed8c2339488feca16a050f22101b7921034d646e8f479c577966d67d1b345c94`.

Four 130 ms sections begin at 0.925, 1.18, 2.005, and 2.525 seconds. Variants 1 and 3 then remove 20 and 25 ms of remaining pre-attack respectively and refill the end with silence; final transient maxima fall within the first 30 ms. Decoded to mono 22,050 Hz PCM16, high-pass 180 Hz, broad -4 dB cut at 420 Hz, low-pass 9.5 kHz, 2 ms attack fade and 55 ms release fade. Normalized to peak 20,500/32,768. Shortening removes overlapping original contacts and the low-mid cut reduces muddy resonance. Runtime rates stay between 0.99 and 1.026; the contact grain layer follows 16 ms later at less than 21% of hoof gain. There is no third slow-pitched scrape. A compressor protects the output; no reverberation is added.

## Sand

[Fantozzi’s Footsteps: grass/sand & stone](https://opengameart.org/content/fantozzis-footsteps-grasssand-stone), CC0. The author also links the originating Freesound pack on this page.

Downloaded archive: `https://opengameart.org/sites/default/files/Fantozzi-footsteps.7z`. SHA256: `415d360e0911c1c1c5355ee94023b772e6f4044f59b9b580610e7dbffd1840fd`.

Only lossless sand recordings L1, R1, L2, R2 are used. The 170 ms sections begin at 25 ms: mono 22,050 Hz PCM16, high-pass 1.4 kHz, low-pass 9.8 kHz, 6 ms attack fade and 105 ms release fade. Peaks are normalized to 12,000/32,768. Rates remain above unity, preserving crisp grain texture without introducing low-pitched rumble.

A deterministic four-second granular overlap-add bed uses 60 ms Hann-windowed sections of processed sand L1, 18 ms spacing and circular accumulation, seed 71. It loops at original rate through a 1.8 kHz high-pass at only 0.004 gain. This replaces the earlier 0.28-rate low-pass bed.

## Validation limits

Automated tests verify activation, one-time scheduling, stale-event rejection, pause/resume, mute, bounded voice counts, load failure, and capture output. PCM peaks are measured and bounded. Listening and audiovisual synchronization review require the combined live renderer and are recorded in the project validation document rather than inferred from waveform analysis alone.
