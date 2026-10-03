"""TECTONIC — original song for the dodge game (theme: heavy bass / earthquake).
140 BPM heavy dubstep in F Phrygian dominant (F Gb A Bb C Db Eb: dark, a little Middle-Eastern);
the second drop switches to a double-time drum & bass section.
Beat 0 at t = 0.5 s; 1 beat = 60/140 s (about 0.43 s); 1 bar = about 1.71 s.

Every sound here is made for this song only, so it does not sound like the other songs:
  throat singing  — a low buzzing drone with a whistling overtone melody on top (Tuvan khoomei style).
                    The melody can only use the drone's harmonics (8 = F5, 9 = G5, 10 = A5, 12 = C6 ...).
  grind bass      — the "growl" of this song: pitched noise in a resonating comb (sounds like stone grinding on stone),
                    plus a square wave, ring-modulated and bit-crushed by the same LFO that opens its resonant filter
  808 boom kick   — a long, sliding sine boom with a stone-thud attack (no click)
  anvil snare     — metal partials that clang, with a short burst of noise
  gravel shaker   — hats made of hundreds of tiny random clicks (pebbles rattling)
  stone marimba   — a lithophone: inharmonic stone bars with a dry thump (the arpeggio)
  bowed saw       — a bowed metal lead with a slow, wide vibrato (the hook)
  BRAAM           — a huge cinematic brass blast (drops, the end of each build)
  rock collapse   — an impact made of a sub boom and a shower of falling rocks
Writes tectonic.wav and score.json (beat times for the chart).

Run:  python3 tectonic-compose.py      (needs numpy + scipy)
Then: ffmpeg -i tectonic.wav -b:a 192k Tectonic.mp3, and copy score.json into songs/tectonic-score.js.
Form (bars): rumble 0-8 / build 8-16 / DROP 16-32 / aftershock (throat-singing break) 32-40 / build 40-48 /
DROP 2 48-56 / double-time 56-64 / collapse (outro) 64-68.
"""
import json
import numpy as np
from scipy import signal

SR = 44100
BPM = 140
BEAT = 60 / BPM
T0 = 0.5
BARS = 68
N = int((T0 + BARS * 4 * BEAT + 6.0) * SR)
rng = np.random.default_rng(5150)

def bt(b): return T0 + b * BEAT
def bar(k): return bt(k * 4)
def mtof(m): return 440.0 * 2 ** ((np.asarray(m, float) - 69) / 12)
def ftom(f): return 69 + 12 * np.log2(f / 440.0)
NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
def midi(n): return 12 * (int(n[-1]) + 1) + NOTE[n[:-1]]

class Bus:
    def __init__(self):
        self.L = np.zeros(N, np.float32); self.R = np.zeros(N, np.float32)
    def add(self, t, sig, gain=1.0, pan=0.0):
        i = int(round(t * SR))
        if i >= N or len(sig) == 0: return
        if i < 0: sig = sig[-i:]; i = 0
        n = min(len(sig), N - i)
        self.L[i:i + n] += (sig[:n] * gain * np.cos((pan + 1) * np.pi / 4) * np.sqrt(2)).astype(np.float32)
        self.R[i:i + n] += (sig[:n] * gain * np.sin((pan + 1) * np.pi / 4) * np.sqrt(2)).astype(np.float32)
    def stereo(self): return np.vstack([self.L, self.R])

drums, snareb, sub, bass, voice, lead, fxb = (Bus() for _ in range(7))

# ---- tools -------------------------------------------------------------------------------
def tvec(d): return np.arange(int(d * SR)) / SR
def noise(d): return rng.standard_normal(int(d * SR))
def lp(x, fc, o=2): return signal.sosfilt(signal.butter(o, min(fc, SR * 0.45), 'low', fs=SR, output='sos'), x)
def hp(x, fc, o=2): return signal.sosfilt(signal.butter(o, fc, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=2): return signal.sosfilt(signal.butter(o, [lo, min(hi, SR * 0.45)], 'band', fs=SR, output='sos'), x)
def env(dur, a=0.004, r=0.04):
    tt = tvec(dur)
    return np.minimum(1, tt / max(a, 1e-4)) * np.clip((dur - tt) / max(r, 1e-4), 0, 1)
def phase(f, n): return np.cumsum(np.broadcast_to(np.asarray(f, float), (n,))) / SR

def tv_filter(x, fc, q, kind='low', blk=64):
    """resonant RBJ biquad whose cutoff follows the array fc (Hz, one value per sample)"""
    out = np.empty_like(x); zi = np.zeros((1, 2))
    for i in range(0, len(x), blk):
        f = float(np.clip(fc[min(i, len(fc) - 1)], 30, SR * 0.42))
        w0 = 2 * np.pi * f / SR; al = np.sin(w0) / (2 * q); c = np.cos(w0)
        b = [(1 - c) / 2, 1 - c, (1 - c) / 2] if kind == 'low' else [al, 0, -al]
        a0 = 1 + al
        sos = np.array([[b[0] / a0, b[1] / a0, b[2] / a0, 1, -2 * c / a0, (1 - al) / a0]])
        out[i:i + blk], zi = signal.sosfilt(sos, x[i:i + blk], zi=zi)
    return out

def bend(make, f0, n, semis):
    """render make(f0, length) and read it faster / slower so the pitch follows `semis` (array, semitones)"""
    r = 2 ** (np.asarray(semis, float) / 12)
    pos = np.cumsum(r)
    base = make(f0, int(pos[-1]) + 4)
    return np.interp(pos, np.arange(len(base)), base)

def crush(x, hold):
    """sample-rate reduction; hold (samples, array) can change over time"""
    step = np.floor(np.cumsum(1.0 / np.maximum(1.0, hold)))
    inc = np.r_[True, np.diff(step) > 0]
    idx = np.maximum.accumulate(np.where(inc, np.arange(len(x)), 0))
    return x[idx]

def glottal(f, n, bright=0.8, jitter=0.004):
    """a buzzing voice source: a band-limited pulse train (harmonics falling off like a real voice)"""
    vib = 1 + jitter * np.sin(2 * np.pi * 5.1 * np.arange(n) / SR) + jitter * 10 * lp(rng.standard_normal(n), 8)
    ph = 2 * np.pi * phase(f * vib, n)
    s = np.zeros(n)
    for h in range(1, int(min(60, 8000 / f))):
        s += np.sin(h * ph) / h ** bright
    return s / 4

# ---- the sounds of this song --------------------------------------------------------------
def throat(f0, dur, harm_track=None, whistle=1.0):
    """throat singing: drone at f0 through a nasal formant + a very narrow resonance that picks out one harmonic
       (harm_track = harmonic number per sample; it glides, so the whistle melody slides like a real singer)"""
    n = int(dur * SR)
    src = glottal(f0, n, 0.7)
    out = 0.9 * tv_filter(src, np.full(n, 420.0), 2.5, 'band') + 0.5 * tv_filter(src, np.full(n, 1150.0), 4, 'band') + 0.25 * lp(src, 250)
    if harm_track is not None:
        out = out + whistle * 3.0 * tv_filter(src, harm_track * f0, 45, 'band')
    return np.tanh(1.5 * out) * env(dur, 0.25, 0.4)

def grind_src(f, n):
    """pitched noise in a comb (Karplus-Strong loop driven by noise): a gritty, stony tone"""
    P = max(2, int(round(SR / f)))
    a = np.zeros(P + 2); a[0] = 1; a[P] = -0.497; a[P + 1] = -0.497
    g = signal.lfilter([1.0], a, rng.standard_normal(n))
    g /= (np.std(g) + 1e-9)
    sq = np.sign(np.sin(2 * np.pi * f * np.arange(n) / SR))
    return 0.45 * g + 0.7 * sq

def lfo_for(shape, tt, dur, rate):
    u = tt / max(dur, 1e-3)
    if shape == 'wob':   return 0.5 - 0.5 * np.cos(2 * np.pi * tt / (rate * BEAT))
    if shape == 'yoi':   return np.sin(np.pi * np.clip(u * 1.1, 0, 1)) ** 0.6
    if shape == 'wow':   return np.clip(u * 4, 0, 1) * (1 - 0.7 * u)
    if shape == 'up':    return u ** 0.7
    if shape == 'down':  return (1 - u) ** 1.2
    if shape == 'stab':  return np.exp(-tt / 0.06) * 0.85 + 0.15
    if shape == 'stut':  return ((tt / (rate * BEAT)) % 1.0 < 0.5) * 0.9 + 0.05
    if shape == 'dive':  return 0.95 - 0.6 * u
    if shape == 'screech': return 0.8 + 0.2 * np.sin(2 * np.pi * 11 * tt)
    return np.full_like(tt, 0.5)

def grind(m, dur, shape='wob', rate=0.5):
    """the bass of this song. One LFO opens a resonant filter, adds a metallic ring (x1.5 ring modulation)
       and crushes the sample rate when it is closed — so it rasps instead of 'talking' like an FM growl"""
    n = int(dur * SR); tt = np.arange(n) / SR
    lfo = lfo_for(shape, tt, dur, rate)
    semis = np.zeros(n)
    if shape == 'dive':    semis = -26 * (tt / dur) ** 1.6
    if shape == 'yoi':     semis = -7 * np.exp(-tt / 0.05)
    if shape == 'up':      semis = -12 + 12 * np.clip(tt / (dur * 0.6), 0, 1)
    if shape == 'screech': semis = 24 + 2 * np.exp(-tt / 0.06) + 0.6 * np.sin(2 * np.pi * 9 * tt)
    f = float(mtof(m))
    x = bend(grind_src, f, n, semis)
    ring = x * np.sin(2 * np.pi * phase(f * 1.5 * 2 ** (semis / 12), n))
    x = x * (1 - 0.6 * lfo) + ring * 0.9 * lfo
    y = tv_filter(x, 140 + 4600 * lfo ** 1.6, 6.5 if shape != 'screech' else 9)
    y = crush(y, 1 + 5 * (1 - lfo) ** 2)
    y = np.tanh(3.0 * y)
    y = hp(y, 90, 3)
    return y * env(dur, 0.003, 0.02)

def sub_tone(m, dur, glide_from=None, a=0.004, r=0.03):
    """808-style sub: pure sine, sliding into the note when glide_from is given"""
    n = int(dur * SR); tt = np.arange(n) / SR
    f = float(mtof(m))
    while f > 70: f /= 2
    if glide_from is not None:
        f0 = float(mtof(glide_from))
        while f0 > 70: f0 /= 2
        fr = f0 * (f / f0) ** np.clip(tt / 0.07, 0, 1)
    else: fr = np.full(n, f)
    return np.tanh(1.8 * np.sin(2 * np.pi * phase(fr, n))) * 0.85 * env(dur, a, r)

def kick808(g=1.0, dur=0.7, m=29):
    """long sliding boom + the thud of a stone (low-passed noise), no click"""
    tt = tvec(dur); f = float(mtof(m))
    fr = f + f * 3 * np.exp(-tt / 0.035)
    body = np.sin(2 * np.pi * phase(fr, len(tt))) * np.exp(-tt / (dur * 0.5))
    thud = lp(noise(dur), 260, 4) * np.exp(-tt / 0.018) * 4
    return np.tanh(2.0 * body + thud) * g

def anvil(g=1.0):
    """anvil snare: inharmonic metal partials that ring, a short noise burst and a low body"""
    d = 0.5; tt = tvec(d)
    metal = sum(a * np.sin(2 * np.pi * f * tt + rng.random() * 6) * np.exp(-tt / dec)
                for f, a, dec in [(523, 1.0, 0.16), (1187, 0.8, 0.12), (1931, 0.6, 0.09), (2711, 0.5, 0.07), (3517, 0.35, 0.05)])
    nz = bp(noise(d), 1800, 7000) * np.exp(-tt / 0.06)
    body = np.sin(2 * np.pi * phase(160 + 90 * np.exp(-tt / 0.01), len(tt))) * np.exp(-tt / 0.06)
    return np.tanh(1.6 * (0.55 * metal + 1.1 * nz + 0.9 * body)) * g

def gravel(d=0.09, dens=4000):
    """a shake of gravel: lots of tiny clicks of random loudness"""
    n = int(d * SR)
    clicks = (rng.random(n) < dens / SR) * rng.standard_normal(n) * 3
    s = bp(clicks + 0.15 * rng.standard_normal(n), 2500, 11000)
    return s * np.sin(np.pi * np.arange(n) / n) ** 0.5

def stone(m, dur=0.6):
    """stone marimba (lithophone): partials 1 : 3.93 : 9.1 that die fast, and a dry thump"""
    tt = tvec(dur); f = float(mtof(m))
    s = (np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.22) + 0.5 * np.sin(2 * np.pi * f * 3.93 * tt) * np.exp(-tt / 0.05)
         + 0.25 * np.sin(2 * np.pi * f * 9.1 * tt) * np.exp(-tt / 0.015))
    thump = bp(noise(dur), f * 0.8, f * 2.5) * np.exp(-tt / 0.008) * 0.8
    return (s + thump) * env(dur, 0.001, 0.08)

def bowed_saw(m, dur):
    """bowed metal (a musical saw / a bowed sheet): a soft saw with a slow wide vibrato and metal resonances"""
    tt = tvec(dur); n = len(tt); f0 = float(mtof(m))
    vib = 0.35 * np.sin(2 * np.pi * 4.6 * tt) * np.clip((tt - 0.1) / 0.25, 0, 1)
    scoop = -1.5 * np.exp(-tt / 0.06)
    f = f0 * 2 ** ((vib + scoop) / 12)
    ph = phase(f, n)
    src = 2 * (ph % 1.0) - 1
    body = sum(tv_filter(src, np.full(n, f0 * r), 18, 'band') * a for r, a in [(1.0, 1.0), (2.0, 0.6), (2.9, 0.45), (4.7, 0.3)])
    bow = bp(rng.standard_normal(n), f0 * 1.8, f0 * 6) * 0.06
    return np.tanh(1.4 * (body + bow)) * env(dur, 0.09, 0.15)

def braam(ms, dur=2.6, swell=0.25):
    """cinematic brass blast: low saws and squares; the filter blares open, then closes; distorted"""
    n = int(dur * SR); tt = np.arange(n) / SR; s = np.zeros(n)
    for m in ms:
        f = float(mtof(m))
        for d in (-0.08, 0.08):
            ph = phase(f * 2 ** (d / 12) * (1 + 0.002 * np.sin(2 * np.pi * 5 * tt)), n)
            s += (2 * (ph % 1.0) - 1) + 0.6 * np.sign(np.sin(2 * np.pi * ph))
    s /= 3 * len(ms)
    fc = 150 + 2600 * np.clip(tt / swell, 0, 1) ** 2 * np.exp(-np.clip(tt - swell, 0, None) / 0.7)
    y = np.tanh(3 * tv_filter(s, fc, 1.5))
    return y * env(dur, 0.04, 0.8)

def collapse(d=3.2):
    """impact: a falling sub boom + a shower of rocks (random low clicks that thin out)"""
    tt = tvec(d); n = len(tt)
    boom = np.sin(2 * np.pi * phase(26 + 80 * np.exp(-tt / 0.15), n)) * np.exp(-tt / 1.1)
    rate = 2500 * np.exp(-tt / 0.5)
    rocks = (rng.random(n) < rate / SR) * rng.standard_normal(n) * 6
    rocks = lp(rocks, 1800) + 0.4 * bp(rocks, 1800, 6000)
    thud = lp(noise(d), 300) * np.exp(-tt / 0.1) * 3
    return np.tanh(1.5 * (1.5 * boom + thud + rocks * np.exp(-tt / 1.4)))

def subdrop(d=2.0):
    tt = tvec(d)
    return np.tanh(1.5 * np.sin(2 * np.pi * phase(90 * (28 / 90) ** (tt / d), len(tt)))) * np.minimum(1, tt / 0.01) * np.clip((d - tt) / 0.3, 0, 1)

def grind_riser(d):
    """the build: grinding stone that rises two octaves, with a rattle that gets faster and faster"""
    n = int(d * SR); tt = np.arange(n) / SR; u = tt / d
    x = bend(grind_src, float(mtof(41)), n, 24 * u ** 1.5)
    x = tv_filter(x, 300 + 6000 * u ** 2, 3)
    trem = 0.6 + 0.4 * np.sin(2 * np.pi * phase(2 + 30 * u ** 2, n))
    return np.tanh(2 * x) * trem * u ** 1.5

def downlifter(d=2.0):
    n = int(d * SR); tt = np.arange(n) / SR; u = tt / d
    x = bend(grind_src, float(mtof(65)), n, -30 * u)
    return tv_filter(x, 6000 * (1 - u) + 200, 2) * (1 - u) ** 2 * 0.5

# ---- the score ---------------------------------------------------------------------------------------
score = {'kick': [], 'snare': [], 'growl': [], 'reese': [], 'impact': [], 'subdrop': [], 'hook': [], 'arp': [], 'roll': [], 'siren': [], 'crash': []}
def K(b, g=1.0, dur=0.7, m=29): drums.add(bt(b), kick808(g, dur, m), 0.6); score['kick'].append(b)
def S(b, g=1.0, mark=True):
    snareb.add(bt(b), anvil(), 0.32 * g, 0.05)
    if mark: score['snare'].append(b)
def HH(b, g=1.0, long=False): drums.add(bt(b), gravel(0.2 if long else 0.08, 6000 if long else 3500), 0.07 * g, 0.4 if (b * 2) % 2 else -0.4)
def CR(b, g=1.0): fxb.add(bt(b), braam([29, 41, 48, 53], 2.6), 0.2 * g); score['crash'].append(b)
def IMP(b, g=1.0): fxb.add(bt(b), collapse(), 0.6 * g); score['impact'].append(b)
def SD(b, d=2.0): sub.add(bt(b), subdrop(d), 0.5); score['subdrop'].append(b)

F2 = midi('F2')
last_sub = [None]
def G(b, L, off, shape='wob', rate=0.5, g=1.0, subon=True):
    m = F2 + off
    bass.add(bt(b), grind(m, L * BEAT, shape, rate), 0.36 * g)
    if subon and shape != 'screech':
        sub.add(bt(b), sub_tone(m, (L if shape != 'dive' else min(L, 0.5)) * BEAT, last_sub[0]), 0.42 * g)
        last_sub[0] = m
    score['growl'].append([b, L, off, shape, round(rate, 4)])

# F – Gb – Ebm – F   (I – bII – vii – I in F Phrygian dominant); roots for the sub
ROOT = {'F': 29, 'Gb': 30, 'Ebm': 27}
PROG = ['F', 'Gb', 'Ebm', 'F']
def root_at(k): return ROOT[PROG[k % 4]]
CHORD_TONES = {'F': [53, 57, 60, 65], 'Gb': [54, 58, 61, 66], 'Ebm': [51, 54, 58, 63]}
def tones_at(k): return CHORD_TONES[PROG[k % 4]]

def parse(lines, start_bar):
    notes, cur = [], None
    for bi, line in enumerate(lines):
        toks = line.split(); assert len(toks) == 8, line
        for kk, tok in enumerate(toks):
            b = (start_bar + bi) * 4 + kk * 0.5
            if tok == '-':
                if cur: cur[1] += 0.5
                continue
            if cur: notes.append(tuple(cur)); cur = None
            if tok == '.': continue
            cur = [b, 0.5, tok]
    if cur: notes.append(tuple(cur))
    return notes

# the hook (bowed saw): Phrygian dominant — the half step F→Gb and the fall to A give it its face
HOOK = ['F4 . Gb4 F4 . . C5 .', 'Db5 - C5 . A4 . Gb4 -', 'F4 . Gb4 F4 . . Eb5 .', 'Db5 C5 Bb4 A4 Gb4 - F4 -']
# the throat-singing melody: harmonic numbers over the F2 drone (8 = F5, 9 = G5, 10 = A5, 12 = C6, 7 = a low Eb5)
OVERTONE = ['8 - - 9 - 10 - -', '12 - 10 - 9 - 8 -', '8 - - 9 - 10 - 12', '10 - - - 9 8 7 -']

# drop phrases: (beat in bar, length in beats, semitones above F2, shape, rate). 3+3+2 rhythm (dotted 8ths)
PA = [(0, 0.75, 0, 'wow'), (0.75, 0.75, 1, 'yoi'), (1.5, 0.5, 0, 'stab'), (2, 1, 4, 'wob', 1 / 3), (3, 0.5, 1, 'down'), (3.5, 0.5, 0, 'stut', 1 / 8)]
PB = [(0, 0.75, 0, 'yoi'), (0.75, 0.75, 1, 'yoi'), (1.5, 0.5, 4, 'stab'), (2, 1, 0, 'wob', 0.25), (3, 1, -4, 'up')]
PC = [(0, 1.5, 0, 'wow'), (1.5, 0.5, 8, 'stab'), (2, 0.75, 7, 'yoi'), (2.75, 0.75, 1, 'down'), (3.5, 0.5, 0, 'stab')]
PD = [(0, 0.75, 0, 'stut', 1 / 6), (0.75, 0.75, 1, 'yoi'), (1.5, 0.5, 4, 'stab'), (2, 2, 0, 'dive')]
QA = [(0, 0.5, 0, 'yoi'), (0.5, 0.25, 0, 'stab'), (0.75, 0.75, 1, 'stut', 1 / 8), (1.5, 0.5, 0, 'stab'), (2, 1, 0, 'wob', 1 / 6), (3, 0.5, 1, 'screech'), (3.5, 0.5, 0, 'screech')]
QB = [(0, 1, 0, 'wow'), (1, 0.5, 1, 'yoi'), (1.5, 0.5, 4, 'down'), (2, 1, -2, 'wob', 0.25), (3, 1, 1, 'up')]
QC = [(0, 0.75, 0, 'yoi'), (0.75, 0.75, 1, 'yoi'), (1.5, 0.5, 0, 'stab'), (2, 1, 7, 'wob', 1 / 3), (3, 0.5, 8, 'screech'), (3.5, 0.5, 7, 'down')]
QD = [(0, 0.5, 0, 'stab'), (0.5, 0.5, 1, 'stab'), (1, 0.5, 4, 'screech'), (1.5, 0.5, 1, 'screech'), (2, 2, 0, 'dive')]

def drop_drums(k, fill):
    B = k * 4
    K(B, 1.0, 0.9); K(B + 0.75, 0.7, 0.5)
    S(B + 2)
    if k % 2 == 1: K(B + 2.75, 0.8, 0.5)
    for h in range(8): HH(B + h * 0.5 + 0.25, 0.8, long=(h % 4 == 3))
    if fill:
        for i, h in enumerate((3, 3.25, 3.5, 3.75)): S(B + h, 0.45 + 0.15 * i)

def dnb_drums(k):
    B = k * 4
    K(B, 1.0, 0.35); K(B + 2.5, 0.9, 0.35)
    S(B + 1); S(B + 3)
    for h in range(16): HH(B + h * 0.25, 0.5 + 0.4 * (h % 2), long=(h % 8 == 6))
    if k % 2 == 1: K(B + 1.75, 0.6, 0.3)
    if k % 4 == 3:
        for h in (3.5, 3.75): S(B + h, 0.6)

def throat_phrase(k0, nbars, lines=None, f0m=41, gain=0.2, whistle=1.0):
    """one throat singer for nbars bars; lines = the overtone melody (or None for just the drone)"""
    dur = nbars * 4 * BEAT + 0.6; n = int(dur * SR)
    track = None
    if lines:
        cur = float(lines[0].split()[0]); vals = []
        for li in range(nbars):
            for tok in lines[li % len(lines)].split():
                if tok not in '-.': cur = float(tok)
                vals.append(cur)
        step = 0.5 * BEAT * SR
        idx = np.minimum((np.arange(n) / step).astype(int), len(vals) - 1)
        steps = np.asarray(vals)[idx]
        track = signal.lfilter([1 - 0.9985], [1, -0.9985], steps - steps[0]) + steps[0]     # glide between harmonics
        for li in range(nbars):                                  # the overtone melody goes into the score
            for kk, tok in enumerate(lines[li % len(lines)].split()):
                if tok not in '-.':
                    b = (k0 + li) * 4 + kk * 0.5
                    score['hook'].append([b, 0.5, round(float(ftom(float(mtof(f0m)) * float(tok))), 2)])
    voice.add(bar(k0), throat(float(mtof(f0m)), dur, track, whistle), gain)

# ---- rumble 0-8: throat drone, a singer from bar 4, BRAAM at 0 and 4, stone marimba from bar 6
throat_phrase(0, 4, None, 41, 0.16)
throat_phrase(4, 4, OVERTONE, 41, 0.2)
IMP(0, 0.6); fxb.add(bar(0), braam([29, 41], 3.5, 0.6), 0.16)
IMP(16, 0.7); fxb.add(bar(4), braam([29, 41, 48], 3.0, 0.4), 0.2)
for k in range(6, 8):
    for h in range(8):
        m = tones_at(k)[(0, 2, 1, 3, 2, 1, 3, 0)[h]] - 12
        lead.add(bt(k * 4 + h * 0.5), stone(m), 0.13, -0.3 + 0.6 * (h % 2))
for k in range(0, 8):
    sub.add(bar(k), sub_tone(root_at(k) + 12, 4 * BEAT, None, 0.8, 0.8), 0.14)

for k in range(8, BARS):
    B = k * 4
    # ---- builds 8-16 and 40-48: 808 + anvil, stone marimba in 16ths, the bowed-saw hook, a grinding bass line
    if 8 <= k < 16 or 40 <= k < 48:
        late = k in (14, 15, 46, 47)
        if not late:
            K(B, 0.9); K(B + 1.5, 0.6, 0.4); S(B + 2)
            if k % 2: K(B + 2.75, 0.7, 0.4)
            for h in range(8): HH(B + h * 0.5 + 0.25, 0.7, long=(h % 2 == 1))
            rm = root_at(k) + 12
            for h, L in ((0, 1.5), (1.5, 1), (2.5, 1.5)):
                bass.add(bt(B + h), grind(rm + (1 if h == 1.5 else 0), L * BEAT, 'stab' if h else 'wow'), 0.2)
                sub.add(bt(B + h), sub_tone(rm, L * BEAT), 0.24)
                score['reese'].append([B + h, L, rm])
        for h in range(16):                                                      # 16th stone marimba
            m = tones_at(k)[(0, 1, 2, 3, 2, 1, 0, 2)[h % 8]] - 12 + (12 if k % 8 >= 4 and h % 4 == 3 else 0)
            lead.add(bt(B + h * 0.25), stone(m, 0.4), 0.1, -0.4 + 0.8 * ((h * 5 % 16) / 15))
            score['arp'].append([B + h * 0.25, m])
        if late:                                                                  # anvil roll that speeds up
            per = {14: 0.5, 15: 0.25, 46: 0.5, 47: 0.25}[k]
            if k in (15, 47):
                for i in range(int(2 / per)): S(B + i * per, 0.5 + 0.25 * i * per / 2, False); score['roll'].append(B + i * per)
                for i in range(16): S(B + 2 + i * 0.125, 0.7 + 0.3 * i / 16, False); score['roll'].append(B + 2 + i * 0.125)
            else:
                for i in range(int(4 / per)): S(B + i * per, 0.4 + 0.3 * i * per / 4, False); score['roll'].append(B + i * per)
            K(B, 0.8)
    if k in (14, 46): fxb.add(bar(k), grind_riser(8 * BEAT), 0.16)
    if k in (15, 47):                                                              # a BRAAM swell before the drop
        fxb.add(bt(B + 1), braam([29, 41, 48, 54], 2.6 * BEAT, 2.4 * BEAT), 0.18); score['siren'].append(B + 1)
    # ---- drops 16-32 and 48-56 (half-time)
    if 16 <= k < 32 or 48 <= k < 56:
        j = (k - 16) if k < 32 else (k - 48)
        pats = [PA, PB, PC, PD] if k < 32 else [QA, QB, QC, QD]
        pat = pats[j % 4]
        if k < 32 and j >= 8 and j % 4 == 2: pat = PA
        last = (k == 31)
        drop_drums(k, fill=(j % 4 == 3))
        for p in pat:
            if last and p[0] >= 2: continue
            G(B + p[0], p[1], p[2], p[3], p[4] if len(p) > 4 else 0.5, 1.0)
        if j % 8 == 0: CR(B)
    if k in (16, 48): IMP(B, 1.0); SD(B - 1, 1 * BEAT)
    if k == 31: fxb.add(bt(B + 2), downlifter(2 * BEAT), 0.2); score['subdrop'].append(B + 2); sub.add(bt(B + 2), subdrop(2 * BEAT), 0.5)
    # ---- aftershock 32-40: two throat singers (drone + melody), a heartbeat of 808s
    if k == 32:
        IMP(B, 0.7)
        throat_phrase(32, 8, None, 41, 0.15)
        throat_phrase(32, 4, None, 48, 0.07)                                         # a second singer a fifth up
        throat_phrase(36, 4, OVERTONE, 41, 0.22, 1.2)
    if 34 <= k < 40:
        K(B, 0.65, 0.8); K(B + 0.75, 0.4, 0.5)
    if 32 <= k < 40: sub.add(bar(k), sub_tone(root_at(k) + 12, 4 * BEAT, None, 0.5, 0.6), 0.16)
    # ---- double time 56-64: rolling grind bass in 16ths, gravel hats, BRAAM stabs
    if 56 <= k < 64:
        dnb_drums(k)
        line = [0, 0, 1, 0, 4, 0, 1, 0, 7, 8, 7, 4, 1, 0, -2, 0] if k % 2 == 0 else [0, 0, 1, 0, 4, 0, 8, 7, 0, 0, -4, -2, 0, 1, 4, 7]
        prev = None
        for h in range(16):
            m = F2 + line[h]
            if h % 4 == 3 and k % 4 == 3: continue
            bass.add(bt(B + h * 0.25), grind(m, 0.25 * BEAT + 0.01, 'stab'), 0.3)
            sub.add(bt(B + h * 0.25), sub_tone(m, 0.25 * BEAT, prev), 0.36); prev = m
            score['reese'].append([B + h * 0.25, 0.25, m])
        for h in (0.5, 2.75):
            off = (12, 13)[int(h) % 2]
            bass.add(bt(B + h), grind(F2 + off, 0.25 * BEAT, 'screech'), 0.16)
            score['growl'].append([B + h, 0.25, off, 'stab', 0])
        if k in (56, 60): fxb.add(bar(k), braam([29, 41, 48, 53], 1.5), 0.17)
        if k == 56: IMP(B, 0.9); score['crash'].append(B)
        if k == 60: score['crash'].append(B)
    # ---- collapse 64-68
    if k == 64:
        IMP(B, 1.2); fxb.add(bar(64), braam([29, 41, 48, 53], 5.0, 0.3), 0.26); score['crash'].append(B)
        K(B, 1.2, 1.4); SD(B + 4, 3.0)
        G(B, 2, 0, 'wow', 0.5, 1.1); G(B + 2, 2, 0, 'dive', 0.5, 1.0)
        throat_phrase(65, 3, None, 41, 0.17)

# the bowed-saw hook: build 1 (from bar 10), drop 1 second half (an octave up, quietly), build 2, the end
hook_notes = parse(HOOK, 10) + parse(HOOK, 24) + parse(HOOK * 2, 40) + parse(HOOK, 64)
for (b, L, tok) in hook_notes:
    up = 24 * 4 <= b < 32 * 4
    m = midi(tok) + (12 if up else 0)
    lead.add(bt(b), bowed_saw(m, L * BEAT + 0.12), 0.05 if up else 0.12, 0.15)
    score['hook'].append([b, L, m])
score['hook'].sort(key=lambda h: h[0])

# ---- mix ---------------------------------------------------------------------------------------------
def duck_curve(beats, depth, tau):
    d = np.ones(N, np.float32)
    for b in beats:
        i = int(bt(b) * SR); n = int(0.3 * SR)
        if i >= N: continue
        seg = 1 - depth * np.exp(-np.arange(min(n, N - i)) / SR / tau)
        d[i:i + len(seg)] = np.minimum(d[i:i + len(seg)], seg)
    return d
dk = duck_curve(score['kick'], 0.85, 0.1)
for bus_ in (sub, voice):
    bus_.L *= dk; bus_.R *= dk
dk2 = duck_curve(score['kick'] + score['snare'], 0.45, 0.06)
bass.L *= dk2; bass.R *= dk2
w = hp(bass.R, 400); bass.R = (bass.R * 0.75 + 0.25 * np.concatenate([np.zeros(int(0.011 * SR)), w[:-int(0.011 * SR)]])).astype(np.float32)
voice.R = np.concatenate([np.zeros(int(0.009 * SR), np.float32), voice.R[:-int(0.009 * SR)]])

def reverb(st, mix, dur=3.4, decay=1.0):
    """a big stone hall"""
    tt = np.arange(int(dur * SR)) / SR
    out = []
    for ch in range(2):
        ir = lp(rng.standard_normal(len(tt)) * np.exp(-tt / decay), 5000); ir[:int(0.03 * SR)] *= 0.2
        ir /= np.sqrt(np.sum(ir ** 2))
        out.append(signal.fftconvolve(st[ch], ir)[:N])
    return np.vstack(out) * mix

dry = drums.stereo() + snareb.stereo() + sub.stereo() * 1.15 + bass.stereo() + voice.stereo() + lead.stereo() + fxb.stereo()
wet = reverb(snareb.stereo() * 0.9 + lead.stereo() + voice.stereo() * 0.9 + fxb.stereo() * 0.4, 0.32)
mix = dry + wet
mix -= np.mean(mix, axis=1, keepdims=True)
lowm = lp((mix[0] + mix[1]) / 2, 120, 4)
mix = np.vstack([hp(mix[0], 120, 4) + lowm, hp(mix[1], 120, 4) + lowm])
# limiter: look 5 ms ahead, pull the gain down fast and let it back up slowly, then a soft clip
mix /= np.max(np.abs(mix))
pk = np.max(np.abs(mix), axis=0)
win = int(0.005 * SR)
pk = np.maximum.reduce([np.roll(pk, -i) for i in range(0, win, 8)])
DRIVE, THR = 3.2, 0.9
g = np.minimum(1, THR / np.maximum(pk * DRIVE, 1e-6))
rel = np.exp(-1 / (0.12 * SR))
g = signal.lfilter([1 - rel], [1, -rel], g[::-1])[::-1]
g = np.minimum(g, np.minimum(1, THR / np.maximum(pk * DRIVE, 1e-6)) * 1.15)
mix = np.tanh(mix * DRIVE * g / THR * 0.9) * THR
endi = int((bar(68) + 0.5) * SR)
mix = mix[:, :endi]
mix[:, -int(3.0 * SR):] *= np.linspace(1, 0, int(3.0 * SR)) ** 1.5
mix *= 0.95 / np.max(np.abs(mix))

from scipy.io import wavfile
wavfile.write('tectonic.wav', SR, (mix.T * 32767).astype(np.int16))
for key in score:
    if isinstance(score[key], list) and score[key] and not isinstance(score[key][0], list): score[key].sort()
score['growl'].sort(key=lambda g: g[0]); score['reese'].sort(key=lambda r: r[0])
score['end'] = round(mix.shape[1] / SR, 2)
json.dump(score, open('score.json', 'w'), default=lambda o: o.item() if hasattr(o, 'item') else o)
print('done', mix.shape[1] / SR)
