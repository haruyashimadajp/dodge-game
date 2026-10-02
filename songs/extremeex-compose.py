"""ExtremeEX — original song for the dodge game (the hardest one).
200 BPM hardcore, F minor (the second drop goes up to F# minor). Beat 0 at t = 0.5 s; 1 bar = 1.2 s.
The signature sound is the "vwoon" synth: a stack of detuned saws, driven hard, whose pitch
whines up into every note from an octave below while its filter tears open ("ヴイーン").
Writes extremeex.wav and score.json (beat times for the chart).

Run:  python3 extremeex-compose.py      (needs numpy + scipy)
Then: ffmpeg -i extremeex.wav -b:a 192k ExtremeEX.mp3, and copy score.json into songs/extremeex-score.js.
Form (bars): intro 0-8 / A 8-24 / build 24-32 / drop 32-48 / break 48-56 / build 56-64 /
drop EX 64-88 / final 88-96 / end 96-100.
"""
import json
import numpy as np
from scipy import signal

SR = 44100
BPM = 200
BEAT = 60 / BPM            # 0.3 s
T0 = 0.5
BARS = 100
N = int((T0 + BARS * 4 * BEAT + 3.0) * SR)
rng = np.random.default_rng(99)

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

drums, bass, synth, lead, fxb = (Bus() for _ in range(5))

def tvec(d): return np.arange(int(d * SR)) / SR
def noise(d): return rng.standard_normal(int(d * SR))
def lp(x, fc, o=2): return signal.sosfilt(signal.butter(o, min(fc, SR * 0.45), 'low', fs=SR, output='sos'), x)
def hp(x, fc, o=2): return signal.sosfilt(signal.butter(o, fc, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=2): return signal.sosfilt(signal.butter(o, [lo, min(hi, SR * 0.45)], 'band', fs=SR, output='sos'), x)

def polyblep(ph, dt):
    out = np.zeros_like(ph)
    m = ph < dt; x = ph[m] / dt[m]; out[m] = x + x - x * x - 1
    m = ph > 1 - dt; x = (ph[m] - 1) / dt[m]; out[m] = x * x + x + x + 1
    return out
def saw(f, dur):
    n = int(dur * SR)
    f = np.broadcast_to(np.asarray(f, float), (n,)) if np.ndim(f) else np.full(n, float(f))
    dt = f / SR
    ph = (np.cumsum(dt) + rng.random()) % 1.0
    return (2 * ph - 1) - polyblep(ph, dt)
def sine(f, dur):
    n = int(dur * SR)
    f = np.broadcast_to(np.asarray(f, float), (n,)) if np.ndim(f) else np.full(n, float(f))
    return np.sin(2 * np.pi * np.cumsum(f) / SR)
def env(dur, a=0.004, r=0.04):
    tt = tvec(dur)
    return np.minimum(1, tt / max(a, 1e-4)) * np.clip((dur - tt) / max(r, 1e-4), 0, 1)
def sweep_lp(x, fc):
    """low-pass with a cutoff that changes over time (fc = array, one value per sample)"""
    out = np.zeros_like(x); zi = None; blk = 192
    for i in range(0, len(x), blk):
        sos = signal.butter(2, float(np.clip(fc[i], 40, SR * 0.45)), 'low', fs=SR, output='sos')
        if zi is None: zi = np.zeros((sos.shape[0], 2))
        out[i:i + blk], zi = signal.sosfilt(sos, x[i:i + blk], zi=zi)
    return out

# ---------------------------------------------------------------- the "vwoon" synth
def vwoon(m, dur, rise=12, rise_t=0.11, drive=4.0, bright=1.0, voices=7):
    """pitch whines up `rise` semitones into the note while the filter tears open"""
    tt = tvec(dur)
    k = np.clip(tt / rise_t, 0, 1)
    semi = m - rise * (1 - (3 * k * k - 2 * k ** 3)) + 0.12 * np.sin(2 * np.pi * 7 * tt) * np.clip((tt - 0.12) / 0.1, 0, 1)
    f = mtof(semi)
    s = np.zeros_like(tt)
    for i in range(voices):
        det = (i - (voices - 1) / 2) / ((voices - 1) / 2) * 0.22
        s += saw(f * 2 ** (det / 12), dur)
    s = s / voices + 0.5 * np.sign(np.sin(2 * np.pi * np.cumsum(f / 2) / SR))   # square sub an octave down
    s = np.tanh(s * drive)
    fc = (500 + 8500 * bright * np.clip(tt / (rise_t * 1.3), 0, 1) ** 1.5) * (1 - 0.35 * np.clip((tt - 0.2) / max(0.01, dur), 0, 1))
    s = sweep_lp(s, fc)
    s = s + 0.35 * bp(s, 1800, 3200)                                               # the "ee" vowel
    return np.tanh(s * 1.5) * env(dur, 0.003, min(0.05, dur * 0.3))

def siren(dur, m0=48, m1=84):
    """long vwoon glide upward (risers)"""
    tt = tvec(dur)
    f = mtof(m0 + (m1 - m0) * (tt / dur) ** 1.6)
    s = sum(saw(f * 2 ** (d / 12), dur) for d in (-0.25, 0, 0.25)) / 3
    s = np.tanh(s * 3)
    return sweep_lp(s, 400 + 9000 * (tt / dur) ** 2) * np.minimum(1, tt / 0.05)

def reese(m, dur, growl=0.0):
    tt = tvec(dur)
    f = mtof(m)
    s = saw(f * 1.006, dur) + saw(f * 0.994, dur)
    if growl:
        s = np.sin(2 * np.pi * np.cumsum(np.full(len(tt), f)) / SR + growl * (1 + np.sin(2 * np.pi * 8 * tt)) * s)
    s = np.tanh(lp(s, 700 + 1500 * growl) * 2.5) + 0.8 * sine(f, dur)
    return s * env(dur, 0.003, 0.03)

# ---------------------------------------------------------------- drums
def hardkick(g=1.0):
    tt = tvec(0.3)
    f = 50 + 260 * np.exp(-tt / 0.018)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.16)
    s[:int(0.005 * SR)] += hp(noise(0.005), 2500) * 0.5
    return np.tanh(s * 5) * 0.75 * g
def snare():
    tt = tvec(0.22)
    return np.tanh((0.7 * np.sin(2 * np.pi * 210 * tt) * np.exp(-tt / 0.04) + bp(noise(0.22), 1500, 11000) * np.exp(-tt / 0.08)) * 2)
def hat(o=False):
    d = 0.18 if o else 0.035
    return hp(noise(d), 8000) * np.exp(-tvec(d) / (0.06 if o else 0.01))
def crash(d=1.6): return hp(noise(d), 4000) * np.exp(-tvec(d) / 0.5)
def impact():
    tt = tvec(1.5)
    return np.tanh((np.sin(2 * np.pi * (35 + 80 * np.exp(-tt / 0.05)) * tt) * np.exp(-tt / 0.5) + hp(noise(1.5), 200) * np.exp(-tt / 0.2) * 0.5) * 3)

score = {'kick': [], 'snare': [], 'stab': [], 'impact': []}
def K(b, g=1.0): drums.add(bt(b), hardkick(g), 0.5); score['kick'].append(b)
def S(b, g=1.0): drums.add(bt(b), snare(), 0.36 * g, 0.05); score['snare'].append(b)
def HH(b, g=1.0, o=False, pan=0.3): drums.add(bt(b), hat(o), (0.17 if o else 0.2) * g, pan)
def CR(b, g=1.0): drums.add(bt(b), crash(), 0.3 * g, -0.2)
def IMP(b, g=1.0): fxb.add(bt(b), impact(), 0.45 * g); score['impact'].append(b)

def hardcore(k0, k1, h16=False, snare_on=(1, 3)):
    for k in range(k0, k1):
        B = k * 4
        for q in range(4): K(B + q)
        for q in snare_on: S(B + q)
        for e in range(16 if h16 else 8):
            st = 0.25 if h16 else 0.5
            if h16 or e % 2: HH(B + e * st, 0.9 if (e % 2 if not h16 else e % 4 == 2) else 0.45, pan=0.3 if e % 2 else -0.25)
        HH(B + 3.5, 0.8, True, -0.3)

# intro: kick bursts on bar heads, accelerating
for k in range(0, 8):
    K(k * 4, 0.8)
    if k >= 4: K(k * 4 + 2, 0.8)
    if k >= 6: K(k * 4 + 1); K(k * 4 + 3)
for i in range(8): S(7 * 4 + i * 0.5, 0.4 + 0.07 * i)
IMP(32)
hardcore(8, 24)
for k in range(24, 32):                                   # build: kicks thin out, snare roll speeds up
    K(k * 4)
    step = 1 if k < 26 else 0.5 if k < 28 else 0.25 if k < 31 else 0.125
    for i in range(int(4 / step)): S(k * 4 + i * step, 0.3 + 0.6 * (k - 24) / 8)
IMP(128); CR(128, 1.3)
hardcore(32, 48, h16=True)
for k in (36, 40, 44): CR(k * 4)
for k in range(48, 56):                                   # break: half-time
    K(k * 4); K(k * 4 + 1.5, 0.8); S(k * 4 + 2)
    if k % 2: K(k * 4 + 3.5, 0.7)
    for e in range(8): HH(k * 4 + e * 0.5, 0.6)
for k in range(56, 64):
    for q in range(4): K(k * 4 + q, 0.7 + 0.04 * (k - 56))
    step = 0.5 if k < 60 else 0.25 if k < 62 else 0.125
    for i in range(int(4 / step)): S(k * 4 + i * step, 0.3 + 0.6 * (k - 56) / 8)
IMP(256, 1.2); CR(256, 1.4)
hardcore(64, 88, h16=True)
for k in range(64, 88, 4): CR(k * 4)
for k in range(88, 96):                                   # final: double kicks
    B = k * 4
    for q in range(8): K(B + q * 0.5, 0.9)
    S(B + 1); S(B + 3)
    for e in range(16): HH(B + e * 0.25, 0.8)
IMP(384, 1.4); CR(384, 1.5)

# ---------------------------------------------------------------- harmony & parts
CH = {'Fm': (41, [65, 68, 72]), 'Db': (37, [61, 65, 68]), 'Eb': (39, [63, 67, 70]), 'C': (36, [64, 67, 72]),
      'Bbm': (34, [65, 70, 73]), 'Ab': (44, [63, 68, 72])}
PROG = ['Fm', 'Db', 'Eb', 'C']
def chord(k):
    name = PROG[k % 4] if not (48 <= k < 56) else ['Fm', 'Bbm', 'Db', 'C'][k % 4]
    root, tones = CH[name]
    sh = 1 if 64 <= k < 100 else 0
    return name, root + sh, [t + sh for t in tones]

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

LEAD = ['F5 - - Ab5 - - C6 -', 'Db6 - - C6 - - Ab5 -', 'Bb5 - - G5 - - Eb5 -', 'E5 - - G5 - C6 - -',
        'F5 - - Ab5 - - C6 -', 'F6 - - Eb6 - - Db6 -', 'Eb6 - Db6 - C6 - Bb5 -', 'C6 - - - - - - -']
LEAD_END = ['F5 - - Ab5 - - C6 -', 'F6 - - Eb6 - - Db6 -', 'Eb6 - F6 - G6 - Ab6 -', 'G6 - - - E6 - C6 -']
drop1 = parse(LEAD * 2, 32)
drop2 = parse(LEAD * 2 + LEAD[:4] + LEAD_END, 64, 1)
final = parse(['F6 - - - Ab6 - - -', 'Db6 - - - F6 - - -', 'Eb6 - - - G6 - - -', 'C6 - - - E6 - - -'] * 2, 88, 1)

STAB = [0, 0.75, 1.5, 2.5, 3.25]                         # syncopated vwoon stabs (A section)
for k in range(BARS):
    name, root, tones = chord(k)
    t = bar(k)
    if k < 8:
        if k % 2 == 0: synth.add(t, vwoon(root + 24, 0.5, rise=24, rise_t=0.3), 0.25, -0.2 + 0.1 * k)
    if 8 <= k < 24:
        for s in STAB:
            synth.add(bt(k * 4 + s), vwoon(root + 24, 0.22, rise=7, rise_t=0.06), 0.3, 0.3 if s % 1 else -0.3)
            score['stab'].append([k * 4 + s, root + 24])
        for e in range(8):
            bass.add(bt(k * 4 + e * 0.5 + 0.0), reese(root, 0.14), 0.45 if e % 2 else 0)
    if 24 <= k < 32:
        bass.add(t, reese(root, 1.15), 0.4)
    if 32 <= k < 48 or 64 <= k < 88:
        for e in range(8):
            if e % 2: bass.add(bt(k * 4 + e * 0.5), reese(root, 0.14, growl=0.6), 0.5)
        synth.add(t, vwoon(root + 12, 1.15, rise=5, rise_t=0.05, drive=2.5, bright=0.5, voices=5), 0.12)
    if 48 <= k < 56:
        bass.add(t, reese(root, 0.55, growl=1.5), 0.55); bass.add(bt(k * 4 + 2), reese(root + 12 if k % 2 else root, 0.55, growl=2.2), 0.5)
        if k % 2 == 1:
            synth.add(bt(k * 4 + 3), vwoon(root + 36, 0.3, rise=12, rise_t=0.1), 0.25, 0.3)
    if 56 <= k < 64:
        for e in range(8): bass.add(bt(k * 4 + e * 0.5), reese(root, 0.13), 0.45)
    if 88 <= k < 96:
        for e in range(8): bass.add(bt(k * 4 + e * 0.5), reese(root, 0.13, growl=1.0), 0.5)
        for s in (0, 1.5, 3): synth.add(bt(k * 4 + s), vwoon(root + 24, 0.3, rise=12, rise_t=0.08), 0.3)
    if k == 96:
        synth.add(t, vwoon(root + 12, 3.0, rise=24, rise_t=0.5), 0.35)
        bass.add(t, reese(root, 3.0, growl=0.8) * np.exp(-tvec(3.0) / 1.0), 0.6)

for (b, L, m) in drop1 + drop2 + final:
    lead.add(bt(b), vwoon(m, L * BEAT + 0.04, rise=12 if L >= 1 else 5, rise_t=0.09 if L >= 1 else 0.04), 0.42, -0.05)
    lead.add(bt(b), vwoon(m + 12, L * BEAT + 0.04, rise=12, rise_t=0.09, voices=3, bright=0.7), 0.1, 0.15)

for (b0, b1) in ((96, 128), (224, 256)):
    fxb.add(bt(b0), siren((b1 - b0) * BEAT), 0.2)
    d = (b1 - b0) * BEAT
    nz = hp(noise(d), 2000) * np.linspace(0, 1, int(d * SR)) ** 3
    fxb.add(bt(b0), nz, 0.25)

def sidechain(bus, b0, b1, depth, tau=0.06):
    for b in np.arange(b0, b1, 1.0):
        i0 = int(bt(b) * SR); n = int(BEAT * SR)
        e = (1 - depth * np.exp(-np.arange(n) / SR / tau)).astype(np.float32)
        for ch in (bus.L, bus.R): ch[i0:i0 + n] *= e[:len(ch[i0:i0 + n])]
for a, z in ((32, 48), (64, 96), (8, 24)):
    sidechain(synth, a * 4, z * 4, 0.6); sidechain(lead, a * 4, z * 4, 0.35)

def reverb(st, mix, dur=1.6, decay=0.35):
    tt = np.arange(int(dur * SR)) / SR
    out = []
    for ch in range(2):
        ir = lp(rng.standard_normal(len(tt)) * np.exp(-tt / decay), 7000); ir /= np.sqrt(np.sum(ir ** 2))
        out.append(signal.fftconvolve(st[ch], ir)[:N])
    return np.vstack(out) * mix
leadst = lead.stereo(); synst = synth.stereo()
dry = drums.stereo() + bass.stereo() * 0.3 + synst + leadst + fxb.stereo()
mix = dry + reverb(leadst * 0.5 + synst * 0.4 + drums.stereo() * 0.05, 0.25)
mix -= np.mean(mix, axis=1, keepdims=True)
mix = mix / np.max(np.abs(mix)) * 2.2
mix = np.tanh(mix) / np.tanh(2.2)                        # loud and crushed on purpose
endi = int((bar(97) + 1.5) * SR)
mix[:, endi - int(2 * SR):endi] *= np.linspace(1, 0, int(2 * SR))
mix = mix[:, :endi]
mix *= 0.95 / np.max(np.abs(mix))

from scipy.io import wavfile
wavfile.write('extremeex.wav', SR, (mix.T * 32767).astype(np.int16))
score.update({'bpm': BPM, 'beat': BEAT, 't0': T0, 'end': round(mix.shape[1] / SR, 2),
              'drop1': [[b, L, m] for b, L, m in drop1], 'drop2': [[b, L, m] for b, L, m in drop2],
              'final': [[b, L, m] for b, L, m in final]})
json.dump(score, open('score.json', 'w'))
print('done', mix.shape[1] / SR)
