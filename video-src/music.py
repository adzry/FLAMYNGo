"""Generates the royalty-free 128 BPM house soundtrack for tiktok.html.

    python3 music.py tiktok <out.wav>

Everything is synthesised here (no samples). The Vox-style videos from
film.html use score.py instead.
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


def write_wav(out, mix):
    mix = mix / (np.abs(mix).max() + 1e-9) * 0.89
    stereo = np.stack([mix, mix], axis=1)
    with wave.open(out, "wb") as f:
        f.setnchannels(2)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes((stereo * 32767).astype("<i2").tobytes())


def clap():
    n = int(0.18 * SR)
    x = RNG.standard_normal(n)
    x = lowpass(x, 5000) - lowpass(x, 900)
    e = env_exp(n, 0.05)
    for d in (0.0, 0.011, 0.022):  # three quick bursts = hand clap
        i = int(d * SR)
        e[i:] += 0.6 * env_exp(n - i, 0.008)
    return x * e


def crash():
    n = int(1.6 * SR)
    x = RNG.standard_normal(n)
    return (x - lowpass(x, 3000)) * env_exp(n, 0.45)


def tiktok(out):
    """Energetic 128 BPM house loop. Section map in beats must match the
    scenes in tiktok.html: hook 8, problem 8, intro 4 (drop on its beat 2),
    physical 8, digital 8, live 8, outro 8 = 52 beats."""
    beat = 60 / 128
    total_beats = 52
    duration = total_beats * beat
    buf = np.zeros(int((duration + 2) * SR))
    chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]  # Am F C G
    build = (16, 18)       # "Kenalkan..." roll, logo drops on beat 18
    cuts = [8, 16, 20, 28, 36, 44]
    outro_stop = 48        # drums out for the logo
    for b in range(total_beats):
        t = b * beat
        chord = chords[(b // 4) % 4]
        in_build = build[0] <= b < build[1]
        # four-on-the-floor + clap on 2 & 4 + 16th hats
        if not in_build and b < outro_stop:
            add(buf, t, 0.55 * kick())
            if b % 2 == 1:
                add(buf, t, 0.22 * clap())
            for q in range(4):
                add(buf, t + q * beat / 4, (0.07 if q == 2 else 0.03) * hat())
            # off-beat house bass
            add(buf, t + beat / 2, 0.32 * bass(hz(chord[0] - 24), beat / 2))
        # 16th-note pluck arpeggio all the way through
        if b < outro_stop + 1:
            for q in range(4):
                m = chord[(b * 4 + q) % 3] + (12 if q % 2 else 0)
                add(buf, t + q * beat / 4, 0.10 * pluck(hz(m + 12), 0.25))
        # snare-roll build before the drop
        if in_build:
            steps = 8 if b < build[1] - 1 else 16
            for q in range(steps // 2):
                add(buf, t + q * beat / (steps // 2), (0.08 + 0.12 * (b - build[0])) * clap())
    # riser into the drop, crash on every cut and on the drop
    rn = int((build[1] - build[0]) * beat * SR)
    r = RNG.standard_normal(rn)
    r = r - lowpass(r, 1500)
    add(buf, build[0] * beat, 0.25 * r * np.linspace(0, 1, rn) ** 2)
    for c in cuts + [build[1]]:
        add(buf, c * beat, (0.35 if c == build[1] else 0.18) * crash())
    # final chord hit for the logo
    add(buf, outro_stop * beat, 0.25 * pad_chord(chords[0], 4 * beat))
    add(buf, outro_stop * beat, 0.6 * kick())
    add(buf, outro_stop * beat, 0.35 * crash())
    mix = buf[: int(duration * SR)]
    n = len(mix)
    mix = np.tanh(1.4 * mix * np.clip((n - np.arange(n)) / (0.8 * SR), 0, 1))
    write_wav(out, mix)


if __name__ == "__main__":
    tiktok(sys.argv[2])
