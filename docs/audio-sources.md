# Recorded sound sources

The soundtrack uses real recorded horse and sand samples. There is no independently timed gallop loop: the four authored contact events per stride trigger individual hoof transients, a grain scrape, and a quiet settling texture. First trusted pointer interaction unlocks Web Audio; M mutes. Hidden, reduced-motion, and context-loss pauses stop voices. No catch-up impacts play on resume.

## Horse

[Horse gallop by Max_Headroom](https://freesound.org/people/Max_Headroom/sounds/175356/), Creative Commons Zero. The public author page links the [CC0 dedication](https://creativecommons.org/publicdomain/zero/1.0/).

Downloaded public high-quality preview: `https://cdn.freesound.org/previews/175/175356_2861652-hq.mp3`. This is a compressed source preview, not the original recorder master. SHA256: `ed8c2339488feca16a050f22101b7921034d646e8f479c577966d67d1b345c94`.

Four 210 ms sections begin at 0.90, 1.16, 1.98, and 2.50 seconds. Decoded to mono 22,050 Hz PCM16, high-pass 75 Hz, low-pass 9 kHz, 5 ms attack fade, 50 ms release fade, normalized separately to peak 22,000/32,768. The very short edits isolate contact transients rather than horse breathing or the original gallop rhythm. Runtime varies playback rate modestly and retains low gain; a dynamics compressor protects the mixed output.

## Sand

[Fantozzi’s Footsteps: grass/sand & stone](https://opengameart.org/content/fantozzis-footsteps-grasssand-stone), CC0. The author also links the originating Freesound pack on this page.

Downloaded archive: `https://opengameart.org/sites/default/files/Fantozzi-footsteps.7z`. SHA256: `415d360e0911c1c1c5355ee94023b772e6f4044f59b9b580610e7dbffd1840fd`.

Only the lossless sand recordings L1, R1, L2, R2 are used. First 480 ms of each recording: mono 22,050 Hz PCM16, high-pass 380 Hz, 12 ms attack fade and 160 ms release fade. Contact playback adds an 800 Hz high-pass. A deterministic four-second granular overlap-add bed is built from 90 ms Hann-windowed segments of sand L1 with 25 ms spacing and circular accumulation (seed 71). It removes the original footstep cadence, loops continuously, and supplies quiet slow-rate, low-pass air/grain ambience; no synthetic wind oscillator is used.

## Validation limits

Automated tests verify activation, one-time scheduling, stale-event rejection, pause/resume, mute, bounded voice counts, load failure, and capture output. PCM peaks are measured and bounded. Listening and audiovisual synchronization review require the combined live renderer and are recorded in the project validation document rather than inferred from waveform analysis alone.
