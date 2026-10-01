"""segment — original song for the dodge game.
160 BPM, D minor (final chorus in Eb minor). Beat 0 at t = 0.5 s; 1 bar = 1.5 s.
Instruments: piano, glockenspiel, breaking glass (+ drums, sub bass, a quiet string pad).
Writes segment.wav and score.json (note/drum/glass times for the bullet chart).

Run:  python3 segment-compose.py      (needs numpy + scipy)
Then convert the wav to Segment.mp3 (e.g. ffmpeg -i segment.wav -b:a 192k Segment.mp3)
and copy the lists from score.json into songs/segment-score.js.
Form (bars): intro 0-8 / intro B 8-16 / verse 16-32 / pre-chorus 32-40 / chorus 40-56 /
break 56-64 / final chorus (+1 key) 64-80 / outro 80-84.
"""
import json
import numpy as np
from scipy import signal

SR = 44100
BPM = 160
BEAT = 60 / BPM            # 0.375 s
T0 = 0.5
BARS = 84
LENGTH = T0 + BARS * 4 * BEAT + 4.0
N = int(LENGTH * SR)
rng = np.random.default_rng(11)

def bt(b): return T0 + b * BEAT
def bar(k): return bt(k * 4)
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)

NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6,
        'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
def midi(name):
    return 12 * (int(name[-1]) + 1) + NOTE[name[:-1]]

# ---------------------------------------------------------------- buses
class Bus:
    def __init__(self):
        self.L = np.zeros(N, np.float32); self.R = np.zeros(N, np.float32)
    def add(self, t, sig, gain=1.0, pan=0.0):
        """sig: mono array, or (2, n) stereo"""
        i = int(round(t * SR))
        st = sig.ndim == 2
        n0 = sig.shape[-1]
        if i >= N or n0 == 0: return
        if i < 0:
            sig = sig[..., -i:]; i = 0
        n = min(sig.shape[-1], N - i)
        l = gain * np.cos((pan + 1) * np.pi / 4) * np.sqrt(2)
        r = gain * np.sin((pan + 1) * np.pi / 4) * np.sqrt(2)
        if st:
            self.L[i:i + n] += (sig[0, :n] * l).astype(np.float32)
            self.R[i:i + n] += (sig[1, :n] * r).astype(np.float32)
        else:
            self.L[i:i + n] += (sig[:n] * l).astype(np.float32)
            self.R[i:i + n] += (sig[:n] * r).astype(np.float32)
    def stereo(self): return np.vstack([self.L, self.R])

drums, bass, piano_b, glock_b, glass_b, pad = (Bus() for _ in range(6))

def tvec(d): return np.arange(int(d * SR)) / SR
def noise(d): return rng.standard_normal(int(d * SR))
def lp(x, fc, order=2):
    return signal.sosfilt(signal.butter(order, min(fc, SR * 0.45), 'low', fs=SR, output='sos'), x)
def hp(x, fc, order=2):
    return signal.sosfilt(signal.butter(order, fc, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, order=2):
    return signal.sosfilt(signal.butter(order, [lo, min(hi, SR * 0.45)], 'band', fs=SR, output='sos'), x)

# ---------------------------------------------------------------- piano (additive, 2 strings, inharmonic)
_piano_cache = {}
def _piano_raw(m, vb):
    key = (m, vb)
    if key in _piano_cache: return _piano_cache[key]
    vel = (vb + 1) / 4
    f0 = mtof(m)
    tau0 = float(np.clip(4.5 * (261.6 / f0) ** 0.7, 0.5, 9.0))
    dur = min(7.0, tau0 * 2.2 + 0.3)
    tt = tvec(dur)
    Bc = 0.00012 * (f0 / 261.6) ** 0.9 + 0.00003
    out = np.zeros_like(tt)
    nmax = int(min(32, 11000 / f0))
    for n in range(1, nmax + 1):
        fn = n * f0 * np.sqrt(1 + Bc * n * n)
        if fn > 16000: break
        hammer = abs(np.sin(np.pi * n / 7.3)) * 0.85 + 0.15        # strike point ~1/7 of the string
        a = hammer / n ** (1.25 + 0.9 * (1 - vel))
        tn = tau0 / (1 + (fn / 1800) ** 1.3)
        env = 0.65 * np.exp(-tt / (tn * 0.22)) + 0.35 * np.exp(-tt / tn)
        det = 1 + (0.00035 + 0.0002 * rng.random()) * (1 if n % 2 else -1)
        ph = rng.random() * 6.28
        out += a * env * (np.sin(2 * np.pi * fn * tt + ph) + 0.8 * np.sin(2 * np.pi * fn * det * tt + ph + 0.3))
    # hammer thump
    th = int(0.012 * SR)
    knock = lp(noise(0.012), 1200 + 3000 * vel) * np.exp(-np.arange(th) / SR / 0.003)
    out[:th] += knock * 0.25 * vel
    out *= np.minimum(1, tt / 0.0015)
    out = lp(out, 3500 + 10000 * vel ** 1.2)
    out /= max(1e-6, np.max(np.abs(out)))
    _piano_cache[key] = out
    return out

def piano(m, vel=0.7, hold=None):
    """hold = seconds until the damper falls (None = let it ring)"""
    vb = int(np.clip(round(vel * 4) - 1, 0, 3))
    s = _piano_raw(m, vb).copy()
    if hold is not None:
        i = int(hold * SR)
        if i < len(s):
            rel = np.exp(-np.arange(len(s) - i) / SR / (0.09 if m > 50 else 0.15))
            s[i:] *= rel
            s = s[:i + int(0.5 * SR)]
    return s * (0.35 + 0.65 * vel)

# ---------------------------------------------------------------- glockenspiel
_glock_cache = {}
def glock(m):
    if m in _glock_cache: return _glock_cache[m]
    f = mtof(m)
    tt = tvec(2.6)
    k = (1046 / f) ** 0.3
    s = np.zeros_like(tt)
    for ratio, amp, dec in [(1, 1, 1.5), (2.756, 0.28, 0.32), (5.404, 0.1, 0.11), (8.933, 0.04, 0.05)]:
        fr = f * ratio
        if fr < 18000:
            s += amp * np.sin(2 * np.pi * fr * tt) * np.exp(-tt / (dec * k))
    c = int(0.004 * SR)
    s[:c] += hp(noise(0.004), 3000) * np.exp(-np.arange(c) / SR / 0.0008) * 0.6
    s *= np.minimum(1, tt / 0.0008)
    _glock_cache[m] = s
    return s

# ---------------------------------------------------------------- breaking glass
def ping(f, tau, d=None):
    d = d or min(0.6, tau * 7)
    tt = tvec(d)
    s = np.sin(2 * np.pi * f * tt) + 0.5 * np.sin(2 * np.pi * f * 1.593 * tt + 1) * np.exp(-tt / (tau * 0.5)) \
        + 0.3 * np.sin(2 * np.pi * f * 2.37 * tt + 2) * np.exp(-tt / (tau * 0.3))
    return s * np.exp(-tt / tau) * np.minimum(1, tt / 0.0003)

def shatter(size=1.0, dur=2.4):
    """a pane of glass breaking: impact + crack + a spray of shards + pieces landing"""
    n = int((dur + 0.7) * SR)
    out = np.zeros((2, n))
    def put(t, sig, g, pan):
        i = int(t * SR)
        if i >= n: return
        m = min(len(sig), n - i)
        out[0, i:i + m] += sig[:m] * g * np.cos((pan + 1) * np.pi / 4)
        out[1, i:i + m] += sig[:m] * g * np.sin((pan + 1) * np.pi / 4)
    tt = tvec(0.5)
    thump = np.sin(2 * np.pi * (70 + 60 * np.exp(-tt / 0.02)) * tt) * np.exp(-tt / 0.07)
    put(0, thump, 0.7 * size, 0)
    put(0, hp(noise(0.03), 1500) * np.exp(-tvec(0.03) / 0.006), 1.1 * size, 0)       # the crack
    spray = bp(noise(0.9), 2500, 14000) * np.exp(-tvec(0.9) / 0.16)
    put(0.004, spray, 0.55 * size, -0.3); put(0.006, bp(noise(0.9), 2500, 14000) * np.exp(-tvec(0.9) / 0.16), 0.55 * size, 0.3)
    count = int(110 * size)
    for _ in range(count):                                                           # flying shards
        t = rng.exponential(0.09 * (0.6 + 0.4 * size))
        if t > dur * 0.4: continue
        f = np.exp(rng.uniform(np.log(2300), np.log(11000)))
        put(t, ping(f, rng.uniform(0.012, 0.05)), rng.uniform(0.08, 0.28) * np.exp(-t / 0.5), rng.uniform(-0.9, 0.9))
    for _ in range(int(70 * size)):                                                  # pieces landing and bouncing
        t = 0.18 + rng.gamma(2.0, 0.17 * (0.7 + 0.3 * size))
        if t > dur: continue
        f = np.exp(rng.uniform(np.log(1400), np.log(8000)))
        put(t, ping(f, rng.uniform(0.01, 0.07)), rng.uniform(0.04, 0.18) * np.exp(-(t - 0.2) / 0.8), rng.uniform(-1, 1))
    return out

def tink(f=None, g=1.0):
    """a small glass clink (2-3 pings)"""
    f = f or np.exp(rng.uniform(np.log(3000), np.log(7000)))
    s = ping(f, 0.06, 0.4)
    s[int(0.012 * SR):] += 0.4 * ping(f * 1.12, 0.04, 0.4)[:len(s) - int(0.012 * SR)]
    return s * g

def crackle(dur, density0=8, density1=60):
    """ice cracking: clicks getting denser"""
    n = int(dur * SR)
    out = np.zeros((2, n))
    t = 0.0
    while t < dur:
        p = t / dur
        t += rng.exponential(1 / (density0 + (density1 - density0) * p * p))
        if t >= dur: break
        c = hp(noise(0.006), 2500) * np.exp(-tvec(0.006) / 0.001)
        c = c + 0.5 * ping(np.exp(rng.uniform(np.log(3000), np.log(9000))), 0.008, 0.05)[:len(c)]
        i = int(t * SR); m = min(len(c), n - i)
        pan = rng.uniform(-1, 1); g = 0.25 + 0.6 * p
        out[0, i:i + m] += c[:m] * g * np.cos((pan + 1) * np.pi / 4)
        out[1, i:i + m] += c[:m] * g * np.sin((pan + 1) * np.pi / 4)
    return out

# ---------------------------------------------------------------- drums / bass / pad
def kick():
    tt = tvec(0.45)
    f = 45 + 120 * np.exp(-tt / 0.03)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.25)
    c = np.zeros_like(tt); cl = hp(noise(0.005), 3000) * np.linspace(1, 0, int(0.005 * SR)); c[:len(cl)] = cl * 0.35
    return np.tanh(1.5 * (s + c))
def snare():
    tt = tvec(0.25)
    return 0.55 * np.sin(2 * np.pi * 200 * tt) * np.exp(-tt / 0.05) + 0.9 * bp(noise(0.25), 1800, 10000) * np.exp(-tt / 0.1)
def hat(open_=False):
    d = 0.22 if open_ else 0.045
    return hp(noise(d), 8000) * np.exp(-tvec(d) / (0.08 if open_ else 0.012))
def bass_note(m, dur):
    tt = tvec(dur)
    f = mtof(m)
    s = np.sin(2 * np.pi * f * tt) + 0.25 * lp(np.sign(np.sin(2 * np.pi * f * tt)), 600)
    env = np.minimum(1, tt / 0.005) * np.minimum(1, np.maximum(0, (dur - tt) / 0.03))
    return s * env
def strings(ms, dur):
    tt = tvec(dur)
    out = np.zeros_like(tt)
    for m in ms:
        for det in (-0.1, 0.1):
            f = mtof(m) * 2 ** (det / 12)
            ph = np.cumsum(f * (1 + 0.003 * np.sin(2 * np.pi * 5 * tt + rng.random() * 6))) / SR
            out += 2 * (ph % 1) - 1
    out = lp(out, 2000) / (len(ms) * 2)
    att = np.minimum(1, tt / 0.4); rel = np.minimum(1, np.maximum(0, (dur - tt) / 0.4))
    return out * att * rel

# ---------------------------------------------------------------- harmony
CH = {'Dm': [50, 53, 57], 'Bb': [46, 50, 53], 'F': [53, 57, 60], 'C': [48, 52, 55], 'Gm': [55, 58, 62],
      'A': [57, 61, 64], 'Am': [57, 60, 64]}
ROOT = {'Dm': 38, 'Bb': 34, 'F': 41, 'C': 36, 'Gm': 43, 'A': 33, 'Am': 33}
INTRO = ['Dm', 'Bb', 'F', 'C']
PRE = ['Gm', 'A', 'Bb', 'C']
CHORUS = ['Bb', 'C', 'Am', 'Dm', 'Bb', 'C', 'Am', 'Dm', 'Bb', 'C', 'Am', 'Dm', 'Gm', 'A', 'Bb', 'A']
BREAK = ['Dm', 'Bb', 'Gm', 'A'] * 2

prog = {}
for k in range(32): prog[k] = (INTRO[k % 4], 0)
for k in range(8): prog[32 + k] = (PRE[k % 4], 0)
for k in range(16): prog[40 + k] = (CHORUS[k], 0)
for k in range(8): prog[56 + k] = (BREAK[k], 0)
for k in range(16): prog[64 + k] = (CHORUS[k], 1)
for k in range(4): prog[80 + k] = ('Dm', 1)

def parse(lines, start_bar, shift=0):
    notes, cur = [], None
    for bi, line in enumerate(lines):
        toks = line.split(); assert len(toks) == 8, line
        for k, tok in enumerate(toks):
            b = (start_bar + bi) * 4 + k * 0.5
            if tok == '-':
                if cur: cur[1] += 0.5
                continue
            if cur: notes.append(tuple(cur)); cur = None
            if tok == '.': continue
            cur = [b, 0.5, midi(tok) + shift]
    if cur: notes.append(tuple(cur))
    return notes

HOOK = ['D6 . A5 . F6 - E6 .', 'D6 . A5 . F5 - - .', 'C6 . A5 . C6 - D6 .', 'E6 - - - C6 - . .']
VERSE = ['A5 - - - F5 - D5 -', 'D5 - - - F5 - G5 -', 'A5 - - - C6 - A5 -', 'G5 - - - - - . .',
         'A5 - - - F5 - D5 -', 'D5 - - - F5 - Bb5 -', 'A5 - C6 - D6 - C6 -', 'G5 - - - E5 - . .']
PRE_M = ['G5 - - - D5 - G5 -', 'A5 - - - E5 - A5 -', 'Bb5 - - - F5 - Bb5 -', 'C6 - - - G5 - C6 -',
         'D6 - C6 - Bb5 - A5 -', 'C#6 - A5 - E5 - C#5 -', 'D6 - - - F6 - - -', 'E6 - - - - - . .']
CHORUS_M = ['D5 - - C5 D5 - F5 -', 'E5 - - D5 C5 - G4 -', 'A4 - C5 - E5 - D5 C5', 'D5 - - - - - A4 C5',
            'D5 - - C5 D5 - F5 -', 'G5 - - F5 E5 - C5 -', 'E5 - F5 - G5 - A5 -', 'D5 - - - - - . .',
            'F5 - - E5 F5 - A5 -', 'G5 - - F5 E5 - C5 -', 'E5 - F5 - G5 - A5 C6', 'D6 - - - - - A5 -',
            'Bb5 - A5 - G5 - F5 -', 'E5 - - F5 E5 - C#5 -', 'D5 - F5 - A5 - D6 -', 'C#6 - - - - - . .']
BREAK_M = ['D5 - - - - - C5 -', 'D5 - - - F5 - - -', 'G5 - - - F5 - D5 -', 'E5 - - - - - . .',
           'D5 - - - - - C5 -', 'D5 - - - F5 - A5 -', 'Bb5 - - - A5 - G5 -', 'A5 - - - - - . .']
OUTRO_G = ['D6 . A5 . F6 - E6 .', 'D6 - - - - - - -', '. . . . . . . .', '. . . . . . . .']

hook_notes = parse(HOOK * 2, 0) + parse(HOOK * 2, 8)
verse_glock = parse(VERSE, 16)
verse_piano = parse(VERSE, 24, -12)
pre_notes = parse(PRE_M, 32)
chorus_notes = parse(CHORUS_M, 40)
break_notes = parse(BREAK_M, 56)
final_notes = parse(CHORUS_M, 64, 1)
outro_glock = parse(OUTRO_G, 80, 1)

score = {'kick': [], 'snare': [], 'shatter': [], 'tink': [], 'stab': [], 'arp': []}

# ---------------------------------------------------------------- drums
def K(b, g=1.0): drums.add(bt(b), kick(), 0.42 * g); score['kick'].append(b)
def S(b, g=1.0): drums.add(bt(b), snare(), 0.42 * g, 0.05); score['snare'].append(b)
def HH(b, g=1.0, o=False, pan=0.3): drums.add(bt(b), hat(o), (0.2 if o else 0.22) * g, pan)

for k in range(8, 12):                                     # intro B: kick only, half-time
    K(k * 4); K(k * 4 + 2.5, 0.8)
for k in range(12, 15):
    K(k * 4); K(k * 4 + 2.5, 0.8); S(k * 4 + 2, 0.7)
    for e in range(8): HH(k * 4 + e * 0.5, 0.5 + 0.5 * (e % 2))
for i in range(12): S(15 * 4 + 1 + i * 0.25, 0.3 + 0.6 * i / 12)      # roll into the shatter
def groove(k0, k1, four=False, h16=False):
    for k in range(k0, k1):
        B = k * 4
        if four:
            for q in range(4): K(B + q)
        else:
            K(B); K(B + 1.5, 0.85); K(B + 2.5, 0.9)
        S(B + 1); S(B + 3)
        for e in range(16 if h16 else 8):
            step = 0.25 if h16 else 0.5
            HH(B + e * step, (1.0 if e % 2 else 0.55) if not h16 else (0.9 if e % 4 == 2 else 0.45), pan=0.3 if e % 2 else -0.2)
        HH(B + 3.5, 0.8, True, -0.3)
groove(16, 32)
groove(32, 36, four=True)
for k in range(36, 40):                                    # pre-chorus build: snare 8ths, then 16ths
    for q in range(4): K(k * 4 + q)
    for e in range(8 if k < 39 else 0): S(k * 4 + e * 0.5, 0.45 + 0.1 * (k - 36))
for i in range(12): S(39 * 4 + i * 0.25, 0.5 + 0.5 * i / 12)          # last beat (beat 159) silent
groove(40, 56, four=True, h16=True)
for k in range(62, 64):
    for e in range(8 if k == 62 else 16): K(k * 4 + e * (0.5 if k == 62 else 0.25), 0.5 + 0.5 * (k - 62) + 0.02 * e)
for i in range(16): S(63 * 4 + i * 0.25, 0.3 + 0.6 * i / 16)
groove(64, 80, four=True, h16=True)
K(320, 1.2)

# ---------------------------------------------------------------- glass
def SH(b, size, gain=1.0):
    glass_b.add(bt(b) - 0.004, shatter(size), 0.55 * gain)
    score['shatter'].append([b, size])
def TK(b, g=1.0, pan=0.0):
    glass_b.add(bt(b), tink(None, 1.0), 0.16 * g, pan); score['tink'].append(b)

SH(32 * 2, 0.5, 0.6)                                       # bar 16
SH(16 * 4, 1.0)
SH(40 * 4, 1.3)
SH(48 * 4, 0.8, 0.9)
SH(56 * 4, 1.2)
SH(64 * 4, 1.4)
for k in (68, 72, 76): SH(k * 4, 0.8, 0.85)
SH(80 * 4, 1.6, 1.1)
SH(8 * 4, 0.35, 0.5)                                       # intro: a small crack opens the beat
# intro: clinks like a music box made of glass
for k in range(0, 8):
    TK(k * 4 + 3.5, 0.6, -0.5 + 0.15 * k)
for k in range(16, 32, 2): TK(k * 4 + 3.75, 0.8, 0.4); TK(k * 4 + 7.75, 0.6, -0.4)
for k in range(40, 56):
    if k % 8 != 0: TK(k * 4, 0.9, 0.5 if k % 2 else -0.5)
for k in range(64, 80):
    if k % 4 != 0: TK(k * 4, 1.0, 0.5 if k % 2 else -0.5)
# ice cracking before the chorus and before the final chorus
glass_b.add(bar(36), crackle(4 * 4 * BEAT - BEAT, 6, 70), 0.3)
glass_b.add(bar(62), crackle(2 * 4 * BEAT, 6, 90), 0.3)
# reversed shatter swells into bar 64
rv = shatter(1.0)[:, ::-1]
glass_b.add(bar(64) - rv.shape[1] / SR + 0.7, rv, 0.45)

# ---------------------------------------------------------------- piano parts
def P(b, m, vel, hold_beats=None, pan=0.0, g=1.0):
    piano_b.add(bt(b), piano(m, vel, None if hold_beats is None else hold_beats * BEAT), 0.3 * g, pan + (m - 64) / 60)

for k in range(84):
    name, sh = prog[k]
    tones = [t + sh for t in CH[name]]; root = ROOT[name] + sh
    B = k * 4
    if k < 8:                                              # intro: arpeggio with pedal
        seq = [root + 12, tones[2], tones[0] + 12, tones[1] + 12, tones[2] + 12, tones[1] + 12, tones[0] + 12, tones[2]]
        for e, m in enumerate(seq):
            P(B + e * 0.5, m, 0.42 + (0.12 if e == 0 else 0), 4 - e * 0.5 + 0.3, g=0.42)
            score['arp'].append([B + e * 0.5, m]) if k >= 4 else None
    elif k < 16:                                           # intro B: ostinato, staccato
        seq = [tones[0] + 12, tones[2] + 12, tones[1] + 12, tones[2] + 12] * 2
        for e, m in enumerate(seq): P(B + e * 0.5, m, 0.5 + 0.1 * (e % 2 == 0), 0.45, g=0.55)
        P(B, root, 0.6, 2.3, g=0.55); P(B + 2.5, root + 12, 0.5, 1.3, g=0.55)
        for e, m in enumerate(seq): score['arp'].append([B + e * 0.5, m])
    elif k < 32:                                           # verse: octave bass 8ths + 3-3-2 chord stabs
        for e in range(8):
            P(B + e * 0.5, root, 0.55 if e % 2 == 0 else 0.45, 0.4); P(B + e * 0.5, root + 12, 0.4, 0.4)
        for s in (0, 1.5, 3):
            for m in tones: P(B + s, m + 12, 0.62, 0.9 if s < 3 else 0.6)
            score['stab'].append([B + s, [m + 12 for m in tones]])
    elif k < 40:                                           # pre: quarter octaves + stabs
        for q in range(4):
            if k == 39 and q == 3: continue
            P(B + q, root, 0.65, 0.8); P(B + q, root + 12, 0.55, 0.8)
            for m in tones: P(B + q + 0.5, m + 12, 0.5 + 0.03 * (k - 32), 0.35)
            score['stab'].append([B + q + 0.5, [m + 12 for m in tones]])
    elif 40 <= k < 56 or 64 <= k < 80:                     # chorus: bass octaves + off-beat comping
        for e in range(8):
            P(B + e * 0.5, root, 0.6, 0.45); P(B + e * 0.5, root + 12, 0.45, 0.45)
            if e % 2 == 1:
                for m in tones: P(B + e * 0.5, m + 12, 0.48, 0.4)
        if k >= 64:                                        # final: high 16th arpeggio
            seq = [tones[0] + 24, tones[1] + 24, tones[2] + 24, tones[1] + 24]
            for s in range(16): P(B + s * 0.25, seq[s % 4], 0.3, 0.3, 0.3)
    elif k < 64:                                           # break: pedalled chords, sparse
        P(B, root, 0.55, 4.2); P(B, root + 12, 0.45, 4.2)
        for i, m in enumerate(tones): P(B + 0.02 * i, m + 12, 0.4, 4.2)
        if k < 62:
            for q in (1, 3): glock_b.add(bt(B + q), glock(tones[(q + k) % 3] + 36 if tones[(q + k) % 3] + 36 < 100 else tones[(q + k) % 3] + 24), 0.1, 0.3)
    else:                                                  # outro: the last chord rings
        if k == 80:
            for m in [root, root + 12] + [t + 12 for t in tones] + [tones[0] + 24]: P(B, m, 0.9, 12)

for (b, L, m) in verse_piano: P(b, m, 0.68, L + 0.2)
for (b, L, m) in pre_notes: P(b, m, 0.78, L); P(b, m - 12, 0.7, L)
for (b, L, m) in chorus_notes + final_notes: P(b, m, 0.92, L); P(b, m - 12, 0.85, L)
for (b, L, m) in break_notes: P(b, m, 0.62, L + 1.0)

# ---------------------------------------------------------------- glockenspiel
for (b, L, m) in hook_notes: glock_b.add(bt(b), glock(m + 12 if m < 84 else m), 0.22 if b < 32 else 0.18, -0.2)
for (b, L, m) in verse_glock: glock_b.add(bt(b), glock(m + 12), 0.24, -0.15)
for (b, L, m) in verse_piano: glock_b.add(bt(b), glock(m + 24), 0.1, -0.15)
for (b, L, m) in chorus_notes + final_notes: glock_b.add(bt(b), glock(m + 24), 0.14, -0.2)
for (b, L, m) in pre_notes: glock_b.add(bt(b), glock(m + 12), 0.1, -0.2)
for (b, L, m) in outro_glock: glock_b.add(bt(b), glock(m + 12), 0.2, -0.1)

# ---------------------------------------------------------------- bass and strings
for k in range(84):
    name, sh = prog[k]
    root = ROOT[name] + sh
    tones = [t + sh for t in CH[name]]
    if 16 <= k < 40 or 40 <= k < 56 or 64 <= k < 80 or 62 <= k < 64:
        if k < 40 and k >= 16:
            for s in (0, 1.5, 2.5): bass.add(bt(k * 4 + s), bass_note(root - 12 + 12 * (root < 36), BEAT * 1.4), 0.5)
        else:
            for e in range(8): bass.add(bt(k * 4 + e * 0.5), bass_note(root - 12 + 12 * (root < 36), BEAT * 0.48), 0.45)
    if 40 <= k < 56 or 64 <= k < 80 or 56 <= k < 62:
        pad.add(bar(k), strings([t + 12 for t in tones], 1.55), 0.16 if k < 56 or k >= 64 else 0.12)
    if k == 80:
        bass.add(bar(80), bass_note(root - 12 + 12 * (root < 36), 4.0), 0.5)
        pad.add(bar(80), strings([t + 12 for t in tones], 5.0), 0.2)

def sidechain(bus, b0, b1, depth=0.5, tau=0.08):
    for b in np.arange(b0, b1, 1.0):
        i0 = int(bt(b) * SR); n = int(BEAT * SR)
        env = (1 - depth * np.exp(-np.arange(n) / SR / tau)).astype(np.float32)
        for ch in (bus.L, bus.R): ch[i0:i0 + n] *= env[:len(ch[i0:i0 + n])]
sidechain(bass, 160, 224, 0.6); sidechain(bass, 256, 320, 0.6)
sidechain(pad, 160, 224, 0.5); sidechain(pad, 256, 320, 0.5)

# ---------------------------------------------------------------- mix
def reverb(st, mix, dur=2.6, decay=0.6):
    tt = np.arange(int(dur * SR)) / SR
    out = []
    for ch in range(2):
        ir = rng.standard_normal(len(tt)) * np.exp(-tt / decay)
        ir = lp(ir, 7000); ir /= np.sqrt(np.sum(ir ** 2))
        out.append(signal.fftconvolve(st[ch], ir)[:N])
    return np.vstack(out) * mix

pianost = piano_b.stereo(); glockst = glock_b.stereo(); glassst = glass_b.stereo()
dry = drums.stereo() * 0.95 + bass.stereo() * 0.25 + pianost * 1.0 + glockst * 1.0 + glassst * 1.0 + pad.stereo() * 0.8
send = pianost * 0.55 + glockst * 0.9 + glassst * 0.6 + pad.stereo() * 0.5 + drums.stereo() * 0.05
mix = dry + reverb(send, 0.4)
# the break: everything wetter (a big empty room)
a, z = int(bar(56) * SR), int(bar(62) * SR)
mix[:, a:z] += reverb(np.pad(pianost[:, a:z], ((0, 0), (a, N - z))), 0.5, 4.0, 1.4)[:, a:z]

# a beat of silence right after the shatter at bar 56 (only the glass keeps ringing)
i0, i1 = int((bar(56) + 0.05) * SR), int(bt(56 * 4 + 1) * SR)
mix[:, i0:i1] = glassst[:, i0:i1] + reverb(glassst, 0.6)[:, i0:i1]

mix -= np.mean(mix, axis=1, keepdims=True)
mix = mix / np.max(np.abs(mix)) * 1.5
mix = np.tanh(mix) / np.tanh(1.5)
endi = int((bar(84) + 1.5) * SR)
fade = int(2.5 * SR)
mix[:, endi - fade:endi] *= np.linspace(1, 0, fade)
mix = mix[:, :endi]
mix *= 0.93 / np.max(np.abs(mix))

from scipy.io import wavfile
wavfile.write('segment.wav', SR, (mix.T * 32767).astype(np.int16))
score.update({
    'bpm': BPM, 'beat': BEAT, 't0': T0, 'end': round(mix.shape[1] / SR, 2),
    'hook': [[b, m] for b, L, m in hook_notes],
    'verseGlock': [[b, m] for b, L, m in verse_glock],
    'versePiano': [[b, L, m] for b, L, m in verse_piano],
    'pre': [[b, L, m] for b, L, m in pre_notes],
    'chorus': [[b, L, m] for b, L, m in chorus_notes],
    'break': [[b, L, m] for b, L, m in break_notes],
    'final': [[b, L, m] for b, L, m in final_notes],
})
json.dump(score, open('score.json', 'w'))
print('done', mix.shape[1] / SR, 's')
