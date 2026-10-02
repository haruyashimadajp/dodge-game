"""Abyss — original song for the dodge game (slow bullets, but hard).
90 BPM deep-sea ambient / dub in D minor. Beat 0 at t = 0.5 s; 1 beat = 0.6667 s; 1 bar = 2.667 s.
Sounds: sonar pings with echoes, a deep sub-bass that swells, whale-song glides, a slow pad,
a glassy kalimba melody (bioluminescence), a heartbeat kick and bubbles.
Writes abyss.wav and score.json (beat times for the chart).

Run:  python3 abyss-compose.py      (needs numpy + scipy)
Then: ffmpeg -i abyss.wav -b:a 160k Abyss.mp3, and copy score.json into songs/abyss-score.js.
Form (bars): surface 0-4 / descent 4-12 / jellyfish 12-20 / dark water 20-28 / rising 28-30 / leviathan 30-40 / end 40-42.
"""
import json
import numpy as np
from scipy import signal

SR = 44100
BPM = 90
BEAT = 60 / BPM
T0 = 0.5
BARS = 42
N = int((T0 + BARS * 4 * BEAT + 4.0) * SR)
rng = np.random.default_rng(1000)

def bt(b): return T0 + b * BEAT
def bar(k): return bt(k * 4)
def mtof(m): return 440.0 * 2 ** ((np.asarray(m, float) - 69) / 12)
NOTE = {'C': 0, 'C#': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'Bb': 10, 'B': 11}
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

drums, bass, pads, lead, fxb = (Bus() for _ in range(5))

def tvec(d): return np.arange(int(d * SR)) / SR
def noise(d): return rng.standard_normal(int(d * SR))
def lp(x, fc, o=2): return signal.sosfilt(signal.butter(o, min(fc, SR * 0.45), 'low', fs=SR, output='sos'), x)
def hp(x, fc, o=2): return signal.sosfilt(signal.butter(o, fc, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=2): return signal.sosfilt(signal.butter(o, [lo, min(hi, SR * 0.45)], 'band', fs=SR, output='sos'), x)
def env(dur, a=0.004, r=0.05):
    tt = tvec(dur)
    return np.minimum(1, tt / max(a, 1e-4)) * np.clip((dur - tt) / max(r, 1e-4), 0, 1)
def osc(f, n): return 2 * np.pi * np.cumsum(np.broadcast_to(np.asarray(f, float), (n,))) / SR

def ping(f=1760, dur=1.6):
    """sonar ping: a pure sine with a soft click and a fast fall"""
    tt = tvec(dur)
    s = np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.35) + 0.3 * np.sin(2 * np.pi * f * 2.01 * tt) * np.exp(-tt / 0.1)
    return s * env(dur, 0.002, 0.2)

def kalimba(m, dur):
    tt = tvec(dur); f = float(mtof(m))
    s = np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.6) + 0.35 * np.sin(2 * np.pi * f * 5.4 * tt) * np.exp(-tt / 0.06)
    s += 0.2 * np.sin(2 * np.pi * f * 2 * tt) * np.exp(-tt / 0.3)
    return s * env(dur, 0.002, 0.15)

def whale(m0, m1, dur):
    """whale song: a slow vocal-like glide with formants"""
    tt = tvec(dur); n = len(tt)
    curve = m0 + (m1 - m0) * (0.5 - 0.5 * np.cos(np.pi * tt / dur)) + 0.3 * np.sin(2 * np.pi * 4.5 * tt) * (tt / dur)
    f = mtof(curve)
    ph = osc(f, n)
    s = np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.3 * np.sin(3 * ph)
    s = bp(s, 300, 1400) * 2 + 0.4 * np.sin(ph)
    return s * np.sin(np.pi * np.clip(tt / dur, 0, 1)) ** 1.5

def sub(m, dur):
    tt = tvec(dur); f = float(mtof(m))
    s = np.sin(2 * np.pi * f * tt) + 0.15 * np.tanh(3 * np.sin(2 * np.pi * f * tt))
    return s * np.minimum(1, tt / 0.15) * np.clip((dur - tt) / 0.4, 0, 1)

def pad(ms, dur):
    tt = tvec(dur); n = len(tt)
    s = np.zeros(n)
    for m in ms:
        for d in (-0.08, 0.08):
            ph = (np.cumsum(np.full(n, float(mtof(m)) * 2 ** (d / 12))) / SR + rng.random()) % 1.0
            s += 2 * ph - 1
    s = lp(s / (2 * len(ms)), 900)
    return s * env(dur, 1.2, 1.2)

def heart(g=1.0):
    tt = tvec(0.5)
    def thump(t0, a):
        x = np.zeros(len(tt)); m = tt >= t0; u = tt[m] - t0
        x[m] = a * np.sin(2 * np.pi * (42 + 60 * np.exp(-u / 0.04)) * u) * np.exp(-u / 0.12)
        return x
    return (thump(0, 1) + thump(0.16, 0.6)) * g
def tick(): return hp(noise(0.03), 5000) * np.exp(-tvec(0.03) / 0.008)
def bubbles(dur):
    out = np.zeros(int(dur * SR))
    for _ in range(int(dur * 9)):
        t0 = rng.uniform(0, dur - 0.1); f0 = rng.uniform(500, 1600); d = 0.05
        tt = tvec(d); s = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 2 * tt / d)) / SR) * np.exp(-tt / 0.015)
        i = int(t0 * SR); out[i:i + len(s)] += s * rng.uniform(0.2, 0.6)
    return out

score = {'kick': [], 'ping': [], 'whale': []}
def K(b, g=1.0): drums.add(bt(b), heart(g), 0.5); score['kick'].append(b)
def HT(b, g=1.0): drums.add(bt(b), tick(), 0.1 * g, rng.uniform(-0.5, 0.5))
def P(b, f=1760, g=1.0):
    for i, (d, a, pn) in enumerate(((0, 1, 0), (0.75, 0.35, -0.6), (1.5, 0.15, 0.6))):    # ping + 2 echoes
        fxb.add(bt(b + d), ping(f), 0.16 * g * a, pn)
    score['ping'].append(b)
def WH(b, m0, m1, beats):
    fxb.add(bt(b), whale(m0, m1, beats * BEAT), 0.16, rng.uniform(-0.3, 0.3)); score['whale'].append([b, beats, m0, m1])

CH = {'Dm': [38, 62, 65, 69], 'Bb': [34, 62, 65, 70], 'Gm': [43, 62, 67, 70], 'A': [45, 61, 64, 69], 'F': [41, 60, 65, 69], 'C': [36, 60, 64, 67]}
PROG = ['Dm', 'Bb', 'Gm', 'A']
PROG2 = ['Dm', 'F', 'C', 'Gm', 'Dm', 'Bb', 'Gm', 'A']

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
            cur = [b, 0.5, midi(tok)]
    if cur: notes.append(tuple(cur))
    return notes

# kalimba: glittering 8ths (bioluminescence); the chart reads these
MEL_A = ['D5 A5 F5 A5 E5 A5 F5 A5', 'D5 Bb5 F5 Bb5 D5 Bb5 F5 D6', 'D5 G5 Bb5 G5 D6 G5 Bb5 G5', 'C#5 E5 A5 E5 C#6 A5 E5 A5']
MEL_B = ['A5 - F5 - D6 - C6 -', 'A5 - - - F5 G5 A5 -', 'G5 - E5 - C6 - Bb5 -', 'A5 - - - . . . .']
MEL_C = ['D6 - A5 D6 F6 - E6 D6', 'C6 - A5 C6 F6 - E6 C6', 'C6 - G5 C6 E6 - D6 C6', 'Bb5 - G5 Bb5 D6 - C6 Bb5',
         'D6 - A5 D6 F6 - G6 F6', 'D6 - Bb5 D6 F6 - E6 D6', 'Bb5 - G5 Bb5 D6 - E6 F6', 'E6 - C#6 - A5 - - -']
melA = parse(MEL_A * 2, 4)
melB = parse(MEL_B * 2, 12)
melC = parse(MEL_C, 30) + parse(MEL_C[:2], 38)

for k in range(BARS):
    B = k * 4
    name = PROG2[(k - 30) % 8] if 30 <= k < 40 else PROG[k % 4]
    ms = CH[name]
    if k < 40: pads.add(bar(k), pad(ms[1:], 4 * BEAT + 1.0), 0.16 if k >= 4 else 0.08 + 0.02 * k)
    if k % 2 == 0 and k < 40: P(B, 1760 if k < 20 or k >= 30 else 1320)
    if 20 <= k < 28: P(B + 2, 1320, 0.8)                         # dark water: pings every 2 beats
    if k >= 4 and k < 40:
        K(B, 0.8 if k < 12 else 1.0)
        if k >= 12: K(B + 2.5, 0.7)
        bass.add(bt(B), sub(ms[0], 4 * BEAT), 0.5 if k >= 12 else 0.35)
        if k >= 12:
            for e in range(8): HT(B + e * 0.5 + 0.25, 0.5 + 0.5 * (e % 2))
    if k in (2, 9, 17, 23, 27, 33, 37): WH(B, 50 + (k % 3) * 2, 57 + (k % 4), 6)
    if 28 <= k < 30:                                            # rising: bubbles + swelling sub
        fxb.add(bar(k), bubbles(4 * BEAT), 0.1 + 0.08 * (k - 28))
        bass.add(bar(k), sub(26 + (k - 28) * 7, 4 * BEAT), 0.5)
    if k == 40:
        bass.add(bar(40), sub(38, 8 * BEAT), 0.5); pads.add(bar(40), pad([62, 65, 69, 74], 8 * BEAT), 0.18)
        P(B, 1760, 1.2); WH(B, 55, 50, 8)
for b in (k * 4 for k in range(4, 40, 4)): fxb.add(bt(b), bubbles(2.0), 0.06)

for (b, L, m) in melA: lead.add(bt(b), kalimba(m, L * BEAT + 0.5), 0.13, 0.25 if (b * 2) % 2 else -0.25)
for (b, L, m) in melB: lead.add(bt(b), kalimba(m, L * BEAT + 0.8), 0.2, 0)
for (b, L, m) in melC:
    lead.add(bt(b), kalimba(m, L * BEAT + 0.5), 0.2, 0.05)
    lead.add(bt(b), kalimba(m - 12, L * BEAT + 0.5), 0.07, -0.2)

def reverb(st, mix, dur=4.0, decay=1.2):
    tt = np.arange(int(dur * SR)) / SR
    out = []
    for ch in range(2):
        ir = lp(rng.standard_normal(len(tt)) * np.exp(-tt / decay), 3500); ir /= np.sqrt(np.sum(ir ** 2))
        out.append(signal.fftconvolve(st[ch], ir)[:N])
    return np.vstack(out) * mix
dry = drums.stereo() + bass.stereo() + pads.stereo() + lead.stereo() + fxb.stereo()
mix = dry + reverb(lead.stereo() + fxb.stereo() + pads.stereo() * 0.5, 0.45)
mix -= np.mean(mix, axis=1, keepdims=True)
mix = np.tanh(mix / np.max(np.abs(mix)) * 1.4) / np.tanh(1.4)
endi = int((bar(42) + 1.5) * SR)
mix = mix[:, :endi]
mix[:, -int(3 * SR):] *= np.linspace(1, 0, int(3 * SR))
mix *= 0.92 / np.max(np.abs(mix))

from scipy.io import wavfile
wavfile.write('abyss.wav', SR, (mix.T * 32767).astype(np.int16))
score.update({'end': round(mix.shape[1] / SR, 2), 'melA': [list(n) for n in melA], 'melB': [list(n) for n in melB], 'melC': [list(n) for n in melC]})
json.dump(score, open('score.json', 'w'), default=lambda o: o.item())
print('done', mix.shape[1] / SR)
