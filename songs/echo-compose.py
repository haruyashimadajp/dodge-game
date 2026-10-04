"""Echoes — original song for the dodge game (theme: echo and reverberation).
100 BPM, D minor. Beat 0 at t = 0.5 s; 1 beat = 0.6 s; 1 bar = 2.4 s.

Everything you hear is made of reflections:
  drip        — a water drop in a cave, with a long cave reverb
  ping        — a glassy FM bell. Every ping goes into a ping-pong delay (dotted 8th, left / right / left ...),
                so each note comes back again and again, quieter and darker each time
  pluck       — the melody instrument of the first half (Karplus-Strong string), with the same echo
  lead        — a soft square lead in the climax; every phrase is answered by its own echo an octave down
  pad / choir — wide pads with a huge reverb; reverse-reverb swells ("whooosh") lead into the big moments
  drums       — kick, rim, snare (sent into a big plate), hats, shaker, toms, crash, a reverse cymbal.
                The drums come in at bar 8 and the song lifts a little from bar 16, and most at bar 32
  bass        — a round sub bass
Writes echo.wav and score.json (beat numbers for the chart, including the times of every audible echo tap).

Run:  python3 echo-compose.py      (needs numpy + scipy)
Then: ffmpeg -i echo.wav -b:a 192k Echoes.mp3, and copy score.json into songs/echo-score.js.
Form (bars): Intro (drips + pings) 0-8 / Ripple (rim + pluck) 8-16 / Resonance (full drums) 16-24 /
Silence (break: choir, reverse swells) 24-28 / Build 28-32 / Reverberation (climax) 32-44 / Fade (only echoes remain) 44-52.
"""
import json
import numpy as np
from scipy import signal

SR = 44100
BPM = 100
BEAT = 60 / BPM
T0 = 0.5
BARS = 52
N = int((T0 + BARS * 4 * BEAT + 8.0) * SR)
rng = np.random.default_rng(2401)
ECHO = 0.75                                   # the delay time in beats (dotted 8th)

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

dry, echo_send, verb_send, drums, sub = (Bus() for _ in range(5))
score = {k: [] for k in ('drip', 'ping', 'pluck', 'lead', 'echo', 'kick', 'snare', 'rim', 'hat', 'tom', 'crash',
                         'swell', 'choir', 'bass', 'chord', 'riser', 'roll')}

# ---- tools -------------------------------------------------------------------------------
def nz(n): return rng.standard_normal(n)
def lp(x, fc, o=2): return signal.sosfilt(signal.butter(o, min(fc, SR * 0.45), 'low', fs=SR, output='sos'), x)
def hp(x, fc, o=2): return signal.sosfilt(signal.butter(o, fc, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=2): return signal.sosfilt(signal.butter(o, [lo, min(hi, SR * 0.45)], 'band', fs=SR, output='sos'), x)
def phase(f, n): return np.cumsum(np.broadcast_to(np.asarray(f, float), (n,))) / SR
def env_ar(n, a, r):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / max(r, 1e-4))
def fade_tail(x, d=0.02):
    k = min(len(x), int(d * SR)); x[-k:] *= np.linspace(1, 0, k); return x

# ---- instruments -------------------------------------------------------------------------
def drip(m=86):
    """a water drop: a fast upward pitch blip"""
    n = int(0.25 * SR); t = np.arange(n) / SR
    f = mtof(m) * (1 + 1.4 * np.exp(-t / 0.012))
    return np.sin(2 * np.pi * phase(f, n)) * env_ar(n, 0.001, 0.035)

def ping(m, d=1.6):
    """glassy FM bell"""
    n = int(d * SR); t = np.arange(n) / SR; f = float(mtof(m))
    mod = np.sin(2 * np.pi * f * 3.5 * t) * 2.2 * np.exp(-t / 0.18)
    x = np.sin(2 * np.pi * f * t + mod) * env_ar(n, 0.002, d * 0.32)
    x += 0.3 * np.sin(2 * np.pi * f * 2.0 * t) * env_ar(n, 0.002, 0.25)
    return fade_tail(x)

def pluck(m, d=1.0):
    f = float(mtof(m)); n = int(d * SR); P = max(2, int(round(SR / f)))
    exc = lp(nz(P), 5000)
    a = np.zeros(P + 2); a[0] = 1; a[P] = -0.496; a[P + 1] = -0.496
    x = signal.lfilter([1.0], a, np.concatenate([exc, np.zeros(n - P)]))
    x = x / (np.max(np.abs(x)) + 1e-9) * np.exp(-np.arange(n) / SR / (d * 0.4))
    return fade_tail(lp(x, 4200))

def lead(m, d, glide_from=None):
    n = int((d + 0.12) * SR); t = np.arange(n) / SR; f0 = float(mtof(m))
    f = np.full(n, f0)
    if glide_from is not None: f = f0 * 2 ** ((glide_from - m) / 12 * np.exp(-t / 0.05))
    f = f * 2 ** (0.12 / 12 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.2) / 0.3, 0, 1))
    ph = phase(f, n)
    x = np.sign(np.sin(2 * np.pi * ph)) * 0.5 + 0.5 * np.sin(2 * np.pi * ph * 1.003)
    e = np.minimum(1, t / 0.015) * np.clip((d + 0.1 - t) / 0.1, 0, 1) * (0.75 + 0.25 * np.exp(-t / 0.3))
    return lp(x * e, 2600)

def pad(ms, d, bright=1800, att=0.8):
    n = int((d + 1.0) * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in ms:
        for det in (-9, -3, 4, 10):
            x += 2 * ((phase(mtof(m) * 2 ** (det / 1200), n) + rng.random()) % 1) - 1
    x /= 4 * len(ms)
    e = np.minimum(1, t / att) * np.clip((d + 1.0 - t) / 1.0, 0, 1)
    return lp(x * e, bright)

def choir(m, d):
    """an 'aah' choir voice: a buzzy source through vowel formants"""
    n = int((d + 1.2) * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for p in range(5):
        f = mtof(m) * 2 ** ((rng.uniform(-8, 8) + 14 * np.sin(2 * np.pi * rng.uniform(4.5, 5.5) * t + rng.random() * 6)) / 1200)
        x += 2 * ((phase(f, n) + rng.random()) % 1) - 1
    y = 0.9 * bp(x, 650, 900) + 0.6 * bp(x, 1050, 1300) + 0.25 * bp(x, 2500, 2900)
    e = np.minimum(1, t / 1.0) * np.clip((d + 1.2 - t) / 1.2, 0, 1)
    return y * e / 5

def bass(m, d):
    n = int((d + 0.05) * SR); t = np.arange(n) / SR; f = float(mtof(m))
    x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    e = np.minimum(1, t / 0.01) * np.clip((d - t) / 0.06, 0, 1)
    return np.tanh(1.4 * x * e)

def kick(g=1.0):
    n = int(0.45 * SR); t = np.arange(n) / SR
    f = 46 + 110 * np.exp(-t / 0.035)
    x = np.sin(2 * np.pi * phase(f, n)) * np.exp(-t / 0.22)
    x += 0.25 * lp(nz(n), 3000) * np.exp(-t / 0.004)
    return np.tanh(1.6 * x) * g

def snare():
    n = int(0.4 * SR); t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * phase(185 + 60 * np.exp(-t / 0.02), n)) * np.exp(-t / 0.07)
    nse = bp(nz(n), 1500, 9000) * np.exp(-t / 0.13)
    return 0.6 * tone + 0.8 * nse

def rim():
    n = int(0.12 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1700 * t) * 0.6 + bp(nz(n), 2000, 6000)) * np.exp(-t / 0.012)

def hat(open_=False):
    d = 0.35 if open_ else 0.06; n = int(d * SR); t = np.arange(n) / SR
    return hp(nz(n), 7000, 3) * np.exp(-t / (0.12 if open_ else 0.018))

def shaker():
    n = int(0.09 * SR); t = np.arange(n) / SR
    return bp(nz(n), 4000, 11000) * np.minimum(1, t / 0.02) * np.exp(-t / 0.03)

def tom(m):
    n = int(0.6 * SR); t = np.arange(n) / SR; f = float(mtof(m))
    return np.tanh(1.3 * np.sin(2 * np.pi * phase(f * (1 + 0.5 * np.exp(-t / 0.03)), n)) * np.exp(-t / 0.25))

def crash(d=2.5):
    n = int(d * SR); t = np.arange(n) / SR
    return hp(nz(n), 4000, 2) * np.exp(-t / (d * 0.35)) * np.minimum(1, t / 0.003)

def riser(d):
    n = int(d * SR); t = np.arange(n) / SR; u = t / d
    fc = 300 * (40 ** u)
    x = np.zeros(n); src = nz(n)
    for i in range(0, n, 2048):
        j = min(n, i + 2048); x[i:j] = bp(src[i:j], fc[i] * 0.7, fc[i] * 1.4, 1)
    return x * u ** 2

# ---- effects -------------------------------------------------------------------------------
def plate(st, decay=3.2, dur=5.0, pre=0.03, bright=7000):
    tt = np.arange(int(dur * SR)) / SR; out = []
    for ch in range(2):
        ir = rng.standard_normal(len(tt)) * np.exp(-tt / (decay / 6.9))
        ir = lp(ir, bright) * (0.6 + 0.4 * np.exp(-tt / 0.5))
        ir[:int(pre * SR)] = 0
        ir /= np.sqrt(np.sum(ir ** 2))
        out.append(signal.fftconvolve(st[ch], ir)[:N])
    return np.vstack(out)

def pingpong(st, taps=7, fb=0.55, beats=ECHO):
    """ping-pong delay: the mono sum bounces left / right, darker on every bounce"""
    mono = (st[0] + st[1]) * 0.5
    out = np.zeros((2, N)); d = int(beats * BEAT * SR); x = mono.copy()
    for i in range(1, taps + 1):
        x = lp(x, 6500 - 650 * i, 1) * fb
        ch = (i - 1) % 2
        out[ch, i * d:] += x[:N - i * d]
    return out

def reverse_swell(sig, at, gain, pan=0.0):
    """reverb a note, flip it, and place it so it swells INTO the time 'at'"""
    x = np.pad(sig, (0, int(3.5 * SR))); tt = np.arange(int(3.0 * SR)) / SR; w = []
    for ch in range(2):
        ir = lp(rng.standard_normal(len(tt)), 6000) * np.exp(-tt / 0.4)
        w.append(signal.fftconvolve(x, ir)[:len(x)][::-1])
    w = np.vstack(w)
    w /= np.max(np.abs(w)) + 1e-9
    i = int(at * SR) - w.shape[1]
    for ch, b in ((0, verb_send.L), (1, verb_send.R)):
        seg = w[ch] * gain
        j = max(0, i); seg = seg[j - i:]
        b[j:j + len(seg)] += seg[:N - j].astype(np.float32)

# ---- harmony + melodies -------------------------------------------------------------------------
CH = {'Dm': (38, [62, 65, 69]), 'Bb': (34, [62, 65, 70]), 'F': (41, [60, 65, 69]), 'C': (36, [60, 64, 67]),
      'Gm': (43, [62, 67, 70]), 'A': (45, [61, 64, 69])}
VERSE = ['Dm', 'Bb', 'F', 'C']
CHORUS = ['Bb', 'C', 'Dm', 'Dm', 'Bb', 'C', 'Dm', 'A']
PLAN = {}
for k in range(0, 32): PLAN[k] = VERSE[k % 4]
for k in range(24, 28): PLAN[k] = ['Bb', 'Gm', 'Bb', 'A'][k - 24]
for k in range(32, 44): PLAN[k] = CHORUS[(k - 32) % 8]
for k in range(44, 52): PLAN[k] = VERSE[k % 4] if k < 50 else 'Dm'
for k in range(BARS): score['chord'].append([k * 4, PLAN[k]])

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

MEL_A = ['D5 - - - A4 - C5 -', 'D5 - F5 - D5 - C5 -', 'C5 - - - . . A4 -', 'G4 - - - - - . .',
         'D5 - - - A4 - C5 -', 'D5 - F5 - G5 - F5 -', 'E5 - - - C5 - - -', 'D5 - - - - - . .']
MEL_C = ['F5 - - D5 F5 - G5 -', 'G5 - - E5 G5 - A5 -', 'A5 - - - D6 - C6 -', 'A5 - - - - - . .',
         'F5 - - D5 F5 - G5 -', 'G5 - - E5 G5 - C6 -', 'A5 - - - G5 - F5 -', 'E5 - - - C#5 - - -']

def echo_taps(b, m, gain, taps=5, fb=0.55, kind='ping'):
    """remember when each echo of a note is heard (for the chart): [beat, midi, level, side, tap#, kind]"""
    for i in range(1, taps + 1):
        lvl = gain * fb ** i
        if lvl < 0.02: break
        score['echo'].append([round(b + i * ECHO, 3), m, round(lvl, 3), -1 if (i - 1) % 2 == 0 else 1, i, kind])

# ==== Intro 0-8: drips in a cave, then pings with their echoes; a pad fades in ====
DRIPS = [0.0, 3.0, 5.5, 8.0, 10.5, 12.0, 14.5, 16.0, 18.0, 19.5, 21.0, 22.5, 24.0, 25.0, 26.5, 28.0, 29.0, 30.5]
for i, b in enumerate(DRIPS):
    m = [86, 89, 84, 91, 88][i % 5]; pan = [-0.6, 0.5, -0.2, 0.7, 0.1][i % 5]
    verb_send.add(bt(b), drip(m), 0.5, pan); dry.add(bt(b), drip(m), 0.15, pan); score['drip'].append([b, pan])
PING_INTRO = [(8, 74), (10, 69), (11.5, 72), (14, 74), (16, 77), (18, 76), (19.5, 74), (22, 69),
              (24, 74), (26, 69), (27.5, 72), (30, 77), (31, 76)]
for b, m in PING_INTRO:
    s = ping(m); dry.add(bt(b), s, 0.22, 0); echo_send.add(bt(b), s, 0.22); verb_send.add(bt(b), s, 0.12)
    score['ping'].append([b, m]); echo_taps(b, m, 1.0, 6)
for k in range(2, 8):
    root, up = CH[PLAN[k]]
    verb_send.add(bar(k), pad(up, 4 * BEAT, 900, 1.5), 0.06 + 0.012 * k, 0)
reverse_swell(ping(81, 1.2), bar(8), 0.28)
score['swell'].append([30, 32])

# ==== Ripple 8-16: rim + kick + shaker, plucked melody with echo, sub bass ====
for b, L, m in parse(MEL_A, 8):
    s = pluck(m, max(0.8, L * BEAT + 0.3)); dry.add(bt(b), s, 0.34, 0.1); echo_send.add(bt(b), s, 0.3); verb_send.add(bt(b), s, 0.1)
    score['pluck'].append([b, L, m]); echo_taps(b, m, 1.0, 5, kind='pluck')
for k in range(8, 16):
    root, up = CH[PLAN[k]]
    verb_send.add(bar(k), pad(up, 4 * BEAT, 1300, 0.8), 0.1, 0)
    for b0, L in ((0, 1.5), (2.5, 1.5)):
        sub.add(bt(k * 4 + b0), bass(root, L * BEAT), 0.32); score['bass'].append([k * 4 + b0, L, root])
    drums.add(bt(k * 4), kick(0.7), 0.5); score['kick'].append(k * 4)
    drums.add(bt(k * 4 + 2.5), kick(0.5), 0.4); score['kick'].append(k * 4 + 2.5)
    for h in (1, 3):
        drums.add(bt(k * 4 + h), rim(), 0.22, 0.2); echo_send.add(bt(k * 4 + h), rim(), 0.1); score['rim'].append(k * 4 + h)
    for h in range(8): drums.add(bt(k * 4 + h * 0.5), shaker(), 0.06 + 0.03 * (h % 2), -0.3)
for b, m in ((46, 81), (54, 79), (62, 77)):
    s = ping(m); dry.add(bt(b), s, 0.16); echo_send.add(bt(b), s, 0.2); score['ping'].append([b, m]); echo_taps(b, m, 0.9, 6)

# ==== Resonance 16-24: full drums (snare into the plate), hats, the melody again with pings an octave up ====
for b, L, m in parse(MEL_A, 16):
    s = pluck(m, max(0.8, L * BEAT + 0.3)); dry.add(bt(b), s, 0.3, 0.1); echo_send.add(bt(b), s, 0.28)
    score['pluck'].append([b, L, m]); echo_taps(b, m, 1.0, 5, kind='pluck')
    if L >= 1.5:
        p = ping(m + 12, 1.2); dry.add(bt(b), p, 0.1); echo_send.add(bt(b), p, 0.14); score['ping'].append([b, m + 12])
for k in range(16, 24):
    root, up = CH[PLAN[k]]
    verb_send.add(bar(k), pad(up, 4 * BEAT, 1800, 0.5), 0.12, 0)
    for b0, L in ((0, 1.5), (1.5, 1.0), (2.5, 1.5)):
        sub.add(bt(k * 4 + b0), bass(root, L * BEAT), 0.36); score['bass'].append([k * 4 + b0, L, root])
    for h in (0, 1.5, 2.5):
        drums.add(bt(k * 4 + h), kick(0.9 if h == 0 else 0.7), 0.6); score['kick'].append(k * 4 + h)
    for h in (1, 3):
        s = snare(); drums.add(bt(k * 4 + h), s, 0.35); verb_send.add(bt(k * 4 + h), s, 0.22); score['snare'].append(k * 4 + h)
    for h in range(8):
        drums.add(bt(k * 4 + h * 0.5), hat(h == 7), 0.07 if h % 2 == 0 else 0.11, 0.35); score['hat'].append(k * 4 + h * 0.5)
    if k == 23:
        for i, (h, m) in enumerate(((3, 50), (3.25, 47), (3.5, 45), (3.75, 43))):
            drums.add(bt(k * 4 + h), tom(m), 0.35, -0.5 + i * 0.33); echo_send.add(bt(k * 4 + h), tom(m), 0.1); score['tom'].append([k * 4 + h, m])
drums.add(bar(16), crash(), 0.25, 0.3); verb_send.add(bar(16), crash(), 0.1); score['crash'].append(64)

# ==== Silence 24-28: the beat stops. A choir in a huge space, the last snare echoes away, reverse swells ====
s = snare(); drums.add(bar(24), s, 0.35); echo_send.add(bar(24), s, 0.45); verb_send.add(bar(24), s, 0.3); score['snare'].append(96)
echo_taps(96, 0, 1.0, 7, kind='snare')
drums.add(bar(24), crash(3.5), 0.22, -0.3); verb_send.add(bar(24), crash(3.5), 0.14); score['crash'].append(96)
for k in range(24, 28):
    root, up = CH[PLAN[k]]
    for v, m in enumerate(up):
        verb_send.add(bar(k), choir(m, 4 * BEAT), 0.16, (-0.4, 0, 0.4)[v])
    score['choir'].append([k * 4, 4])
    sub.add(bar(k), bass(root, 4 * BEAT), 0.2); score['bass'].append([k * 4, 4, root])
for b, m in ((97, 74), (99.5, 77), (102, 81), (104, 79), (105.5, 77), (108, 76), (110, 73)):
    s = ping(m, 2.0); dry.add(bt(b), s, 0.16); echo_send.add(bt(b), s, 0.3); verb_send.add(bt(b), s, 0.2)
    score['ping'].append([b, m]); echo_taps(b, m, 1.0, 7)
reverse_swell(choir(69, 1.5), bar(26), 0.3); score['swell'].append([102, 104])

# ==== Build 28-32: four on the floor, snare roll speeding up, riser, reverse cymbal ====
for b, L, m in parse(MEL_A[:4], 28):
    s = pluck(m + 12, max(0.8, L * BEAT + 0.3)); dry.add(bt(b), s, 0.26, -0.1); echo_send.add(bt(b), s, 0.3)
    score['pluck'].append([b, L, m + 12]); echo_taps(b, m + 12, 1.0, 5, kind='pluck')
for k in range(28, 32):
    root, up = CH[PLAN[k]]
    verb_send.add(bar(k), pad(up, 4 * BEAT, 1200 + 600 * (k - 28), 0.3), 0.12, 0)
    for h in range(4):
        drums.add(bt(k * 4 + h), kick(0.8), 0.55); score['kick'].append(k * 4 + h)
        sub.add(bt(k * 4 + h + 0.5), bass(root, 0.45 * BEAT), 0.3); score['bass'].append([k * 4 + h + 0.5, 0.45, root])
    step = 1 if k < 30 else 0.5 if k == 30 else 0.25
    for i in range(int(4 / step)):
        b = k * 4 + i * step; g = 0.12 + 0.25 * ((b - 112) / 16)
        if k == 31 and i * step >= 3.5: continue
        s = snare(); drums.add(bt(b), s, g); verb_send.add(bt(b), s, g * 0.4); score['roll'].append(round(b, 3))
dry.add(bt(112), riser(16 * BEAT - 0.3), 0.18); score['riser'].append([112, 127.5])
reverse_swell(crash(2.0), bar(32), 0.32); score['swell'].append([126, 128])

# ==== Reverberation 32-44: the climax — lead melody answered by its own echo, full drums, crash, dub throws ====
for rep in (32, 40):
    lines = MEL_C if rep == 32 else MEL_C[:4]
    prev = None
    for b, L, m in parse(lines, rep):
        s = lead(m, L * BEAT, prev if prev is not None and abs(prev - m) <= 4 else None); prev = m
        dry.add(bt(b), s, 0.22, 0); echo_send.add(bt(b), s, 0.26); verb_send.add(bt(b), s, 0.08)
        score['lead'].append([b, L, m]); echo_taps(b, m, 1.0, 5, kind='lead')
        if L >= 1.5:                                                              # the answer: the same note an octave down, one bar later... as an echo
            p = ping(m, 1.0); dry.add(bt(b + 0.5), p, 0.08, 0.5); score['ping'].append([b + 0.5, m])
for k in range(32, 44):
    root, up = CH[PLAN[k]]
    verb_send.add(bar(k), pad(up, 4 * BEAT, 2600, 0.2), 0.13, 0)
    if k < 40:
        for v, m in enumerate(up): verb_send.add(bar(k), choir(m + 12, 4 * BEAT), 0.07, (-0.5, 0, 0.5)[v])
        score['choir'].append([k * 4, 4])
    for h in range(8):
        a = up[[0, 1, 2, 1][h % 4]] + 12
        s = pluck(a, 0.5); dry.add(bt(k * 4 + h * 0.5), s, 0.1, 0.4 * (1 if h % 2 else -1))
    for b0, L in ((0, 0.75), (0.75, 0.75), (1.5, 1.0), (2.5, 0.5), (3, 1.0)):
        sub.add(bt(k * 4 + b0), bass(root, L * BEAT), 0.38); score['bass'].append([k * 4 + b0, L, root])
    for h in (0, 1, 2, 3):
        drums.add(bt(k * 4 + h), kick(1.0), 0.62); score['kick'].append(k * 4 + h)
    for h in (1, 3):
        s = snare(); drums.add(bt(k * 4 + h), s, 0.4); verb_send.add(bt(k * 4 + h), s, 0.25); score['snare'].append(k * 4 + h)
    for h in range(16):
        drums.add(bt(k * 4 + h * 0.25), hat(h % 4 == 2), 0.05 + 0.05 * (h % 2 == 0) + 0.04 * (h % 4 == 2), 0.35)
        if h % 2 == 0: score['hat'].append(k * 4 + h * 0.25)
    if k % 4 == 0:
        drums.add(bar(k), crash(), 0.28, 0.3); verb_send.add(bar(k), crash(), 0.12); score['crash'].append(k * 4)
    if k % 4 == 3:                                                                # dub throw: the last snare is sent into the echo
        s = snare(); echo_send.add(bt(k * 4 + 3.5), s, 0.5); drums.add(bt(k * 4 + 3.5), s, 0.3); score['snare'].append(k * 4 + 3.5)
        echo_taps(k * 4 + 3.5, 0, 1.0, 5, kind='snare')
        for i, (h, m) in enumerate(((2, 52), (2.25, 50), (2.5, 47), (2.75, 45), (3, 43))):
            drums.add(bt(k * 4 + h), tom(m), 0.3, -0.6 + i * 0.3); score['tom'].append([k * 4 + h, m])
reverse_swell(ping(86, 1.2), bar(40), 0.3); score['swell'].append([158, 160])

# ==== Fade 44-52: the drums fall away; only pings, their echoes and the cave remain ====
for k in range(44, 52):
    root, up = CH[PLAN[k]]
    g = 1 - (k - 44) / 8
    verb_send.add(bar(k), pad(up, 4 * BEAT, 1200 * g + 500, 0.8), 0.1 * g + 0.03, 0)
    if k < 48:
        drums.add(bt(k * 4), kick(0.6 * g), 0.5); score['kick'].append(k * 4)
        for h in (1, 3): drums.add(bt(k * 4 + h), rim(), 0.16 * g, 0.2); echo_send.add(bt(k * 4 + h), rim(), 0.12 * g); score['rim'].append(k * 4 + h)
        sub.add(bar(k), bass(root, 3 * BEAT), 0.26 * g); score['bass'].append([k * 4, 3, root])
for b, L, m in parse(MEL_A[:4], 44):
    s = ping(m, 1.4); dry.add(bt(b), s, 0.16); echo_send.add(bt(b), s, 0.3); verb_send.add(bt(b), s, 0.12)
    score['ping'].append([b, m]); echo_taps(b, m, 1.0, 6)
for b, m in ((192, 74), (196, 69), (200, 74)):
    s = ping(m, 2.0); dry.add(bt(b), s, 0.14); echo_send.add(bt(b), s, 0.34); verb_send.add(bt(b), s, 0.2)
    score['ping'].append([b, m]); echo_taps(b, m, 1.0, 8, 0.62)
for b in (194.5, 198, 201.5, 204, 206.5):
    verb_send.add(bt(b), drip(88), 0.5, 0.3); score['drip'].append([b, 0.3])
drums.add(bar(44), crash(3.0), 0.22); verb_send.add(bar(44), crash(3.0), 0.12); score['crash'].append(176)

# ---- mix: a cave -----------------------------------------------------------------------------------
ech = pingpong(echo_send.stereo(), 8, 0.55)
wet = plate(verb_send.stereo() + 0.6 * dry.stereo() + 0.5 * ech + 0.25 * drums.stereo(), 3.6, 6.0)
mix = dry.stereo() * 0.9 + ech * 0.85 + wet * 0.55 + drums.stereo() * 0.95 + sub.stereo() * 0.8
mix -= np.mean(mix, axis=1, keepdims=True)
mix = np.vstack([hp(mix[0], 30, 2), hp(mix[1], 30, 2)])
mix /= np.max(np.abs(mix))
lvl = np.maximum(lp(np.sqrt(np.maximum(lp(np.mean(mix ** 2, axis=0), 3), 0)), 3), 1e-4)
mix = mix * np.minimum(1, (0.1 / lvl) ** 0.25)
mix /= np.max(np.abs(mix))
pk = np.max(np.abs(mix), axis=0)
pk = np.maximum.reduce([np.roll(pk, -i) for i in range(0, int(0.005 * SR), 8)])
DRIVE, THR = 2.4, 0.9
gl = np.minimum(1, THR / np.maximum(pk * DRIVE, 1e-6))
rel = np.exp(-1 / (0.12 * SR))
gl = signal.lfilter([1 - rel], [1, -rel], gl[::-1])[::-1]
gl = np.minimum(gl, np.minimum(1, THR / np.maximum(pk * DRIVE, 1e-6)) * 1.15)
mix = np.tanh(mix * DRIVE * gl / THR * 0.9) * THR
endi = int((bt(208) + 6.0) * SR)
mix = mix[:, :endi]
mix[:, -int(2.5 * SR):] *= np.linspace(1, 0, int(2.5 * SR)) ** 1.5
mix *= 0.95 / np.max(np.abs(mix))

from scipy.io import wavfile
wavfile.write('echo.wav', SR, (mix.T * 32767).astype(np.int16))
for key in score:
    if score[key] and not isinstance(score[key][0], list): score[key].sort()
    elif score[key]: score[key].sort(key=lambda v: v[0])
score['end'] = round(mix.shape[1] / SR, 2)
json.dump(score, open('score.json', 'w'), default=lambda o: o.item() if hasattr(o, 'item') else o)
print('done', mix.shape[1] / SR, {k: len(v) for k, v in score.items() if isinstance(v, list)})
