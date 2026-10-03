"""ExtremeEX (Remake) — the 3-minute medley version of the hardest song.
200 BPM hardcore in F minor, built on the same "vwoon" synth as the original (songs/extremeex-compose.py),
but every 8 bars it puts on the clothes of another song in the game — the chart does the same with that
song's attacks. Beat 0 at t = 0.5 s; 1 bar = 1.2 s. About 3:02.

Form (bars):
  0 WARNING / 8 EXTREME / 16 FIRST STEP / 24 the EmpErroR / 32 Re:Unknown X / 40 モラトリウム /
  48 segment / 56 Vertigo / 64 CHARGE (build) / 72 Malware (drop) / 80 Abyss (drop) / 88 Ward 13 (break) /
  96 Prism / 104 四季 / 112 Candy Pop Parade / 120 REVERSAL (build) / 128 EXTREME EX (final drop, +1 key) /
  144 LIMIT BREAK / 148 end
Each section has its own flavour on top of the hardcore: pluck arps, chip glitches, fast runs, ticking
clocks and a music box (with a time stop), breaking glass, a wobble bass, a modem, sonar pings,
a heartbeat and drone, trance supersaws, koto and taiko, future-bass chords and bells.

Run:  python3 extremeex-remake-compose.py      (needs numpy + scipy)
Writes extremeex-remake.wav and score-remake.json (the note times used by the chart → songs/extremeex-remake-score.js).
"""
import json
import numpy as np
from scipy import signal

SR = 44100
BPM = 200
BEAT = 60 / BPM            # 0.3 s
T0 = 0.5
BARS = 152
N = int((T0 + BARS * 4 * BEAT + 3.0) * SR)
rng = np.random.default_rng(2026)

def bt(b): return T0 + b * BEAT
def bar(k): return bt(k * 4)
def mtof(m): return 440.0 * 2 ** ((np.asarray(m, float) - 69) / 12)
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

drums, bass, synth, lead, fxb = (Bus() for _ in range(5))

def tvec(d): return np.arange(int(d * SR)) / SR
def noise(d): return rng.standard_normal(int(d * SR))
def lp(x, fc, o=2): return signal.sosfilt(signal.butter(o, min(fc, SR * 0.45), 'low', fs=SR, output='sos'), x)
def hp(x, fc, o=2): return signal.sosfilt(signal.butter(o, fc, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=2): return signal.sosfilt(signal.butter(o, [lo, min(hi, SR * 0.45)], 'band', fs=SR, output='sos'), x)

def polyblep(ph, dt):
    out = np.zeros_like(ph)
    m = ph < dt; x = ph[m] / dt[m]; out[m] = x + x - x * x - 1
    m = ph > 1 - dt; x = (ph[m] - 1) / dt[m]; out[m] = x * x + x + x + 1
    return out
def saw(f, dur):
    n = int(dur * SR)
    f = np.broadcast_to(np.asarray(f, float), (n,)) if np.ndim(f) else np.full(n, float(f))
    dt = f / SR
    ph = (np.cumsum(dt) + rng.random()) % 1.0
    return (2 * ph - 1) - polyblep(ph, dt)
def sine(f, dur):
    n = int(dur * SR)
    f = np.broadcast_to(np.asarray(f, float), (n,)) if np.ndim(f) else np.full(n, float(f))
    return np.sin(2 * np.pi * np.cumsum(f) / SR)
def env(dur, a=0.004, r=0.04):
    tt = tvec(dur)
    return np.minimum(1, tt / max(a, 1e-4)) * np.clip((dur - tt) / max(r, 1e-4), 0, 1)
def sweep_lp(x, fc):
    """low-pass with a cutoff that changes over time (fc = array, one value per sample)"""
    out = np.zeros_like(x); zi = None; blk = 192
    for i in range(0, len(x), blk):
        sos = signal.butter(2, float(np.clip(fc[i], 40, SR * 0.45)), 'low', fs=SR, output='sos')
        if zi is None: zi = np.zeros((sos.shape[0], 2))
        out[i:i + blk], zi = signal.sosfilt(sos, x[i:i + blk], zi=zi)
    return out

# ---------------------------------------------------------------- the "vwoon" synth
def vwoon(m, dur, rise=12, rise_t=0.11, drive=4.0, bright=1.0, voices=7):
    """pitch whines up `rise` semitones into the note while the filter tears open"""
    tt = tvec(dur)
    k = np.clip(tt / rise_t, 0, 1)
    semi = m - rise * (1 - (3 * k * k - 2 * k ** 3)) + 0.12 * np.sin(2 * np.pi * 7 * tt) * np.clip((tt - 0.12) / 0.1, 0, 1)
    f = mtof(semi)
    s = np.zeros_like(tt)
    for i in range(voices):
        det = (i - (voices - 1) / 2) / ((voices - 1) / 2) * 0.22
        s += saw(f * 2 ** (det / 12), dur)
    s = s / voices + 0.5 * np.sign(np.sin(2 * np.pi * np.cumsum(f / 2) / SR))   # square sub an octave down
    s = np.tanh(s * drive)
    fc = (500 + 8500 * bright * np.clip(tt / (rise_t * 1.3), 0, 1) ** 1.5) * (1 - 0.35 * np.clip((tt - 0.2) / max(0.01, dur), 0, 1))
    s = sweep_lp(s, fc)
    s = s + 0.35 * bp(s, 1800, 3200)                                               # the "ee" vowel
    return np.tanh(s * 1.5) * env(dur, 0.003, min(0.05, dur * 0.3))

def siren(dur, m0=48, m1=84):
    """long vwoon glide upward (risers)"""
    tt = tvec(dur)
    f = mtof(m0 + (m1 - m0) * (tt / dur) ** 1.6)
    s = sum(saw(f * 2 ** (d / 12), dur) for d in (-0.25, 0, 0.25)) / 3
    s = np.tanh(s * 3)
    return sweep_lp(s, 400 + 9000 * (tt / dur) ** 2) * np.minimum(1, tt / 0.05)

def reese(m, dur, growl=0.0):
    tt = tvec(dur)
    f = mtof(m)
    s = saw(f * 1.006, dur) + saw(f * 0.994, dur)
    if growl:
        s = np.sin(2 * np.pi * np.cumsum(np.full(len(tt), f)) / SR + growl * (1 + np.sin(2 * np.pi * 8 * tt)) * s)
    s = np.tanh(lp(s, 700 + 1500 * growl) * 2.5) + 0.8 * sine(f, dur)
    return s * env(dur, 0.003, 0.03)

# ---------------------------------------------------------------- drums
def hardkick(g=1.0):
    tt = tvec(0.3)
    f = 50 + 260 * np.exp(-tt / 0.018)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.16)
    s[:int(0.005 * SR)] += hp(noise(0.005), 2500) * 0.5
    return np.tanh(s * 5) * 0.75 * g
def snare():
    tt = tvec(0.22)
    return np.tanh((0.7 * np.sin(2 * np.pi * 210 * tt) * np.exp(-tt / 0.04) + bp(noise(0.22), 1500, 11000) * np.exp(-tt / 0.08)) * 2)
def hat(o=False):
    d = 0.18 if o else 0.035
    return hp(noise(d), 8000) * np.exp(-tvec(d) / (0.06 if o else 0.01))
def crash(d=1.6): return hp(noise(d), 4000) * np.exp(-tvec(d) / 0.5)
def impact():
    tt = tvec(1.5)
    return np.tanh((np.sin(2 * np.pi * (35 + 80 * np.exp(-tt / 0.05)) * tt) * np.exp(-tt / 0.5) + hp(noise(1.5), 200) * np.exp(-tt / 0.2) * 0.5) * 3)

# ---------------------------------------------------------------- flavour instruments (one per section)
def pluck(m, dur, bright=3000, decay=0.25):
    """a plucked string (piano / koto-ish): two saws through a closing low-pass"""
    tt = tvec(dur); f = mtof(m)
    s = saw(f, dur) * 0.6 + saw(f * 2.003, dur) * 0.25
    s = sweep_lp(s, 300 + bright * np.exp(-tt / (decay * 0.5)))
    return s * np.exp(-tt / decay) * np.minimum(1, tt / 0.002)
def bell(m, dur=1.2, decay=0.6):
    """FM bell / music box / glockenspiel"""
    tt = tvec(dur); f = mtof(m)
    mod = np.sin(2 * np.pi * f * 3.5 * tt) * 2.0 * np.exp(-tt / 0.15)
    return np.sin(2 * np.pi * f * tt + mod) * np.exp(-tt / decay) * np.minimum(1, tt / 0.001)
def chip(m, dur):
    """8-bit square, crushed to 16 levels"""
    tt = tvec(dur); f = mtof(m)
    s = np.sign(np.sin(2 * np.pi * f * tt)) * 0.6
    s = np.round(s * 8) / 8
    return s * env(dur, 0.001, 0.01)
def glass_hit(size=1.0):
    """breaking glass: a noise crack + a cloud of inharmonic high partials"""
    d = 1.4
    tt = tvec(d)
    s = hp(noise(d), 3000) * np.exp(-tt / 0.06) * 0.8
    for _ in range(14):
        f = rng.uniform(2500, 9000); t0 = rng.uniform(0, 0.25)
        s += np.sin(2 * np.pi * f * tt) * np.exp(-np.maximum(0, tt - t0) / rng.uniform(0.05, 0.4)) * (tt >= t0) * 0.12
    return s * size
def tick(hi=True):
    tt = tvec(0.03)
    return np.sin(2 * np.pi * (3200 if hi else 2400) * tt) * np.exp(-tt / 0.004)
def ping(m=84, dur=1.6):
    """sonar ping: a pure sine with a soft echo"""
    tt = tvec(dur); f = mtof(m)
    s = np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.35)
    e = np.zeros_like(s); k = int(0.28 * SR); e[k:] = s[:-k] * 0.4
    return (s + e) * np.minimum(1, tt / 0.003)
def supersaw(ms, dur, cut=5000):
    s = sum(saw(mtof(m) * 2 ** (d / 1200), dur) for m in ms for d in (-14, -5, 5, 14))
    return lp(s / (len(ms) * 4), cut) * env(dur, 0.005, 0.05)
def wobble(m, dur, rate=4.0):
    tt = tvec(dur); f = mtof(m)
    s = np.tanh((saw(f * 1.004, dur) + saw(f * 0.996, dur)) * 1.5)
    fc = 250 + 2600 * (0.5 - 0.5 * np.cos(2 * np.pi * rate * tt))
    return np.tanh(sweep_lp(s, fc) * 2.5) * env(dur, 0.004, 0.03)
def drone(m, dur):
    tt = tvec(dur)
    s = sum(saw(mtof(m + o) * (1 + d), dur) for o in (0, 1, 12) for d in (-0.003, 0.003)) / 6
    return sweep_lp(s, 600 + 300 * np.sin(2 * np.pi * 0.2 * tt)) * np.minimum(1, tt / 1.0) * np.minimum(1, (dur - tt) / 0.5)
def taiko():
    tt = tvec(0.6)
    f = 70 + 90 * np.exp(-tt / 0.03)
    return np.tanh((np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.18) + lp(noise(0.6), 900) * np.exp(-tt / 0.03) * 0.6) * 2.5)
def modem(dur=1.2):
    """dial-up chirps"""
    tt = tvec(dur); f = 1200 + 1100 * np.sign(np.sin(2 * np.pi * 9 * tt)) + 400 * np.sin(2 * np.pi * 31 * tt)
    return np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.25 * env(dur, 0.01, 0.1)
def heartbeat():
    tt = tvec(0.35)
    return np.tanh(np.sin(2 * np.pi * (45 + 40 * np.exp(-tt / 0.03)) * tt) * np.exp(-tt / 0.12) * 4)
def creak(dur=0.8):
    tt = tvec(dur)
    f = 180 + 60 * np.sin(2 * np.pi * 1.3 * tt) + 30 * rng.standard_normal(len(tt)).cumsum() / np.sqrt(len(tt))
    return bp(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * (rng.random(len(tt)) < 0.4), 300, 2500) * env(dur, 0.05, 0.2) * 0.4
def clap():
    tt = tvec(0.2)
    s = bp(noise(0.2), 900, 6000)
    e = np.exp(-tt / 0.05) + 0.6 * np.exp(-np.maximum(0, tt - 0.01) / 0.01) * (tt > 0.01) + 0.5 * np.exp(-np.maximum(0, tt - 0.02) / 0.01) * (tt > 0.02)
    return s * e

# ---------------------------------------------------------------- drums
score = {'kick': [], 'snare': [], 'stab': [], 'impact': [], 'motif': {}, 'glass': [], 'tick': [], 'ping': [], 'stop': [], 'taiko': [], 'heart': [], 'chord': []}
def motif(name, b, m, L=0.5):
    score['motif'].setdefault(name, []).append([round(b, 4), int(m), L])
def K(b, g=1.0): drums.add(bt(b), hardkick(g), 0.5); score['kick'].append(b)
def S(b, g=1.0): drums.add(bt(b), snare(), 0.36 * g, 0.05); score['snare'].append(b)
def HH(b, g=1.0, o=False, pan=0.3): drums.add(bt(b), hat(o), (0.17 if o else 0.2) * g, pan)
def CR(b, g=1.0): drums.add(bt(b), crash(), 0.3 * g, -0.2)
def IMP(b, g=1.0): fxb.add(bt(b), impact(), 0.45 * g); score['impact'].append(b)

def hardcore(k0, k1, h16=False, snare_on=(1, 3)):
    for k in range(k0, k1):
        B = k * 4
        for q in range(4): K(B + q)
        for q in snare_on: S(B + q)
        for e in range(16 if h16 else 8):
            st = 0.25 if h16 else 0.5
            if h16 or e % 2: HH(B + e * st, 0.9 if (e % 2 if not h16 else e % 4 == 2) else 0.45, pan=0.3 if e % 2 else -0.25)
        HH(B + 3.5, 0.8, True, -0.3)
def halftime(k0, k1, g=1.0):
    for k in range(k0, k1):
        K(k * 4, g); K(k * 4 + 1.5, 0.8 * g); S(k * 4 + 2, g)
        if k % 2: K(k * 4 + 3.5, 0.7 * g)
        for e in range(8): HH(k * 4 + e * 0.5, 0.6)
def build(k0, k1):
    for k in range(k0, k1):
        n = (k - k0) / (k1 - k0)
        for q in range(4): K(k * 4 + q, 0.6 + 0.4 * n)
        step = 1 if n < 0.25 else 0.5 if n < 0.5 else 0.25 if n < 0.85 else 0.125
        for i in range(int(4 / step)): S(k * 4 + i * step, 0.3 + 0.6 * n)
    fxb.add(bar(k0), siren((k1 - k0) * 4 * BEAT), 0.2)
    d = (k1 - k0) * 4 * BEAT
    fxb.add(bar(k0), hp(noise(d), 2000) * np.linspace(0, 1, int(d * SR)) ** 3, 0.25)
def fourfloor(k0, k1, clapit=True):
    for k in range(k0, k1):
        for q in range(4): K(k * 4 + q, 0.85)
        if clapit:
            for q in (1, 3): drums.add(bt(k * 4 + q), clap(), 0.3, 0.1); score['snare'].append(k * 4 + q)
        for q in range(4): HH(k * 4 + q + 0.5, 0.9, True, 0.25)

# ---------------------------------------------------------------- harmony
CH = {'Fm': (41, [65, 68, 72]), 'Db': (37, [61, 65, 68]), 'Eb': (39, [63, 67, 70]), 'C': (36, [64, 67, 72]),
      'Bbm': (34, [65, 70, 73]), 'Ab': (44, [63, 68, 72])}
PROG = ['Fm', 'Db', 'Eb', 'C']
def chord(k):
    name = ['Fm', 'Bbm', 'Db', 'C'][k % 4] if 88 <= k < 96 else PROG[k % 4]
    root, tones = CH[name]
    sh = 1 if k >= 128 else 0
    return name, root + sh, [t + sh for t in tones]
for k in range(BARS):
    score['chord'].append([k * 4, chord(k)[1]])

def parse(lines, start_bar, shift=0):
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
            cur = [b, 0.5, midi(tok) + shift]
    if cur: notes.append(tuple(cur))
    return notes
LEAD = ['F5 - - Ab5 - - C6 -', 'Db6 - - C6 - - Ab5 -', 'Bb5 - - G5 - - Eb5 -', 'E5 - - G5 - C6 - -',
        'F5 - - Ab5 - - C6 -', 'F6 - - Eb6 - - Db6 -', 'Eb6 - Db6 - C6 - Bb5 -', 'C6 - - - - - - -']
LEAD_END = ['F5 - - Ab5 - - C6 -', 'F6 - - Eb6 - - Db6 -', 'Eb6 - F6 - G6 - Ab6 -', 'G6 - - - E6 - C6 -']
drop1 = parse(LEAD * 2, 72)
drop2 = parse(LEAD + LEAD[:4] + LEAD_END, 128, 1)
final = parse(['F6 - - - Ab6 - - -', 'Db6 - - - F6 - - -', 'Eb6 - - - G6 - - -', 'C6 - - - E6 - - -'], 144, 1)

# ================================================================= the form
# 0-8 WARNING: kick bursts that speed up, vwoon risers
for k in range(0, 8):
    K(k * 4, 0.8)
    if k >= 4: K(k * 4 + 2, 0.8)
    if k >= 6: K(k * 4 + 1); K(k * 4 + 3)
    _, root, _ = chord(k)
    if k % 2 == 0: synth.add(bar(k), vwoon(root + 24, 0.5, rise=24, rise_t=0.3), 0.25, -0.2 + 0.1 * k)
for i in range(8): S(7 * 4 + i * 0.5, 0.4 + 0.07 * i)
IMP(32); CR(32, 1.2)

# 8-16 EXTREME: hardcore + syncopated vwoon stabs (as the original A section)
hardcore(8, 16)
STAB = [0, 0.75, 1.5, 2.5, 3.25]
for k in range(8, 16):
    _, root, _ = chord(k)
    for s in STAB:
        synth.add(bt(k * 4 + s), vwoon(root + 24, 0.22, rise=7, rise_t=0.06), 0.3, 0.3 if s % 1 else -0.3)
        score['stab'].append([k * 4 + s, root + 24])
    for e in range(8): bass.add(bt(k * 4 + e * 0.5), reese(root, 0.14), 0.45 if e % 2 else 0)

def offbass(k0, k1, growl=0.0, g=0.45):
    for k in range(k0, k1):
        _, root, _ = chord(k)
        for e in range(8):
            if e % 2: bass.add(bt(k * 4 + e * 0.5), reese(root, 0.14, growl=growl), g)

# 16-24 FIRST STEP: plain and bright — an 8th-note pluck arpeggio up and down the chord
hardcore(16, 24); offbass(16, 24)
for k in range(16, 24):
    _, root, tones = chord(k)
    seq = [tones[0], tones[1], tones[2], tones[0] + 12, tones[2], tones[1], tones[0], tones[1]]
    for e, m in enumerate(seq):
        synth.add(bt(k * 4 + e * 0.5), pluck(m, 0.4, 4000), 0.32, -0.3 + 0.6 * (e % 2)); motif('firststep', k * 4 + e * 0.5, m)
CR(64)

# 24-32 the EmpErroR: 16th chip arps + glitch stutters (one vwoon chopped into 32nds)
hardcore(24, 32, h16=True); offbass(24, 32, 0.4)
for k in range(24, 32):
    _, root, tones = chord(k)
    for e in range(16):
        m = tones[e % 3] + 12 * ((e // 3) % 2)
        if not (k % 2 == 1 and e >= 12):
            synth.add(bt(k * 4 + e * 0.25), chip(m, 0.07), 0.16, 0.4 if e % 2 else -0.4); motif('emperror', k * 4 + e * 0.25, m, 0.25)
    if k % 2 == 1:                                         # the stutter fills the last beat
        cut = vwoon(root + 24, 0.04, rise=0, rise_t=0.01)
        for i in range(8): synth.add(bt(k * 4 + 3 + i * 0.125), cut * (0.6 + 0.05 * i), 0.4); score['tick'].append(k * 4 + 3 + i * 0.125)
CR(96)

# 32-40 Re:Unknown X: fast 16th runs up and down (piano-like plucks), a touch of a shrine bell
hardcore(32, 40, h16=True); offbass(32, 40, 0.3)
for k in range(32, 40):
    _, root, tones = chord(k)
    up = [tones[0], tones[1], tones[2], tones[0] + 12, tones[1] + 12, tones[2] + 12, tones[0] + 24, tones[2] + 12]
    run = up + up[::-1]
    for e, m in enumerate(run):
        synth.add(bt(k * 4 + e * 0.25), pluck(m, 0.2, 5000, 0.12), 0.22, -0.4 + 0.8 * e / 15); motif('unknown', k * 4 + e * 0.25, m, 0.25)
    if k % 2 == 0: fxb.add(bar(k), bell(tones[0] + 24, 1.4, 0.7), 0.12, 0.2)
CR(128)

# 40-48 モラトリウム: half time, ticking clock, a music box; the last two beats stop dead (time stop)
halftime(40, 47)
for k in range(40, 48):
    _, root, tones = chord(k)
    for e in range(8):
        if k == 47 and e >= 4: continue
        drums.add(bt(k * 4 + e * 0.5), tick(e % 2 == 0), 0.25, 0.5 if e % 2 else -0.5); score['tick'].append(k * 4 + e * 0.5)
    box = [tones[2] + 12, tones[1] + 12, tones[0] + 12, tones[1] + 12]
    for i, m in enumerate(box):
        if k == 47 and i >= 2: continue
        fxb.add(bt(k * 4 + i), bell(m, 1.0, 0.5), 0.18, 0.15); motif('moratorium', k * 4 + i, m, 1)
    if k < 47: bass.add(bar(k), reese(root, 1.1), 0.35)
K(47 * 4); K(47 * 4 + 1)
score['stop'].append(47 * 4 + 2)                            # time stop: 2 beats of silence
fxb.add(bar(48) - 0.05, bell(89, 1.6, 0.8), 0.3)
CR(192)

# 48-56 segment: breaking glass every 4 bars, piano chords in 3-3-2, a glockenspiel line
hardcore(48, 56); offbass(48, 56)
for k in range(48, 56):
    _, root, tones = chord(k)
    for s in (0, 1.5, 3):
        for m in tones: synth.add(bt(k * 4 + s), pluck(m, 0.5, 2500, 0.3), 0.13)
        motif('segment', k * 4 + s, tones[1])
    fxb.add(bt(k * 4 + 2), bell(tones[2] + 24, 0.8, 0.3), 0.13, 0.35); score['ping'].append(k * 4 + 2)
for b in (48 * 4, 52 * 4, 55 * 4 + 2):
    fxb.add(bt(b), glass_hit(1.0), 0.5, 0.0); score['glass'].append(b)
CR(224)

# 56-64 Vertigo: four on the floor and a wobbling bass, a dive every 2 bars
fourfloor(56, 64)
for k in range(56, 64):
    _, root, tones = chord(k)
    bass.add(bar(k), wobble(root + 12, 1.18, rate=2.5 + (k % 2) * 2.5), 0.45)
    if k % 2 == 1:
        dive = vwoon(root + 36, 0.6, rise=-24, rise_t=0.5)
        synth.add(bt(k * 4 + 2.5), dive, 0.2, 0.3 if k % 4 == 1 else -0.3); motif('vertigo', k * 4 + 2.5, root + 36, 1)

# 64-72 CHARGE: the build (snare roll speeds up, siren)
build(64, 72)
for k in range(64, 72):
    _, root, _ = chord(k)
    bass.add(bar(k), reese(root, 1.15), 0.4)
IMP(288, 1.3); CR(288, 1.4)

# 72-88 the drop (Malware → Abyss), carried by the ExtremeEX lead
hardcore(72, 88, h16=True); offbass(72, 88, 0.6, 0.5)
for k in range(72, 88):
    _, root, tones = chord(k)
    synth.add(bar(k), vwoon(root + 12, 1.15, rise=5, rise_t=0.05, drive=2.5, bright=0.5, voices=5), 0.12)
    if k < 80:                                             # Malware: crushed chip arps
        for e in range(8):
            m = tones[(e * 2) % 3] + 24
            synth.add(bt(k * 4 + e * 0.5 + 0.25), chip(m, 0.1), 0.1, 0.5 if e % 2 else -0.5); motif('malware', k * 4 + e * 0.5 + 0.25, m)
    else:                                                  # Abyss: sonar pings
        for s in (0, 2.5):
            fxb.add(bt(k * 4 + s), ping(tones[0] + 24 + (5 if s else 0)), 0.2, -0.3 if s else 0.3); score['ping'].append(k * 4 + s)
fxb.add(bar(72), modem(1.2), 0.3, -0.3)
for k in (76, 80, 84): CR(k * 4)

# 88-96 Ward 13: the break — a heartbeat, a drone, dissonant stabs, creaking
for k in range(88, 96):
    _, root, tones = chord(k)
    for b in (0, 0.5, 2, 2.5):
        if b in (0, 2) or k >= 92:
            drums.add(bt(k * 4 + b), heartbeat(), 0.5 if b % 1 == 0 else 0.35); score['heart'].append(k * 4 + b)
    if k % 2 == 0: bass.add(bar(k), drone(root, 2.4), 0.45)
    if k % 2 == 1:
        st = vwoon(tones[0] + 25, 0.35, rise=12, rise_t=0.1)  # a minor 2nd above — wrong on purpose
        synth.add(bt(k * 4 + 3), st, 0.18, 0.4); motif('ward13', k * 4 + 3, tones[0] + 25, 1)
    if k % 4 == 1: fxb.add(bt(k * 4 + 1), creak(0.9), 0.5, -0.5)
    if k >= 94:
        for i in range(8 if k == 95 else 4): S(k * 4 + i * (0.5 if k == 95 else 1), 0.3 + 0.1 * i)
IMP(384, 1.2); CR(384, 1.3)

# 96-104 Prism: trance — four on the floor, offbeat bass, gated supersaw chords
fourfloor(96, 104)
for k in range(96, 104):
    _, root, tones = chord(k)
    for q in range(4): bass.add(bt(k * 4 + q + 0.5), reese(root, 0.25), 0.45)
    for e in range(16):
        if e % 4 != 3:
            synth.add(bt(k * 4 + e * 0.25), supersaw(tones, 0.07, 6000), 0.3, 0.0); motif('prism', k * 4 + e * 0.25, tones[e % 3], 0.25)
    lead.add(bar(k), vwoon(tones[2] + 12, 1.1, rise=12, rise_t=0.2, voices=5, bright=0.6), 0.12, 0.1)
CR(416)

# 104-112 四季: koto on the F minor pentatonic, taiko, and the hardcore underneath
hardcore(104, 112); offbass(104, 112, 0.2)
PENTA = [65, 68, 70, 72, 75, 77, 80, 82, 84]
KOTO = [0, 2, 4, 3, 5, 4, 2, 1, 4, 6, 8, 7, 5, 4, 3, 2]
for k in range(104, 112):
    for e in range(8):
        idx = KOTO[(e + (k - 104) * 8) % 16] + (1 if k % 4 == 3 else 0)
        m = PENTA[min(idx, len(PENTA) - 1)]
        synth.add(bt(k * 4 + e * 0.5), pluck(m, 0.6, 3500, 0.35), 0.28, -0.3 + 0.6 * ((e * 3) % 8) / 7); motif('shiki', k * 4 + e * 0.5, m)
    for b in (0, 1.5, 3):
        drums.add(bt(k * 4 + b), taiko(), 0.45, -0.2); score['taiko'].append(k * 4 + b)
CR(448)

# 112-120 Candy Pop Parade: future bass — half time, wide wobbling chords, bells
halftime(112, 120)
for k in range(112, 120):
    _, root, tones = chord(k)
    for s in (0, 0.75, 1.5, 2.5, 3, 3.5):
        ch = supersaw([t + 12 for t in tones], 0.28, 4500)
        synth.add(bt(k * 4 + s), ch, 0.28); motif('candy', k * 4 + s, tones[0] + 12)
    bass.add(bar(k), reese(root, 1.1, growl=0.3), 0.4)
    for i, m in enumerate([tones[2] + 24, tones[1] + 24, tones[0] + 24, tones[1] + 24]):
        fxb.add(bt(k * 4 + i + 0.5), bell(m, 0.6, 0.25), 0.12, 0.4 if i % 2 else -0.4)

# 120-128 REVERSAL: the second build
build(120, 128)
for k in range(120, 128):
    _, root, _ = chord(k)
    for e in range(8): bass.add(bt(k * 4 + e * 0.5), reese(root, 0.13), 0.45)
IMP(512, 1.4); CR(512, 1.5)

# 128-144 EXTREME EX: the final drop, up a semitone
hardcore(128, 144, h16=True); offbass(128, 144, 0.6, 0.5)
for k in range(128, 144):
    _, root, tones = chord(k)
    synth.add(bar(k), vwoon(root + 12, 1.15, rise=5, rise_t=0.05, drive=2.5, bright=0.5, voices=5), 0.12)
for k in range(128, 144, 4): CR(k * 4)

# 144-148 LIMIT BREAK: double kicks
for k in range(144, 148):
    B = k * 4
    for q in range(8): K(B + q * 0.5, 0.9)
    S(B + 1); S(B + 3)
    for e in range(16): HH(B + e * 0.25, 0.8)
    _, root, _ = chord(k)
    for e in range(8): bass.add(bt(B + e * 0.5), reese(root, 0.13, growl=1.0), 0.5)
    for s in (0, 1.5, 3): synth.add(bt(B + s), vwoon(root + 24, 0.3, rise=12, rise_t=0.08), 0.3)

# 148 end: one last vwoon
IMP(592, 1.5); CR(592, 1.6)
_, root, _ = chord(148)
synth.add(bar(148), vwoon(root + 12, 3.0, rise=24, rise_t=0.5), 0.35)
bass.add(bar(148), reese(root, 3.0, growl=0.8) * np.exp(-tvec(3.0) / 1.0), 0.6)

for (b, L, m) in drop1 + drop2 + final:
    lead.add(bt(b), vwoon(m, L * BEAT + 0.04, rise=12 if L >= 1 else 5, rise_t=0.09 if L >= 1 else 0.04), 0.42, -0.05)
    lead.add(bt(b), vwoon(m + 12, L * BEAT + 0.04, rise=12, rise_t=0.09, voices=3, bright=0.7), 0.1, 0.15)

# ---------------------------------------------------------------- mix
def sidechain(bus, b0, b1, depth, tau=0.06):
    for b in np.arange(b0, b1, 1.0):
        i0 = int(bt(b) * SR); n = int(BEAT * SR)
        e = (1 - depth * np.exp(-np.arange(n) / SR / tau)).astype(np.float32)
        for ch in (bus.L, bus.R): ch[i0:i0 + n] *= e[:len(ch[i0:i0 + n])]
for a, z in ((8, 40), (48, 64), (72, 88), (96, 112), (128, 148)):
    sidechain(synth, a * 4, z * 4, 0.6); sidechain(lead, a * 4, z * 4, 0.35)
for a, z in ((112, 120),):
    sidechain(synth, a * 4, z * 4, 0.8, 0.12)
# time stop: everything stops for two beats
i0, i1 = int(bt(47 * 4 + 2) * SR), int((bar(48) - 0.05) * SR)
for bus in (drums, bass, synth, lead, fxb):
    for ch in (bus.L, bus.R): ch[i0:i1] *= np.linspace(1, 0, i1 - i0) ** 8

def reverb(st, mix, dur=1.6, decay=0.35):
    tt = np.arange(int(dur * SR)) / SR
    out = []
    for ch in range(2):
        ir = lp(rng.standard_normal(len(tt)) * np.exp(-tt / decay), 7000); ir /= np.sqrt(np.sum(ir ** 2))
        out.append(signal.fftconvolve(st[ch], ir)[:N])
    return np.vstack(out) * mix
leadst = lead.stereo(); synst = synth.stereo(); fxst = fxb.stereo()
dry = drums.stereo() + bass.stereo() * 0.3 + synst + leadst + fxst
mix = dry + reverb(leadst * 0.5 + synst * 0.4 + fxst * 0.4 + drums.stereo() * 0.05, 0.25)
mix -= np.mean(mix, axis=1, keepdims=True)
mix = mix / np.max(np.abs(mix)) * 2.2
mix = np.tanh(mix) / np.tanh(2.2)
endi = int((bar(149) + 1.5) * SR)
mix[:, endi - int(2 * SR):endi] *= np.linspace(1, 0, int(2 * SR))
mix = mix[:, :endi]
mix *= 0.95 / np.max(np.abs(mix))

from scipy.io import wavfile
wavfile.write('extremeex-remake.wav', SR, (mix.T * 32767).astype(np.int16))
score.update({'bpm': BPM, 'beat': BEAT, 't0': T0, 'end': round(mix.shape[1] / SR, 2),
              'drop1': [[b, L, m] for b, L, m in drop1], 'drop2': [[b, L, m] for b, L, m in drop2],
              'final': [[b, L, m] for b, L, m in final]})
json.dump(score, open('score-remake.json', 'w'))
print('done', mix.shape[1] / SR)
