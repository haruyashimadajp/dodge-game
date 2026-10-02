"""Ward 13 — original song for the dodge game (horror).
100 BPM dark industrial horror. Beat 0 at t = 0.5 s; 1 beat = 0.6 s; 1 bar = 2.4 s.
Sounds: a low drone, lone dissonant piano notes, footsteps, metal scrapes and bangs, radio static,
a heartbeat, an air-raid siren, a dissonant choir, a distorted industrial beat in the chases,
and jump-scare stingers. Writes ward13.wav and score.json (beat times for the chart).

Run:  python3 ward13-compose.py      (needs numpy + scipy)
Then: ffmpeg -i ward13.wav -b:a 160k Ward13.mp3, and copy score.json into songs/ward13-score.js.
Form (bars): entrance 0-8 / corridor 8-16 / siren 16-20 / otherworld 20-32 / cctv 32-36 / run 36-46 / end 46-48.
"""
import json
import numpy as np
from scipy import signal

SR = 44100
BPM = 100
BEAT = 60 / BPM
T0 = 0.5
BARS = 48
N = int((T0 + BARS * 4 * BEAT + 4.0) * SR)
rng = np.random.default_rng(13)

def bt(b): return T0 + b * BEAT
def bar(k): return bt(k * 4)
def mtof(m): return 440.0 * 2 ** ((np.asarray(m, float) - 69) / 12)

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

drums, low, mid, fxb = (Bus() for _ in range(4))

def tvec(d): return np.arange(int(d * SR)) / SR
def noise(d): return rng.standard_normal(int(d * SR))
def lp(x, fc, o=2): return signal.sosfilt(signal.butter(o, min(fc, SR * 0.45), 'low', fs=SR, output='sos'), x)
def hp(x, fc, o=2): return signal.sosfilt(signal.butter(o, fc, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=2): return signal.sosfilt(signal.butter(o, [lo, min(hi, SR * 0.45)], 'band', fs=SR, output='sos'), x)
def env(dur, a=0.004, r=0.05):
    tt = tvec(dur)
    return np.minimum(1, tt / max(a, 1e-4)) * np.clip((dur - tt) / max(r, 1e-4), 0, 1)
def osc(f, n): return 2 * np.pi * np.cumsum(np.broadcast_to(np.asarray(f, float), (n,))) / SR
def saw(f, n, ph0=None): return 2 * ((osc(f, n) / (2 * np.pi) + (rng.random() if ph0 is None else ph0)) % 1.0) - 1

def drone(m, dur):
    n = int(dur * SR); tt = tvec(dur)
    s = sum(saw(mtof(m) * 2 ** (d / 12) * (1 + 0.002 * np.sin(2 * np.pi * 0.1 * tt + d)), n) for d in (-0.2, 0, 0.13, 0.95))
    s = lp(s / 4, 300 + 150 * np.sin(2 * np.pi * 0.05 * dur) ** 2)
    return s * env(dur, 2.0, 2.0)

def piano(m, dur=3.0, g=1.0):
    """detuned, slightly out-of-tune piano note"""
    tt = tvec(dur); f = float(mtof(m))
    s = np.zeros_like(tt)
    for h, a in ((1, 1), (2, 0.5), (3, 0.3), (4, 0.15), (5.02, 0.1)):
        for d in (0.997, 1.004):
            s += a * np.sin(2 * np.pi * f * h * d * tt) * np.exp(-tt * (1.2 + h * 0.6))
    s[:int(0.004 * SR)] += noise(0.004) * 0.3
    return s * 0.25 * g * env(dur, 0.002, 0.4)

def step():
    d = 0.18; tt = tvec(d)
    s = lp(noise(d), 600) * np.exp(-tt / 0.03) + 0.5 * np.sin(2 * np.pi * 70 * tt) * np.exp(-tt / 0.04)
    return s
def bang():
    d = 1.2; tt = tvec(d)
    s = sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt / (0.2 + 0.4 * rng.random())) for f in (113, 227, 389, 611, 893, 1517))
    s = s / 6 + lp(noise(d), 1200) * np.exp(-tt / 0.06)
    return np.tanh(s * 2)
def scrape(dur):
    tt = tvec(dur); n = len(tt)
    f = 900 + 400 * np.sin(2 * np.pi * 0.7 * tt) + 120 * rng.standard_normal(n).cumsum() / np.sqrt(n) * 3
    s = np.sin(osc(f, n)) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 23 * tt)))
    return bp(s + 0.3 * noise(dur), 600, 3000) * env(dur, 0.2, 0.4)
def static(dur):
    s = hp(noise(dur), 1500) * (0.6 + 0.4 * (rng.random(int(dur * SR)) > 0.97))
    return s * env(dur, 0.02, 0.05)
def heart(g=1.0):
    tt = tvec(0.5)
    def thump(t0, a):
        x = np.zeros(len(tt)); m = tt >= t0; u = tt[m] - t0
        x[m] = a * np.sin(2 * np.pi * (40 + 50 * np.exp(-u / 0.04)) * u) * np.exp(-u / 0.12)
        return x
    return (thump(0, 1) + thump(0.17, 0.65)) * g
def siren(dur):
    """air-raid siren: slow rise and fall, a little rough"""
    tt = tvec(dur); n = len(tt)
    ph = (tt / dur)
    f = 180 + 520 * np.where(ph < 0.55, np.clip(ph / 0.55, 0, 1) ** 0.7, 1 - np.clip((ph - 0.55) / 0.45, 0, 1) ** 1.4 * 0.75)
    s = np.sin(osc(f, n)) + 0.45 * np.sin(osc(f * 2.01, n)) + 0.25 * np.sign(np.sin(osc(f, n)))
    s = lp(s, 2500) * (0.85 + 0.15 * np.sin(2 * np.pi * 7 * tt))
    return s * env(dur, 1.0, 1.5)
def choir(ms, dur):
    """dissonant 'aah' choir: buzzy voices through a vowel filter"""
    tt = tvec(dur); n = len(tt)
    s = np.zeros(n)
    for m in ms:
        for d in (-0.12, 0.1):
            f = mtof(m) * 2 ** (d / 12) * (1 + 0.004 * np.sin(2 * np.pi * 5 * tt + rng.random() * 6))
            s += saw(f, n)
    s = bp(s, 500, 1100) * 1.5 + bp(s, 2300, 2900) * 0.6
    return s / len(ms) * env(dur, 0.8, 1.0)
def kick(g=1.0):
    tt = tvec(0.35)
    f = 45 + 160 * np.exp(-tt / 0.02)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.18)
    return np.tanh(s * 4) * 0.8 * g
def metal():
    d = 0.3; tt = tvec(d)
    s = sum(np.sin(2 * np.pi * f * tt) for f in (330, 512, 787, 1210)) / 4 * np.exp(-tt / 0.08)
    return np.tanh((s + bp(noise(d), 1500, 6000) * np.exp(-tt / 0.05)) * 3)
def stinger():
    """jump scare: a reversed swell into a huge dissonant hit"""
    d = 2.0; tt = tvec(d); n = len(tt)
    hit = np.zeros(n)
    for m in (36, 37, 48, 49, 55, 61, 66, 67, 73):
        hit += saw(mtof(m), n) * np.exp(-tt / 0.6)
    hit = np.tanh(hit / 3 * 3) + lp(noise(d), 3000) * np.exp(-tt / 0.08) * 1.5
    return hit * env(d, 0.002, 0.5)
def swell(dur):
    tt = tvec(dur)
    return (hp(noise(dur), 300) * 0.5 + choir([60, 61, 66], dur) * 2) * (tt / dur) ** 3

score = {'heart': [], 'kick': [], 'bang': [], 'piano': [], 'scare': [], 'step': []}
def H(b, g=1.0): drums.add(bt(b), heart(g), 0.55); score['heart'].append(b)
def K(b, g=1.0): drums.add(bt(b), kick(g), 0.5); score['kick'].append(b)
def MT(b, g=1.0): drums.add(bt(b), metal(), 0.22 * g, rng.uniform(-0.4, 0.4))
def BANG(b, g=1.0): fxb.add(bt(b), bang(), 0.35 * g, rng.uniform(-0.6, 0.6)); score['bang'].append(b)
def P(b, m, g=1.0): mid.add(bt(b), piano(m, g=g), 0.5, rng.uniform(-0.3, 0.3)); score['piano'].append([b, m])
def STEP(b, g=1.0, pan=0.0): fxb.add(bt(b), step(), 0.25 * g, pan); score['step'].append(b)
def SCARE(b):
    fxb.add(bt(b) - 1.2, swell(1.2), 0.25)
    fxb.add(bt(b), stinger(), 0.45); score['scare'].append(b)

PIANO = [64, 65, 71, 60, 63, 64, 70, 59]      # lonely, wrong-sounding notes (half steps, tritones)

for k in range(BARS):
    B = k * 4
    if k < 46 and k % 4 == 0 and not (32 <= k < 36):
        low.add(bar(k), drone(28 if k < 20 else 29, 4 * 4 * BEAT + 2), 0.35)
    if k < 16:                                         # entrance / corridor: piano, footsteps far away
        if k % 2 == 0: P(B + (k % 4) * 0.5, PIANO[k % 8] + (12 if k >= 8 else 0), 0.8 + 0.1 * (k >= 8))
        if 4 <= k < 16:
            for q in (0, 1, 2, 3): STEP(B + q, 0.3 + 0.5 * (k - 4) / 12, -0.6 + 1.2 * ((k + q) % 7) / 7)
        if k in (3, 7, 11, 14): BANG(B + 3.5, 0.8)
        if k in (5, 13): fxb.add(bar(k), scrape(3.0), 0.12, 0.5)
    if 8 <= k < 16:
        H(B); H(B + 2)
    if 16 <= k < 20:                                   # siren
        if k == 16: fxb.add(bar(16), siren(4 * 4 * BEAT), 0.3)
        H(B); H(B + 1.5); H(B + 2); H(B + 3)
        fxb.add(bar(k), static(4 * BEAT) * np.linspace(0.1, 1, int(4 * BEAT * SR)) ** 2, 0.04 + 0.03 * (k - 16))
    if 20 <= k < 32 or 36 <= k < 46:                   # otherworld / run: industrial beat
        fast = k >= 36
        for q in range(4):
            K(B + q, 0.9 if q % 2 == 0 else 0.7)
            if fast or q % 2: MT(B + q + 0.5, 0.8)
        if fast:
            for q in (1, 3): K(B + q + 0.75, 0.6)
        MT(B + 1); MT(B + 3)
        if k % 2 == 0: mid.add(bar(k), choir([60, 61, 66] if k % 4 == 0 else [59, 60, 65], 8 * BEAT), 0.12)
        if k % 4 == 3: BANG(B + 3.5)
        if k % 2 == 1: P(B + 2, PIANO[k % 8] + 24, 0.7)
    if 32 <= k < 36:                                   # cctv: only hum, static and steps
        if k == 32: fxb.add(bar(32), static(0.3), 0.15)
        mid.add(bar(k), lp(np.sin(2 * np.pi * 60 * tvec(4 * BEAT)) + 0.3 * np.sin(2 * np.pi * 180 * tvec(4 * BEAT)), 400), 0.08)
        for q in (0, 2): STEP(B + q + (k % 2) * 0.5, 0.7, 0.3)
        if k == 35: H(B); H(B + 1); H(B + 2); H(B + 2.5); H(B + 3); H(B + 3.5)
    if k == 46:
        P(B, 52, 1.2); P(B + 0.5, 53, 0.9)
SCARE(96); SCARE(144); SCARE(186)

def reverb(st, mix, dur=3.0, decay=0.9):
    tt = np.arange(int(dur * SR)) / SR
    out = []
    for ch in range(2):
        ir = lp(rng.standard_normal(len(tt)) * np.exp(-tt / decay), 4000); ir /= np.sqrt(np.sum(ir ** 2))
        out.append(signal.fftconvolve(st[ch], ir)[:N])
    return np.vstack(out) * mix
dry = drums.stereo() + low.stereo() + mid.stereo() + fxb.stereo()
mix = dry + reverb(mid.stereo() + fxb.stereo() + drums.stereo() * 0.3, 0.4)
mix -= np.mean(mix, axis=1, keepdims=True)
mix = np.tanh(mix / np.max(np.abs(mix)) * 1.5) / np.tanh(1.5)
endi = int((bar(48) + 1.0) * SR)
mix = mix[:, :endi]
mix[:, -int(1.0 * SR):] *= np.linspace(1, 0, int(1.0 * SR))
mix *= 0.92 / np.max(np.abs(mix))

from scipy.io import wavfile
wavfile.write('ward13.wav', SR, (mix.T * 32767).astype(np.int16))
score['end'] = round(mix.shape[1] / SR, 2)
json.dump(score, open('score.json', 'w'), default=lambda o: o.item())
print('done', mix.shape[1] / SR)
