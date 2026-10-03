"""Candy Pop Parade — original song for the dodge game (cute / fancy).
150 BPM kawaii future bass in F major (the last chorus goes up to G). Beat 0 at t = 0.5 s; 1 beat = 0.4 s; 1 bar = 1.6 s.
Sounds: music box, glockenspiel, a chiptune square lead, cute "ah/oo" vocal chops, future-bass supersaw chords that
wobble and duck under the kick, a bouncy bass, kick / clap / finger snap / hats, toy squeaks, bubble pops and sparkles.
Writes candy.wav and score.json (beat times for the chart).

Run:  python3 candy-compose.py      (needs numpy + scipy)
Then: ffmpeg -i candy.wav -b:a 160k CandyPop.mp3, and copy score.json into songs/candy-score.js.
Form (bars): intro 0-8 / A 8-16 / B (build) 16-24 / chorus 24-40 / bubble break 40-48 / build 48-56 / last chorus 56-72 / end 72-74.
"""
import json
import numpy as np
from scipy import signal

SR = 44100
BPM = 150
BEAT = 60 / BPM
T0 = 0.5
BARS = 74
N = int((T0 + BARS * 4 * BEAT + 5.0) * SR)
rng = np.random.default_rng(777)

def bt(b): return T0 + b * BEAT
def bar(k): return bt(k * 4)
def mtof(m): return 440.0 * 2 ** ((np.asarray(m, float) - 69) / 12)
NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
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
def saw_ph(f, n):
    ph = np.cumsum(np.broadcast_to(np.asarray(f, float), (n,))) / SR + rng.random()
    return 2 * (ph % 1.0) - 1
def sweep_lp(x, f0, f1):
    out = np.zeros_like(x); blk = 1024; zi = None
    for i in range(0, len(x), blk):
        fc = f0 * (f1 / f0) ** (i / max(1, len(x) - 1))
        sos = signal.butter(2, min(fc, SR * 0.45), 'low', fs=SR, output='sos')
        if zi is None: zi = signal.sosfilt_zi(sos) * 0
        out[i:i + blk], zi = signal.sosfilt(sos, x[i:i + blk], zi=zi)
    return out

# ---- instruments ---------------------------------------------------------------------
def musicbox(m, dur=1.4):
    tt = tvec(dur); f = float(mtof(m))
    s = np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.6) + 0.35 * np.sin(2 * np.pi * f * 3.0 * tt) * np.exp(-tt / 0.12)
    s += 0.2 * np.sin(2 * np.pi * f * 5.1 * tt) * np.exp(-tt / 0.04)
    return s * env(dur, 0.001, 0.2)

def glock(m, dur=1.0):
    tt = tvec(dur); f = float(mtof(m))
    s = np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.45) + 0.45 * np.sin(2 * np.pi * f * 2.76 * tt) * np.exp(-tt / 0.15)
    s += 0.25 * np.sin(2 * np.pi * f * 5.4 * tt) * np.exp(-tt / 0.05)
    return s * env(dur, 0.001, 0.1)

def square_lead(m, dur, vib=True):
    """chiptune square with a little pitch blip at the start and a delayed vibrato"""
    tt = tvec(dur); n = len(tt); f0 = float(mtof(m))
    blip = 0.6 * np.exp(-tt / 0.02)
    v = (0.2 * np.sin(2 * np.pi * 6 * tt) * np.clip((tt - 0.12) / 0.1, 0, 1)) if vib else 0
    f = f0 * 2 ** ((blip + v) / 12)
    ph = np.cumsum(f) / SR
    duty = 0.25 + 0.1 * np.sin(2 * np.pi * 0.7 * tt)
    s = np.where((ph % 1.0) < duty, 1.0, -1.0)
    s = lp(s, 6000) * 0.6 + np.sin(2 * np.pi * ph) * 0.4
    return s * env(dur, 0.003, 0.05)

def chop(m, dur, vowel='a'):
    """a cute pitched vocal chop ("ah" / "oo"): a buzzy source through formant filters"""
    tt = tvec(dur); n = len(tt); f0 = float(mtof(m))
    f = f0 * 2 ** ((0.15 * np.sin(2 * np.pi * 5.5 * tt)) / 12)
    src = saw_ph(f, n)
    forms = {'a': [(900, 1.0), (1500, 0.6), (3000, 0.25)], 'o': [(450, 1.0), (850, 0.5), (2600, 0.15)], 'i': [(350, 0.8), (2300, 0.7), (3200, 0.3)]}[vowel]
    s = sum(a * bp(src, fc * 0.85, fc * 1.15) for fc, a in forms)
    s = s / 3 + 0.15 * np.sin(2 * np.pi * np.cumsum(f) / SR)
    return s * env(dur, 0.01, 0.06)

def supersaw(ms, dur, cut=4500, voices=6, spread=0.2, a=0.005, r=0.08):
    n = int(dur * SR); s = np.zeros(n)
    for m in ms:
        for v in range(voices):
            d = (v - (voices - 1) / 2) / ((voices - 1) / 2) * spread
            s += saw_ph(float(mtof(m)) * 2 ** (d / 12), n)
    return 5.0 * lp(s / (voices * len(ms)), cut) * env(dur, a, r)

def wobble_chord(ms, dur, rate):
    """future-bass chord that wobbles (the filter opens and closes rate times per beat)"""
    n = int(dur * SR); s = np.zeros(n)
    for m in ms:
        for d in (-0.15, 0, 0.15):
            s += saw_ph(float(mtof(m)) * 2 ** (d / 12), n)
    s /= 3 * len(ms)
    tt = tvec(dur)
    lfo = 0.5 - 0.5 * np.cos(2 * np.pi * rate / BEAT * tt)
    lo = lp(s, 700); hi = lp(s, 5000)
    return 4.0 * (lo * (1 - lfo) + hi * lfo) * env(dur, 0.005, 0.05)

def bouncy_bass(m, dur):
    tt = tvec(dur); f = float(mtof(m)) * 2 ** ((1.5 * np.exp(-tt / 0.03)) / 12)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.15 * np.tanh(4 * np.sin(ph))
    return s * env(dur, 0.003, 0.04)

def kick(g=1.0):
    tt = tvec(0.35); f = 50 + 150 * np.exp(-tt / 0.025)
    return np.tanh(1.4 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.22)) * g
def clap():
    tt = tvec(0.3); s = np.zeros(len(tt))
    for d in (0, 0.01, 0.02):
        m = tt >= d; s[m] += np.exp(-(tt[m] - d) / (0.01 if d < 0.02 else 0.1))
    return bp(noise(0.3), 1000, 7000) * s
def snap():
    d = 0.1; tt = tvec(d)
    return (bp(noise(d), 2000, 7000) + 0.5 * np.sin(2 * np.pi * 1800 * tt)) * np.exp(-tt / 0.015)
def hat(o=False):
    d = 0.18 if o else 0.04
    return hp(noise(d), 8000) * np.exp(-tvec(d) / (0.06 if o else 0.01))
def squeak(up=True):
    d = 0.18; tt = tvec(d)
    f = (700 + 1400 * (tt / d)) if up else (2100 - 1400 * (tt / d))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / d)
def pop():
    d = 0.08; tt = tvec(d)
    return np.sin(2 * np.pi * np.cumsum(400 + 2600 * (tt / d)) / SR) * np.exp(-tt / 0.02)
def sparkle(n=6):
    out = np.zeros(int(0.6 * SR))
    for i in range(n):
        s = glock(96 + rng.integers(0, 12), 0.3) * 0.5
        j = int(i * 0.05 * SR); out[j:j + len(s)] += s[:len(out) - j]
    return out
def riser(dur):
    tt = tvec(dur)
    return sweep_lp(noise(dur), 400, 12000) * (tt / dur) ** 2 + 0.2 * np.sin(2 * np.pi * np.cumsum(300 * 6 ** (tt / dur)) / SR) * (tt / dur) ** 2

# ---- the score ---------------------------------------------------------------------------
score = {'kick': [], 'clap': [], 'lead': [], 'bell': [], 'chop': [], 'pop': [], 'squeak': [], 'sparkle': []}
def K(b, g=1.0): drums.add(bt(b), kick(g), 0.5); score['kick'].append(b)
def CL(b, g=1.0): drums.add(bt(b), clap(), 0.26 * g, 0.05); score['clap'].append(b)
def SN(b, g=1.0): drums.add(bt(b), snap(), 0.16 * g, -0.2)
def HH(b, g=1.0, o=False): drums.add(bt(b), hat(o), (0.07 if not o else 0.06) * g, 0.3 if (b * 2) % 2 else -0.3)
def SQ(b, up=True): fxb.add(bt(b), squeak(up), 0.07, rng.uniform(-0.6, 0.6)); score['squeak'].append(b)
def PO(b): fxb.add(bt(b), pop(), 0.12, rng.uniform(-0.7, 0.7)); score['pop'].append(b)
def SP(b): fxb.add(bt(b), sparkle(), 0.1, rng.uniform(-0.5, 0.5)); score['sparkle'].append(b)

# F – C – Dm – Bb (I – V – vi – IV); the last chorus is in G
CH = {'F': [41, 65, 69, 72], 'C': [36, 64, 67, 72], 'Dm': [38, 65, 69, 74], 'Bb': [34, 65, 70, 74], 'Gm': [43, 67, 70, 74], 'A': [45, 64, 69, 73]}
PROG = ['F', 'C', 'Dm', 'Bb']
PROG_B = ['Bb', 'C', 'Dm', 'C']
def chord_at(k):
    name = (PROG_B[(k - 16) % 4] if 16 <= k < 24 or 48 <= k < 56 else PROG[k % 4])
    up = 2 if k >= 56 else 0
    return [m + up for m in CH[name]]

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

# melodies (8ths)
INTRO = ['C6 . A5 . F5 . A5 .', 'G5 . E5 . C5 . E5 .', 'A5 . F5 . D5 . F5 .', 'Bb5 . A5 . G5 - . .']
VERSE = ['A5 . C6 A5 G5 . F5 .', 'G5 - E5 . C5 . . .', 'F5 . A5 F5 D6 . C6 .', 'Bb5 - A5 . G5 . . .']
BUILD = ['D6 . D6 . C6 . Bb5 .', 'C6 . C6 . A5 . G5 .', 'A5 . A5 . F5 . A5 .', 'C6 - - - E6 - - -']
CHORUS = ['F6 - E6 F6 - C6 - A5', 'G5 - E5 - C6 - - .', 'D6 - C6 D6 - F6 - E6', 'D6 - C6 - Bb5 - A5 -',
          'F6 - E6 F6 - G6 - A6', 'G6 - E6 - C6 - - .', 'D6 - E6 F6 - G6 - F6', 'E6 - D6 - C6 - - -']
lead_notes = parse(VERSE * 2, 8) + parse(BUILD * 2, 16) + parse(CHORUS * 2, 24) + parse(CHORUS * 2, 56, 2)
bell_notes = parse(INTRO * 2, 0) + parse(INTRO * 2, 40) + parse(BUILD * 2, 48, 12)
chop_notes = []
for k in list(range(24, 40)) + list(range(56, 72)):                 # vocal chops on the off-beats of the chorus
    ms = chord_at(k)
    for i, b in enumerate((k * 4 + 0.5, k * 4 + 1.5, k * 4 + 2.75, k * 4 + 3.5)):
        chop_notes.append((b, 0.4, ms[1 + i % 3] + 12, 'aoia'[i]))

for k in range(BARS):
    B = k * 4; ms = chord_at(k)
    chorus = 24 <= k < 40 or 56 <= k < 72
    # chords
    if k < 8 or 40 <= k < 48:
        chords.add(bar(k), supersaw(ms[1:], 4 * BEAT + 0.3, 1500, 4, 0.12, 0.4, 0.4), 0.09)
    elif chorus:
        for h in range(8):
            chords.add(bt(B + h * 0.5), wobble_chord(ms[1:] + [ms[1] + 12], 0.5 * BEAT, 1.0), 0.24)
    elif k < 72:
        chords.add(bar(k), supersaw(ms[1:], 4 * BEAT + 0.2, 2200 + (300 * (k - 16) if 16 <= k < 24 else 0), 5, 0.15, 0.02, 0.2), 0.12)
    # bass
    if 8 <= k < 40 or 48 <= k < 72:
        pat = [0, 1.5, 2, 3.5] if chorus else [0, 2, 2.5]
        for h in pat: bass.add(bt(B + h), bouncy_bass(ms[0] + 12, 0.45 * BEAT), 0.3)
    # drums
    if 8 <= k < 40 or 48 <= k < 72:
        for h in range(4):
            if chorus or h in (0, 2): K(B + h, 1.0 if chorus else 0.9)
        CL(B + 1); CL(B + 3)
        for h in range(8): HH(B + h * 0.5 + (0.25 if not chorus else 0), 0.7 + 0.3 * (h % 2), o=chorus and h % 2 == 1)
        if not chorus: SN(B + 2.5)
    if k in (22, 23, 54, 55):                                        # build: clap rolls
        n = 8 if k % 2 == 0 else 16
        for h in range(n): CL(B + h * 4 / n, 0.4 + 0.5 * h / n)
    if k in (22, 54): fxb.add(bar(k), riser(8 * BEAT), 0.16)
    # toy squeaks / pops / sparkles
    if 8 <= k < 24 and k % 2 == 1: SQ(B + 3.5, k % 4 == 1)
    if 40 <= k < 48:
        for h in (0.5, 1.75, 2.5, 3.25): PO(B + h)
    if k in (8, 24, 40, 56, 72) or (chorus and k % 4 == 0): SP(B)
    if k == 72:
        chords.add(bar(72), supersaw([67, 71, 74, 79], 6.0, 3000, 6, 0.2, 0.01, 3.5), 0.16)
        bass.add(bar(72), bouncy_bass(43, 3.0), 0.35); K(B)
        for i, m in enumerate((79, 83, 86, 91)): keys.add(bt(B + i * 0.25), glock(m, 2.0), 0.12)

for (b, L, m) in lead_notes:
    lead.add(bt(b), square_lead(m, L * BEAT + 0.03), 0.15, 0.0)
    if b >= 24 * 4: lead.add(bt(b), glock(m + 12, 0.6), 0.04, 0.3)
    score['lead'].append([b, L, m])
for (b, L, m) in bell_notes:
    keys.add(bt(b), musicbox(m) if b < 48 * 4 else glock(m), 0.16, -0.15)
    score['bell'].append([b, m])
for (b, L, m, v) in chop_notes:
    lead.add(bt(b), chop(m, L * BEAT, v), 0.12, rng.uniform(-0.4, 0.4))
    score['chop'].append([b, m])

# sidechain: chords and bass duck under the kick
duck = np.ones(N, np.float32)
for b in score['kick']:
    i = int(bt(b) * SR); n = int(0.25 * SR)
    if i >= N: continue
    seg = 1 - 0.7 * np.exp(-np.arange(min(n, N - i)) / SR / 0.07)
    duck[i:i + len(seg)] = np.minimum(duck[i:i + len(seg)], seg)
for bus in (chords, bass): bus.L *= duck; bus.R *= duck
chords.R = np.concatenate([np.zeros(int(0.01 * SR), np.float32), chords.R[:-int(0.01 * SR)]])

def reverb(st, mix, dur=3.0, decay=1.0):
    tt = np.arange(int(dur * SR)) / SR
    out = []
    for ch in range(2):
        ir = lp(rng.standard_normal(len(tt)) * np.exp(-tt / decay), 7000); ir /= np.sqrt(np.sum(ir ** 2))
        out.append(signal.fftconvolve(st[ch], ir)[:N])
    return np.vstack(out) * mix
dry = drums.stereo() + bass.stereo() + chords.stereo() + lead.stereo() + keys.stereo() + fxb.stereo()
mix = dry + reverb(keys.stereo() + lead.stereo() * 0.5 + fxb.stereo() + chords.stereo() * 0.3, 0.3)
mix -= np.mean(mix, axis=1, keepdims=True)
mix = np.tanh(mix / np.max(np.abs(mix)) * 1.5) / np.tanh(1.5)
endi = int((bar(74) + 1.5) * SR)
mix = mix[:, :endi]
mix[:, -int(2.5 * SR):] *= np.linspace(1, 0, int(2.5 * SR))
mix *= 0.93 / np.max(np.abs(mix))

from scipy.io import wavfile
wavfile.write('candy.wav', SR, (mix.T * 32767).astype(np.int16))
score['end'] = round(mix.shape[1] / SR, 2)
json.dump(score, open('score.json', 'w'), default=lambda o: o.item())
print('done', mix.shape[1] / SR)
