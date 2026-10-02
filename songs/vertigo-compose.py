"""Vertigo — original song for the dodge game.
128 BPM, E minor. Beat 0 at t = 0.5 s; 1 bar = 1.875 s.
A seasick, wobbling electro track: detuned pads that drift in pitch, a wobble bass,
a lead that dives at the end of phrases, the whole song sinking a whole tone when the
screen turns upside down, and the stereo image flipping left/right every bar in the
"mirror" part. Writes vertigo.wav and score.json (beat times for the chart).

Run:  python3 vertigo-compose.py      (needs numpy + scipy)
Then: ffmpeg -i vertigo.wav -b:a 192k Vertigo.mp3, and copy score.json into songs/vertigo-score.js.
Form (bars): intro 0-8 / tilt 8-16 / conveyor 16-24 / build 24-28 / drop 28-36 /
upside down 36-40 / mirror 40-44 / build 44-48 / drop 2 48-60 / outro 60-66.
"""
import json
import numpy as np
from scipy import signal

SR = 44100
BPM = 128
BEAT = 60 / BPM            # 0.46875 s
T0 = 0.5
BARS = 66
N = int((T0 + BARS * 4 * BEAT + 4.0) * SR)
rng = np.random.default_rng(23)

def bt(b): return T0 + b * BEAT
def bar(k): return bt(k * 4)
def mtof(m): return 440.0 * 2 ** ((np.asarray(m, float) - 69) / 12)
NOTE = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'Bb': 10, 'B': 11}
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

drums, bass, pad, lead, keys, fxb = (Bus() for _ in range(6))

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
def saw(freq, dur):
    n = int(dur * SR)
    f = np.broadcast_to(np.asarray(freq, float), (n,)) if np.ndim(freq) else np.full(n, float(freq))
    dt = f / SR
    ph = (np.cumsum(dt) + rng.random()) % 1.0
    return (2 * ph - 1) - polyblep(ph, dt)
def sine(freq, dur):
    n = int(dur * SR)
    f = np.broadcast_to(np.asarray(freq, float), (n,)) if np.ndim(freq) else np.full(n, float(freq))
    return np.sin(2 * np.pi * np.cumsum(f) / SR)
def env(dur, a=0.005, r=0.05):
    tt = tvec(dur)
    return np.minimum(1, tt / max(a, 1e-4)) * np.clip((dur - tt) / max(r, 1e-4), 0, 1)

# ---- whole-song pitch drift: the world "sinks" a whole tone in the upside-down part
def drift_semi(t):
    t = np.asarray(t, float)
    a, z = bar(36), bar(40)
    p = np.clip((t - a) / (2 * 4 * BEAT), 0, 1)                    # 2 bars down
    q = np.clip((t - (z - 0.5 * 4 * BEAT)) / (0.5 * 4 * BEAT), 0, 1)  # half a bar back up
    return np.where(t < a, 0, np.where(t < z - 0.5 * 4 * BEAT, -2 * (3 * p * p - 2 * p ** 3), -2 * (1 - q)))

def note_freq(m, t0, dur, vib=0.0, vibf=5.0, sea=0.0):
    tt = tvec(dur)
    semi = m + drift_semi(t0 + tt) + vib * np.sin(2 * np.pi * vibf * tt) * np.clip(tt / 0.2, 0, 1) \
        + sea * np.sin(2 * np.pi * 0.35 * (t0 + tt))                 # slow seasick wobble
    return mtof(semi)

# ---- drums
def kick(g=1.0):
    tt = tvec(0.5)
    f = 42 + 140 * np.exp(-tt / 0.028)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.3)
    s[:int(0.004 * SR)] += hp(noise(0.004), 3000) * 0.3
    return np.tanh(1.8 * s) * g
def snare():
    tt = tvec(0.35)
    body = np.sin(2 * np.pi * 180 * tt) * np.exp(-tt / 0.06)
    nz = bp(noise(0.35), 1200, 9000) * np.exp(-tt / 0.13)
    return 0.6 * body + 1.0 * nz
def clap():
    d = 0.3; out = np.zeros(int(d * SR))
    for k, off in enumerate([0, 0.01, 0.021]):
        seg = bp(noise(d - off), 900, 6000) * np.exp(-tvec(d - off) / (0.012 if k < 2 else 0.11))
        i = int(off * SR); out[i:i + len(seg)] += seg
    return out
def hat(o=False):
    d = 0.24 if o else 0.05
    return hp(noise(d), 7500) * np.exp(-tvec(d) / (0.08 if o else 0.013))
def crash(d=2.0):
    tt = tvec(d)
    return hp(noise(d), 4000) * np.exp(-tt / 0.6)

score = {'kick': [], 'snare': []}
def K(b, g=1.0): drums.add(bt(b), kick(g), 0.42); score['kick'].append(b)
def S(b, g=1.0): drums.add(bt(b), snare(), 0.45 * g, 0.05); drums.add(bt(b), clap(), 0.3 * g, -0.1); score['snare'].append(b)
def HH(b, g=1.0, o=False, pan=0.25): drums.add(bt(b), hat(o), (0.2 if o else 0.24) * g, pan)
def CR(b, g=1.0): drums.add(bt(b), crash(), 0.35 * g, -0.2)

def halftime(k0, k1):                          # kick 1 (+ "and" of 2), snare 3
    for k in range(k0, k1):
        B = k * 4
        K(B); K(B + 1.5, 0.8); S(B + 2)
        if k % 2: K(B + 3.25, 0.7)
        for e in range(8): HH(B + e * 0.5, 0.6 + 0.4 * (e % 2))
def four(k0, k1, h16=False):
    for k in range(k0, k1):
        B = k * 4
        for q in range(4): K(B + q)
        S(B + 1); S(B + 3)
        for e in range(16 if h16 else 8):
            st = 0.25 if h16 else 0.5
            HH(B + e * st, (0.9 if (e % 4 == 2 if h16 else e % 2) else 0.45), pan=0.3 if e % 2 else -0.25)
        HH(B + 3.5, 0.8, True, -0.3)

for k in range(4, 8): K(k * 4, 0.7)
halftime(8, 16)
four(16, 24)
for k in range(24, 28):
    for q in range(4): K(k * 4 + q, 0.8 + 0.05 * (k - 24))
for i in range(32): S(96 + i * 0.5 if i < 16 else 104 + (i - 16) * 0.25, 0.3 + 0.6 * i / 32)
for k in (28, 32): CR(k * 4, 1.2)
halftime(28, 36)
for k in range(40, 44):                        # mirror: 4-on-floor again
    for q in range(4): K(k * 4 + q, 0.9)
    S(k * 4 + 1); S(k * 4 + 3)
    for e in range(8): HH(k * 4 + e * 0.5, 0.5 + 0.5 * (e % 2), pan=0.4 if k % 2 else -0.4)
for k in range(44, 48):
    for q in range(4): K(k * 4 + q, 0.85)
for i in range(32): S(176 + i * 0.5 if i < 16 else 184 + (i - 16) * 0.25, 0.3 + 0.6 * i / 32)
for k in (48, 52, 56): CR(k * 4, 1.2)
for k in range(48, 60):                        # drop 2: half-time snare over a 4-on-floor kick
    B = k * 4
    for q in range(4): K(B + q)
    S(B + 2)
    if k % 2: S(B + 3.5, 0.6)
    for e in range(16): HH(B + e * 0.25, 0.9 if e % 4 == 2 else 0.4, pan=0.3 if e % 2 else -0.25)
K(240, 1.1); CR(240, 1.3)

# ---- harmony
CH = {'Em': [52, 55, 59], 'C': [48, 52, 55], 'Am': [57, 60, 64], 'B': [54, 59, 63], 'G': [55, 59, 62], 'D': [54, 57, 62]}
ROOT = {'Em': 40, 'C': 36, 'Am': 33, 'B': 35, 'G': 43, 'D': 38}
PROG = ['Em', 'C', 'Am', 'B']
prog = [PROG[k % 4] for k in range(BARS)]

def padnote(ms, t0, dur, sea=0.25, cutoff=1400):
    out = np.zeros(int(dur * SR))
    for m in ms:
        for det in (-0.12, 0.12):
            out += saw(note_freq(m + det, t0, dur, sea=sea), dur)
    out = lp(out, cutoff) / (len(ms) * 2)
    tt = tvec(dur)
    return out * np.minimum(1, tt / 0.3) * np.clip((dur - tt) / 0.3, 0, 1)

def bell(m, t0, dur=1.2):
    f = note_freq(m, t0, dur, sea=0.12)
    tt = tvec(dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph + 1.8 * np.exp(-tt / 0.12) * np.sin(ph * 3.0)) * np.exp(-tt / 0.45)
    return s * np.minimum(1, tt / 0.002)

def lead_note(m, t0, dur, dive=False, vib=0.15):
    tt = tvec(dur)
    f = note_freq(m, t0, dur, vib=vib, sea=0.1)
    if dive:                                    # pitch dive at the end of a phrase
        f = f * 2 ** (-12 * np.clip((tt - dur * 0.45) / (dur * 0.55), 0, 1) ** 2 / 12)
    s = saw(f * 1.004, dur) + saw(f * 0.996, dur) + 0.5 * saw(f * 2.0, dur)
    s = lp(s, 4200)
    return s * env(dur, 0.01, min(0.06, dur * 0.3)) * 0.3

def wobble(m, t0, dur, rate_beats):
    """saw bass through a low-pass whose cutoff swings once every rate_beats"""
    f = note_freq(m, t0, dur)
    raw = saw(f * 1.003, dur) + saw(f * 0.997, dur) + 0.8 * sine(f / 2, dur)
    tt = tvec(dur)
    ph = ((t0 - T0 + tt) / (rate_beats * BEAT)) % 1.0
    fc = 120 + 2600 * (0.5 - 0.5 * np.cos(2 * np.pi * ph)) ** 2
    out = np.zeros_like(raw)
    blk = 256
    zi = None
    for i in range(0, len(raw), blk):
        sos = signal.butter(2, fc[i], 'low', fs=SR, output='sos')
        if zi is None: zi = signal.sosfilt_zi(sos) * 0
        out[i:i + blk], zi = signal.sosfilt(sos, raw[i:i + blk], zi=zi)
    return np.tanh(out * 1.6) * env(dur, 0.004, 0.03)

def pluck(m, t0, dur=0.2):
    f = note_freq(m, t0, dur)
    s = saw(f, dur)
    return lp(s, 3000) * np.exp(-tvec(dur) / 0.07)

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

HOOK = ['E5 - - G5 - - F#5 -', 'E5 - - D5 - - B4 -', 'C5 - - E5 - - A5 -', 'G5 - F#5 - D#5 - B4 -',
        'E5 - - G5 - - B5 -', 'A5 - - G5 - - E5 -', 'C6 - B5 - A5 - G5 -', 'F#5 - - - D#5 - . .']
VERSE = ['B4 - - - E5 - - -', 'G5 - - - - - E5 -', 'A5 - - - G5 - E5 -', 'F#5 - - - - - . .'] * 2
HOOK_END = ['E5 - - G5 - - B5 -', 'A5 - - G5 - - E5 -', 'C6 - B5 - A5 - G5 -', 'E5 - - - - - . .']

intro_bell = parse(HOOK[:4], 4)
verse = parse(VERSE, 8)
conveyor_lead = parse(VERSE, 16, 12)
drop1 = parse(HOOK, 28)
upside = parse(HOOK[:2], 36) + parse(HOOK[2:4], 38)
mirror = parse(HOOK[:4], 40)
drop2 = parse(HOOK + HOOK[:4], 48) + parse(HOOK_END, 56)
outro_bell = parse(HOOK[4:8], 60)

def phrase_end(notes, b):                     # last note of every 2-bar phrase dives
    ends = set()
    for (nb, L, m) in notes:
        if (nb + L) % 8 >= 7 or L >= 1.5: ends.add(nb)
    return b in ends

# pads / bass / arps per bar
for k in range(BARS):
    name = prog[k]
    tones, root = CH[name], ROOT[name]
    t = bar(k)
    if k < 8 or 36 <= k < 40 or k >= 60:
        pad.add(t, padnote(tones + [tones[0] + 12], t, 4 * BEAT + 0.2, sea=0.35), 0.55)
    elif 8 <= k < 28 or 40 <= k < 48:
        pad.add(t, padnote(tones, t, 4 * BEAT + 0.1, sea=0.2, cutoff=900), 0.32)
    else:
        pad.add(t, padnote(tones + [tones[0] + 12], t, 4 * BEAT + 0.1, sea=0.15, cutoff=2600), 0.38)
    # bass
    if 8 <= k < 16:
        for s, L in ((0, 1.4), (1.5, 0.9), (2.5, 1.4)):
            bass.add(bt(k * 4 + s), lp(saw(note_freq(root, bt(k * 4 + s), L * BEAT), L * BEAT), 500) * env(L * BEAT, 0.005, 0.03), 0.5)
    if 16 <= k < 28 or 40 <= k < 48:
        for e in range(8):
            d = BEAT * 0.45
            bass.add(bt(k * 4 + e * 0.5), lp(saw(note_freq(root + (12 if e % 2 else 0), bt(k * 4 + e * 0.5), d), d), 800) * env(d, 0.004, 0.03), 0.45)
    if 28 <= k < 36 or 48 <= k < 60:
        rate = [1, 0.5, 1, 0.25][k % 4] if k < 36 else [0.5, 0.5, 0.25, 0.125][k % 4]
        bass.add(t, wobble(root, t, 4 * BEAT, rate), 0.55)
    if 36 <= k < 40:
        bass.add(t, lp(sine(note_freq(root, t, 4 * BEAT), 4 * BEAT), 300) * env(4 * BEAT, 0.05, 0.2), 0.5)
    if k == 60:
        bass.add(t, sine(note_freq(40, t, 6.0), 6.0) * env(6.0, 0.01, 3.0), 0.5)
    # 16th arpeggio (conveyor, mirror, drop 2)
    if 16 <= k < 28 or 40 <= k < 44 or 48 <= k < 60:
        seq = [tones[0] + 12, tones[1] + 12, tones[2] + 12, tones[0] + 24]
        for s in range(16):
            b = k * 4 + s * 0.25
            keys.add(bt(b), pluck(seq[s % 4] + (0 if s % 8 < 4 else 0), bt(b)), 0.14 if k < 48 else 0.1, 0.4 if s % 2 else -0.4)

for (b, L, m) in intro_bell + outro_bell: keys.add(bt(b), bell(m + 12, bt(b)), 0.3, 0.1)
for (b, L, m) in verse: lead.add(bt(b), lead_note(m, bt(b), L * BEAT, dive=phrase_end(verse, b)), 0.6)
for (b, L, m) in conveyor_lead: keys.add(bt(b), bell(m, bt(b), 0.8), 0.22, -0.1)
for (b, L, m) in drop1 + drop2:
    lead.add(bt(b), lead_note(m, bt(b), L * BEAT, dive=phrase_end(drop1 + drop2, b), vib=0.25), 0.75)
    lead.add(bt(b), lead_note(m + 12, bt(b), L * BEAT, vib=0.25), 0.15, 0.2)
for (b, L, m) in upside: lead.add(bt(b), lead_note(m - 12, bt(b), L * BEAT * 1.5, vib=0.4), 0.55)
for (b, L, m) in mirror: keys.add(bt(b), bell(m, bt(b), 1.0), 0.3, 0.0)

# risers / reverse cymbals
def riser(b0, b1, g):
    d = (b1 - b0) * BEAT
    x = noise(d); out = np.zeros_like(x); nb = 40
    for i in range(nb):
        a, z = int(len(x) * i / nb), int(len(x) * (i + 1) / nb)
        fc = 300 * 20 ** (i / nb)
        out[a:z] = bp(x[max(0, a - 2000):z], fc * 0.7, fc * 1.6)[-(z - a):]
    fxb.add(bt(b0), out * np.linspace(0, 1, len(out)) ** 2, g)
riser(96, 112, 0.3); riser(176, 192, 0.32)
for k in range(40, 44):
    rc = crash(1.2)[::-1]
    fxb.add(bar(k + 1) - len(rc) / SR, rc, 0.3)
rc = crash(1.8)[::-1]; fxb.add(bar(36) - len(rc) / SR, rc, 0.4); fxb.add(bar(48) - len(rc) / SR, rc, 0.4)

def sidechain(bus, b0, b1, depth, tau=0.09, step=1.0):
    for b in np.arange(b0, b1, step):
        i0 = int(bt(b) * SR); n = int(step * BEAT * SR)
        e = (1 - depth * np.exp(-np.arange(n) / SR / tau)).astype(np.float32)
        for ch in (bus.L, bus.R): ch[i0:i0 + n] *= e[:len(ch[i0:i0 + n])]
sidechain(pad, 64, 112, 0.5); sidechain(pad, 160, 192, 0.5); sidechain(pad, 192, 240, 0.6)
sidechain(bass, 64, 112, 0.5, 0.07)

# ---- mix
def reverb(st, mix, dur=2.4, decay=0.5):
    tt = np.arange(int(dur * SR)) / SR
    out = []
    for ch in range(2):
        ir = lp(rng.standard_normal(len(tt)) * np.exp(-tt / decay), 6500)
        ir /= np.sqrt(np.sum(ir ** 2))
        out.append(signal.fftconvolve(st[ch], ir)[:N])
    return np.vstack(out) * mix
def delay(st, d, fb=0.3, taps=3):
    out = np.zeros_like(st); n = int(d * SR)
    for k in range(1, taps + 1):
        out[k % 2, n * k:] += st[0, :-n * k] * fb ** k
        out[(k + 1) % 2, n * k:] += st[1, :-n * k] * fb ** k
    return out
leadst = lead.stereo(); leadst = leadst + delay(leadst, BEAT * 0.75, 0.3)
keyst = keys.stereo(); keyst = keyst + delay(keyst, BEAT * 0.5, 0.25, 2)
dry = drums.stereo() + bass.stereo() * 0.26 + pad.stereo() * 0.8 + leadst + keyst + fxb.stereo()
mix = dry + reverb(pad.stereo() * 0.5 + leadst * 0.5 + keyst * 0.7 + drums.stereo() * 0.05, 0.35)

# upside down (bars 36-40): everything muffled
a, z = int(bar(36) * SR), int(bar(40) * SR)
for ch in range(2): mix[ch, a:z] = lp(mix[ch, a:z], 1500) * 0.85
# mirror (bars 40-44): left and right swap every bar
for k in (41, 43):
    a, z = int(bar(k) * SR), int(bar(k + 1) * SR)
    mix[:, a:z] = mix[::-1, a:z]

mix -= np.mean(mix, axis=1, keepdims=True)
mix = mix / np.max(np.abs(mix)) * 1.6
mix = np.tanh(mix) / np.tanh(1.6)
endi = int((bar(64) + 4.0) * SR)
mix[:, endi - int(3 * SR):endi] *= np.linspace(1, 0, int(3 * SR))
mix = mix[:, :endi]
mix *= 0.93 / np.max(np.abs(mix))

from scipy.io import wavfile
wavfile.write('vertigo.wav', SR, (mix.T * 32767).astype(np.int16))
score.update({'bpm': BPM, 'beat': BEAT, 't0': T0, 'end': round(mix.shape[1] / SR, 2),
              'verse': [[b, L, m] for b, L, m in verse],
              'drop1': [[b, L, m] for b, L, m in drop1],
              'drop2': [[b, L, m] for b, L, m in drop2]})
json.dump(score, open('score.json', 'w'))
print('done', mix.shape[1] / SR)
