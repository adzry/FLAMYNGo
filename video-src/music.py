"""Generates the royalty-free soundtrack for the FLAMYNGo teaser videos.

    python3 music.py <duration_s> <cuts_csv> <out.wav> [--drop-drums-at S]

Everything is synthesised here (no samples): a soft pad, a plucked
arpeggio, sub bass, light drums, and a whoosh + tick on every scene cut.
Tempo is 96 BPM, so one bar is 2.5 s and every scene cut lands on a bar.
"""
import sys
import wave

import numpy as np

SR = 44100
BPM = 96
BEAT = 60 / BPM
BAR = BEAT * 4

# Am - F - C - G, as MIDI notes
CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env_exp(n, decay):
    return np.exp(-np.arange(n) / SR / decay)


def add(buf, start_s, sig):
    i = int(start_s * SR)
    if i >= len(buf):
        return
    sig = sig[: len(buf) - i]
    buf[i : i + len(sig)] += sig


def lowpass(x, cutoff):
    # one-pole low-pass, vectorised enough for our lengths
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y


def pluck(freq, dur=0.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(2 * np.pi * 2 * freq * t) + 0.12 * np.sin(2 * np.pi * 3 * freq * t)
    attack = np.minimum(1, t / 0.004)
    return s * attack * env_exp(n, 0.18)


def pad_chord(notes, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for m in notes:
        f = hz(m - 12)
        for det in (-0.12, 0.0, 0.12):  # slight chorus
            ph = 2 * np.pi * f * (1 + det / 100) * t
            s += np.sin(ph) + 0.18 * np.sin(2 * ph)
    env = np.minimum(1, t / 0.6) * np.minimum(1, (dur - t) / 0.5)
    return s / (len(notes) * 3) * np.clip(env, 0, 1)


def bass(freq, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(4 * np.pi * freq * t)
    return s * np.minimum(1, t / 0.01) * env_exp(n, 0.35)


def kick():
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    f = 45 + 80 * np.exp(-t / 0.04)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.12)


RNG = np.random.default_rng(7)


def hat():
    n = int(0.06 * SR)
    x = RNG.standard_normal(n)
    x = x - lowpass(x, 6000)  # crude high-pass
    return x * env_exp(n, 0.015)


def whoosh(dur=0.55):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = RNG.standard_normal(n)
    x = lowpass(x, 2500) - lowpass(x, 300)
    swell = (t / dur) ** 2.2
    return x * swell


def tick():
    n = int(0.08 * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * 1760 * t) * env_exp(n, 0.02)


def main():
    duration = float(sys.argv[1])
    cuts = [float(c) for c in sys.argv[2].split(",") if c]
    out = sys.argv[3]
    drop_at = float(sys.argv[sys.argv.index("--drop-drums-at") + 1]) if "--drop-drums-at" in sys.argv else duration
    drums_from = BAR * 1 if duration < 30 else BAR * 3  # teaser: let the hook breathe

    total = int((duration + 2) * SR)
    mus = np.zeros(total)
    fx = np.zeros(total)

    bars = int(np.ceil(duration / BAR))
    for b in range(bars):
        t0 = b * BAR
        last = t0 + BAR >= duration - 0.01
        chord = CHORDS[b % 4] if not last else CHORDS[0]
        add(mus, t0, 0.22 * pad_chord(chord, BAR + (1.5 if last else 0.15)))
        if last:
            add(mus, t0, 0.3 * bass(hz(chord[0] - 24), 2.5))
            for i, m in enumerate(chord + [chord[0] + 12]):
                add(mus, t0 + i * 0.06, 0.16 * pluck(hz(m + 12), 1.8))
            break
        # arpeggio: 8 eighth-notes per bar
        pattern = [0, 1, 2, 1, 0, 2, 1, 2]
        for i, p in enumerate(pattern):
            m = chord[p] + (12 if i in (2, 5) else 0)
            add(mus, t0 + i * BEAT / 2, 0.13 * pluck(hz(m)))
        if drums_from <= t0 < drop_at:
            for beat in range(4):
                add(mus, t0 + beat * BEAT, 0.28 * bass(hz(chord[0] - 24), BEAT))
                add(mus, t0 + beat * BEAT, 0.36 * kick())
                add(mus, t0 + beat * BEAT + BEAT / 2, 0.05 * hat())

    for c in cuts:
        if c <= 0:
            continue
        w = whoosh()
        add(fx, c - len(w) / SR, 0.09 * w / (np.abs(w).max() + 1e-9))
        add(fx, c, 0.10 * tick())

    mix = mus + fx
    mix = mix[: int(duration * SR)]
    # gentle fade in/out, then normalise to -1 dBFS peak
    n = len(mix)
    fade_in = np.minimum(1, np.arange(n) / (0.4 * SR))
    fade_out = np.clip((n - np.arange(n)) / (1.2 * SR), 0, 1)
    mix = np.tanh(1.2 * mix * fade_in * fade_out)
    mix = mix / (np.abs(mix).max() + 1e-9) * 0.89
    stereo = np.stack([mix, mix], axis=1)
    with wave.open(out, "wb") as f:
        f.setnchannels(2)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes((stereo * 32767).astype("<i2").tobytes())


if __name__ == "__main__":
    main()
