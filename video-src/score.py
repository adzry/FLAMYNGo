"""Vox-style score + synced sound design for the film.html videos.

    python3 score.py <timeline> <out.wav>     timeline: teaser | physical | digital | live

An upbeat funk/pop score that still follows the story: a building intro,
a minor-key verse for the problem, then a bright F-major chorus with a
melodic hook once FLAMYNGo appears, peaking on the live data. Swung
16th-note hats, a bouncing bass and a Rhodes-style electric piano carry the
groove. Every on-screen reveal in film.html also gets its own sound (pops,
marker scribbles, QR beeps, a ticking clock, counter ticks). Everything is
synthesised here, so it is royalty-free. Tempo is 96 BPM: one bar = 2.5 s,
and every scene cut lands on a bar line.

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
    "teaser": [("hook", 7.5, "intro"), ("problem", 12.5, "verse"), ("idea", 10, "lift"),
               ("physical", 12.5, "chorus"), ("digital", 12.5, "chorus"), ("live", 12.5, "peak"),
               ("outro", 7.5, "resolve")],
    "physical": [("physical", 12.5, "chorus"), ("end", 2.5, "resolve")],
    "digital": [("digital", 12.5, "chorus"), ("end", 2.5, "resolve")],
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
    "live": [(.2, "thud"), (.9, "swipe", .6), (1.0, "whoosh", .7), (2.9, "scribble", .7), (3.4, "pop"), (3.9, "scribble", .7), (4.4, "pop"),
             (5.5, "count", 1.3), (6.1, "count", 1.3), (6.7, "count", 1.1), (7.6, "tick")],
    "outro": [(.1, "impact"), (1.0, "thud"), (1.35, "thud"), (1.7, "thud"), (2.3, "pop")],
    # the clips' end card plays the outro at 1.25x speed
    "end": [(.08, "impact"), (.8, "thud"), (1.08, "thud"), (1.36, "thud"), (1.84, "pop")],
}

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


# Harmony. Verse (the problem): Dm7 Bbmaj7 Gm7 A7 — minor but still funky.
# Chorus (FLAMYNGo arrives): Fmaj7 Cadd9 Dm7 Bbmaj7, i.e. I-V-vi-IV in F.
VERSE = [[50, 53, 57, 60], [46, 50, 53, 57], [43, 46, 50, 53], [45, 49, 52, 55]]
CHORUS = [[53, 57, 60, 64], [48, 52, 55, 62], [50, 53, 57, 60], [46, 50, 53, 57]]

# The hook: one 4-bar phrase over the chorus chords, as (16th step, MIDI note).
HOOK = [
    [(0, 72), (3, 69), (6, 72), (8, 74), (11, 72), (14, 69)],
    [(0, 67), (3, 69), (6, 72), (10, 74), (12, 76)],
    [(0, 77), (3, 76), (6, 74), (8, 72), (11, 74), (14, 72)],
    [(0, 74), (3, 72), (6, 70), (8, 69), (12, 65)],
]
STEP = BEAT / 4
SWING = 0.18  # push every off-16th a little late: the "enak" bounce


def at(bar_t0, step):
    return bar_t0 + step * STEP + (SWING * STEP if step % 2 else 0)


# ---------------------------------------------------------------- instruments
def ep(f, dur=0.9):
    """Rhodes-style electric piano (2-operator FM + tine)."""
    t = tt(dur + 0.25)
    index = 1.6 * np.exp(-t / 0.18) + 0.35
    s = np.sin(2 * np.pi * f * t + index * np.sin(2 * np.pi * f * t))
    s += 0.18 * np.sin(2 * np.pi * f * 7.02 * t) * np.exp(-t / 0.04)  # bell-like tine
    env = np.exp(-t / 1.4) * np.minimum(1, t / 0.003)
    rel = np.clip((dur + 0.25 - t) / 0.25, 0, 1)
    trem = 1 + 0.08 * np.sin(2 * np.pi * 4.5 * t)
    return s * env * rel * trem


def lead(f, dur=0.3):
    """Soft square-ish lead with a touch of vibrato for the hook."""
    t = tt(dur + 0.12)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * t) * np.minimum(1, t / 0.15)
    ph = 2 * np.pi * f * np.cumsum(vib) / SR
    s = np.sin(ph) + 0.28 * np.sin(3 * ph) + 0.12 * np.sin(5 * ph) + 0.35 * np.sin(2 * ph)
    env = np.minimum(1, t / 0.01) * (0.75 + 0.25 * np.exp(-t / 0.08))
    rel = np.clip((dur + 0.12 - t) / 0.12, 0, 1)
    return s * env * rel


def bell(f, dur=3.0):
    t = tt(dur)
    s = sum(a * np.sin(2 * np.pi * f * p * t) * np.exp(-t / d)
            for p, a, d in [(1, 1, 2.2), (2.76, .45, 1.0), (5.4, .25, .45), (8.93, .12, .2)])
    return s * np.minimum(1, t / 0.002)


def pad(notes, dur):
    t = tt(dur)
    s = np.zeros_like(t)
    for m in notes:
        for det in (-0.2, 0, 0.2):
            ph = 2 * np.pi * hz(m) * (1 + det / 100) * t
            s += np.sin(ph) + 0.2 * np.sin(2 * ph) + 0.08 * np.sin(3 * ph)
    env = np.clip(np.minimum(t / 0.5, (dur - t) / 0.5), 0, 1)
    return s / (3 * len(notes)) * env


def bass(f, dur=0.3):
    """Round, punchy synth bass."""
    t = tt(dur + 0.05)
    s = np.sin(2 * np.pi * f * t) + 0.45 * np.sin(4 * np.pi * f * t) * np.exp(-t / 0.06) + 0.15 * np.sin(6 * np.pi * f * t) * np.exp(-t / 0.03)
    env = np.minimum(1, t / 0.004) * np.exp(-t / 0.45)
    rel = np.clip((dur + 0.05 - t) / 0.05, 0, 1)
    return s * env * rel


def kick():
    t = tt(0.4)
    f = 50 + 110 * np.exp(-t / 0.03)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16)
    click = band(noise(0.4), 2000, 8000) * np.exp(-t / 0.003) * 0.3
    return body + click


def snare():
    t = tt(0.25)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05)
    rattle = band(noise(0.25), 1500, 9000) * np.exp(-t / 0.07)
    return 0.6 * tone + 0.8 * rattle


def clap():
    t = tt(0.2)
    x = band(noise(0.2), 900, 6000)
    e = np.exp(-t / 0.06)
    for d in (0.0, 0.01, 0.02):
        i = int(d * SR)
        e[i:] += 0.7 * np.exp(-(t[: len(t) - i]) / 0.006)
    return x * e


def hat(open_=False):
    d = 0.25 if open_ else 0.05
    t = tt(d)
    return band(noise(d), 7000, 14000) * np.exp(-t / (0.09 if open_ else 0.013)) * np.minimum(1, t / 0.001)


def crash():
    t = tt(2.0)
    return band(noise(2.0), 3000, 14000) * np.exp(-t / 0.7)


def riser(dur):
    t = tt(dur)
    x = band(noise(dur), 1500, 9000)
    return x * (t / dur) ** 2.5


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
# 16th-step patterns (0-15) per section
EP_COMP = [(0, .35), (3, .25), (6, .6), (10, .25), (12, .5)]          # funky syncopated chords
BASS_LINE = [(0, 0, .35), (3, 12, .15), (6, 0, .2), (8, 7, .3), (10, 0, .15), (11, 12, .15), (14, 10, .2)]


def drums(mix, t0, style):
    if style == "intro":
        for s in range(0, 16, 2):
            mix.add(at(t0, s), hat(), .10 if s % 4 else .16, pan=.35)
        mix.add(at(t0, 4), clap(), .18)
        mix.add(at(t0, 12), clap(), .18)
        return
    kicks = {"verse": [0, 7, 10], "chorus": [0, 6, 8, 11], "peak": [0, 4, 6, 8, 11, 12]}[style]
    for s in kicks:
        mix.add(at(t0, s), kick(), .62)
    for s in (4, 12):
        mix.add(at(t0, s), snare(), .30)
        mix.add(at(t0, s), clap(), .20)
    if style != "verse":
        mix.add(at(t0, 15), snare(), .07)  # ghost note
    for s in range(16):
        accent = .10 if s % 4 == 2 else (.055 if s % 2 else .04)
        mix.add(at(t0, s), hat(open_=(style == "peak" and s in (6, 14))), accent * (1.6 if style == "peak" and s in (6, 14) else 1), pan=.35)


def play_bar(mix, t0, mood, chord, gbar, first, last, ring=4.5):
    root = chord[0] - 12
    if mood == "intro":
        # EP chords + light groove building up to the verse
        for s, d in EP_COMP[:3] if first else EP_COMP:
            for n in chord:
                mix.add(at(t0, s), ep(hz(n + 12), d), .07, pan=-.15)
        if not first:
            drums(mix, t0, "intro")
            for s, iv, d in BASS_LINE[:3]:
                mix.add(at(t0, s), bass(hz(root + iv), d), .22)
        if last:
            mix.add(t0, riser(BAR), .16)
            for s in range(8, 16):
                mix.add(at(t0, s), snare(), .05 + .02 * (s - 8))
        return
    if mood == "resolve":
        mix.add(t0, crash(), .22)
        mix.add(t0, kick(), .6)
        for i, n in enumerate(chord + [chord[0] + 12]):
            mix.add(t0 + i * 0.05, ep(hz(n + 12), ring), .09, pan=(i - 2) * .12)
        mix.add(t0, bass(hz(root), 3.0), .35)
        mix.add(t0 + 0.2, bell(hz(chord[0] + 36), 3.5), .14)
        mix.add(t0, pad([n + 12 for n in chord], ring + .5), .12)
        return

    # verse / chorus / peak: full band
    style = {"verse": "verse", "lift": "chorus", "chorus": "chorus", "peak": "peak"}[mood]
    drums(mix, t0, style)
    for s, d in EP_COMP:
        for n in chord:
            mix.add(at(t0, s), ep(hz(n + 12), d), .075, pan=-.2)
    for s, iv, d in BASS_LINE:
        mix.add(at(t0, s), bass(hz(root + iv), d), .34)
    if first and mood in ("lift", "chorus", "peak"):
        mix.add(t0, crash(), .20 if mood != "chorus" else .12)
    if mood in ("lift", "peak") or (mood == "chorus" and gbar % 8 < 4):
        phrase = HOOK[gbar % 4]
        for i, (s, m) in enumerate(phrase):
            nxt = phrase[i + 1][0] if i + 1 < len(phrase) else 16
            d = min((nxt - s) * STEP * 0.9, 0.45)
            up = 12 if mood == "peak" else 0
            mix.add(at(t0, s), lead(hz(m + up), d), .13, pan=.2)
            if mood == "peak":
                mix.add(at(t0, s), lead(hz(m), d), .06, pan=-.2)
    elif mood == "chorus":
        # answer bars: EP fills an octave up instead of the hook
        for s in (2, 7, 13):
            mix.add(at(t0, s), ep(hz(chord[(s // 5) % 4] + 24), .2), .07, pan=.3)
    if mood == "peak":
        mix.add(t0, pad([n + 12 for n in chord], BAR + .2), .12)
    if last and mood == "verse":
        mix.add(t0, riser(BAR), .2)
        for s in range(12, 16):
            mix.add(at(t0, s), snare(), .12)


def render(name, out):
    tl = TIMELINES[name]
    duration = sum(d for _, d, _ in tl)
    mix = Mix(duration)
    t_scene = 0.0
    for scene, dur, mood in tl:
        progression = VERSE if mood in ("intro", "verse") else CHORUS
        nbars = int(round(dur / BAR))
        for b in range(nbars):
            t0 = t_scene + b * BAR
            gbar = int(round(t0 / BAR))
            if mood == "resolve":
                if b == 0:
                    play_bar(mix, t0, mood, CHORUS[0], gbar, True, True, ring=dur)
                continue
            play_bar(mix, t0, mood, progression[gbar % 4], gbar, b == 0, b == nbars - 1)
        if t_scene > 0:
            mix.add(t_scene - 0.45, sfx("whoosh", 0.5), .18)
        for cue in CUES[scene]:
            t, kind = cue[0], cue[1]
            s = sfx(kind, cue[2]) if len(cue) > 2 else sfx(kind)
            mix.add(t_scene + t, s, SFX_GAIN[kind])
        t_scene += dur

    out_buf = mix.buf[: int(duration * SR)]
    n = len(out_buf)
    fade = np.clip((n - np.arange(n)) / (0.6 * SR), 0, 1)[:, None] * np.minimum(1, np.arange(n) / (0.05 * SR))[:, None]
    out_buf = np.tanh(1.3 * norm(out_buf) * fade) * 0.9  # gentle saturation = glue
    with wave.open(out, "wb") as f:
        f.setnchannels(2)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes((out_buf * 32767).astype("<i2").tobytes())


if __name__ == "__main__":
    render(sys.argv[1], sys.argv[2])
