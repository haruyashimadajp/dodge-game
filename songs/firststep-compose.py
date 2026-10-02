"""First Step — original song for the dodge game (the beginner song).
108 BPM cheerful pop in C major: a bell melody, plucked chords, soft drums.
Beat 0 at t = 0.5 s; 1 beat = 0.5556 s; 1 bar = 2.222 s.
Writes firststep.wav and score.json (beat times for the chart).

Run:  python3 firststep-compose.py      (needs numpy + scipy)
Then: ffmpeg -i firststep.wav -b:a 160k FirstStep.mp3, and copy score.json into songs/firststep-score.js.
Form (bars): intro 0-4 / A 4-12 / B 12-20 / chorus 20-28 / bridge 28-32 / chorus 32-40 / outro 40-43.
"""
import json
import numpy as np
from scipy import signal

SR = 44100
BPM = 108
BEAT = 60 / BPM
T0 = 0.5
BARS = 43
N = int((T0 + BARS * 4 * BEAT + 3.0) * SR)
rng = np.random.default_rng(7)

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

drums, bass, keys, lead = (Bus() for _ in range(4))

def tvec(d): return np.arange(int(d * SR)) / SR
def noise(d): return rng.standard_normal(int(d * SR))
def lp(x, fc, o=2): return signal.sosfilt(signal.butter(o, min(fc, SR * 0.45), 'low', fs=SR, output='sos'), x)
def hp(x, fc, o=2): return signal.sosfilt(signal.butter(o, fc, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=2): return signal.sosfilt(signal.butter(o, [lo, min(hi, SR * 0.45)], 'band', fs=SR, output='sos'), x)
def env(dur, a=0.004, r=0.05):
    tt = tvec(dur)
    return np.minimum(1, tt / max(a, 1e-4)) * np.clip((dur - tt) / max(r, 1e-4), 0, 1)

def bell(m, dur):
    """soft FM bell (the melody)"""
    tt = tvec(dur); f = float(mtof(m))
    idx = 2.2 * np.exp(-tt / 0.25)
    s = np.sin(2 * np.pi * f * tt + idx * np.sin(2 * np.pi * f * 3.5 * tt))
    s += 0.3 * np.sin(2 * np.pi * f * 2 * tt) * np.exp(-tt / 0.4)
    return s * np.exp(-tt / (0.35 + 0.25 * dur)) * env(dur, 0.003, 0.08)

def pluck(m, dur=0.5):
    """plucked string-ish chord tone (a decaying, darkening saw)"""
    tt = tvec(dur); f = float(mtof(m))
    ph = (f * tt + rng.random()) % 1.0
    s = 2 * ph - 1
    s = lp(s, 2500) * np.exp(-tt / 0.18) + 0.4 * np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.25)
    return s * env(dur, 0.002, 0.05)

def pad(ms, dur):
    tt = tvec(dur)
    s = sum(np.sin(2 * np.pi * float(mtof(m)) * tt + 0.3 * np.sin(2 * np.pi * 0.5 * tt)) for m in ms) / len(ms)
    return s * env(dur, 0.4, 0.6)

def basstone(m, dur):
    tt = tvec(dur); f = float(mtof(m))
    s = np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(2 * np.pi * 2 * f * tt)
    return s * np.exp(-tt / 0.6) * env(dur, 0.005, 0.05)

def kick():
    tt = tvec(0.3)
    f = 50 + 120 * np.exp(-tt / 0.03)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.18)
def clap():
    d = 0.25; s = np.zeros(int(d * SR))
    for o in (0, 0.01, 0.02):
        i = int(o * SR); s[i:] += bp(noise(d - o), 900, 4000) * np.exp(-tvec(d - o) / 0.05)
    return s * 0.5
def shaker(): return hp(noise(0.06), 6000) * np.exp(-tvec(0.06) / 0.02)
def chime():
    tt = tvec(2.0)
    return sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.8) for f in (1568, 2093, 2637)) / 3

score = {'kick': [], 'clap': [], 'chime': []}
def K(b, g=1.0): drums.add(bt(b), kick(), 0.5 * g); score['kick'].append(b)
def C(b, g=1.0): drums.add(bt(b), clap(), 0.3 * g, 0.1); score['clap'].append(b)
def SH(b, g=1.0): drums.add(bt(b), shaker(), 0.12 * g, -0.3)
def CH(b): lead.add(bt(b), chime(), 0.12); score['chime'].append(b)

CH_ = {'C': [48, 60, 64, 67], 'G': [43, 59, 62, 67], 'Am': [45, 60, 64, 69], 'F': [41, 60, 65, 69], 'Dm': [38, 62, 65, 69], 'Em': [40, 59, 64, 67]}
VERSE = ['C', 'G', 'Am', 'F']
CHORUS = ['F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C']
def chord(k):
    if 20 <= k < 28: return CHORUS[k - 20]
    if 32 <= k < 40: return CHORUS[k - 32]
    if 28 <= k < 32: return ['Dm', 'Em', 'F', 'G'][k - 28]
    return VERSE[k % 4]

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

MEL_A = ['E5 - G5 - C6 - - -', 'B5 - G5 - D5 - - -', 'C5 - E5 - A5 - G5 -', 'F5 - - - . . . .']
MEL_A2 = ['E5 - G5 - C6 - D6 -', 'B5 - - - G5 - - -', 'A5 - G5 - E5 - C5 -', 'D5 - - - . . . .']
MEL_B = ['A5 - . A5 G5 - E5 -', 'G5 - - - D5 - - -', 'E5 - . E5 D5 - C5 -', 'C5 - - - . . G5 -']
MEL_C = ['A5 - C6 - F6 - E6 -', 'D6 - - - B5 - G5 -', 'G5 - B5 - E6 - D6 -', 'C6 - - - A5 - - -',
         'A5 - C6 - F6 - E6 -', 'D6 - - - B5 - D6 -', 'E6 - D6 - C6 - D6 -', 'C6 - - - - - . .']
melA = parse(MEL_A + MEL_A2, 4)
melB = parse(MEL_B * 2, 12)
chorus1 = parse(MEL_C, 20)
chorus2 = parse(MEL_C, 32)

for k in range(BARS):
    B = k * 4
    cn = chord(k); ms = CH_[cn]
    if k < 4:                                          # intro: chimes + soft plucks
        if k % 2 == 0: CH(B)
        for e in (0, 1.5, 3): keys.add(bt(B + e), pluck(ms[1 + int(e) % 3] + 12, 0.6), 0.12)
        if k >= 2: K(B, 0.6)
    elif k < 40:
        K(B); K(B + 2)
        if k >= 12: C(B + 1); C(B + 3)
        elif k >= 8: C(B + 3, 0.7)
        if k >= 20: K(B + 2.5, 0.6)
        for e in range(8): SH(B + e * 0.5, 0.6 if e % 2 else 0.3)
        for e in range(8):
            if e % 2 == 1 or k >= 20: keys.add(bt(B + e * 0.5), pluck(ms[1 + e % 3], 0.4), 0.16 if e % 2 else 0.09, 0.2 if e % 2 else -0.2)
        for e, L in ((0, 1.5), (1.5, 1), (2.5, 1.5)) if k >= 12 else ((0, 2), (2, 2)):
            bass.add(bt(B + e), basstone(ms[0], L * BEAT), 0.4)
        if 28 <= k < 32: keys.add(bt(B), pad([m + 12 for m in ms[1:]], 4 * BEAT), 0.08)
    else:                                              # outro: last chord, chime
        if k == 40:
            K(B); CH(B)
            for m in ms[1:]: keys.add(bt(B), bell(m + 12, 4 * BEAT), 0.12)
            bass.add(bt(B), basstone(ms[0], 4 * BEAT), 0.4)
for b0 in (80, 128): drums.add(bt(b0), hp(noise(2.0), 4000) * np.exp(-tvec(2.0) / 0.6), 0.12)   # cymbal at the choruses
for (b, L, m) in melA + melB + chorus1 + chorus2:
    lead.add(bt(b), bell(m, L * BEAT + 0.2), 0.3, 0.05)
for (b, L, m) in chorus1 + chorus2:
    lead.add(bt(b), bell(m - 12, L * BEAT + 0.2), 0.1, -0.2)

def reverb(st, mix, dur=2.0, decay=0.5):
    tt = np.arange(int(dur * SR)) / SR
    out = []
    for ch in range(2):
        ir = lp(rng.standard_normal(len(tt)) * np.exp(-tt / decay), 5000); ir /= np.sqrt(np.sum(ir ** 2))
        out.append(signal.fftconvolve(st[ch], ir)[:N])
    return np.vstack(out) * mix
mix = drums.stereo() + bass.stereo() + keys.stereo() + lead.stereo()
mix = mix + reverb(lead.stereo() + keys.stereo() * 0.6, 0.3)
mix -= np.mean(mix, axis=1, keepdims=True)
mix = np.tanh(mix / np.max(np.abs(mix)) * 1.3) / np.tanh(1.3)
endi = int((bar(41) + 2.5) * SR)
mix = mix[:, :endi]
mix[:, -int(1.5 * SR):] *= np.linspace(1, 0, int(1.5 * SR))
mix *= 0.92 / np.max(np.abs(mix))

from scipy.io import wavfile
wavfile.write('firststep.wav', SR, (mix.T * 32767).astype(np.int16))
score.update({'end': round(mix.shape[1] / SR, 2),
              'melA': [list(n) for n in melA], 'melB': [list(n) for n in melB],
              'chorus1': [list(n) for n in chorus1], 'chorus2': [list(n) for n in chorus2]})
json.dump(score, open('score.json', 'w'), default=lambda o: o.item())
print('done', mix.shape[1] / SR)
