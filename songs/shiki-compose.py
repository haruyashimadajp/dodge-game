"""Shiki (四季, the four seasons) — original song for the dodge game.
100 BPM, about 3 minutes. Koto, shakuhachi, taiko, temple bell, wind chimes, a music box and soft strings.
Beat 0 at t = 0.5 s; 1 beat = 0.6 s; 1 bar = 2.4 s.
Form (bars): prologue 0-4 / spring 4-20 / summer 20-36 / autumn 36-52 / winter 52-66 / rebirth (spring again) 66-74 / end 74-76.
Writes shiki.wav and score.json (beat times for the chart).

Run:  python3 shiki-compose.py      (needs numpy + scipy)
Then: ffmpeg -i shiki.wav -b:a 160k Shiki.mp3, and copy score.json into songs/shiki-score.js.
"""
import json
import numpy as np
from scipy import signal

SR = 44100
BPM = 100
BEAT = 60 / BPM
T0 = 0.5
BARS = 76
N = int((T0 + BARS * 4 * BEAT + 6.0) * SR)
rng = np.random.default_rng(4444)

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

drums, strings, koto_b, flute_b, bells, fxb = (Bus() for _ in range(6))

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

def sweep_bp(x, f0, f1, q=0.35):
    out = np.zeros_like(x); blk = 2048; zi = None
    for i in range(0, len(x), blk):
        fc = f0 * (f1 / f0) ** (i / max(1, len(x) - 1))
        sos = signal.butter(1, [fc * (1 - q), min(fc * (1 + q), SR * 0.45)], 'band', fs=SR, output='sos')
        if zi is None: zi = signal.sosfilt_zi(sos) * 0
        out[i:i + blk], zi = signal.sosfilt(sos, x[i:i + blk], zi=zi)
    return out

# ---- instruments ----------------------------------------------------------------
def koto(m, dur, bend=0.0):
    """plucked silk string: bright inharmonic partials that die fast, a pick noise, and an optional press-bend (oshide)"""
    tt = tvec(dur); n = len(tt); f0 = float(mtof(m))
    f = f0 * 2 ** ((bend * np.clip((tt - 0.12) / 0.15, 0, 1)) / 12)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.zeros(n)
    for h in range(1, 9):
        s += (1.0 / h ** 0.9) * np.sin(h * ph * (1 + 0.0007 * h * h)) * np.exp(-tt * (2.2 + 1.6 * h))
    s += 0.25 * bp(noise(dur), 1500, 6000) * np.exp(-tt / 0.006)
    return s * env(dur, 0.001, 0.08)

def flute(m, dur, vib=1.0, scoop=True):
    """shakuhachi-like: breathy sine, a scoop up into the note, a slow vibrato and a breath at the start"""
    tt = tvec(dur); n = len(tt); f0 = float(mtof(m))
    sc = (-0.8 * np.exp(-tt / 0.06)) if scoop else 0
    v = vib * 0.25 * np.sin(2 * np.pi * 5.0 * tt) * np.clip((tt - 0.25) / 0.4, 0, 1)
    f = f0 * 2 ** ((sc + v) / 12)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) + 0.18 * np.sin(2 * ph) + 0.06 * np.sin(3 * ph)
    breath = bp(noise(dur), f0 * 0.8, f0 * 3.0) * (0.25 + 0.6 * np.exp(-tt / 0.08))
    amp = np.minimum(1, tt / 0.07) * (0.85 + 0.15 * np.sin(np.pi * np.clip(tt / dur, 0, 1)))
    return (s + 0.35 * breath) * amp * env(dur, 0.02, min(0.25, dur * 0.3))

def musicbox(m, dur=1.6):
    tt = tvec(dur); f = float(mtof(m))
    s = np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.7) + 0.4 * np.sin(2 * np.pi * f * 3.0 * tt) * np.exp(-tt / 0.15)
    s += 0.15 * np.sin(2 * np.pi * f * 5.04 * tt) * np.exp(-tt / 0.05)
    return s * env(dur, 0.001, 0.2)

def kane(m=57, dur=5.0):
    """temple bell: inharmonic partials with a slow beating"""
    tt = tvec(dur); f = float(mtof(m)); s = np.zeros(len(tt))
    for r, a, d in ((1, 1, 3.5), (2.02, 0.5, 2.2), (2.76, 0.45, 1.6), (5.4, 0.25, 0.7), (8.9, 0.12, 0.3)):
        s += a * np.sin(2 * np.pi * f * r * tt) * np.exp(-tt / d) * (1 + 0.15 * np.sin(2 * np.pi * 1.3 * tt))
    s += 0.3 * lp(noise(dur), 2000) * np.exp(-tt / 0.02)
    return s * env(dur, 0.002, 0.5)

def furin():
    """glass wind chime"""
    d = 2.0; tt = tvec(d); f = rng.choice([2349.0, 2637.0, 2960.0, 3520.0])
    return (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * f * 2.7 * tt)) * np.exp(-tt / 0.5) * env(d, 0.001, 0.2)

def taiko(g=1.0, big=False):
    d = 1.4 if big else 0.8; tt = tvec(d)
    f = (52 if big else 70) + 70 * np.exp(-tt / 0.04)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / (0.45 if big else 0.25))
    s += 0.35 * lp(noise(d), 900) * np.exp(-tt / 0.03)
    return np.tanh(1.5 * s) * g

def ka():
    d = 0.08; tt = tvec(d)
    return (bp(noise(d), 1800, 5000) * 0.8 + np.sin(2 * np.pi * 1200 * tt) * 0.5) * np.exp(-tt / 0.012)

def shime():
    d = 0.12; tt = tvec(d)
    return (np.sin(2 * np.pi * (380 + 200 * np.exp(-tt / 0.01)) * tt) + 0.5 * bp(noise(d), 1500, 4500)) * np.exp(-tt / 0.03)

def kick(g=1.0):
    tt = tvec(0.35); f = 50 + 110 * np.exp(-tt / 0.03)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.2) * g

def shaker():
    d = 0.08; return hp(noise(d), 6000) * np.exp(-tvec(d) / 0.02)

def snap():
    d = 0.2; tt = tvec(d)
    return bp(noise(d), 1200, 5000) * np.exp(-tt / 0.05)

def pad(ms, dur, cut=1800, a=0.8, r=1.0):
    n = int(dur * SR); s = np.zeros(n)
    for m in ms:
        for d in (-0.1, 0.0, 0.1):
            s += saw_ph(float(mtof(m)) * 2 ** (d / 12), n)
    s = lp(s / (3 * len(ms)), cut)
    return s * env(dur, a, r)

def wind(dur, f0=400, f1=1400):
    tt = tvec(dur)
    return sweep_bp(noise(dur), f0, f1) * np.sin(np.pi * np.clip(tt / dur, 0, 1)) ** 1.5

def firework():
    """a whistle that rises for two beats, then the boom and the crackle"""
    up = 2 * BEAT; tt = tvec(up)
    wh = np.sin(2 * np.pi * np.cumsum(900 + 1800 * (tt / up) ** 1.5) / SR) * 0.25 * (tt / up)
    d = 2.5; t2 = tvec(d)
    boom = np.sin(2 * np.pi * np.cumsum(45 + 60 * np.exp(-t2 / 0.05)) / SR) * np.exp(-t2 / 0.5)
    boom += 0.6 * lp(noise(d), 1200) * np.exp(-t2 / 0.25)
    crack = np.zeros(len(t2))
    for _ in range(40):
        i = int(rng.uniform(0.3, 2.2) * SR); k = int(0.01 * SR)
        if i + k < len(crack): crack[i:i + k] += hp(noise(0.01), 3000) * rng.uniform(0.1, 0.4)
    return np.concatenate([wh, boom + crack])

# ---- the score ----------------------------------------------------------------------
score = {'koto': [], 'flute': [], 'box': [], 'taiko': [], 'ka': [], 'kick': [], 'kane': [], 'fw': [], 'wind': []}
def K(b, g=1.0): drums.add(bt(b), kick(g), 0.4); score['kick'].append(b)
def TK(b, g=1.0, big=False, pan=0.0): drums.add(bt(b), taiko(g, big), 0.45, pan); score['taiko'].append(b)
def KA(b, g=1.0): drums.add(bt(b), ka(), 0.18 * g, 0.3); score['ka'].append(b)
def SH(b, g=1.0): drums.add(bt(b), shime(), 0.12 * g, -0.3)
def SK(b, g=1.0): drums.add(bt(b), shaker(), 0.08 * g, 0.4 if (b * 2) % 2 else -0.4)
def SN(b, g=1.0): drums.add(bt(b), snap(), 0.2 * g, 0.1)
def KN(b, m=57, g=1.0): bells.add(bt(b), kane(m), 0.22 * g, 0); score['kane'].append(b)
def FW(b):                                        # b = the beat of the boom
    fxb.add(bt(b - 2), firework(), 0.18, rng.uniform(-0.6, 0.6)); score['fw'].append(b)
def WD(b, beats, f0=350, f1=1500, g=1.0):
    fxb.add(bt(b), wind(beats * BEAT, f0, f1), 0.16 * g, rng.uniform(-0.5, 0.5)); score['wind'].append([b, beats])

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

CH = {
    'G': [43, 59, 62, 67], 'A': [45, 61, 64, 69], 'F#m': [42, 61, 66, 69], 'Bm': [47, 62, 66, 71], 'D': [38, 62, 66, 69],
    'Dm': [38, 62, 65, 69], 'Bb': [34, 62, 65, 70], 'Gm': [43, 62, 67, 70], 'C': [36, 60, 64, 67], 'Asus': [45, 62, 64, 69],
    'Dm9': [38, 64, 65, 69], 'Bbmaj7': [34, 62, 65, 69], 'F': [41, 60, 65, 69],
}
PROLOGUE = ['Asus', 'Asus', 'D', 'Asus']
SPRING = ['G', 'A', 'F#m', 'Bm']
SUMMER = ['D', 'G', 'A', 'Bm', 'G', 'A', 'D', 'D']
AUTUMN = ['Dm', 'Bb', 'Gm', 'A', 'Dm', 'Bb', 'C', 'A']
WINTER = ['Dm9', 'Bbmaj7', 'F', 'C']
def chord_name(k):
    if k < 4: return PROLOGUE[k]
    if k < 20: return SPRING[(k - 4) % 4]
    if k < 36: return SUMMER[(k - 20) % 8]
    if k < 52: return AUTUMN[(k - 36) % 8]
    if k < 66: return WINTER[(k - 52) % 4]
    if k < 74: return SPRING[(k - 66) % 4]
    return 'D'

MEL_SPRING = ['D5 - E5 F#5 - - A5 -', 'B5 - A5 - F#5 - E5 -', 'F#5 - - - E5 D5 E5 -', 'B4 - - - . . D5 E5',
              'F#5 - A5 - B5 - D6 -', 'E6 - D6 B5 - - A5 -', 'B5 - A5 F#5 - E5 F#5 -', 'D5 - - - - - . .']
MEL_SUMMER = ['A5 B5 A5 F#5 E5 D5 E5 F#5', 'D6 B5 A5 B5 - - A5 B5', 'C#6 - B5 A5 E5 - F#5 A5', 'B5 - - A5 F#5 - E5 -',
              'D5 E5 F#5 A5 B5 A5 F#5 E5', 'E5 F#5 A5 B5 C#6 B5 A5 E5', 'F#5 - E5 D5 E5 - A4 -', 'D5 - - - - - . .']
MEL_AUTUMN = ['A5 - - - G5 - A5 Bb5', 'A5 - - - - - G5 -', 'G5 - D5 - Eb5 - D5 -', 'C#5 - - - - - . .',
              'D5 - F5 - G5 - A5 -', 'Bb5 - A5 - G5 - F5 G5', 'E5 - - - G5 - F5 E5', 'C#5 - - - E5 - - -']
MEL_WINTER = ['D6 . A5 . F6 . E6 .', 'D6 . . . A5 . . .', 'C6 . A5 . F5 . A5 .', 'G5 . . . E5 . . .',
              'D6 . A5 . F6 . G6 .', 'A6 . . . F6 . . .', 'E6 . C6 . A5 . G5 .', 'A5 . . . . . . .']
MEL_PRO = ['A4 - - - D5 - - -', 'E5 - - - - - . .', 'F#5 - E5 - D5 - A4 -', 'B4 - - - - - . .']

flute_notes = parse(MEL_PRO, 0) + parse(MEL_SPRING, 4) + parse(MEL_SPRING, 12) \
    + parse(MEL_SUMMER, 20) + parse(MEL_SUMMER, 28) + parse(MEL_AUTUMN, 36) + parse(MEL_AUTUMN, 44) \
    + parse(MEL_SPRING, 66, 12)
box_notes = parse(MEL_WINTER, 52) + parse(MEL_WINTER[:6], 60)
koto_lead = parse(MEL_SUMMER, 28, -12) + parse(MEL_AUTUMN, 44, -12) + parse(MEL_SPRING, 66)

for k in range(BARS):
    B = k * 4
    name = chord_name(k); ms = CH[name]
    # strings
    if k < 4: strings.add(bar(k), pad(ms[1:], 4 * BEAT + 1.0, 900, 1.5, 1.2), 0.1)
    elif k < 74:
        cut = {0: 1500, 1: 2600, 2: 1300, 3: 1000, 4: 3000}[0 if k < 20 else 1 if k < 36 else 2 if k < 52 else 3 if k < 66 else 4]
        g = 0.18 if 52 <= k < 62 else 0.25
        strings.add(bar(k), pad(ms[1:] + ([ms[1] + 12] if k >= 66 else []), 4 * BEAT + 0.8, cut, 0.6, 0.8), g)
        strings.add(bar(k), pad([ms[0]], 4 * BEAT + 0.5, 400, 0.1, 0.5), 0.18)
    else:
        strings.add(bar(74), pad([62, 66, 69, 74], 10.0, 2000, 0.5, 5.0), 0.18)
        strings.add(bar(74), pad([38], 10.0, 400, 0.1, 5.0), 0.15)
    # koto accompaniment (broken chords)
    if 4 <= k < 52 or 66 <= k < 74:
        lo = ms[1:]
        pat = [lo[0], lo[1], lo[2], lo[1] + 12, lo[2], lo[1], lo[2] + 12, lo[1]]
        step = 0.5
        if 20 <= k < 36: pat = pat + pat; step = 0.25           # summer: 16ths
        for i, m in enumerate(pat):
            b = B + i * step
            if 36 <= k < 52 and i % 2: continue                 # autumn: sparser
            koto_b.add(bt(b), koto(m, 1.2), 0.14 if step == 0.5 else 0.1, -0.4 + 0.8 * (i % 8) / 7)
            if i % 2 == 0: score['koto'].append([b, step, m])
    # drums
    if 12 <= k < 20:
        K(B); K(B + 2)
        for i in range(8): SK(B + i * 0.5, 0.6 + 0.4 * (i % 2))
    if 20 <= k < 36:
        TK(B, 1.0, k % 4 == 0); TK(B + 1.5, 0.7); TK(B + 2, 0.9); KA(B + 3); KA(B + 3.5, 0.7)
        for i in range(8): SH(B + i * 0.5 + 0.25, 0.7)
        if k >= 24:
            for i in range(4): K(B + i, 0.8)
        if k >= 34:
            for i in range(16): TK(B + i * 0.25, 0.3 + 0.6 * ((k - 34) * 16 + i) / 32)
    if 36 <= k < 52:
        K(B); SN(B + 2); K(B + 2.5, 0.6)
        for i in range(8): SK(B + i * 0.5 + 0.25, 0.5)
    if 60 <= k < 62: TK(B, 0.5, True)
    if 62 <= k < 66:
        n = 4 if k < 64 else 8 if k == 64 else 16
        for i in range(n): TK(B + i * 4 / n, 0.4 + 0.6 * ((k - 62) * 4 + i * 4 / n) / 16, k == 65 and i == n - 1)
    if 66 <= k < 74:
        TK(B, 1.0, True); TK(B + 1.5, 0.7); TK(B + 2, 0.9, True); KA(B + 3); KA(B + 3.5, 0.7)
        for i in range(4): K(B + i)
        for i in range(8): SH(B + i * 0.5 + 0.25, 0.7)
    # bells, chimes, fireworks, wind
    if k in (0, 2, 4, 20, 36, 52, 66, 74): KN(B, 50 if k in (52, 74) else 57, 1.2 if k in (66, 74) else 1.0)
    if 20 <= k < 36 and k % 2 == 1: bells.add(bt(B + 1.5), furin(), 0.05, rng.uniform(-0.7, 0.7))
    if 20 <= k < 34 and k % 2 == 0 and k >= 22: FW(B + 2)
    if k in (26, 30): FW(B)
    if 36 <= k < 52 and k % 2 == 0: WD(B + 1, 6, 300, 1600)
    if 52 <= k < 66 and k % 4 == 1: WD(B, 8, 600, 2400, 0.7)
    if k in (1, 3): WD(B, 6, 300, 900, 0.8)

for (b, L, m) in flute_notes:
    flute_b.add(bt(b), flute(m, L * BEAT + 0.15, vib=1.0 if L >= 1 else 0.3, scoop=L >= 1), 0.2, 0.05)
    score['flute'].append([b, L, m])
for (b, L, m) in box_notes:
    bells.add(bt(b), musicbox(m), 0.16, 0.2)
    bells.add(bt(b) + 0.75 * BEAT, musicbox(m, 1.0), 0.05, -0.5)        # a soft echo
    score['box'].append([b, L, m])
for (b, L, m) in koto_lead:
    koto_b.add(bt(b), koto(m, 1.5, bend=1.0 if (L >= 1.5 and 36 * 4 <= b < 52 * 4) else 0), 0.13, -0.15)
    score['koto'].append([b, L, m])
score['koto'].sort()
# the end: one last bell and a bent koto note
KN(74 * 4 + 2, 45, 0.8)
koto_b.add(bt(74 * 4), koto(74, 3.0, 0), 0.2, 0)

def reverb(st, mix, dur=4.5, decay=1.6):
    tt = np.arange(int(dur * SR)) / SR
    out = []
    for ch in range(2):
        ir = lp(rng.standard_normal(len(tt)) * np.exp(-tt / decay), 5000); ir /= np.sqrt(np.sum(ir ** 2))
        out.append(signal.fftconvolve(st[ch], ir)[:N])
    return np.vstack(out) * mix
dry = drums.stereo() + strings.stereo() + koto_b.stereo() + flute_b.stereo() + bells.stereo() + fxb.stereo()
mix = dry + reverb(flute_b.stereo() + koto_b.stereo() * 0.7 + bells.stereo() + strings.stereo() * 0.5 + fxb.stereo() * 0.5 + drums.stereo() * 0.15, 0.4)
mix -= np.mean(mix, axis=1, keepdims=True)
mix = np.tanh(mix / np.max(np.abs(mix)) * 1.3) / np.tanh(1.3)
endi = int((bar(76) + 2.0) * SR)
mix = mix[:, :endi]
mix[:, -int(4 * SR):] *= np.linspace(1, 0, int(4 * SR))
mix *= 0.92 / np.max(np.abs(mix))

from scipy.io import wavfile
wavfile.write('shiki.wav', SR, (mix.T * 32767).astype(np.int16))
score['end'] = round(mix.shape[1] / SR, 2)
json.dump(score, open('score.json', 'w'), default=lambda o: o.item())
print('done', mix.shape[1] / SR)
