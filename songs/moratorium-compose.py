"""モラトリウム — original song for the dodge game.
150 BPM, D major (final chorus in Eb). Beat 0 at t = 0.5 s; 1 bar = 1.6 s.
Writes moratorium.wav and score.json (note/drum times for the bullet chart).

Run:  python3 moratorium-compose.py      (needs numpy + scipy)
Then convert the wav to Moratorium.mp3 (e.g. ffmpeg -i moratorium.wav -b:a 192k Moratorium.mp3)
and copy the note lists from score.json into songs/moratorium-score.js.
Form (bars): intro 0-12 / verse 12-28 / pre-chorus 28-36 / chorus 36-52 /
break with tape stop 52-60 / final chorus (+1 key) 60-76 / outro 76-80.
"""
import json
import numpy as np
from scipy import signal

SR = 44100
BPM = 150
BEAT = 60 / BPM            # 0.4 s
T0 = 0.5                    # time of beat 0
BARS = 80
LENGTH = T0 + BARS * 4 * BEAT + 3.0
N = int(LENGTH * SR)
rng = np.random.default_rng(7)

def bt(b):                  # beat -> seconds
    return T0 + b * BEAT
def bar(k):
    return bt(k * 4)
def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)

NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6,
        'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
def midi(name):
    p, o = name[:-1], int(name[-1])
    return 12 * (o + 1) + NOTE[p]

# ---------------------------------------------------------------- buses
class Bus:
    def __init__(self):
        self.L = np.zeros(N, np.float32)
        self.R = np.zeros(N, np.float32)
    def add(self, t, sig, gain=1.0, pan=0.0):
        i = int(round(t * SR))
        if i >= N or len(sig) == 0:
            return
        if i < 0:
            sig = sig[-i:]; i = 0
        n = min(len(sig), N - i)
        l = gain * np.cos((pan + 1) * np.pi / 4) * np.sqrt(2)
        r = gain * np.sin((pan + 1) * np.pi / 4) * np.sqrt(2)
        self.L[i:i + n] += (sig[:n] * l).astype(np.float32)
        self.R[i:i + n] += (sig[:n] * r).astype(np.float32)
    def stereo(self):
        return np.vstack([self.L, self.R])

drums, bass, chords, lead, keys, fxb, ticks, pad = (Bus() for _ in range(8))

# ---------------------------------------------------------------- oscillators
def tvec(dur):
    return np.arange(int(dur * SR)) / SR

def polyblep(ph, dt):
    out = np.zeros_like(ph)
    m = ph < dt
    x = ph[m] / dt[m]
    out[m] = x + x - x * x - 1
    m = ph > 1 - dt
    x = (ph[m] - 1) / dt[m]
    out[m] = x * x + x + x + 1
    return out

def saw(freq, dur, phase0=None):
    n = int(dur * SR)
    f = np.broadcast_to(np.asarray(freq, float), (n,)) if np.ndim(freq) else np.full(n, float(freq))
    dt = f / SR
    ph = (np.cumsum(dt) + (rng.random() if phase0 is None else phase0)) % 1.0
    return (2 * ph - 1) - polyblep(ph, dt)

def square(freq, dur):
    n = int(dur * SR)
    f = np.broadcast_to(np.asarray(freq, float), (n,)) if np.ndim(freq) else np.full(n, float(freq))
    dt = f / SR
    ph = np.cumsum(dt) % 1.0
    ph2 = (ph + 0.5) % 1.0
    return (np.where(ph < 0.5, 1.0, -1.0) + polyblep(ph, dt) - polyblep(ph2, dt))

def sine(freq, dur, phase=0.0):
    t = tvec(dur)
    return np.sin(2 * np.pi * freq * t + phase)

def adsr(dur, a=0.01, d=0.1, s=0.7, r=0.1):
    n = int(dur * SR)
    t = np.arange(n) / SR
    env = np.where(t < a, t / max(a, 1e-4), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4)))
    rel = int(r * SR)
    if rel > 0 and n > rel:
        env[-rel:] *= np.linspace(1, 0, rel)
    return env

def lp(x, fc, order=2):
    sos = signal.butter(order, min(fc, SR * 0.45), 'low', fs=SR, output='sos')
    return signal.sosfilt(sos, x)
def hp(x, fc, order=2):
    sos = signal.butter(order, fc, 'high', fs=SR, output='sos')
    return signal.sosfilt(sos, x)
def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], 'band', fs=SR, output='sos')
    return signal.sosfilt(sos, x)

def noise(dur):
    return rng.standard_normal(int(dur * SR))

# ---------------------------------------------------------------- instruments
def kick(gain=1.0, t=None):
    d = 0.45
    tt = tvec(d)
    f = 45 + 110 * np.exp(-tt / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-tt / 0.28)
    click = np.zeros_like(tt); c = hp(noise(0.006), 3000) * np.linspace(1, 0, int(0.006 * SR))
    click[:len(c)] += c * 0.4
    return np.tanh(1.6 * (s + click)) * gain

def snare():
    d = 0.25
    tt = tvec(d)
    body = np.sin(2 * np.pi * 190 * tt) * np.exp(-tt / 0.06)
    nz = bp(noise(d), 1500, 9000) * np.exp(-tt / 0.11)
    return 0.6 * body + 0.9 * nz

def clap():
    d = 0.3
    out = np.zeros(int(d * SR))
    for k, off in enumerate([0, 0.011, 0.022]):
        seg = bp(noise(d - off), 900, 5000) * np.exp(-tvec(d - off) / (0.015 if k < 2 else 0.12))
        i = int(off * SR)
        out[i:i + len(seg)] += seg
    return out * 0.8

def hat(open_=False):
    d = 0.25 if open_ else 0.05
    tt = tvec(d)
    return hp(noise(d), 7500) * np.exp(-tt / (0.09 if open_ else 0.014))

def crash(d=2.2):
    tt = tvec(d)
    metal = sum(np.sin(2 * np.pi * f * tt + rng.random() * 6) for f in [3115, 4370, 5241, 6670, 7810]) * 0.08
    return (hp(noise(d), 4500) * 0.8 + metal) * np.exp(-tt / 0.55)

def tom(f0):
    d = 0.3
    tt = tvec(d)
    f = f0 * (1 + 0.6 * np.exp(-tt / 0.05))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.13)

def tick(high=True):
    d = 0.03
    tt = tvec(d)
    f = 3400 if high else 2300
    return (np.sin(2 * np.pi * f * tt) * 0.6 + bp(noise(d), 2000, 6000) * 0.5) * np.exp(-tt / 0.006)

def bell(m, dur=1.6):                       # music box: FM bell
    f = mtof(m)
    tt = tvec(dur)
    idx = 2.2 * np.exp(-tt / 0.15)
    mod = np.sin(2 * np.pi * f * 3.5 * tt) * idx
    s = np.sin(2 * np.pi * f * tt + mod) * np.exp(-tt / 0.7)
    s += 0.25 * np.sin(2 * np.pi * f * 2 * tt) * np.exp(-tt / 0.25)
    att = np.minimum(1, tt / 0.003)
    return s * att

def pluck(m, dur=0.18):
    s = square(mtof(m), dur) * 0.5 + saw(mtof(m), dur) * 0.5
    tt = tvec(dur)
    s = lp(s, 2600) * np.exp(-tt / 0.07)
    return s

def lead_note(m, dur):
    tt = tvec(dur)
    f = mtof(m)
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.5 * tt) * np.clip((tt - 0.15) / 0.2, 0, 1)
    s = saw(f * vib * 1.003, dur) + saw(f * vib * 0.997, dur) + 0.6 * square(f * vib, dur)
    s = lp(s, 5200)
    return s * adsr(dur, 0.008, 0.12, 0.75, min(0.06, dur * 0.3)) * 0.33

def supersaw(ms, dur, cutoff=4200):
    out = np.zeros(int(dur * SR))
    for m in ms:
        for det in [-0.16, -0.07, 0, 0.07, 0.16]:
            out += saw(mtof(m) * 2 ** (det / 12), dur)
    out = lp(out, cutoff) / (len(ms) * 5) * 2.2
    return out * adsr(dur, 0.01, 0.2, 0.85, 0.08)

def padnote(ms, dur):
    out = np.zeros(int(dur * SR))
    for m in ms:
        for det in [-0.08, 0.08]:
            out += saw(mtof(m) * 2 ** (det / 12), dur)
    out = lp(out, 1100) / (len(ms) * 2)
    return out * adsr(dur, 0.35, 0.5, 0.8, 0.4)

def bass_note(m, dur, cutoff=900):
    s = saw(mtof(m), dur) * 0.7 + sine(mtof(m), dur) * 0.8
    s = lp(s, cutoff)
    return s * adsr(dur, 0.005, 0.08, 0.8, min(0.03, dur * 0.3))

# ---------------------------------------------------------------- harmony
CH = {   # chord tones (mid register) and bass root
    'Bm': ([59, 62, 66], 35), 'G': ([55, 59, 62], 31), 'D': ([57, 62, 66], 38), 'A': ([57, 61, 64], 33),
    'Em': ([55, 59, 64], 40), 'F#m': ([57, 61, 66], 42), 'D/A': ([57, 62, 66], 33),
}
def chord(name, shift=0):
    tones, root = CH[name]
    return [t + shift for t in tones], root + shift

INTRO = ['Bm', 'G', 'D', 'A']
VERSE = ['Bm', 'G', 'D', 'A'] * 4
PRE = ['Em', 'F#m', 'G', 'A'] * 2
CHORUS = ['G', 'A', 'F#m', 'Bm'] * 3 + ['G', 'A', 'D', 'D']

# section map (bar ranges)
SECT = {'introA': (0, 4), 'introB': (4, 12), 'verse': (12, 28), 'pre': (28, 36), 'chorus': (36, 52),
        'break': (52, 60), 'final': (60, 76), 'outro': (76, 80)}
progression = {}            # bar -> (chord name, key shift)
for i in range(4): progression[i] = (INTRO[i], 0)
for i in range(8): progression[4 + i] = (INTRO[i % 4], 0)
for i in range(16): progression[12 + i] = (VERSE[i], 0)
for i in range(8): progression[28 + i] = (PRE[i], 0)
for i in range(16): progression[36 + i] = (CHORUS[i], 0)
for i in range(8): progression[52 + i] = (INTRO[i % 4] if i < 6 else ['G', 'A'][i - 6], 0)
for i in range(16): progression[60 + i] = (CHORUS[i], 1)
for i in range(4): progression[76 + i] = ('D', 1)

# ---------------------------------------------------------------- melodies (8th-note grid, 8 tokens per bar)
def parse(lines, start_bar, shift=0):
    notes = []          # (beat, len_beats, midi)
    cur = None
    for bi, line in enumerate(lines):
        toks = line.split()
        assert len(toks) == 8, line
        for k, tok in enumerate(toks):
            b = (start_bar + bi) * 4 + k * 0.5
            if tok == '-':
                if cur: cur[1] += 0.5
                continue
            if cur: notes.append(tuple(cur)); cur = None
            if tok == '.':
                continue
            cur = [b, 0.5, midi(tok) + shift]
    if cur: notes.append(tuple(cur))
    return notes

BOX_A = ['F#5 . D5 . B4 . D5 .', 'G5 . D5 . B4 . D5 .', 'F#5 . D5 . A4 . D5 .', 'E5 . C#5 . A4 . C#5 .']
BOX_B = ['B5 . F#5 . D5 . F#5 .', 'B5 . G5 . D5 . G5 .', 'A5 . F#5 . D5 . F#5 .', 'A5 . E5 . C#5 . E5 .']
BOX_BUILD = ['G5 . B5 . D6 . B5 .', 'A5 . C#6 . E6 . A6 .']
VERSE_LEAD = ['B4 - - D5 - - F#5 -', 'E5 - D5 - B4 - - -', 'A4 - - D5 - - F#5 -', 'E5 - - - C#5 - - -',
              'B4 - - D5 - - F#5 -', 'G5 - F#5 - E5 - D5 -', 'F#5 - - A5 - - D5 -', 'E5 - F#5 - E5 - C#5 -']
PRE_LEAD = ['E5 - - - B4 - E5 -', 'F#5 - - - C#5 - F#5 -', 'G5 - - - D5 - G5 -', 'A5 - - - - - - -',
            'G5 - F#5 - E5 - B4 -', 'A5 - G5 - F#5 - C#5 -', 'B5 - A5 - G5 - D5 -', 'A5 - B5 - C#6 - . .']
CHORUS_LEAD = ['B4 . A4 B4 D5 - B4 A4', 'A4 - - E4 A4 B4 C#5 -', 'C#5 . B4 C#5 E5 - C#5 B4', 'B4 - - - F#4 A4 B4 D5',
               'E5 - D5 - B4 - D5 E5', 'F#5 - E5 - C#5 - A4 B4', 'C#5 - E5 - F#5 - E5 D5', 'D5 - - - - . . .',
               'B4 . A4 B4 D5 - B4 A4', 'A4 - - E4 A4 B4 C#5 E5', 'F#5 - E5 F#5 A5 - F#5 E5', 'D5 - - - B4 C#5 D5 E5',
               'F#5 - - G5 F#5 - E5 D5', 'E5 - - F#5 E5 - D5 C#5', 'D5 - - - A4 - D5 -', 'D5 - - - - - . .']
OUTRO_BOX = ['F#5 . D5 . A4 . D5 .', 'F#5 . E5 . D5 . A4 .', 'D5 - - - - - - -', '. . . . . . . .']

box_notes = parse(BOX_A, 0) + parse(BOX_A + BOX_B[:2], 52) + parse(BOX_BUILD, 58) + parse(OUTRO_BOX, 76, 1)
verse_notes = parse(VERSE_LEAD, 20)
pre_notes = parse(PRE_LEAD, 28)
chorus_notes = parse(CHORUS_LEAD, 36)
final_notes = parse(CHORUS_LEAD, 60, 1)

# ---------------------------------------------------------------- arrange: drums
score = {'kick': [], 'snare': [], 'crash': [], 'hat': [], 'tick': []}
def K(b, g=1.0):
    drums.add(bt(b), kick(g), 0.3); score['kick'].append(b)
def S(b, g=1.0):
    drums.add(bt(b), snare(), 0.55 * g, 0.05); drums.add(bt(b), clap(), 0.4 * g, -0.1); score['snare'].append(b)
def HH(b, g=1.0, open_=False, pan=0.25):
    drums.add(bt(b), hat(open_), (0.22 if open_ else 0.28) * g, pan); score['hat'].append(b)
def CR(b, g=1.0):
    drums.add(bt(b), crash(), 0.42 * g, -0.2); score['crash'].append(b)

def groove(b0, bars, hats16=False, fill_last=False):
    for k in range(bars):
        B = b0 + k * 4
        for q in range(4): K(B + q)
        S(B + 1); S(B + 3)
        for e in range(8):
            if hats16:
                HH(B + e * 0.5, 1.0 if e % 2 else 0.6)
                HH(B + e * 0.5 + 0.25, 0.4, pan=-0.25)
            elif e % 2 == 1:
                HH(B + e * 0.5)
        HH(B + 3.5, 0.9, open_=True, pan=-0.2)
    if fill_last:
        B = b0 + (bars - 1) * 4
        for i, f in enumerate([220, 180, 150, 120]):
            drums.add(bt(B + 2 + i * 0.5), tom(f), 0.5, -0.4 + i * 0.25)

# intro B: half-time then 4-on-floor, snare roll, crash at bar 12
for k in range(4, 10):
    K(k * 4); K(k * 4 + 2.5, 0.7)
    for e in range(4): HH(k * 4 + e + 0.5, 0.7)
for k in (10, 11):
    for q in range(4): K(k * 4 + q)
roll = [44 + i * 0.5 for i in range(4)] + [46 + i * 0.25 for i in range(8)]
for i, b in enumerate(roll): S(b, 0.35 + 0.65 * i / len(roll))
# verse
CR(48)
groove(48, 16)
# pre-chorus: groove 6 bars, then roll; last beat silent ("breath")
groove(112, 6)
for k in (34, 35):
    K(k * 4); K(k * 4 + 1); K(k * 4 + 2)
    if k == 34: K(k * 4 + 3)
roll2 = [136 + i * 0.5 for i in range(8)] + [140 + i * 0.25 for i in range(12)]
for i, b in enumerate(roll2): S(b, 0.3 + 0.7 * i / len(roll2))
# chorus
for k in range(36, 52, 4): CR(k * 4)
groove(144, 16, hats16=True)
for k in (39, 43, 47):
    for i, f in enumerate([230, 190, 160, 130]): drums.add(bt(k * 4 + 2 + i * 0.5), tom(f), 0.45, -0.4 + i * 0.25)
# break: build in last 2 bars
for i in range(4): K(58 * 4 + i, 0.6)
for i in range(8): K(59 * 4 + i * 0.5, 0.6 + 0.4 * i / 8)
for i in range(16): S(59 * 4 + i * 0.25, 0.25 + 0.6 * i / 16)
# final chorus
for k in range(60, 76, 4): CR(k * 4, 1.1)
groove(240, 16, hats16=True, fill_last=True)
for k in (63, 67, 71):
    for i, f in enumerate([240, 200, 170, 140]): drums.add(bt(k * 4 + 2 + i * 0.5), tom(f), 0.45, -0.4 + i * 0.25)
# outro: final hit
K(304); CR(304, 1.3)

# clock ticks: whole song (8ths in intro/break/outro, beats elsewhere, quieter under the band)
for b2 in range(0, 80 * 8):
    b = b2 * 0.5
    k = b / 4
    quiet = SECT['verse'][0] <= k < SECT['break'][0] or SECT['final'][0] <= k < SECT['outro'][0]
    if quiet and b2 % 2: continue
    if k >= 78 and b2 % 2: continue                 # outro: slows down
    g = 0.10 if quiet else 0.28
    ticks.add(bt(b), tick(b2 % 2 == 0 if not quiet else int(b) % 2 == 0), g, 0.45 if int(b) % 2 else -0.45)
    if not quiet: score['tick'].append(b)

# ---------------------------------------------------------------- arrange: harmony
def sidechain(bus, b0, b1, depth=0.7, tau=0.09):
    """duck a bus on every beat between beats b0..b1 (pumping)"""
    for b in np.arange(b0, b1, 1.0):
        i0 = int(bt(b) * SR); n = int(BEAT * SR)
        env = 1 - depth * np.exp(-np.arange(n) / SR / tau)
        for ch in (bus.L, bus.R):
            seg = ch[i0:i0 + n]
            seg *= env[:len(seg)].astype(np.float32)

for k in range(80):
    name, sh = progression[k]
    tones, root = chord(name, sh)
    t = bar(k)
    if k < 12 or 52 <= k < 58 or k >= 76:
        pad.add(t, padnote([m - 12 for m in tones] + [tones[0]], 1.7), 0.55 if k < 76 else 0.7)
    if 12 <= k < 36:                                  # verse/pre pad, quieter
        pad.add(t, padnote(tones, 1.65), 0.3)
    if 36 <= k < 52 or 60 <= k < 76:                  # chorus supersaw chords
        chords.add(t, supersaw(tones + [tones[0] + 12], 1.6), 0.5, 0)
    if 28 <= k < 36:                                  # pre: brighter chords on beats
        for q in range(4):
            chords.add(bt(k * 4 + q), supersaw(tones, 0.34, 3000), 0.3, 0)
    if 56 <= k < 60:
        chords.add(t, supersaw(tones, 1.6, 900 + 900 * (k - 56)), 0.2)
    if k == 76:
        chords.add(t, supersaw(tones + [tones[0] + 12], 4.5, 3800), 0.55)

    # bass
    if 4 <= k < 12 and k >= 6:
        bass.add(t, bass_note(root + 12, 1.55, 500), 0.5)
    if 12 <= k < 36:
        for e in range(8):
            if e % 2 == 1:
                bass.add(bt(k * 4 + e * 0.5), bass_note(root + 12, 0.2), 0.55)
            elif e == 0:
                bass.add(bt(k * 4), bass_note(root, 0.18), 0.5)
    if 36 <= k < 52 or 60 <= k < 76:
        for e in range(8):
            m = root + (24 if e in (3, 7) else 12)
            bass.add(bt(k * 4 + e * 0.5), bass_note(m, 0.19, 1300), 0.55)
    if k == 76:
        bass.add(t, bass_note(root + 12, 3.0, 700), 0.6)

    # arp plucks (verse, chorus)
    if 12 <= k < 52 or 60 <= k < 76:
        if 36 <= k < 52 or 60 <= k < 76 or 20 <= k < 36 or 12 <= k < 20:
            seq = [tones[0] + 12, tones[1] + 12, tones[2] + 12, tones[0] + 24, tones[2] + 12, tones[1] + 12, tones[0] + 12, tones[1] + 12]
            for s in range(16):
                g = 0.17 if 12 <= k < 36 else 0.11
                keys.add(bt(k * 4 + s * 0.25), pluck(seq[s % 8]), g, 0.35 if s % 2 else -0.35)

sidechain(bass, 48, 144, 0.5, 0.06)
sidechain(chords, 144, 208, 0.75, 0.1)
sidechain(chords, 240, 304, 0.75, 0.1)
sidechain(bass, 144, 208, 0.55, 0.07)
sidechain(bass, 240, 304, 0.55, 0.07)
sidechain(pad, 48, 144, 0.4, 0.12)

# ---------------------------------------------------------------- melodies
for (b, L, m) in box_notes:
    keys.add(bt(b), bell(m + 12 if m < 74 else m), 0.33, 0.15)
for (b, L, m) in verse_notes:
    lead.add(bt(b), lead_note(m, L * BEAT), 0.55, -0.05)
for (b, L, m) in pre_notes:
    lead.add(bt(b), lead_note(m, L * BEAT), 0.62, -0.05)
for (b, L, m) in chorus_notes + final_notes:
    lead.add(bt(b), lead_note(m, L * BEAT), 0.75, -0.05)
    lead.add(bt(b), lead_note(m + 12, L * BEAT), 0.18, 0.1)
    keys.add(bt(b), bell(m + 12), 0.08, 0.3)

# ---------------------------------------------------------------- FX
def riser(b0, b1, gain=0.35):
    d = (b1 - b0) * BEAT
    x = noise(d)
    out = np.zeros_like(x)
    nb = 40
    for i in range(nb):
        a, z = int(len(x) * i / nb), int(len(x) * (i + 1) / nb)
        fc = 400 * (16 ** (i / nb))
        out[a:z] = bp(x[max(0, a - 2000):z], fc * 0.7, min(fc * 1.6, 18000))[-(z - a):]
    out *= np.linspace(0, 1, len(out)) ** 2
    fxb.add(bt(b0), out, gain)
riser(40, 48, 0.25)
riser(128, 144, 0.3)
riser(232, 240, 0.35)

# reverse crash into bar 60
rc = crash(1.6)[::-1]
fxb.add(bt(240) - len(rc) / SR, rc, 0.5)

# ---------------------------------------------------------------- mix
def reverb(st, mix=0.22, dur=2.0):
    ir_len = int(dur * SR)
    tt = np.arange(ir_len) / SR
    out = []
    for ch in range(2):
        ir = rng.standard_normal(ir_len) * np.exp(-tt / 0.45)
        ir = lp(ir, 6000)
        ir /= np.sqrt(np.sum(ir ** 2))
        out.append(signal.fftconvolve(st[ch], ir)[:N])
    return np.vstack(out) * mix

def delay(st, d=0.3, fb=0.35, taps=3):
    out = np.zeros_like(st)
    n = int(d * SR)
    for k in range(1, taps + 1):
        g = fb ** k
        out[0 if k % 2 else 1, n * k:] += st[0, :-n * k] * g
        out[1 if k % 2 else 0, n * k:] += st[1, :-n * k] * g
    return out

leadst = lead.stereo()
leadst = leadst + delay(leadst, 0.3, 0.32)
keysst = keys.stereo()
keysst = keysst + delay(keysst, 0.3, 0.25, 2)
dry = drums.stereo() * 1.0 + bass.stereo() * 0.27 + chords.stereo() * 0.95 + leadst * 1.05 + keysst * 0.9 \
      + fxb.stereo() + ticks.stereo() + pad.stereo() * 0.7
send = chords.stereo() * 0.5 + leadst * 0.6 + keysst * 0.8 + pad.stereo() * 0.6 + drums.stereo() * 0.08
mix = dry + reverb(send, 0.35)

# intro B filter sweep on the band (bars 4..12): low-pass rising 400 Hz -> open
a, z = int(bar(4) * SR), int(bar(12) * SR)
blk = int(0.05 * SR)
for ch in range(2):
    zi = None
    sos0 = None
    for s0 in range(a, z, blk):
        p = (s0 - a) / (z - a)
        fc = 700 * (25 ** p)
        sos = signal.butter(2, min(fc, 18000), 'low', fs=SR, output='sos')
        if zi is None: zi = signal.sosfilt_zi(sos) * mix[ch, s0]
        mix[ch, s0:s0 + blk], zi = signal.sosfilt(sos, mix[ch, s0:s0 + blk], zi=zi)

# tape stop at the end of the chorus (last 2 beats of bar 51 -> stop at bar 52) = "time stops"
def tape_stop(st, t_end, dur):
    i1 = int(t_end * SR); n = int(dur * SR); i0 = i1 - n
    rate = np.linspace(1, 0, n)
    pos = np.cumsum(rate)
    for ch in range(2):
        src = st[ch, i0:i0 + n].copy()
        st[ch, i0:i1] = np.interp(pos, np.arange(n), src) * np.linspace(1, 0.2, n)
tape_stop(mix, bar(52), 2 * BEAT)
# after the stop: a short silence except ticks/pad (already sparse); duck the first 0.15 s
i = int(bar(52) * SR); mix[:, i:i + int(0.12 * SR)] *= np.linspace(0, 1, int(0.12 * SR))

# rewind sound in bar 59.5..60: reversed chorus chunk with rising speed
src = mix[:, int(bar(44) * SR):int(bar(46) * SR)][:, ::-1]
n = int(2 * BEAT * SR)
rate = np.linspace(0.6, 3.0, n)
pos = np.cumsum(rate); pos = pos[pos < src.shape[1] - 1]
rew = np.vstack([np.interp(pos, np.arange(src.shape[1]), src[c]) for c in range(2)])
rew *= np.linspace(0.1, 0.55, rew.shape[1])
i = int(bt(238) * SR)
mix[:, i:i + rew.shape[1]] += rew[:, :min(rew.shape[1], N - i)]

# master: gentle glue + soft clip + normalize
mix = mix - np.mean(mix, axis=1, keepdims=True)
peak = np.max(np.abs(mix))
mix = mix / peak * 1.6
mix = np.tanh(mix) / np.tanh(1.6)
fade = int(2.0 * SR)
endi = int((bar(80) + 1.0) * SR)
mix[:, endi - fade:endi] *= np.linspace(1, 0, fade)
mix[:, endi:] = 0
mix = mix[:, :endi + int(0.3 * SR)]
mix *= 0.93 / np.max(np.abs(mix))

from scipy.io import wavfile
wavfile.write('moratorium.wav', SR, (mix.T * 32767).astype(np.int16))

score.update({
    'bpm': BPM, 'beat': BEAT, 't0': T0, 'bars': BARS, 'end': round(mix.shape[1] / SR, 2),
    'sections': {k: [bar(a), bar(b)] for k, (a, b) in SECT.items()},
    'box': [[b, m] for b, L, m in box_notes],
    'verse': [[b, L, m] for b, L, m in verse_notes],
    'pre': [[b, L, m] for b, L, m in pre_notes],
    'chorus': [[b, L, m] for b, L, m in chorus_notes],
    'final': [[b, L, m] for b, L, m in final_notes],
})
json.dump(score, open('score.json', 'w'))
print('done', mix.shape[1] / SR, 's')
