"""Prism — original song for the dodge game (a song made of beams of light).
128 BPM melodic trance in B minor / D major (the last drop goes up a half step). Beat 0 at t = 0.5 s;
1 beat = 0.46875 s; 1 bar = 1.875 s.
Sounds: a felt piano, a glassy FM arpeggio (the beams in the chart follow it), supersaw chords that duck under the kick,
a bright saw lead, an offbeat bass, kick / clap / hats, white-noise risers, reverse swells and a "zap" for the big beams.
Writes prism.wav and score.json (beat times for the chart).

Run:  python3 prism-compose.py      (needs numpy + scipy)
Then: ffmpeg -i prism.wav -b:a 160k Prism.mp3, and copy score.json into songs/prism-score.js.
Form (bars): prelude 0-8 / spectrum 8-16 / string art 16-24 / kaleidoscope 24-28 / rise 28-30 / opus 30-42 /
             mirror 42-46 / nocturne 46-50 / masterpiece 50-60 / fin 60-62.
"""
import json
import numpy as np
from scipy import signal

SR = 44100
BPM = 128
BEAT = 60 / BPM
T0 = 0.5
BARS = 62
N = int((T0 + BARS * 4 * BEAT + 6.0) * SR)
rng = np.random.default_rng(2026)

def bt(b): return T0 + b * BEAT
def bar(k): return bt(k * 4)
def mtof(m): return 440.0 * 2 ** ((np.asarray(m, float) - 69) / 12)
NOTE = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
def midi(n): return 12 * (int(n[-1]) + 1) + NOTE[n[:-1]]

class Bus:
    def __init__(self):
        self.L = np.zeros(N, np.float32); self.R = np.zeros(N, np.float32)
    def add(self, t, sig, gain=1.0, pan=0.0):
        i = int(round(t * SR))
        if i >= N or len(sig) == 0: return
        n = min(len(sig), N - i)
        self.L[i:i + n] += (sig[:n] * gain * np.cos((pan + 1) * np.pi / 4) * np.sqrt(2)).astype(np.float32)
        self.R[i:i + n] += (sig[:n] * gain * np.sin((pan + 1) * np.pi / 4) * np.sqrt(2)).astype(np.float32)
    def stereo(self): return np.vstack([self.L, self.R])

drums, bass, chords, lead, keys, fxb = (Bus() for _ in range(6))

def tvec(d): return np.arange(int(d * SR)) / SR
def noise(d): return rng.standard_normal(int(d * SR))
def lp(x, fc, o=2): return signal.sosfilt(signal.butter(o, min(fc, SR * 0.45), 'low', fs=SR, output='sos'), x)
def hp(x, fc, o=2): return signal.sosfilt(signal.butter(o, fc, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=2): return signal.sosfilt(signal.butter(o, [lo, min(hi, SR * 0.45)], 'band', fs=SR, output='sos'), x)
def env(dur, a=0.004, r=0.05):
    tt = tvec(dur)
    return np.minimum(1, tt / max(a, 1e-4)) * np.clip((dur - tt) / max(r, 1e-4), 0, 1)
def saw_ph(f, n, ph0=None):
    ph = np.cumsum(np.broadcast_to(np.asarray(f, float), (n,))) / SR + (rng.random() if ph0 is None else ph0)
    return 2 * (ph % 1.0) - 1

def sweep_lp(x, f0, f1):
    """a lowpass whose cutoff glides from f0 to f1 (processed in short blocks)"""
    out = np.zeros_like(x); blk = 1024; zi = None
    for i in range(0, len(x), blk):
        fc = f0 * (f1 / f0) ** (i / max(1, len(x) - 1))
        sos = signal.butter(2, min(fc, SR * 0.45), 'low', fs=SR, output='sos')
        if zi is None: zi = signal.sosfilt_zi(sos) * 0
        out[i:i + blk], zi = signal.sosfilt(sos, x[i:i + blk], zi=zi)
    return out

# ---- instruments -------------------------------------------------------------------
def piano(m, dur):
    tt = tvec(dur); f = float(mtof(m)); s = np.zeros(len(tt))
    for h, a, d in ((1, 1, 1.4), (2, 0.45, 0.8), (3, 0.22, 0.5), (4, 0.12, 0.35), (5, 0.06, 0.25)):
        s += a * np.sin(2 * np.pi * f * h * (1 + 0.0004 * h * h) * tt) * np.exp(-tt / d)
    s += 0.15 * hp(noise(dur), 2000) * np.exp(-tt / 0.01)          # the hammer
    return lp(s, 5000) * env(dur, 0.002, 0.2)

def glass(m, dur, bright=1.0):
    """glassy FM bell — the prism arpeggio"""
    tt = tvec(dur); f = float(mtof(m))
    idx = (1.5 + 2.5 * bright) * np.exp(-tt / 0.12)
    s = np.sin(2 * np.pi * f * tt + idx * np.sin(2 * np.pi * f * 3.5 * tt)) * np.exp(-tt / 0.45)
    s += 0.25 * np.sin(2 * np.pi * f * 2 * tt) * np.exp(-tt / 0.2)
    return s * env(dur, 0.001, 0.12)

def supersaw(ms, dur, cut=3500, voices=5, spread=0.18, a=0.01, r=0.15):
    n = int(dur * SR); s = np.zeros(n)
    for m in ms:
        for v in range(voices):
            d = (v - (voices - 1) / 2) / ((voices - 1) / 2) * spread
            s += saw_ph(float(mtof(m)) * 2 ** (d / 12), n)
    s /= voices * len(ms)
    return 5.0 * lp(s, cut) * env(dur, a, r)

def leadsyn(m, dur, vib=True):
    tt = tvec(dur); n = len(tt)
    f = float(mtof(m)) * (1 + (0.006 * np.sin(2 * np.pi * 5.5 * tt) * np.clip((tt - 0.15) / 0.2, 0, 1) if vib else 0))
    s = sum(saw_ph(f * 2 ** (d / 12), n) for d in (-0.1, 0, 0.1)) / 3
    s = lp(s, 4200) + 0.3 * np.sin(2 * np.pi * np.cumsum(np.broadcast_to(f, (n,))) / SR)
    return s * env(dur, 0.005, 0.08)

def bassyn(m, dur):
    tt = tvec(dur); n = len(tt); f = float(mtof(m))
    s = lp(saw_ph(f, n), 600 + 900 * np.exp(-0.0)) * 0.7 + np.sin(2 * np.pi * f * tt) * 0.6
    return s * env(dur, 0.004, 0.05)

def subsyn(m, dur):
    tt = tvec(dur); f = float(mtof(m))
    return np.sin(2 * np.pi * f * tt) * env(dur, 0.01, 0.2)

def kick(g=1.0):
    tt = tvec(0.42)
    f = 48 + 140 * np.exp(-tt / 0.035)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.28)
    s += 0.25 * hp(noise(0.42), 3000) * np.exp(-tt / 0.004)
    return np.tanh(1.6 * s) * g

def clap():
    tt = tvec(0.35); s = np.zeros(len(tt))
    for d in (0, 0.011, 0.022):
        m = tt >= d; s[m] += np.exp(-(tt[m] - d) / (0.012 if d < 0.02 else 0.13))
    return bp(noise(0.35), 900, 6000) * s

def hat(open_=False):
    d = 0.22 if open_ else 0.05
    return hp(noise(d), 7000) * np.exp(-tvec(d) / (0.07 if open_ else 0.012))

def crash():
    d = 2.6
    return hp(noise(d), 4000) * np.exp(-tvec(d) / 0.7)

def riser(dur):
    tt = tvec(dur); n = len(tt)
    s = sweep_lp(noise(dur), 300, 12000) * (tt / dur) ** 2
    s += 0.25 * np.sin(2 * np.pi * np.cumsum(200 * 8 ** (tt / dur)) / SR) * (tt / dur) ** 2
    return s

def swell(ms, dur):
    """a reversed bell chord that swells up into the next downbeat"""
    s = sum(glass(m, dur, 0.6) for m in ms)
    return s[::-1] * env(dur, 0.01, 0.01)

def zap(m=88, dur=0.7):
    """the beam: a resonant saw falling in pitch, with a shimmering tail"""
    tt = tvec(dur); n = len(tt)
    f = float(mtof(m)) * np.exp(-tt / 0.18) + 80
    s = saw_ph(f, n, 0) * 0.6 + np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR) * 0.5
    s = bp(s, 300, 6000) * np.exp(-tt / 0.25)
    s += 0.2 * hp(noise(dur), 6000) * np.exp(-tt / 0.05)
    return s

# ---- the score -------------------------------------------------------------------
score = {'kick': [], 'clap': [], 'arp': [], 'lead': [], 'piano': [], 'zap': [], 'crash': []}
def K(b, g=1.0): drums.add(bt(b), kick(g), 0.55); score['kick'].append(b)
def CL(b, g=1.0): drums.add(bt(b), clap(), 0.3 * g, 0.05); score['clap'].append(b)
def HH(b, g=1.0, o=False): drums.add(bt(b), hat(o), (0.09 if not o else 0.07) * g, 0.3 if (b * 2) % 2 else -0.2)
def CR(b, g=1.0): drums.add(bt(b), crash(), 0.12 * g, 0); score['crash'].append(b)
def Z(b, m=88, g=1.0): fxb.add(bt(b), zap(m), 0.12 * g, rng.uniform(-0.4, 0.4)); score['zap'].append(b)

# Bm – G – D – A (vi–IV–I–V in D). The last drop is a half step higher (Cm – Ab – Eb – Bb).
CH = {'Bm': [47, 62, 66, 71], 'G': [43, 62, 67, 71], 'D': [50, 62, 66, 69], 'A': [45, 61, 64, 69]}
PROG = ['Bm', 'G', 'D', 'A']
def chord_at(k):
    ms = CH[PROG[k % 4]]
    up = 1 if k >= 50 and k < 60 else 0
    return [m + up for m in ms]

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

# the lead (drops)
LEAD = ['F#5 - - B5 - - A5 -', 'G5 - - D5 - - E5 F#5', 'A5 - - F#5 - - D5 -', 'E5 - - C#5 - - A4 -',
        'F#5 - - B5 - - C#6 -', 'D6 - - B5 - - A5 G5', 'F#5 - - A5 - - D6 -', 'C#6 - - - E6 - C#6 -']
# the piano melody (prelude, nocturne)
PIANO = ['B4 - - - D5 - C#5 -', 'B4 - - - G4 - A4 -', 'F#4 - - - A4 - D5 -', 'C#5 - - - - - . .']
# the counter melody (string art): a plucked line the beams draw
COUNTER = ['B5 . F#5 . D6 . B5 .', 'G5 . D5 . B5 . G5 .', 'A5 . F#5 . D6 . A5 .', 'E5 . C#5 . A5 . C#6 .']

lead_notes = parse(LEAD, 30) + parse(LEAD[:4], 38) + parse(LEAD, 50, 1) + parse(LEAD[:2], 58, 1)
piano_notes = parse(PIANO * 2, 0) + parse(PIANO, 46)
counter_notes = parse(COUNTER * 2, 16)

def arp_pattern(ms, k):
    """8ths (16ths in the drops) broken chord over two octaves"""
    lo = [m for m in ms[1:]]
    seq = [lo[0], lo[1], lo[2], lo[0] + 12, lo[2], lo[1] + 12, lo[2] + 12, lo[1] + 12]
    return seq

for k in range(BARS):
    B = k * 4
    ms = chord_at(k)
    drop = (30 <= k < 42) or (50 <= k < 60)
    # pads / supersaw chords
    if k < 8:
        chords.add(bar(k), supersaw(ms[1:], 4 * BEAT + 0.4, 900, 3, 0.1, 0.6, 0.6), 0.10 + 0.01 * k)
    elif k < 24:
        chords.add(bar(k), supersaw(ms[1:], 4 * BEAT + 0.3, 1600 + 120 * (k - 8), 5, 0.15, 0.2, 0.3), 0.16)
    elif k < 28:                                                       # kaleidoscope: wide, slow
        chords.add(bar(k), supersaw(ms[1:] + [ms[1] + 12], 4 * BEAT + 0.6, 2200, 5, 0.25, 0.5, 0.6), 0.16, 0)
        fxb.add(bar(k + 1) - 2 * BEAT, swell([m + 12 for m in ms[1:]], 2 * BEAT), 0.08)
    elif k < 30:
        chords.add(bar(k), supersaw(ms[1:], 4 * BEAT, 1200 + 1500 * (k - 28), 5, 0.2, 0.05, 0.1), 0.16)
    elif drop or (42 <= k < 46):
        for h in range(8):                                            # pumping 8ths
            chords.add(bt(B + h * 0.5), supersaw(ms[1:] + [ms[1] + 12], 0.5 * BEAT, 5200 if drop else 2200, 7, 0.22, 0.005, 0.05), 0.2 if drop else 0.15)
    elif 46 <= k < 50:
        chords.add(bar(k), supersaw(ms[1:], 4 * BEAT + 0.6, 1000, 3, 0.12, 0.6, 0.6), 0.12)
    # bass
    if 8 <= k < 16:
        bass.add(bar(k), subsyn(ms[0], 4 * BEAT), 0.2)
    if 16 <= k < 24 or 28 <= k < 30 or drop or 42 <= k < 46:
        for h in range(4): bass.add(bt(B + h + 0.5), bassyn(ms[0] + 12, 0.45 * BEAT), 0.28)
        bass.add(bar(k), subsyn(ms[0], 4 * BEAT), 0.2)
    if 46 <= k < 50: bass.add(bar(k), subsyn(ms[0], 4 * BEAT), 0.25)
    # drums
    if 8 <= k < 24 or drop or 42 <= k < 46:
        for h in range(4): K(B + h, 0.85 if k < 16 else 1.0)
        for h in range(4): HH(B + h + 0.5, 1.0, o=drop)
        if k >= 16 or drop:
            CL(B + 1); CL(B + 3)
        if drop or 20 <= k < 24:
            for h in range(16): HH(B + h * 0.25, 0.35 + 0.3 * (h % 2))
    if 28 <= k < 30:                                                    # the rise: snare roll + kick 8ths
        n = 8 if k == 28 else 16
        for h in range(n): CL(B + h * 4 / n, 0.5 + 0.5 * (k - 28 + h / n) / 2)
        if k == 29:
            for h in range(8): K(B + h * 0.5, 0.6 + 0.05 * h)
    if 22 <= k < 24:
        for h in range(8 if k == 22 else 16): CL(B + h * (0.5 if k == 22 else 0.25), 0.4)
    # risers and crashes
    if k in (6, 14, 22, 28, 48): fxb.add(bar(k), riser((4 if k != 28 else 8) * BEAT * (2 if k in (22, 28, 48) else 1)), 0.18)
    if k in (8, 16, 24, 30, 42, 46, 50, 60): CR(B, 1.2 if k in (30, 50) else 0.9)
    # zaps (the big beams): on the drops' downbeats, and the last chord
    if k in (8, 16, 30, 34, 38, 42, 50, 54, 58, 60): Z(B, 90 if k < 50 else 91)
    if drop and k % 2 == 1: Z(B + 3.5, 86, 0.6)
    # the glass arpeggio
    if 8 <= k < 46 or 50 <= k < 60:
        seq = arp_pattern(ms, k)
        step = 0.25 if drop else 0.5
        for i in range(int(4 / step)):
            m = seq[i % 8] + 12
            b = B + i * step
            keys.add(bt(b), glass(m, 0.5, 0.7 if drop else 1.0), 0.07 if drop else 0.1, -0.5 + (i % 8) / 7)
            if step == 0.5 or i % 2 == 0: score['arp'].append([b, m])
    if 0 <= k < 8 or 46 <= k < 50 or k >= 60:                       # piano broken chords
        lo = [ms[0] + 12] + ms[1:]
        for i, m in enumerate([lo[0], lo[2], lo[3], lo[2]] * 2):
            keys.add(bt(B + i * 0.5), piano(m - 12 if i % 4 == 0 else m, 1.4), 0.1, -0.2)
    if k == 60:                                                         # the last chord
        chords.add(bar(60), supersaw([62, 66, 69, 74], 10.0, 2400, 7, 0.25, 0.05, 6.0), 0.2)
        bass.add(bar(60), subsyn(38, 8.0), 0.4)
        K(240, 1.0)
        for m in (74, 78, 81, 86): keys.add(bar(60) + 0.03 * (m - 74), glass(m, 4.0, 0.6), 0.09)

for (b, L, m) in lead_notes:
    lead.add(bt(b), leadsyn(m, L * BEAT + 0.05), 0.3, 0.0)
    lead.add(bt(b), leadsyn(m + 12, L * BEAT + 0.05, False), 0.09, 0.3)
    score['lead'].append([b, L, m])
for (b, L, m) in piano_notes:
    keys.add(bt(b), piano(m + 12, L * BEAT + 1.2), 0.17, 0.1)
    score['piano'].append([b, L, m + 12])
for (b, L, m) in counter_notes:
    keys.add(bt(b), glass(m, 0.8, 1.2), 0.11, 0.25)
    score['piano'].append([b, L, m])
score['piano'].sort()

# ---- sidechain (everything but the drums and the keys ducks under the kick) ----------
duck = np.ones(N, np.float32)
for b in score['kick']:
    i = int(bt(b) * SR); n = int(0.3 * SR)
    if i >= N: continue
    seg = 1 - 0.75 * np.exp(-np.arange(min(n, N - i)) / SR / 0.09)
    duck[i:i + len(seg)] = np.minimum(duck[i:i + len(seg)], seg)
for bus in (chords, bass):
    bus.L *= duck; bus.R *= duck
# chords: wide stereo by delaying one side a little
chords.R = np.concatenate([np.zeros(int(0.012 * SR), np.float32), chords.R[:-int(0.012 * SR)]])

def reverb(st, mix, dur=4.0, decay=1.3):
    tt = np.arange(int(dur * SR)) / SR
    out = []
    for ch in range(2):
        ir = lp(rng.standard_normal(len(tt)) * np.exp(-tt / decay), 6000); ir /= np.sqrt(np.sum(ir ** 2))
        out.append(signal.fftconvolve(st[ch], ir)[:N])
    return np.vstack(out) * mix
def delay(st, beats=0.75, fb=0.35, mix=0.3):
    d = int(beats * BEAT * SR); out = st.copy()
    tap = st.copy()
    for _ in range(4):
        tap = np.roll(tap, d, axis=1) * fb; tap[:, :d] = 0
        tap = tap[::-1]                                                 # ping-pong
        out += tap
    return out * mix
dry = drums.stereo() + bass.stereo() + chords.stereo() + lead.stereo() + keys.stereo() + fxb.stereo()
mix = dry + reverb(keys.stereo() + lead.stereo() * 0.6 + fxb.stereo() + chords.stereo() * 0.3, 0.32) + delay(lead.stereo() + keys.stereo() * 0.5)
mix -= np.mean(mix, axis=1, keepdims=True)
mix = np.tanh(mix / np.max(np.abs(mix)) * 1.6) / np.tanh(1.6)
endi = int((bar(62) + 2.5) * SR)
mix = mix[:, :endi]
mix[:, -int(3 * SR):] *= np.linspace(1, 0, int(3 * SR))
mix *= 0.93 / np.max(np.abs(mix))

from scipy.io import wavfile
wavfile.write('prism.wav', SR, (mix.T * 32767).astype(np.int16))
score['end'] = round(mix.shape[1] / SR, 2)
json.dump(score, open('score.json', 'w'), default=lambda o: o.item())
print('done', mix.shape[1] / SR)
