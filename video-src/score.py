"""Vox-style score + synced sound design for the film.html videos.

    python3 score.py <timeline> <out.wav>     timeline: teaser | physical | digital | live

The music follows the story instead of looping: each scene has a mood
(mystery -> tension -> lift -> groove -> peak -> resolve) and every on-screen
reveal in film.html gets its own sound (pops, marker scribbles, QR beeps, a
ticking clock, counter ticks). Everything is synthesised here, so it is
royalty-free. Tempo is 96 BPM: one bar = 2.5 s, and every scene cut lands on
a bar line.

Keep SCENES / TIMELINES / CUES in sync with the timings in film.html.
"""
import sys
import wave

import numpy as np

SR = 44100
BEAT = 60 / 96
BAR = 4 * BEAT
RNG = np.random.default_rng(11)

# ---------------------------------------------------------------- timeline
# (scene, seconds, mood) — must match TIMELINES in film.html
TIMELINES = {
    "teaser": [("hook", 7.5, "mystery"), ("problem", 12.5, "tension"), ("idea", 10, "lift"),
               ("physical", 12.5, "groove"), ("digital", 12.5, "groove"), ("live", 12.5, "peak"),
               ("outro", 7.5, "resolve")],
    "physical": [("physical", 12.5, "groove"), ("end", 2.5, "resolve")],
    "digital": [("digital", 12.5, "groove"), ("end", 2.5, "resolve")],
    "live": [("live", 12.5, "peak"), ("end", 2.5, "resolve")],
}

# Sound cues per scene, in scene-local seconds: (time, sound, [duration]).
# Times mirror the render() functions in film.html.
CUES = {
    "hook": [(.2, "pop"), (.45, "pop"), (.8, "roll", 3.4), (1.0, "thud"), (2.2, "thud"),
             (2.8, "swipe", .6), (4.6, "question")],
    "problem": [(.2, "thud"), (1.2, "swipe", .6), (2.4, "slap"), (3.0, "slap"), (3.6, "slap"),
                (5.6, "scribble", .9), (6.3, "pop"), (7.2, "tick")],
    "idea": [(.2, "thud"), (.9, "thud"), (1.4, "swipe", .6), (2.0, "whoosh", .5), (2.3, "whoosh", .5),
             (3.3, "pop"), (5.4, "pop")],
    "physical": [(.1, "whoosh", .6), (.6, "thud"), (1.3, "swipe", .6),
                 (3.4, "scribble", .7), (3.6, "pop"), (5.2, "scribble", .7), (5.4, "pop"),
                 (7.0, "scribble", .7), (7.2, "pop")],
    "digital": [(.2, "thud"), (.9, "swipe", .6), (2.0, "whoosh", .6),
                (1.4, "pop"), (1.8, "beep"), (2.0, "blip"),
                (2.9, "pop"), (3.3, "beep"), (3.5, "blip"),
                (4.4, "pop"), (4.8, "beep"), (5.0, "blip"),
                (6.2, "pop"), (8.6, "thud"), (9.0, "clock", 2.6), (11.6, "ding")],
    "live": [(.2, "thud"), (.9, "swipe", .6), (1.0, "whoosh", .7), (2.9, "scribble", .7), (3.4, "pop"),
             (5.5, "count", 1.3), (6.1, "count", 1.3), (6.7, "count", 1.1), (7.6, "tick")],
    "outro": [(.1, "impact"), (1.0, "thud"), (1.35, "thud"), (1.7, "thud"), (2.3, "pop")],
    # the clips' end card plays the outro at 1.25x speed
    "end": [(.08, "impact"), (.8, "thud"), (1.08, "thud"), (1.36, "thud"), (1.84, "pop")],
}

# Harmony: D minor for the problem half, F major once FLAMYNGo arrives.
MINOR = [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]]   # Dm Bb Gm A
MAJOR = [[53, 57, 60], [48, 52, 55], [50, 53, 57], [46, 50, 53]]   # F  C  Dm Bb


# ---------------------------------------------------------------- utilities
def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tt(dur):
    return np.arange(int(dur * SR)) / SR


def band(x, lo, hi):
    """Smooth band-pass via FFT (fast, no scipy needed)."""
    f = np.fft.rfftfreq(len(x), 1 / SR)
    f[0] = 1e-6
    mask = 1 / (1 + (lo / f) ** 4) * 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(np.fft.rfft(x) * mask, len(x))


def noise(dur):
    return RNG.standard_normal(int(dur * SR))


def norm(x):
    return x / (np.abs(x).max() + 1e-9)


class Mix:
    def __init__(self, dur):
        self.buf = np.zeros((int((dur + 3) * SR), 2))

    def add(self, t0, sig, gain=1.0, pan=0.0):
        i = int(t0 * SR)
        if i < 0:
            sig, i = sig[-i:], 0
        sig = sig[: len(self.buf) - i]
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        self.buf[i: i + len(sig), 0] += gain * l * sig
        self.buf[i: i + len(sig), 1] += gain * r * sig


# ---------------------------------------------------------------- instruments
def piano(f, dur=3.0):
    t = tt(dur)
    s = np.zeros_like(t)
    for k in range(1, 9):
        fk = f * k * (1 + 0.0004 * k * k)  # slight stretch like real strings
        s += (1 / k ** 1.3) * np.sin(2 * np.pi * fk * t) * np.exp(-t * (0.9 + 1.1 * k))
    hammer = band(noise(dur), 1000, 5000) * np.exp(-t / 0.008) * 0.15
    return (s + hammer) * np.minimum(1, t / 0.003)


def marimba(f, dur=0.8):
    t = tt(dur)
    return (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.32)
            + 0.3 * np.sin(2 * np.pi * 3.93 * f * t) * np.exp(-t / 0.05)
            + 0.08 * np.sin(2 * np.pi * 9.8 * f * t) * np.exp(-t / 0.015)) * np.minimum(1, t / 0.002)


def bell(f, dur=3.0):
    t = tt(dur)
    s = sum(a * np.sin(2 * np.pi * f * p * t) * np.exp(-t / d)
            for p, a, d in [(1, 1, 2.2), (2.76, .45, 1.0), (5.4, .25, .45), (8.93, .12, .2)])
    return s * np.minimum(1, t / 0.002)


def pulse(f, dur=0.22):
    """Staccato string-synth note for the tension section."""
    t = tt(dur)
    s = sum((1 / k) * (1 if k < 5 else 0.4) * np.sin(2 * np.pi * f * k * t) for k in range(1, 9))
    return s * np.minimum(1, t / 0.006) * np.exp(-t / 0.09)


def pad(notes, dur):
    t = tt(dur)
    s = np.zeros_like(t)
    for m in notes:
        for det in (-0.15, 0, 0.15):
            ph = 2 * np.pi * hz(m) * (1 + det / 100) * t
            s += np.sin(ph) + 0.15 * np.sin(2 * ph)
    env = np.clip(np.minimum(t / 0.8, (dur - t) / 0.8), 0, 1)
    return s / (3 * len(notes)) * env


def drone(f, dur):
    t = tt(dur)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 1.5 * f * t) + 0.2 * np.sin(4 * np.pi * f * t)
    trem = 0.85 + 0.15 * np.sin(2 * np.pi * 0.4 * t)
    env = np.clip(np.minimum(t / 1.2, (dur - t) / 0.6), 0, 1)
    return s * trem * env


def bass(f, dur=0.6):
    t = tt(dur)
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)) * np.minimum(1, t / 0.005) * np.exp(-t / 0.3)


def kick(soft=1.0):
    t = tt(0.4)
    f = 48 + 70 * np.exp(-t / 0.035)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.14 * soft))


def snap():
    t = tt(0.12)
    return band(noise(0.12), 1500, 6000) * (np.exp(-t / 0.018) + 0.5 * np.exp(-np.maximum(t - 0.012, 0) / 0.012) * (t > 0.012))


def shaker():
    t = tt(0.06)
    return band(noise(0.06), 5000, 12000) * np.exp(-t / 0.018) * np.minimum(1, t / 0.004)


# ---------------------------------------------------------------- sound design
def sfx(kind, dur=None):
    if kind == "pop":
        t = tt(0.12)
        f = 380 + 700 * (1 - np.exp(-t / 0.02))
        return 0.9 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.035)
    if kind == "blip":
        t = tt(0.1)
        return 0.5 * np.sin(2 * np.pi * 1320 * t) * np.exp(-t / 0.03)
    if kind == "thud":
        t = tt(0.25)
        f = 60 + 90 * np.exp(-t / 0.03)
        return 0.9 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.07) + 0.25 * band(noise(0.25), 800, 4000) * np.exp(-t / 0.006)
    if kind == "slap":  # paper card landing
        t = tt(0.2)
        return 0.8 * band(noise(0.2), 250, 3500) * np.exp(-t / 0.03) + 0.4 * np.sin(2 * np.pi * 120 * t) * np.exp(-t / 0.05)
    if kind == "swipe":  # highlighter stroke
        t = tt(dur)
        env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
        return 0.35 * band(noise(dur), 2500, 8000) * env
    if kind == "scribble":  # marker drawing a circle
        t = tt(dur)
        strokes = 0.35 + 0.65 * np.abs(np.sin(2 * np.pi * 6.5 * t)) ** 2
        env = np.clip(np.minimum(t / 0.05, (dur - t) / 0.08), 0, 1)
        return 0.45 * band(noise(dur), 1200, 5000) * strokes * env
    if kind == "whoosh":
        t = tt(dur)
        x = band(noise(dur), 300, 3000)
        return 0.55 * x * np.sin(np.pi * t / dur) ** 2
    if kind == "roll":  # trolley wheels
        t = tt(dur)
        jitter = 0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 9 * t))
        env = np.clip(np.minimum(t / 0.4, (dur - t) / 0.4), 0, 1)
        return 0.5 * band(noise(dur), 70, 450) * jitter * env
    if kind == "question":
        a, b = tt(0.12), tt(0.2)
        s = np.zeros(int(0.32 * SR))
        s[: len(a)] += np.sin(2 * np.pi * 660 * a) * np.exp(-a / 0.05)
        i = int(0.1 * SR)
        s[i: i + len(b)] += np.sin(2 * np.pi * 990 * b) * np.exp(-b / 0.08)
        return 0.6 * s
    if kind == "beep":  # QR scanner
        a = tt(0.07)
        b = tt(0.1)
        s = np.concatenate([np.sin(2 * np.pi * 1568 * a), np.sin(2 * np.pi * 2093 * b) * np.exp(-b / 0.05)])
        return 0.35 * s * np.minimum(1, np.arange(len(s)) / 60)
    if kind == "tick":
        t = tt(0.03)
        return 0.6 * band(noise(0.03), 3000, 9000) * np.exp(-t / 0.004)
    if kind == "clock":
        s = np.zeros(int(dur * SR))
        for i, t0 in enumerate(np.arange(0, dur, BEAT / 2)):
            t = tt(0.04)
            c = band(noise(0.04), 3500 if i % 2 == 0 else 1800, 9000 if i % 2 == 0 else 4000) * np.exp(-t / 0.005)
            j = int(t0 * SR)
            s[j: j + len(c)] += 0.7 * c[: len(s) - j]
        return s
    if kind == "count":  # ticks that slow down like the ease-out counter
        s = np.zeros(int((dur + 0.1) * SR))
        n = 16
        for i in range(n):
            p = i / n
            t0 = dur * (1 - (1 - p) ** (1 / 3))
            t = tt(0.03)
            c = np.sin(2 * np.pi * (1100 + 900 * p) * t) * np.exp(-t / 0.008)
            j = int(t0 * SR)
            s[j: j + len(c)] += 0.35 * c
        return s
    if kind == "ding":
        return 0.5 * bell(hz(84), 1.2)
    if kind == "impact":
        t = tt(1.5)
        f = 40 + 60 * np.exp(-t / 0.05)
        boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.5)
        air = band(noise(1.5), 400, 9000) * np.exp(-t / 0.35) * 0.3
        return 0.9 * boom + air + 0.35 * bell(hz(77), 1.5)
    raise ValueError(kind)


SFX_GAIN = {"pop": .5, "blip": .35, "thud": .55, "slap": .45, "swipe": .4, "scribble": .45, "whoosh": .3,
            "roll": .25, "question": .45, "beep": .4, "tick": .35, "clock": .4, "count": .5, "ding": .45,
            "impact": .8}


# ---------------------------------------------------------------- arrangement
def play_bar(mix, t0, mood, chord, bar_in_section, last_bar, ring=4.5):
    root = chord[0]
    if mood == "mystery":
        # single piano notes over a low drone, the "where is it?" feel
        for beat, m in [(0, chord[2] + 12), (1.5, chord[1] + 12), (2.5, chord[0] + 24), (3.5, chord[1] + 12)]:
            mix.add(t0 + beat * BEAT, piano(hz(m), 2.0), .16, pan=.2)
    elif mood == "tension":
        for e in range(8):  # staccato 8ths
            mix.add(t0 + e * BEAT / 2, pulse(hz(root - 12 + (12 if e in (3, 6) else 0))), .17, pan=-.25)
        mix.add(t0, piano(hz(root), 2.5), .14)
        for n in chord:
            mix.add(t0, piano(hz(n + 12), 2.5), .06, pan=.2)
        if bar_in_section >= 1:
            mix.add(t0, kick(0.8), .35)
            mix.add(t0 + 2 * BEAT, kick(0.8), .25)
        if last_bar:  # riser into the reveal
            r = band(noise(BAR), 800, 6000) * np.linspace(0, 1, int(BAR * SR)) ** 3
            mix.add(t0, r, .12)
    else:
        # F-major world: marimba arpeggio carries everything
        pattern = [0, 1, 2, 1, 2, 1, 0, 2] if mood != "peak" else [0, 1, 2, 0, 1, 2, 1, 2]
        octave = 24 if mood != "peak" else 36
        if mood != "resolve":
            for e, p in enumerate(pattern):
                mix.add(t0 + e * BEAT / 2, marimba(hz(chord[p] + octave - 12)), .16, pan=(-.3 if e % 2 else .3))
            mix.add(t0, bass(hz(root - 12), 1.0), .32)
            mix.add(t0 + 2.5 * BEAT, bass(hz(root - 12 + 7), 0.6), .22)
        if mood == "lift":
            if bar_in_section == 0:
                mix.add(t0, bell(hz(chord[2] + 24), 3), .22)
                mix.add(t0, pad([n + 12 for n in chord], BAR * 2), .22)
            for n in chord:
                mix.add(t0, piano(hz(n + 12), 2.5), .07)
            mix.add(t0, kick(0.7), .3)
            mix.add(t0 + 2 * BEAT, kick(0.7), .22)
        if mood in ("groove", "peak"):
            for beat in (1.5, 3.5):  # off-beat piano stabs
                for n in chord:
                    mix.add(t0 + beat * BEAT, piano(hz(n + 12), 0.6), .06, pan=.15)
            kicks = [0, 2, 2.75] if mood == "groove" else [0, 1, 2, 3]
            for k in kicks:
                mix.add(t0 + k * BEAT, kick(), .42)
            for s in (1, 3):
                mix.add(t0 + s * BEAT, snap(), .16)
            for q in range(16):
                mix.add(t0 + q * BEAT / 4, shaker(), .05 if q % 2 else .09, pan=.4)
        if mood == "peak":
            mix.add(t0, pad([n + 12 for n in chord], BAR + .3), .2)
        if mood == "resolve":
            # rolled final chord + bell, no drums
            for i, n in enumerate(chord + [chord[0] + 12, chord[2] + 12]):
                mix.add(t0 + i * 0.07, piano(hz(n + 12), ring), .12, pan=(i - 2) * .15)
            mix.add(t0, piano(hz(root - 12), ring), .16)
            mix.add(t0 + 0.4, bell(hz(chord[0] + 36), 3.5), .12)
            mix.add(t0, pad([n + 12 for n in chord], ring), .16)


def render(name, out):
    tl = TIMELINES[name]
    duration = sum(d for _, d, _ in tl)
    mix = Mix(duration)
    t_scene = 0.0
    prev_mood = None
    for scene, dur, mood in tl:
        # music: bars inside this scene
        progression = MINOR if mood in ("mystery", "tension") else MAJOR
        nbars = int(round(dur / BAR))
        if mood == "mystery":
            mix.add(t_scene, drone(hz(38), dur + 0.6), .16)
            mix.add(t_scene, sfx("clock", dur), .18)  # the "status?" clock under the hook
        if mood == "tension":
            mix.add(t_scene, drone(hz(38), dur + 0.3), .12)
        for b in range(nbars):
            t0 = t_scene + b * BAR
            gb = int(round(t0 / BAR))
            if mood == "resolve":
                if b == 0:
                    play_bar(mix, t0, mood, MAJOR[0], b, True, ring=dur + 0.5)
                continue
            play_bar(mix, t0, mood, progression[gb % 4], b, b == nbars - 1)
        # scene-change whoosh (skip the very first scene)
        if t_scene > 0:
            mix.add(t_scene - 0.45, sfx("whoosh", 0.5), .22)
            if mood != prev_mood and mood in ("lift", "resolve"):
                mix.add(t_scene, bell(hz(84), 2.0), .12)
        # synced sound design
        for cue in CUES[scene]:
            t, kind = cue[0], cue[1]
            s = sfx(kind, cue[2]) if len(cue) > 2 else sfx(kind)
            mix.add(t_scene + t, s, SFX_GAIN[kind], pan=0.0)
        prev_mood = mood
        t_scene += dur

    out_buf = mix.buf[: int(duration * SR)]
    n = len(out_buf)
    fade = np.clip((n - np.arange(n)) / (0.6 * SR), 0, 1)[:, None] * np.minimum(1, np.arange(n) / (0.05 * SR))[:, None]
    out_buf = np.tanh(1.1 * norm(out_buf) * fade) * 0.9
    with wave.open(out, "wb") as f:
        f.setnchannels(2)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes((out_buf * 32767).astype("<i2").tobytes())


if __name__ == "__main__":
    render(sys.argv[1], sys.argv[2])
