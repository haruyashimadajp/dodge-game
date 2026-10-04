"""Circle Pit — original song for the dodge game (breakcore / glitch hardcore, no vocals).
200 BPM, E minor. Beat 0 at t = 0.5 s; 1 beat = 0.3 s; 1 bar = 1.2 s.

A violent electronic hardcore track in the breakcore / glitch style, made only from synthesis
(an original composition; only the general style of the genre is the reference):
  hardcore kick — the main voice. A heavily distorted, pitched kick (a sine that drops from ~500 Hz onto the note,
                  clipped hard): short kicks and long, ringing tonal kicks play the riff like a bass line
  breakbeat     — a chopped, amen-style break (kick, cracking snare, ghost notes, hats) rearranged every bar,
                  with 32nd-note snare rolls, pitched-up fills and half-time versions
  supersaw      — detuned saw chords that pump against the kick (chorus)
  chip lead     — a square / FM lead, bit-crushed, with fast slides (chorus melody)
  FM keys       — cold, glassy chords in the intro and at the very end
  glitches      — stutters (the mix repeats a tiny slice), tape stops, bit-crush and sample-rate drops,
                  risers, sub drops and crushed impacts
No voices of any kind.
Writes punk.wav and score.json (beat numbers for the chart).

Run:  python3 circlepit-compose.py      (needs numpy + scipy)
Then: ffmpeg -i punk.wav -b:a 192k CirclePit.mp3, and copy score.json into songs/circlepit-score.js.
Form (bars): Boot 0-4 / Kick 4-12 / Breakbeat 12-28 / Stutter 28-36 / Chorus 36-44 / Breakbeat 2 44-52 / Chorus 2 52-60 /
Stop (tape stop, kick roll) 60-64 / Breakdown (half time) 64-72 / Crush 72-80 / Final chorus 80-88 / End 88-92.
"""
import json
import numpy as np
from scipy import signal

SR = 44100
BPM = 200
BEAT = 60 / BPM
T0 = 0.5
BARS = 92
N = int((T0 + BARS * 4 * BEAT + 6.0) * SR)
rng = np.random.default_rng(4096)

def bt(b): return T0 + b * BEAT
def bar(k): return bt(k * 4)
def mtof(m): return 440.0 * 2 ** ((np.asarray(m, float) - 69) / 12)
NOTE = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
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

kick_b, brk, syn, lead_b, keys, fxb, sub_b = (Bus() for _ in range(7))
score = {k: [] for k in ('gtr', 'kick', 'snare', 'crash', 'china', 'ride', 'tom', 'stick', 'shout', 'slide', 'lead',
                         'chord', 'beat', 'feedback', 'stop', 'boom', 'impact', 'glitch')}
GLITCH = []                                  # stutters / tape stops / crush, applied to the finished mix at the end
KICKS_AT = []                                # hardcore kick times (for the sidechain pump)

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
def crush(x, bits=6, ds=4):
    """bit-crush + sample-rate reduction (the digital grit)"""
    y = x[::ds].repeat(ds)[:len(x)]
    if len(y) < len(x): y = np.pad(y, (0, len(x) - len(y)))
    q = 2 ** (bits - 1)
    return np.round(y * q) / q
def stretch(x, rate):
    """resample (rate > 1 = higher and shorter)"""
    n = int(len(x) / rate)
    return np.interp(np.arange(n) * rate, np.arange(len(x)), x)

# ---- the hardcore kick -------------------------------------------------------------------------
def hkick(m, d, drive=16, bend=0.0):
    """distorted, pitched hardcore kick. m = the note its tail rings on, d = length (s). bend = semitones the tail falls"""
    n = int((d + 0.015) * SR); t = np.arange(n) / SR
    fe = float(mtof(m)) * 2 ** (-bend / 12 * np.clip(t / max(d, 0.05), 0, 1))
    f = fe + 460 * np.exp(-t / 0.016) + 90 * np.exp(-t / 0.09)
    x = np.sin(2 * np.pi * phase(f, n))
    e = np.minimum(1, t / 0.0008) * (0.62 + 0.38 * np.exp(-t / 0.06)) * np.clip((d - t) / 0.012, 0, 1)
    y = np.tanh(drive * x * e)
    y = np.clip(1.5 * y + 0.06 * np.sin(2 * np.pi * 3 * fe * t), -1, 1)        # hard clip, with a buzz on top
    y = lp(y, 9000) * np.maximum(e, 0) ** 0.3
    k = int(0.003 * SR); y[:k] += hp(nz(k), 3000) * 0.6                        # the click
    return y

def play_kicks(notes, drive=16, oct_=-12, long_scale=1.0, bend=0.0, g=1.0):
    """the riff, played by hardcore kicks: 'm' notes = short kicks, 'o' notes = long ringing kicks"""
    for b, L, r, typ in notes:
        d = 0.14 if typ == 'm' else min(L * BEAT * long_scale, 1.1)
        kick_b.add(bt(b), hkick(r + oct_, d, drive, bend if typ == 'o' else 0), 0.62 * g)
        KICKS_AT.append(bt(b))
        score['gtr'].append([round(b, 3), L, r, typ]); score['kick'].append(round(b, 3))

# ---- the breakbeat ------------------------------------------------------------------------------
def vintage(x):                                  # make a drum sound like an old sampled break
    return crush(lp(x, 9500), 12, 2)
def mk_bkick(v):
    r = np.random.default_rng(v); n = int(0.22 * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * phase(55 + 110 * np.exp(-t / 0.02), n)) * np.exp(-t / 0.08)
    x += 0.3 * bp(r.standard_normal(n), 1000, 5000) * np.exp(-t / 0.005)
    return vintage(np.tanh(1.5 * x))
def mk_snare(v):
    r = np.random.default_rng(100 + v); n = int(0.25 * SR); t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * phase(190 + 80 * np.exp(-t / 0.012), n)) * np.exp(-t / 0.045)
    nse = bp(r.standard_normal(n), 1500, 10000) * np.exp(-t / 0.09)
    crack = hp(r.standard_normal(n), 3500) * np.exp(-t / 0.005)
    return vintage(np.tanh(1.8 * (0.8 * tone + 1.0 * nse + 0.8 * crack)))
def mk_hat(v):
    r = np.random.default_rng(500 + v); n = int(0.045 * SR); t = np.arange(n) / SR
    return vintage(hp(r.standard_normal(n), 7000, 3) * np.exp(-t / 0.012))
def mk_crash(v, d=1.8):
    r = np.random.default_rng(200 + v); n = int(d * SR); t = np.arange(n) / SR
    return vintage(hp(r.standard_normal(n), 3000, 2) * np.exp(-t / (d * 0.3)) * np.minimum(1, t / 0.002))
def mk_china(v):                                 # a crushed, trashy noise hit
    r = np.random.default_rng(300 + v); n = int(0.8 * SR); t = np.arange(n) / SR
    x = bp(r.standard_normal(n), 1800, 8000) * np.exp(-t / 0.2) * (1 + 0.8 * np.sin(2 * np.pi * 520 * t))
    return crush(np.tanh(2 * x), 5, 6)
def mk_tom(m):                                   # a pitched FM "zap" (used in the fills)
    n = int(0.22 * SR); t = np.arange(n) / SR; f = float(mtof(m))
    x = np.sin(2 * np.pi * phase(f * (1 + 1.5 * np.exp(-t / 0.02)), n) + 2.5 * np.exp(-t / 0.04) * np.sin(2 * np.pi * phase(f * 2.01, n)))
    return crush(np.tanh(2 * x * np.exp(-t / 0.07)), 7, 3)

BK = [mk_bkick(i) for i in range(3)]; SN = [mk_snare(i) for i in range(4)]; GH = [mk_snare(10 + i) * 0.4 for i in range(3)]
HT = [mk_hat(i) for i in range(4)]; CRS = [mk_crash(i) for i in range(3)]; CHN = [mk_china(i) for i in range(2)]

def SN_(b, g=1.0, pitch=1.0, rec=True, pan=0.05):
    s = SN[rng.integers(4)]
    if pitch != 1.0: s = stretch(s, pitch)
    brk.add(bt(b), s, 0.48 * g, pan)
    if rec: score['snare'].append(round(b, 3))
def BK_(b, g=1.0): brk.add(bt(b), BK[rng.integers(3)], 0.4 * g)
def CR(b, g=1.0, pan=0.35):
    brk.add(bt(b), CRS[rng.integers(3)], 0.2 * g, pan); score['crash'].append(round(b, 3))
def CH(b, g=1.0):
    brk.add(bt(b), CHN[rng.integers(2)], 0.16 * g, -0.4); score['china'].append(round(b, 3))
def TOM(b, m, pan=0.0, g=1.0):
    brk.add(bt(b), mk_tom(m), 0.3 * g, pan); score['tom'].append([round(b, 3), m])

# 16 steps per bar: K kick, S snare, g ghost snare, r = 32nd-note snare roll, . nothing
BREAKS = {
    'A': 'K.K.S..g.gK.S..g',
    'B': 'K.K.S..g.S.KS.g.',
    'C': 'K.K.S.gS.gK.S.SS',
    'D': 'K.K.S.SSS.SSrrrr',
    'E': 'K..KS..gK.K.S.g.',
    'H': 'K.......S.......',                      # half time
    'X': 'KgSgKgSgKgSgSSrr',                      # double-time chop
}
def breakbeat(k, pat='A', hats=True, crash=False, g=1.0, pitch=1.0):
    b0 = k * 4
    for i, c in enumerate(BREAKS[pat]):
        b = b0 + i * 0.25
        if c == 'K': BK_(b, g)
        elif c == 'S': SN_(b, g, pitch)
        elif c == 'g': brk.add(bt(b), GH[rng.integers(3)], 0.5 * g, 0.1)
        elif c == 'r':
            for j in range(2): SN_(b + j * 0.125, g * (0.55 + 0.25 * j), pitch * (1 + 0.06 * i / 16), rec=False)
        if hats and i % 2 == 0 and c != 'r': brk.add(bt(b), HT[rng.integers(4)], (0.13 if i % 4 == 0 else 0.09) * g, -0.25)
    if crash: CR(b0, 0.9)
    score['beat'].append([b0, pat])

# ---- synths ------------------------------------------------------------------------------
def supersaw(ms, d, bright=5200):
    n = int((d + 0.1) * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in ms:
        for det in (-18, -9, -3, 3, 9, 18):
            x += saw(float(mtof(m)) * 2 ** (det / 1200), n, rng.random())
    x /= 6 * len(ms)
    e = np.minimum(1, t / 0.01) * np.clip((d + 0.1 - t) / 0.1, 0, 1)
    return lp(x * e, bright)

def chip(m, d, glide=None, crushy=True):
    """square + FM chip lead with a fast slide in from the last note"""
    n = int((d + 0.03) * SR); t = np.arange(n) / SR; f0 = float(mtof(m))
    f = np.full(n, f0) if glide is None else f0 * 2 ** ((glide - m) / 12 * np.exp(-t / 0.025))
    f = f * 2 ** (0.18 / 12 * np.sin(2 * np.pi * 7 * t) * np.clip((t - 0.12) / 0.1, 0, 1))
    ph = phase(f, n)
    x = np.where((ph % 1) < 0.25, 1.0, -1.0) * 0.55 + 0.45 * np.sin(2 * np.pi * ph + 1.8 * np.exp(-t / 0.05) * np.sin(4 * np.pi * ph))
    x *= np.minimum(1, t / 0.003) * np.clip((d + 0.02 - t) / 0.02, 0, 1)
    return crush(x, 8, 2) if crushy else x

def fmkey(m, d):
    """cold FM keys (glassy electric piano)"""
    n = int(d * SR); t = np.arange(n) / SR; f = float(mtof(m))
    mod = np.sin(2 * np.pi * f * 14 * t) * 1.2 * np.exp(-t / 0.05) + np.sin(2 * np.pi * f * t) * 0.8 * np.exp(-t / 0.4)
    return np.sin(2 * np.pi * f * t + mod) * np.exp(-t / (d * 0.35)) * np.minimum(1, t / 0.002)

def noise_riser(d):
    n = int(d * SR); t = np.arange(n) / SR; u = t / d
    src = nz(n); x = np.zeros(n); fc = 400 * (30 ** u)
    for i in range(0, n, 1024):
        j = min(n, i + 1024); x[i:j] = bp(src[i:j], fc[i] * 0.6, min(fc[i] * 1.6, 19000), 1)
    return crush(x * u ** 2, 8, 2)

def boom(b, g=1.0):
    n = int(1.3 * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * phase(30 + 34 * np.exp(-t / 0.22), n)) * np.exp(-t / 0.55) * np.minimum(1, t / 0.004)
    sub_b.add(bt(b), np.tanh(1.5 * x), 0.5 * g); score['boom'].append(b)

def impact(b, word='BREAK', g=1.0):
    """a reverse noise swell sucked into a crushed noise blast, with a sub drop"""
    d = 2 * BEAT; n = int(d * SR); t = np.arange(n) / SR
    fxb.add(bt(b) - d, hp(nz(n), 2000) * (t / d) ** 3, 0.25 * g)
    m = int(0.6 * SR); tt = np.arange(m) / SR
    fxb.add(bt(b), crush(np.tanh(3 * bp(nz(m), 300, 9000) * np.exp(-tt / 0.15)), 4, 8), 0.3 * g)
    boom(b, g)
    score['impact'].append([b, word])

def glitch(b, word, beats=0.5, slice_=0.125):
    """a stutter edit (applied to the whole mix at the end): the sound jams on a tiny slice"""
    GLITCH.append((bt(b), 'stutter', beats * BEAT, slice_ * BEAT))
    score['shout'].append([round(b, 3), word]); score['glitch'].append(round(b, 3))

def chord_of(notes):
    for b, L, r, typ in notes:
        if abs(b - round(b / 4) * 4) < 0.01: score['chord'].append([round(b), r])

# ---- riffs (8th notes per bar; 'E' long tonal kick, 'e' short kick, 'e+e' two 16ths, '-' hold, '.' rest) ----
ROOT = {'E': 40, 'F': 41, 'F#': 42, 'G': 43, 'Ab': 44, 'A': 45, 'Bb': 46, 'B': 47, 'C': 48, 'C#': 49, 'D': 50, 'D#': 51}
def parse(lines, start_bar, mel=False):
    """8 tokens per bar. Riffs: chord letters (lower case = short). Melodies (mel=True): note names like 'E5'"""
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
                if mel: cur = [b + j * 0.5 / len(parts), 0.5 / len(parts), midi(p)]
                else: cur = [b + j * 0.5 / len(parts), 0.5 / len(parts), ROOT[p[0].upper() + p[1:]], 'm' if p[0].islower() else 'o']
    if cur: out.append(cur)
    return out

CHORD = {40: [52, 55, 59], 48: [52, 55, 60], 43: [50, 55, 59], 50: [50, 54, 57], 45: [52, 57, 60], 47: [51, 54, 59]}   # Em, C, G, D, Am, B

# ==== Boot 0-4: cold FM keys, a digital drone, stutters, a crushed riser, four kick hits ===============
for k, ms in enumerate([[64, 67, 71, 74], [64, 67, 71, 76], [62, 67, 71, 74], [63, 66, 71, 75]]):
    for i, m in enumerate(ms): keys.add(bar(k) + i * 0.035, fmkey(m, 1.6), 0.13, -0.3 + 0.2 * i)
    for j in range(8):                                                               # a crushed arpeggio, getting louder
        keys.add(bt(k * 4 + j * 0.5), crush(fmkey(ms[j % 4] + 12, 0.25), 6, 3), 0.04 + 0.012 * k, 0.5 if j % 2 else -0.5)
n0 = int(bt(12) * SR); tt = np.arange(n0) / SR
drone = (np.sin(2 * np.pi * 82.4 * tt) + 0.5 * np.sin(2 * np.pi * 164.8 * 1.003 * tt)) * np.clip(tt / bt(12), 0, 1) ** 2
fxb.add(0, crush(np.tanh(3 * drone), 7, 2) * 0.12, 1.0); score['feedback'].append([0, 12])
glitch(6, 'ERR', 1.0, 0.125); glitch(10, 'ERR', 0.5, 0.0625)
fxb.add(bt(8), noise_riser(8 * BEAT), 0.35); score['slide'].append([8, 16])
for i in range(4):
    kick_b.add(bt(12 + i), hkick(28, 0.2, 18), 0.6); KICKS_AT.append(bt(12 + i)); score['stick'].append(12 + i); score['kick'].append(12 + i)
for i in range(8): SN_(14 + i * 0.25, 0.4 + 0.6 * i / 8, 1 + i * 0.04, rec=False)
impact(16, 'BREAK')

# ==== Kick 4-12: the riff on hardcore kicks over the break ===============================================
RIFF_A = ['E - e e G - A -', 'e e e e Bb - A -', 'E - e e G - A -', 'C - - D - - Bb -']
RIFF_A2 = ['E - e e G - A -', 'e e e e Bb - A -', 'E - e e G - A -', 'D - D - D - D+D D+D']
intro = parse(RIFF_A + RIFF_A2, 4); play_kicks(intro); chord_of(intro)
for k in range(4, 12): breakbeat(k, 'AB'[k % 2] if k != 11 else 'D', crash=(k % 4 == 0), g=0.85)
glitch(46, 'ERR', 0.5, 0.125); glitch(47, 'ERR', 0.5, 0.0625)

# ==== Breakbeat 12-28: chopped break, kick riff, a crushed chip counter-line =================================
VERSE = ['e e e e e e G -', 'e e e e e e A -', 'e e e e e e Bb A', 'G - - - F# - - -']
VERSE_END = ['e e e e e e G -', 'e e e e e e A -', 'e e e e e e Bb A', 'G - G - Bb - B -']
v1 = parse(VERSE * 3 + VERSE_END, 12); play_kicks(v1); chord_of(v1)
for k in range(12, 28):
    breakbeat(k, 'ABCA'[k % 4] if k % 8 != 7 else 'D', crash=(k % 4 == 0))
    if k % 4 == 3: glitch(k * 4 + 2, 'ERR', 1.0, [0.125, 0.0625][k % 8 // 4])
    if k % 2 == 1:                                                                    # a crushed chip arpeggio answers every other bar
        r = [g for g in v1 if k * 4 <= g[0] < k * 4 + 4][-1][2]
        for j in range(8): lead_b.add(bt(k * 4 + j * 0.25), chip(r + 24 + [0, 7, 12, 15, 12, 7, 3, 0][j], 0.07), 0.05, 0.4)
impact(48, 'CORE'); impact(80, 'BREAK', 0.8)
fxb.add(bt(110), noise_riser(2 * BEAT), 0.3); score['slide'].append([110, 112])

# ==== Stutter 28-36: half time, the riff jams and stutters =====================================================
TWO = ['E - - e . e G -', 'A - - a . a Bb -', 'E - - e . e G -', 'C - - - B - - -']
t2 = parse(TWO * 2, 28); play_kicks(t2, bend=7); chord_of(t2)
for k in range(28, 36): breakbeat(k, 'H' if k % 2 == 0 else 'E', crash=(k % 2 == 0))
for k in (29, 31, 33, 35): glitch(k * 4 + 3, 'NO', 1.0, 0.0625)
for i in range(8): TOM(35 * 4 + 2 + i * 0.25, [76, 74, 71, 69, 67, 64, 62, 59][i], -0.6 + 0.17 * i)
impact(112, 'BREAK')
fxb.add(bt(142), noise_riser(2 * BEAT), 0.3); score['slide'].append([142, 144])

# ==== Chorus 36-44 / 52-60 / 80-88: a hardcore kick on every beat (on the chord root), pumping supersaws, the chip lead ======
CHO = ['C C C C C C C C', 'G G G G G G G G', 'D D D D D D D D', 'E E E E E E E E']
MEL = ['E5 - G5 - B5 - A5 G5', 'D5 - - G5 - F#5 - D5', 'A5 - F#5 A5 D6 - C6 B5', 'B5 - - - G5+A5 B5 E6 -',
       'E6 - D6 - C6 - B5 G5', 'B5 - A5 G5 F#5 - D5 -', 'F#5 G5 A5 - D6 C6 A5 F#5', 'E5 - - - E6 - . .']
def play_lead(k0, gain=0.15):
    prev = None
    for b, L, m in parse(MEL, k0, mel=True):
        lead_b.add(bt(b), chip(m, L * BEAT, prev if prev is not None and abs(prev - m) <= 5 else None), gain, 0.05)
        lead_b.add(bt(b) + 0.11, chip(m + 12, L * BEAT * 0.8), gain * 0.25, -0.4)          # a crushed echo an octave up
        prev = m
        score['lead'].append([b, L, m])
def chorus(k0, final=False):
    notes = parse(CHO * 2, k0); chord_of(notes)
    for kk in range(8):
        k = k0 + kk; r = notes[kk * 8][2]
        for h in range(4):                                                            # four on the floor, ringing kicks
            b = k * 4 + h
            kick_b.add(bt(b), hkick(r - 12, 0.26, 18), 0.62); KICKS_AT.append(bt(b)); score['kick'].append(b)
        score['gtr'] += [[round(k * 4 + j * 0.5, 3), 0.5, r, 'o'] for j in range(8)]
        syn.add(bar(k), supersaw([m + 12 for m in CHORD[r]], 4 * BEAT), 0.3, 0)
        sub_b.add(bar(k), np.sin(2 * np.pi * phase(float(mtof(r - 12)), int(4 * BEAT * SR))) * 0.8, 0.22)
        pat = 'D' if kk == 7 else ('X' if final and kk % 2 else 'ABAC'[kk % 4])
        breakbeat(k, pat, crash=(kk % 2 == 0), g=0.9 if final else 0.8)
        if kk % 2 == 1: glitch(k * 4, 'X', 0.5, 0.125); glitch(k * 4 + 2, 'X', 0.5, 0.0625)
    play_lead(k0, 0.18 if final else 0.16)
    impact(k0 * 4, 'CORE', 1.1)
chorus(36)

# ==== Breakbeat 2 44-52: faster chops, 16th kick pairs ===============================================
VERSE2 = ['e+e e e+e e e e G -', 'e+e e e+e e e e A -', 'e+e e e+e e e e Bb A', 'G - - - F# - - -']
v2 = parse(VERSE2 + VERSE2[:3] + ['G - G - Bb - B -'], 44); play_kicks(v2, drive=20); chord_of(v2)
for k in range(44, 52):
    breakbeat(k, 'XCXD'[k % 4], crash=(k % 4 == 0), pitch=1.06)
    if k % 4 == 3: glitch(k * 4 + 2, 'ERR', 1.0, 0.0625)
impact(176, 'BREAK')
for i in range(8): TOM(206 + i * 0.25, [79, 76, 74, 71, 67, 64, 62, 59][i], 0.6 - 0.17 * i)

# ==== Chorus 2 52-60 ==================================================================================
chorus(52)

# ==== Stop 60-64: tape stop, single hits, then a kick roll rising in pitch, "GO" ================================
GLITCH.append((bar(60) - 0.45, 'tapestop', 0.45, 0))
score['stop'].append([240, 256])
STOP = ['E - - - . . . .', 'E - . . E - . .', 'E . E . E . E .', 'e+e e+e e+e e+e e+e e+e e+e e+e']
st = parse(STOP, 60); chord_of(st)
roll = 0
for b, L, r, typ in st:
    if b < 252:
        kick_b.add(bt(b), hkick(r - 12, 0.4, 20, bend=5), 0.65); CR(b, 0.7); CH(b, 0.6); SN_(b, 0.9)
    else:                                                                             # the roll: each kick a semitone higher
        kick_b.add(bt(b), hkick(28 + roll, 0.07, 20), 0.55); roll += 1
    KICKS_AT.append(bt(b)); score['gtr'].append([round(b, 3), L, r, typ]); score['kick'].append(round(b, 3))
for i in range(16): SN_(252 + i * 0.25, 0.35 + 0.65 * i / 16, 1 + i * 0.05, rec=(i % 4 == 0))
fxb.add(bt(252), noise_riser(4 * BEAT), 0.4); score['slide'].append([252, 256])
glitch(255, 'GO', 1.0, 0.03125)

# ==== Breakdown 64-72: half time, enormous tonal kicks that bend down, crushed noise on the quarters ==========
BRK = ['E - - e - e E -', 'e - e - Bb - - -', 'E - - e - e E -', 'e - e - G - F# -']
br = parse(BRK * 2, 64); play_kicks(br, drive=24, long_scale=1.2, bend=12, g=1.1); chord_of(br)
for k in range(64, 72):
    breakbeat(k, 'H', hats=False, g=1.1)
    for i in range(4): CH(k * 4 + i, 1.0 if i == 0 else 0.6)
    if k % 2 == 1: glitch(k * 4 + 2, 'ERR', 0.5, 0.0625)
    if k % 2 == 0: boom(k * 4, 1.2)
impact(256, 'BREAK', 1.3)
fxb.add(bt(286), noise_riser(2 * BEAT), 0.3); score['slide'].append([286, 288])

# ==== Crush 72-80: heavier — huge hits every 1.5 beats, then 16th kick runs; the whole mix is decimated ======
MOSH = ['E - - E - - E -', '- - e+e e+e e+e e+e Bb -', 'E - - E - - E -', '- - e+e e+e e+e e+e F# -']
mo = parse(MOSH * 2, 72); play_kicks(mo, drive=26, bend=12, g=1.15); chord_of(mo)
for k in range(72, 80):
    b0 = k * 4
    if k % 2 == 0:
        boom(b0, 1.3)
        for h in (0, 1.5, 3): CH(b0 + h, 1.1); SN_(b0 + h, 0.8, 0.8)
    else:
        SN_(b0 + 3, 1.2); CR(b0 + 3, 0.9)
GLITCH.append((bar(72), 'crush', 8 * 4 * BEAT, 0))
for i in range(12): TOM(317 + i * 0.25, [83, 81, 79, 76, 74, 71, 69, 67, 64, 62, 59, 55][i], -0.6 + 0.1 * i)
glitch(300, 'ERR', 0.5, 0.0625); glitch(302, 'ERR', 0.5, 0.03125)
glitch(318, 'GO', 1.0, 0.03125)
impact(288, 'CORE', 1.3)
fxb.add(bt(316), noise_riser(4 * BEAT), 0.4); score['slide'].append([316, 320])

# ==== Final chorus 80-88: everything, with double-time chops ==================================================
chorus(80, final=True)

# ==== End 88-92: four hits, the last kick rings, cold keys, and the tape stops ===============================
for b in (352, 353, 354, 355):
    kick_b.add(bt(b), hkick(28, 0.25, 22), 0.65); KICKS_AT.append(bt(b)); CR(b, 0.9); SN_(b, 1.0)
    score['gtr'].append([b, 1, 40, 'o']); score['kick'].append(b)
for i in range(12): TOM(354 + i / 6, [76, 74, 71, 69, 67, 64][i // 2], 0.5 - i / 12)
kick_b.add(bt(356), hkick(28, 3.0, 26, bend=3), 0.7); KICKS_AT.append(bt(356)); score['gtr'].append([356, 12, 40, 'o']); score['kick'].append(356)
CR(356, 1.2); CH(356, 1.0); impact(356, 'CORE', 1.4)
for i, m in enumerate([64, 67, 71, 74, 78]): keys.add(bt(357) + i * 0.04, fmkey(m, 3.0), 0.1, -0.4 + 0.2 * i)
GLITCH.append((bt(362), 'tapestop', 1.2, 0))

# ---- mix ----------------------------------------------------------------------------------------------
def comp(st, thr=0.3, ratio=4.0, att=0.003, rel=0.08, makeup=1.0):
    lvl = np.max(np.abs(st), axis=0)
    a = np.exp(-1 / (att * SR)); r = np.exp(-1 / (rel * SR))
    e = signal.lfilter([1 - r], [1, -r], lvl)
    e = np.maximum(e, signal.lfilter([1 - a], [1, -a], lvl))
    g = np.where(e > thr, (thr + (e - thr) / ratio) / np.maximum(e, 1e-9), 1.0)
    return st * g * makeup

def room(st, decay=0.9, dur=1.4, bright=6500):
    tt = np.arange(int(dur * SR)) / SR; out = []
    for ch in range(2):
        ir = rng.standard_normal(len(tt)) * np.exp(-tt / (decay / 6.9))
        ir = lp(ir, bright); ir[:int(0.01 * SR)] = 0
        ir /= np.sqrt(np.sum(ir ** 2))
        out.append(signal.fftconvolve(st[ch], ir)[:N])
    return np.vstack(out)

# sidechain: everything except the kick ducks on every hardcore kick
duck = np.ones(N)
for t in KICKS_AT:
    i = int(t * SR); m = min(N - i, int(0.22 * SR))
    if m > 0: duck[i:i + m] = np.minimum(duck[i:i + m], 1 - 0.75 * np.exp(-np.arange(m) / SR / 0.06))
K_ = kick_b.stereo()
B_ = comp(brk.stereo(), 0.3, 4, makeup=1.3) * (0.55 + 0.45 * duck)
S_ = syn.stereo() * duck
L_ = lead_b.stereo() * (0.5 + 0.5 * duck)
verb = room(B_ * 0.25 + L_ * 0.6 + keys.stereo() * 0.8 + S_ * 0.3, 1.0, 1.6)
mix = K_ * 1.0 + B_ * 0.9 + S_ * 0.8 + L_ * 1.0 + keys.stereo() * 1.0 + fxb.stereo() * 1.0 + sub_b.stereo() * duck * 0.8 + verb * 0.3
mix -= np.mean(mix, axis=1, keepdims=True)
mix = np.vstack([hp(mix[0], 28, 2), hp(mix[1], 28, 2)])
mix /= np.max(np.abs(mix))

# glitch edits on the whole mix (like edits in a DAW, after the sound is made)
for t, kind, dur, sl in sorted(GLITCH):
    i = int(t * SR); n = min(int(dur * SR), mix.shape[1] - i - 1)
    if kind == 'stutter':                                                               # repeat the first slice
        s = max(64, int(sl * SR)); piece = mix[:, i:i + s].copy()
        w = np.ones(s); f = min(48, s // 4); w[:f] = np.linspace(0, 1, f); w[-f:] = np.linspace(1, 0, f)
        for j in range(0, n, s):
            m = min(s, n - j); mix[:, i + j:i + j + m] = piece[:, :m] * w[:m] * (1 - 0.3 * j / n)
    elif kind == 'tapestop':                                                            # the tape slows to a stop
        u = np.arange(n) / n; pos = np.cumsum(1 - u)
        seg = mix[:, i:i + int(pos[-1]) + 2].copy()
        for ch in range(2): mix[ch, i:i + n] = np.interp(pos, np.arange(seg.shape[1]), seg[ch]) * (1 - u ** 3)
    elif kind == 'crush':
        for ch in range(2): mix[ch, i:i + n] = 0.55 * mix[ch, i:i + n] + 0.45 * crush(mix[ch, i:i + n], 6, 5)

mix = comp(mix, 0.45, 3, 0.005, 0.12)
mix /= np.max(np.abs(mix))
pk = np.max(np.abs(mix), axis=0)
pk = np.maximum.reduce([np.roll(pk, -i) for i in range(0, int(0.004 * SR), 8)])
DRIVE, THR = 2.6, 0.9
gl = np.minimum(1, THR / np.maximum(pk * DRIVE, 1e-6))
rel = np.exp(-1 / (0.08 * SR))
gl = signal.lfilter([1 - rel], [1, -rel], gl[::-1])[::-1]
gl = np.minimum(gl, np.minimum(1, THR / np.maximum(pk * DRIVE, 1e-6)) * 1.1)
mix = np.tanh(mix * DRIVE * gl / THR * 0.9) * THR
endi = int(bt(371) * SR)
mix = mix[:, :endi]
mix[:, -int(1.0 * SR):] *= np.linspace(1, 0, int(1.0 * SR)) ** 1.5
mix *= 0.96 / np.max(np.abs(mix))

from scipy.io import wavfile
wavfile.write('punk.wav', SR, (mix.T * 32767).astype(np.int16))
for key in score:
    if score[key] and not isinstance(score[key][0], list): score[key] = sorted(set(score[key]))
    elif score[key]: score[key].sort(key=lambda v: v[0])
score['end'] = round(mix.shape[1] / SR, 2)
json.dump(score, open('score.json', 'w'), default=lambda o: o.item() if hasattr(o, 'item') else o)
print('done', mix.shape[1] / SR, {k: len(v) for k, v in score.items() if isinstance(v, list)})
