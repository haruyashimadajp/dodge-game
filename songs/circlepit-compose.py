"""Circle Pit — original song for the dodge game (hardcore punk).
180 BPM, E minor. Beat 0 at t = 0.5 s; 1 beat = 1/3 s; 1 bar = 1.333 s.

A loud, fast hardcore punk song made only from synthesis:
  guitars     — two distorted rhythm guitars, hard left and hard right (double-tracked wall).
                Every note is a power chord (root + 5th + octave) of detuned saws, down-strummed,
                then pushed through two clipping stages and a 4x12 cabinet filter.
                Palm mutes ("chug") are dark and short; open chords ring until the next one
  bass        — a picked, overdriven bass that follows the guitar roots one octave down, plus a clean sub
  drums       — punchy kick with a beater click, cracking snare, crash, china, ride, hats, toms, sticks.
                Beats: d-beat (verses), skank / polka beat (choruses), two-step, half-time breakdown, blast
  gang vocals — a crowd of 8 voices shouting "HEY!", "OI!", "GO!" (buzzy glottal pulses through moving vowel formants)
  noises      — amp feedback at the start, pick slides into the big sections, the final chord ringing out
Writes punk.wav and score.json (beat numbers for the chart).

Run:  python3 circlepit-compose.py      (needs numpy + scipy)
Then: ffmpeg -i punk.wav -b:a 192k CirclePit.mp3, and copy score.json into songs/circlepit-score.js.
Form (bars): Feedback 0-4 / Intro riff 4-12 / Verse (d-beat) 12-28 / Two-step 28-36 / Chorus (skank, "OI!") 36-44 /
Verse 2 44-52 / Chorus 2 52-60 / Stop + "GO!" 60-64 / Breakdown (half time) 64-72 / Mosh (slower) 72-80 /
Final chorus (blast) 80-88 / Ending 88-92.
"""
import json
import numpy as np
from scipy import signal

SR = 44100
BPM = 180
BEAT = 60 / BPM
T0 = 0.5
BARS = 92
N = int((T0 + BARS * 4 * BEAT + 6.0) * SR)
rng = np.random.default_rng(1977)

def bt(b): return T0 + b * BEAT
def bar(k): return bt(k * 4)
def mtof(m): return 440.0 * 2 ** ((np.asarray(m, float) - 69) / 12)

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

gtrL, gtrR, lead_b, bass_b, sub_b, drums, cym, vox, fxb = (Bus() for _ in range(9))
score = {k: [] for k in ('gtr', 'kick', 'snare', 'crash', 'china', 'ride', 'tom', 'stick', 'shout', 'slide', 'lead',
                         'chord', 'beat', 'feedback', 'stop')}

# ---- tools -------------------------------------------------------------------------------
_sos = {}
def _f(kind, fc, o):
    key = (kind, tuple(np.atleast_1d(fc)), o)
    if key not in _sos: _sos[key] = signal.butter(o, fc, kind, fs=SR, output='sos')
    return _sos[key]
def nz(n): return rng.standard_normal(n)
def lp(x, fc, o=2): return signal.sosfilt(_f('low', min(fc, SR * 0.45), o), x)
def hp(x, fc, o=2): return signal.sosfilt(_f('high', fc, o), x)
def bp(x, lo, hi, o=2): return signal.sosfilt(_f('band', [lo, min(hi, SR * 0.45)], o), x)
def phase(f, n): return np.cumsum(np.broadcast_to(np.asarray(f, float), (n,))) / SR
def saw(f, n, ph0=0.0): return 2 * ((phase(f, n) + ph0) % 1) - 1
def env_ar(n, a, r):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / max(r, 1e-4))
def fade_tail(x, d=0.01):
    k = min(len(x), int(d * SR)); x[-k:] *= np.linspace(1, 0, k); return x

# ---- guitars -----------------------------------------------------------------------------
ROOT = {'E': 40, 'F': 41, 'F#': 42, 'G': 43, 'Ab': 44, 'A': 45, 'Bb': 46, 'B': 47, 'C': 48, 'C#': 49, 'D': 50, 'D#': 51}

def power_di(root, d, mute, seed, oct_=True):
    """clean signal of one down-strummed power chord (root, 5th, octave), 2 detuned saws per string"""
    n = int((d + 0.03) * SR); t = np.arange(n) / SR; x = np.zeros(n)
    notes = [root, root + 7] + ([root + 12] if oct_ else [])
    r = np.random.default_rng(seed)
    for s, m in enumerate(notes):
        k = int((s * (0.004 if mute else 0.007) + r.uniform(0, 0.002)) * SR)         # downstroke: low string first
        if k >= n: continue
        tt = t[:n - k]
        f = float(mtof(m)) * (1 + 0.012 * np.exp(-tt / 0.018))                    # pick attack: a little sharp at first
        for det in (-7, 6):
            x[k:] += saw(f * 2 ** ((det + r.uniform(-2, 2)) / 1200), n - k, r.random()) * (1.0 if s < 2 else 0.6)
    return x / len(notes)

def amp(di, gain, mute):
    """two clipping stages (asymmetric, like an amp) with a tight low end"""
    x = hp(di, 110 if not mute else 90)
    if mute: x = lp(x, 750, 2) * 1.6
    x = x + 0.9 * bp(x, 600, 1600)                                                 # mid push before the clipping
    y = np.tanh(gain * x + 0.15) - np.tanh(0.15)
    y = lp(y, 7500)
    y = np.tanh(2.2 * y)
    return y

def gtr_note(root, d, typ, seed, gain=26):
    mute = typ == 'm'
    dd = min(d, 0.22) if mute else d
    x = amp(power_di(root, dd + 0.04, mute, seed), gain, mute)
    n = len(x); t = np.arange(n) / SR
    if mute: e = np.minimum(1, t / 0.002) * np.exp(-t / 0.075) * 1.05
    else: e = np.minimum(1, t / 0.002) * (0.82 + 0.18 * np.exp(-t / 0.08)) * np.exp(-t / 3.0)
    e *= np.clip((dd + 0.02 - t) / 0.018, 0, 1)                                   # choke when the next chord is played
    return x * e

def cab(x):
    """4x12 cabinet: no fizz above 5 kHz, a small scoop at 400 Hz, a thump at 110 Hz"""
    y = lp(x, 5200, 4)
    y = y - 0.35 * bp(y, 300, 550) + 0.45 * bp(y, 80, 160)
    return hp(y, 70, 2)

def parse(lines, start_bar):
    """8 tokens (8th notes) per bar. 'E' open chord, 'e' palm-muted chug, 'e+e' two 16th chugs, '-' hold, '.' rest"""
    out, cur = [], None
    for bi, line in enumerate(lines):
        toks = line.split(); assert len(toks) == 8, line
        for kk, tok in enumerate(toks):
            b = (start_bar + bi) * 4 + kk * 0.5
            if tok == '-':
                if cur: cur[1] += 0.5
                continue
            if cur: out.append(cur); cur = None
            if tok == '.': continue
            parts = tok.split('+')
            for j, p in enumerate(parts):
                if cur: out.append(cur)
                name = p[0].upper() + p[1:]
                cur = [b + j * 0.5 / len(parts), 0.5 / len(parts), ROOT[name], 'm' if p[0].islower() else 'o']
    if cur: out.append(cur)
    return out

def play_gtr(notes, gain=26, bass=True, bgain=1.0):
    for i, (b, L, r, typ) in enumerate(notes):
        d = L * BEAT
        jit = rng.uniform(-0.004, 0.004)
        gtrL.add(bt(b) + jit, gtr_note(r, d, typ, 1000 + i, gain), 0.5)
        gtrR.add(bt(b) - jit + 0.006, gtr_note(r, d, typ, 5000 + i, gain * 0.9), 0.5)
        if bass: play_bass(b, L, r - 12, typ, bgain)
        score['gtr'].append([round(b, 3), L, r, typ])

# ---- bass --------------------------------------------------------------------------------
def play_bass(b, L, m, typ, g=1.0):
    d = (min(L, 0.45) if typ == 'm' else L) * BEAT
    n = int((d + 0.02) * SR); t = np.arange(n) / SR; f = float(mtof(m))
    x = 0.6 * saw(f, n) + 0.4 * np.sign(np.sin(2 * np.pi * f * t))
    x = lp(x, 900 + 1400 * np.exp(-0.0), 2)
    e = np.minimum(1, t / 0.003) * (0.7 + 0.3 * np.exp(-t / 0.06)) * np.clip((d - t) / 0.015, 0, 1)
    x = np.tanh(2.6 * x * e) + 0.25 * bp(nz(n), 1500, 4000) * np.exp(-t / 0.006)    # pick click
    bass_b.add(bt(b), x, 0.34 * g)
    s = np.sin(2 * np.pi * phase(f, n)) * e
    sub_b.add(bt(b), s, 0.3 * g)

# ---- drums -------------------------------------------------------------------------------
def mk_kick(v):
    r = np.random.default_rng(v)
    n = int(0.32 * SR); t = np.arange(n) / SR
    f = 52 + 150 * np.exp(-t / 0.022)
    x = np.sin(2 * np.pi * phase(f, n)) * np.exp(-t / 0.13)
    x += 0.5 * hp(r.standard_normal(n), 2500) * np.exp(-t / 0.0025)                # beater click (metal-style)
    x += 0.4 * np.sin(2 * np.pi * 1800 * t) * np.exp(-t / 0.003)
    return np.tanh(1.8 * x)
def mk_snare(v):
    r = np.random.default_rng(100 + v)
    n = int(0.32 * SR); t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * phase(210 + 70 * np.exp(-t / 0.015), n)) * np.exp(-t / 0.05)
    tone += 0.5 * np.sin(2 * np.pi * 330 * t) * np.exp(-t / 0.03)
    nse = bp(r.standard_normal(n), 1800, 9500) * np.exp(-t / 0.11)
    crack = hp(r.standard_normal(n), 3000) * np.exp(-t / 0.006)
    return np.tanh(1.5 * (0.8 * tone + 0.9 * nse + 0.7 * crack))
def mk_crash(d=2.2, v=0):
    r = np.random.default_rng(200 + v)
    n = int(d * SR); t = np.arange(n) / SR
    x = hp(r.standard_normal(n), 3500, 2) * np.exp(-t / (d * 0.33))
    x += 0.4 * bp(r.standard_normal(n), 600, 2000) * np.exp(-t / 0.08)
    return x * np.minimum(1, t / 0.002)
def mk_china(v=0):
    r = np.random.default_rng(300 + v)
    n = int(1.1 * SR); t = np.arange(n) / SR
    x = bp(r.standard_normal(n), 2200, 7500, 2) * np.exp(-t / 0.28)
    x *= 1 + 0.8 * np.sin(2 * np.pi * 470 * t)                                     # trashy ring
    return np.tanh(1.4 * x) * np.minimum(1, t / 0.001)
def mk_ride(v=0):
    r = np.random.default_rng(400 + v)
    n = int(0.7 * SR); t = np.arange(n) / SR
    x = hp(r.standard_normal(n), 6000, 2) * np.exp(-t / 0.18) * 0.6
    for f in (2350, 3480, 5010): x += 0.2 * np.sin(2 * np.pi * f * t) * np.exp(-t / 0.3)
    return x
def mk_hat(v=0, open_=False):
    r = np.random.default_rng(500 + v)
    n = int((0.3 if open_ else 0.05) * SR); t = np.arange(n) / SR
    return hp(r.standard_normal(n), 7500, 3) * np.exp(-t / (0.1 if open_ else 0.014))
def mk_tom(m):
    n = int(0.5 * SR); t = np.arange(n) / SR; f = float(mtof(m))
    x = np.sin(2 * np.pi * phase(f * (1 + 0.6 * np.exp(-t / 0.025)), n)) * np.exp(-t / 0.2)
    x += 0.3 * bp(nz(n), 800, 4000) * np.exp(-t / 0.01)
    return np.tanh(1.6 * x)
def mk_stick():
    n = int(0.06 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 2600 * t) + 0.6 * bp(nz(n), 2500, 8000)) * np.exp(-t / 0.008)

KICKS = [mk_kick(i) for i in range(4)]; SNARES = [mk_snare(i) for i in range(4)]
CRASH = [mk_crash(2.2, i) for i in range(3)]; CHINA = [mk_china(i) for i in range(2)]
RIDE = [mk_ride(i) for i in range(2)]; HATS = [mk_hat(i) for i in range(4)]
def K(b, g=1.0):
    drums.add(bt(b) + rng.uniform(-0.002, 0.002), KICKS[rng.integers(4)], 0.55 * g * rng.uniform(0.93, 1.0)); score['kick'].append(round(b, 3))
def S(b, g=1.0, rec=True):
    drums.add(bt(b) + rng.uniform(-0.003, 0.003), SNARES[rng.integers(4)], 0.5 * g * rng.uniform(0.92, 1.0), 0.05)
    if rec: score['snare'].append(round(b, 3))
def CR(b, g=1.0, pan=0.4):
    cym.add(bt(b), CRASH[rng.integers(3)], 0.22 * g, pan); score['crash'].append(round(b, 3))
def CH(b, g=1.0):
    cym.add(bt(b), CHINA[rng.integers(2)], 0.2 * g, -0.45); score['china'].append(round(b, 3))
def RD(b, g=1.0):
    cym.add(bt(b), RIDE[rng.integers(2)], 0.12 * g, 0.35); score['ride'].append(round(b, 3))
def HH(b, g=1.0, open_=False):
    cym.add(bt(b), mk_hat(int(rng.integers(9)), True) if open_ else HATS[rng.integers(4)], 0.1 * g, -0.3)
def TOM(b, m, pan=0.0, g=1.0):
    drums.add(bt(b), mk_tom(m), 0.42 * g, pan); score['tom'].append([round(b, 3), m])

def dbeat(k, crash=False, ride=False):
    """d-beat: K . S K K . S .  with 8th hats (or ride)"""
    b = k * 4
    for h in (0, 1.5, 2): K(b + h)
    for h in (1, 3): S(b + h)
    for i in range(8):
        if ride: RD(b + i * 0.5, 0.7 + 0.3 * (i % 2 == 0))
        else: HH(b + i * 0.5, 0.8 + 0.4 * (i % 2 == 0))
    if crash: CR(b)
    score['beat'].append([b, 'dbeat'])
def skank(k, crash_every=1):
    """skank / polka beat: kick on every beat, snare on every off-beat, crash on the beats"""
    b = k * 4
    for i in range(4):
        K(b + i); S(b + i + 0.5)
        if i % crash_every == 0: CR(b + i, 0.55 if i else 0.9, 0.4 if i % 2 else -0.4)
    score['beat'].append([b, 'skank'])
def twostep(k):
    """two-step groove: K . S . . K S .  (bouncy, half the drive)"""
    b = k * 4
    for h in (0, 2.5): K(b + h)
    for h in (1, 3): S(b + h)
    for i in range(4): RD(b + i, 1.0 if i % 2 == 0 else 0.7)
    if k % 2 == 0: CR(b, 0.6)
    score['beat'].append([b, 'twostep'])
def halftime(k, kicks, china=True):
    """breakdown: snare only on beat 3, kicks with the chugs, china on the quarters"""
    b = k * 4
    for h in kicks: K(b + h, 1.05)
    S(b + 2, 1.15)
    if china:
        for i in range(4): CH(b + i, 1.0 if i == 0 else 0.7)
    score['beat'].append([b, 'half'])
def blast(k):
    """blast beat: kick and snare together on every 8th (hammer blast), crash on the beats"""
    b = k * 4
    for i in range(8):
        K(b + i * 0.5, 0.85); S(b + i * 0.5, 0.75 if i % 2 else 0.9)
        if i % 2 == 0: CR(b + i * 0.5, 0.45 if i else 0.9, 0.4 if i % 4 else -0.4)
    score['beat'].append([b, 'blast'])
def fill(k, kind='toms', start=2):
    b = k * 4
    if kind == 'toms':
        ms = [52, 50, 48, 47, 45, 43, 41, 40]
        steps = int((4 - start) * 4)
        for i in range(steps):
            TOM(b + start + i * 0.25, ms[int(i * 8 / steps)], -0.6 + 1.2 * i / max(1, steps - 1))
    elif kind == 'snare':
        steps = int((4 - start) * 4)
        for i in range(steps): S(b + start + i * 0.25, 0.5 + 0.5 * i / steps)

# ---- gang vocals --------------------------------------------------------------------------
VOW = {'e': (620, 1850, 2600), 'i': (310, 2250, 3000), 'o': (560, 920, 2500), 'a': (800, 1250, 2650), 'u': (360, 800, 2400)}
def formant(x, v, q=1.0):
    f1, f2, f3 = VOW[v]
    return 1.0 * bp(x, f1 * 0.82, f1 * 1.2) + 0.7 * bp(x, f2 * 0.88, f2 * 1.12) + 0.35 * bp(x, f3 * 0.9, f3 * 1.1)
def voice(word, f0, seed):
    """one shouting voice. word = 'HEY' / 'OI' / 'GO' / 'HO'"""
    r = np.random.default_rng(seed)
    d = {'HEY': 0.36, 'OI': 0.34, 'GO': 0.4, 'HO': 0.32}[word]
    n = int(d * SR); t = np.arange(n) / SR
    f = f0 * (1 + 0.06 * np.exp(-t / 0.05) - 0.08 * np.clip((t - d * 0.6) / (d * 0.4), 0, 1))
    f = f * 2 ** (r.uniform(-15, 15) / 1200 + 0.004 * np.sin(2 * np.pi * r.uniform(5, 7) * t))
    src = saw(f, n, r.random()) + 0.25 * r.standard_normal(n)                     # buzzy and rough (shouting)
    src = np.tanh(1.8 * src)
    u = np.clip((t - d * 0.25) / (d * 0.45), 0, 1)
    seq = {'HEY': ('e', 'i'), 'OI': ('o', 'i'), 'GO': ('o', 'u'), 'HO': ('o', 'o')}[word]
    y = formant(src, seq[0]) * (1 - u) + formant(src, seq[1]) * u
    e = np.minimum(1, t / 0.025) * np.clip((d - t) / 0.08, 0, 1)
    if word in ('HEY', 'HO'):                                                      # breathy "h" before the vowel
        hn = int(0.06 * SR); h = formant(r.standard_normal(hn), seq[0]) * np.linspace(0, 1, hn) * 0.7
        y = np.concatenate([h, y]); e = np.concatenate([np.ones(hn), e])
    if word == 'GO':
        g = bp(r.standard_normal(int(0.02 * SR)), 300, 2500) * 0.8
        y = np.concatenate([g, y]); e = np.concatenate([np.ones(len(g)), e])
    return y * e
def shout(b, word, g=1.0, voices=8):
    pre = 0.06 if word in ('HEY', 'HO') else 0.02 if word == 'GO' else 0
    for v in range(voices):
        f0 = rng.uniform(170, 260)
        vox.add(bt(b) - pre + rng.uniform(-0.015, 0.03), voice(word, f0, int(rng.integers(1 << 30))), 0.16 * g, -0.8 + 1.6 * v / (voices - 1))
    score['shout'].append([round(b, 3), word])

# ---- noises ------------------------------------------------------------------------------
def pick_slide(b_end, beats=2):
    """a pick scraped down the low strings: a grinding noise falling in pitch, distorted"""
    d = beats * BEAT; n = int(d * SR); t = np.arange(n) / SR
    fc = 2600 * (0.12 ** (t / d))
    src = nz(n); x = np.zeros(n)
    for i in range(0, n, 1024):
        j = min(n, i + 1024); x[i:j] = bp(src[i:j], fc[i] * 0.6, fc[i] * 1.5, 1)
    x *= 1 + 0.6 * np.sin(2 * np.pi * phase(140 * (0.3 ** (t / d)), n) * 6)
    x = np.tanh(9 * x) * np.minimum(1, t / 0.05) * np.clip((d - t) / 0.03, 0, 1)
    fxb.add(bt(b_end) - d, cab(x), 0.22, 0)
    score['slide'].append([round(b_end - beats, 3), b_end])
def feedback(b0, b1, m=64):
    """amp feedback: a tone that swells and squeals, with the open E chord humming under it"""
    d = (b1 - b0) * BEAT; n = int(d * SR); t = np.arange(n) / SR
    f = float(mtof(m)) * (1 + 0.003 * np.sin(2 * np.pi * 5.5 * t))
    sq = np.sin(2 * np.pi * phase(f, n)) + 0.4 * np.sin(2 * np.pi * phase(f * 2.003, n))
    jump = t > d * 0.55                                                            # the feedback jumps up an octave
    sq = np.where(jump, np.sin(2 * np.pi * phase(f * 2, n)), sq)
    e = np.clip(t / (d * 0.5), 0, 1) ** 2
    x = np.tanh(6 * sq * e) * (0.4 + 0.6 * e)
    fxb.add(bt(b0), cab(x) * np.clip((d - t) / 0.02, 0, 1), 0.2, 0.3)
    score['feedback'].append([b0, b1])

# ---- lead guitar (final chorus): a screaming single-note line an octave over the chords ---------
def lead_note(m, d, bend=False):
    n = int((d + 0.05) * SR); t = np.arange(n) / SR; f0 = float(mtof(m))
    f = f0 * 2 ** ((-1 if bend else 0) / 12 * np.exp(-t / 0.06))
    f = f * 2 ** (0.25 / 12 * np.sin(2 * np.pi * 6 * t) * np.clip((t - 0.15) / 0.2, 0, 1))
    x = saw(f, n) + 0.5 * saw(f * 1.004, n)
    y = np.tanh(18 * hp(x, 300)) * np.minimum(1, t / 0.004) * np.clip((d + 0.04 - t) / 0.03, 0, 1)
    return lp(y, 4200)

# ==== harmony map (for the chart) ======================================================
def chord_of(notes):
    for b, L, r, typ in notes:
        if abs(b - round(b / 4) * 4) < 0.01: score['chord'].append([round(b), r])

# ==== Feedback 0-4: amp hum and feedback, a tom roll, sticks ======================================
feedback(0, 12, 64)
for i in range(4): drums.add(bt(12 + i), mk_stick(), 0.35); score['stick'].append(12 + i)
pick_slide(16, 4)

# ==== Intro riff 4-12 ===================================================================
RIFF_A = ['E - e e G - A -', 'e e e e Bb - A -', 'E - e e G - A -', 'C - - D - - Bb -']
RIFF_A2 = ['E - e e G - A -', 'e e e e Bb - A -', 'E - e e G - A -', 'D - D - D - D+D D+D']
intro = parse(RIFF_A + RIFF_A2, 4); play_gtr(intro); chord_of(intro)
for k in range(4, 12):
    dbeat(k, crash=(k % 2 == 0))
    if k == 11:
        score['kick'] = [x for x in score['kick'] if not (44 + 2 <= x < 48)]
fill(11, 'snare', 2)
shout(46, 'HEY'); shout(47, 'HEY')

# ==== Verse 12-28: d-beat, palm-muted chugs answered by open chords ==========================
VERSE = ['e e e e e e G -', 'e e e e e e A -', 'e e e e e e Bb A', 'G - - - F# - - -']
VERSE_END = ['e e e e e e G -', 'e e e e e e A -', 'e e e e e e Bb A', 'G - G - Bb - B -']
v1 = parse(VERSE * 3 + VERSE_END, 12); play_gtr(v1); chord_of(v1)
for k in range(12, 28):
    dbeat(k, crash=(k % 4 == 0))
    if k % 4 == 3:
        shout(k * 4 + 2, 'HEY', 0.9)
fill(27, 'toms', 3)
pick_slide(112, 2)

# ==== Two-step 28-36: the bounce ============================================================
TWO = ['E - - e . e G -', 'A - - a . a Bb -', 'E - - e . e G -', 'C - - - B - - -']
t2 = parse(TWO * 2, 28); play_gtr(t2); chord_of(t2)
for k in range(28, 36): twostep(k)
for k in (29, 31, 33, 35): shout(k * 4 + 3, 'HO', 0.85)
fill(35, 'snare', 2)
pick_slide(144, 2)

# ==== Chorus 36-44: skank beat, open chords strummed on every 8th, the crowd shouts "OI!" ===============
CHO = ['C C C C C C C C', 'G G G G G G G G', 'D D D D D D D D', 'E E E E E E E E']
CHO_END = ['C C C C C C C C', 'G G G G G G G G', 'D D D D D D D D', 'E - - - B - Bb -']
def chorus(k0, last=False):
    c = parse(CHO + (CHO_END if not last else CHO), k0); play_gtr(c, 24); chord_of(c)
    for k in range(k0, k0 + 8):
        skank(k)
        if k % 2 == 1:
            shout(k * 4, 'OI'); shout(k * 4 + 2, 'OI')
chorus(36)

# ==== Verse 2 44-52: faster drums (ride), more chugs ========================================
VERSE2 = ['e+e e e+e e e e G -', 'e+e e e+e e e e A -', 'e+e e e+e e e e Bb A', 'G - - - F# - - -']
v2 = parse(VERSE2 + VERSE2[:3] + ['G - G - Bb - B -'], 44); play_gtr(v2); chord_of(v2)
for k in range(44, 52):
    dbeat(k, crash=(k % 4 == 0), ride=True)
    if k % 4 == 3: shout(k * 4 + 2, 'HEY')
fill(51, 'toms', 2)

# ==== Chorus 2 52-60 =================================================================
chorus(52)

# ==== Stop 60-64: everything stops on beat 1, single hits, then the crowd counts in with "GO!" =========
STOP = ['E - - - . . . .', 'E - . . E - . .', 'E . E . E . E .', 'e+e e+e e+e e+e e+e e+e e+e e+e']
st = parse(STOP, 60); play_gtr(st); chord_of(st)
for b in (240, 244, 246, 248, 249, 250, 251):
    K(b); CR(b, 0.8); S(b, 0.9)
score['stop'].append([240, 256])
for i in range(16): S(252 + i * 0.25, 0.4 + 0.6 * i / 16)
shout(255, 'GO', 1.2)

# ==== Breakdown 64-72: half time. Big chugs with the kick, china on every quarter — headbang =====================
BRK = ['E - - e - e E -', 'e - e - Bb - - -', 'E - - e - e E -', 'e - e - G - F# -']
br = parse(BRK * 2, 64); play_gtr(br, 30, bgain=1.2); chord_of(br)
for k in range(64, 72):
    kicks = [h for (b, L, r, typ) in br if k * 4 <= b < k * 4 + 4 for h in [b - k * 4]]
    halftime(k, kicks)
    if k % 2 == 1: shout(k * 4 + 2, 'HEY', 0.9)
CR(256, 1.0)
pick_slide(288, 2)

# ==== Mosh 72-80: even slower — one huge hit every 1.5 beats, then a run of chugs ==========================
MOSH = ['E - - E - - E -', '- - e+e e+e e+e e+e Bb -', 'E - - E - - E -', '- - e+e e+e e+e e+e F# -']
mo = parse(MOSH * 2, 72); play_gtr(mo, 32, bgain=1.3); chord_of(mo)
for k in range(72, 80):
    b0 = k * 4
    if k % 2 == 0:
        for h in (0, 1.5, 3):
            K(b0 + h, 1.15); CH(b0 + h, 1.1)
        S(b0 + 1.5, 1.2)
    else:
        for h in np.arange(1, 3, 0.25): K(b0 + h, 0.8)
        S(b0 + 3, 1.2); CR(b0 + 3, 0.9)
    if k == 79:
        score['kick'] = [x for x in score['kick'] if not (b0 + 1 <= x < b0 + 3)]
        fill(79, 'toms', 1)
shout(300, 'HEY'); shout(302, 'HEY'); shout(304, 'HEY'); shout(306, 'HEY')
shout(318, 'GO', 1.3)
pick_slide(320, 2)

# ==== Final chorus 80-88: blast beat, strummed chords, a lead guitar screaming over the top ====================
cf = parse(CHO * 2, 80); play_gtr(cf, 26); chord_of(cf)
for k in range(80, 88):
    if k < 86: blast(k)
    else: skank(k)
    if k % 2 == 1: shout(k * 4, 'OI', 1.1); shout(k * 4 + 2, 'OI', 1.1)
LEAD = [(320, 2, 79), (322, 1, 76), (323, 1, 74), (324, 3, 74), (327, 1, 76),
        (328, 2, 78), (330, 1, 79), (331, 1, 81), (332, 4, 83),
        (336, 2, 84), (338, 1, 83), (339, 1, 81), (340, 3, 79), (343, 1, 78),
        (344, 2, 79), (346, 2, 81), (348, 4, 83)]
for i, (b, L, m) in enumerate(LEAD):
    s = lead_note(m, L * BEAT - 0.02, bend=(L >= 3)); lead_b.add(bt(b), s, 0.16, 0.1)
    score['lead'].append([b, L, m])

# ==== Ending 88-92: four unison hits, then the last chord rings out with feedback =====================
END = ['E - E - E - E -', 'E - - - - - - -', '- - - - - - - -', '- - - - - - - -']
en = parse(END, 88)
for i, (b, L, r, typ) in enumerate(en):
    d = L * BEAT if i < 4 else 4.5
    gtrL.add(bt(b), gtr_note(r, d, 'o', 9000 + i), 0.5); gtrR.add(bt(b) + 0.006, gtr_note(r, d, 'o', 9500 + i, 23), 0.5)
    play_bass(b, min(L, 12), r - 12, 'o', 1.0)
    score['gtr'].append([b, L if i < 4 else 12, r, 'o'])
    K(b, 1.1); CR(b, 1.0, -0.4); CR(b, 0.8, 0.4); S(b, 1.0)
for i in range(12): TOM(354 + i / 6, [52, 50, 48, 47, 45, 43][i // 2], 0.5 - i / 12)
K(356, 1.2); CR(356, 1.2); CH(356, 1.0)
shout(356, 'HEY', 1.3)
feedback(357, 368, 76)

# ---- mix ----------------------------------------------------------------------------------------------
def room(st, decay=1.1, dur=1.8, bright=6000):
    tt = np.arange(int(dur * SR)) / SR; out = []
    for ch in range(2):
        ir = rng.standard_normal(len(tt)) * np.exp(-tt / (decay / 6.9))
        ir = lp(ir, bright); ir[:int(0.012 * SR)] = 0
        ir /= np.sqrt(np.sum(ir ** 2))
        out.append(signal.fftconvolve(st[ch], ir)[:N])
    return np.vstack(out)

def comp(st, thr=0.3, ratio=4.0, att=0.003, rel=0.08, makeup=1.0):
    lvl = np.max(np.abs(st), axis=0)
    a = np.exp(-1 / (att * SR)); r = np.exp(-1 / (rel * SR))
    e = signal.lfilter([1 - r], [1, -r], lvl)                                     # cheap release-shaped envelope
    e = np.maximum(e, signal.lfilter([1 - a], [1, -a], lvl))
    g = np.where(e > thr, (thr + (e - thr) / ratio) / np.maximum(e, 1e-9), 1.0)
    return st * g * makeup

G = np.vstack([cab(gtrL.L + gtrL.R), cab(gtrR.L + gtrR.R)])                       # hard left / hard right
G = np.vstack([G[0] + 0.12 * G[1], G[1] + 0.12 * G[0]])
D = comp(drums.stereo(), 0.35, 4, makeup=1.4)
C = cym.stereo()
B = np.vstack([lp(bass_b.L, 3500), lp(bass_b.R, 3500)])
V = vox.stereo()
V = np.tanh(V * 1.5) / 1.5
Lg = np.vstack([cab(lead_b.L), cab(lead_b.R)])
verb = room(D * 0.45 + V * 0.9 + C * 0.3 + Lg * 0.6 + G * 0.08, 1.2, 2.0)
mix = G * 0.78 + D * 1.0 + C * 0.75 + B * 0.9 + sub_b.stereo() * 0.7 + V * 0.85 + Lg * 0.9 + fxb.stereo() * 1.0 + verb * 0.32
mix -= np.mean(mix, axis=1, keepdims=True)
mix = np.vstack([hp(mix[0], 28, 2), hp(mix[1], 28, 2)])
mix /= np.max(np.abs(mix))
mix = comp(mix, 0.45, 3, 0.005, 0.15)
mix /= np.max(np.abs(mix))
pk = np.max(np.abs(mix), axis=0)
pk = np.maximum.reduce([np.roll(pk, -i) for i in range(0, int(0.004 * SR), 8)])
DRIVE, THR = 2.0, 0.9
gl = np.minimum(1, THR / np.maximum(pk * DRIVE, 1e-6))
rel = np.exp(-1 / (0.08 * SR))
gl = signal.lfilter([1 - rel], [1, -rel], gl[::-1])[::-1]
gl = np.minimum(gl, np.minimum(1, THR / np.maximum(pk * DRIVE, 1e-6)) * 1.1)
mix = np.tanh(mix * DRIVE * gl / THR * 0.9) * THR
endi = int(bt(371) * SR)
mix = mix[:, :endi]
mix[:, -int(1.5 * SR):] *= np.linspace(1, 0, int(1.5 * SR)) ** 1.5
mix *= 0.96 / np.max(np.abs(mix))

from scipy.io import wavfile
wavfile.write('punk.wav', SR, (mix.T * 32767).astype(np.int16))
for key in score:
    if score[key] and not isinstance(score[key][0], list): score[key] = sorted(set(score[key]))
    elif score[key]: score[key].sort(key=lambda v: v[0])
score['end'] = round(mix.shape[1] / SR, 2)
json.dump(score, open('score.json', 'w'), default=lambda o: o.item() if hasattr(o, 'item') else o)
print('done', mix.shape[1] / SR, {k: len(v) for k, v in score.items() if isinstance(v, list)})
