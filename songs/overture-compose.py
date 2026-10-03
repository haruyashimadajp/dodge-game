"""Grand Overture — original song for the dodge game (theme: a full symphony orchestra).
132 BPM heroic overture in D minor that ends in D major. Beat 0 at t = 0.5 s; 1 beat = 60/132 s; 1 bar = about 1.82 s.

The orchestra (every instrument is synthesized here):
  strings     — violins, violas, cellos, double basses. Each section is several players (detuned, each with their own
                vibrato), with bowing styles: legato, tremolo, spiccato (short bounced notes), pizzicato (plucked), fast scale runs
  brass       — French horns (dark, round), trumpets (bright), trombones and tuba. The tone opens up as they play louder
  woodwinds   — flute (breathy), oboe (nasal), clarinet (hollow), bassoon (reedy)
  percussion  — timpani (tuned kettle drums, with rolls), bass drum, crash cymbals and a suspended-cymbal swell,
                a military snare, a triangle
  colours     — concert harp (arpeggios and glissandos), celesta, tubular bells
  choir       — a mixed choir singing "ah"
  pipe organ  — in the finale
Writes overture.wav and score.json (beat times for the chart).

Run:  python3 overture-compose.py      (needs numpy + scipy)
Then: ffmpeg -i overture.wav -b:a 192k GrandOverture.mp3, and copy score.json into songs/overture-score.js.
Form (bars): I. Fanfare 0-8 / II. Theme 8-16 / III. Battle (development) 16-24 / IV. Tutti 24-32 /
V. Nocturne (harp + flute) 32-40 / VI. Crescendo 40-48 / VII. Finale (D major, organ + choir + bells) 48-60 / coda 60-64.
"""
import json
import numpy as np
from scipy import signal

SR = 44100
BPM = 132
BEAT = 60 / BPM
T0 = 0.5
BARS = 64
N = int((T0 + BARS * 4 * BEAT + 7.0) * SR)
rng = np.random.default_rng(1808)

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

strings, brass, winds, perc, harpb, choirb = (Bus() for _ in range(6))

# ---- tools -------------------------------------------------------------------------------
def tvec(d): return np.arange(int(d * SR)) / SR
def noise(d): return rng.standard_normal(int(d * SR))
def nz(n): return rng.standard_normal(n)
def lp(x, fc, o=2): return signal.sosfilt(signal.butter(o, min(fc, SR * 0.45), 'low', fs=SR, output='sos'), x)
def hp(x, fc, o=2): return signal.sosfilt(signal.butter(o, fc, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=2): return signal.sosfilt(signal.butter(o, [lo, min(hi, SR * 0.45)], 'band', fs=SR, output='sos'), x)
def phase(f, n): return np.cumsum(np.broadcast_to(np.asarray(f, float), (n,))) / SR
def adsr(n, a, d, s, r):
    """attack / decay / sustain level / release (seconds) over n samples"""
    t = np.arange(n) / SR; dur = n / SR
    e = np.where(t < a, t / max(a, 1e-4), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4)))
    return e * np.clip((dur - t) / max(r, 1e-4), 0, 1)
def saw(ph): return 2 * (ph % 1.0) - 1

def tv_lp(x, fc, q=0.8, blk=64):
    out = np.empty_like(x); zi = np.zeros((1, 2))
    for i in range(0, len(x), blk):
        f = float(np.clip(fc[min(i, len(fc) - 1)], 40, SR * 0.42))
        w0 = 2 * np.pi * f / SR; al = np.sin(w0) / (2 * q); c = np.cos(w0); a0 = 1 + al
        sos = np.array([[(1 - c) / 2 / a0, (1 - c) / a0, (1 - c) / 2 / a0, 1, -2 * c / a0, (1 - al) / a0]])
        out[i:i + blk], zi = signal.sosfilt(sos, x[i:i + blk], zi=zi)
    return out

def vib_curve(n, rate, depth, onset=0.18):
    t = np.arange(n) / SR
    return depth * np.sin(2 * np.pi * rate * t + rng.random() * 6.28) * np.clip((t - onset) / 0.3, 0, 1)

# ---- strings -----------------------------------------------------------------------------------
BODY = {   # resonances of the wooden body (centre Hz, width, gain) per instrument size
    'vn': [(290, 1.6, 0.5), (1000, 1.5, 0.7), (2800, 1.6, 0.6)],
    'va': [(230, 1.6, 0.6), (800, 1.5, 0.7), (2300, 1.6, 0.45)],
    'vc': [(140, 1.6, 0.7), (550, 1.5, 0.6), (1800, 1.6, 0.35)],
    'cb': [(70, 1.6, 0.8), (300, 1.5, 0.5), (1200, 1.6, 0.2)],
}
def body(x, kind):
    y = lp(x, {'vn': 6500, 'va': 5000, 'vc': 3800, 'cb': 2200}[kind]) * 0.5
    for fc, w, g in BODY[kind]: y += g * bp(x, fc / w, fc * w)
    return y

def string_section(m, dur, kind='vn', players=6, style='legato', att=None):
    """a section of bowed strings playing one note (legato / tremolo / spiccato / marcato)"""
    if style == 'spiccato': dur = min(dur, 0.16)
    n = int((dur + 0.25) * SR); t = np.arange(n) / SR; f0 = float(mtof(m)); s = np.zeros(n)
    for p in range(players):
        det = rng.uniform(-7, 7) / 1200
        vib = vib_curve(n, rng.uniform(4.8, 6.2), rng.uniform(0.10, 0.18) if style == 'legato' else 0.05)
        f = f0 * 2 ** (det + vib / 12)
        v = saw(phase(f, n) + rng.random())
        if style == 'tremolo':
            v *= 0.55 + 0.45 * np.abs(np.sin(2 * np.pi * rng.uniform(6.5, 7.8) * t + rng.random() * 3))
        s += v * (1 + rng.uniform(-0.15, 0.15))
    s /= players
    s += 0.06 * hp(nz(n), 3000) * (0.3 + 0.7 * np.exp(-t / 0.08))                        # bow noise
    if style == 'spiccato':   e = adsr(n, 0.006, 0.05, 0.0, 0.03) * (t < dur + 0.1)
    elif style == 'marcato':  e = adsr(n, 0.01, 0.12, 0.65, 0.12) * (t < dur + 0.2)
    else:
        a = att if att is not None else 0.09
        e = np.minimum(1, t / a) * np.clip((dur + 0.18 - t) / 0.18, 0, 1)
    return body(s * e, kind)

def run(m0, m1, dur, kind='vn'):
    """a fast scale run (D minor / harmonic), one spiccato note after another"""
    scale = [0, 2, 3, 5, 7, 8, 10] if m1 < 74 + 24 else [0, 2, 3, 5, 7, 8, 11]
    notes = [m for m in range(min(m0, m1), max(m0, m1) + 1) if (m - 62) % 12 in scale]
    if m1 < m0: notes = notes[::-1]
    out = np.zeros(int((dur + 0.4) * SR)); step = dur / len(notes)
    for i, m in enumerate(notes):
        x = string_section(m, step * 1.3, kind, 4, 'marcato')
        j = int(i * step * SR); out[j:j + len(x)] += x[:len(out) - j] * (0.7 + 0.5 * i / len(notes))
    return out

def pizz(m, kind='vc'):
    """pizzicato: a plucked string (Karplus-Strong) with the body of the instrument"""
    f = float(mtof(m)); d = 0.9 if kind in ('vc', 'cb') else 0.5; n = int(d * SR)
    P = max(2, int(round(SR / f)))
    exc = lp(nz(P), 3000)
    a = np.zeros(P + 2); a[0] = 1; a[P] = -0.497; a[P + 1] = -0.497
    x = signal.lfilter([1.0], a, np.concatenate([exc, np.zeros(n - P)]))
    x = x / (np.max(np.abs(x)) + 1e-9) * np.exp(-np.arange(n) / SR / (d * 0.35))
    return body(x, kind) * 1.6

# ---- brass -------------------------------------------------------------------------------------
BRASS = {   # brightness (cutoff in harmonics at full blow), players, vibrato, body
    'hn': (5, 4, 0.05), 'tp': (14, 3, 0.06), 'tb': (8, 3, 0.03), 'tu': (5, 1, 0.02),
}
def brass_note(m, dur, kind='hn', dyn=1.0, players=None):
    bright, pl, vd = BRASS[kind]; pl = players or pl
    n = int((dur + 0.3) * SR); t = np.arange(n) / SR; f0 = float(mtof(m)); s = np.zeros(n)
    for p in range(pl):
        scoop = -0.6 * np.exp(-t / 0.04)
        f = f0 * 2 ** ((rng.uniform(-5, 5) / 100 + scoop + vib_curve(n, rng.uniform(4.5, 5.5), vd, 0.3)) / 12)
        ph = phase(f, n) + rng.random()
        s += 0.7 * saw(ph) + 0.3 * np.sin(2 * np.pi * ph)
    s /= pl
    e = np.minimum(1, t / 0.035) * (0.8 + 0.25 * np.exp(-t / 0.08)) * np.clip((dur + 0.15 - t) / 0.15, 0, 1)
    fc = f0 * (1.2 + bright * dyn * e ** 1.5)                                   # louder = brighter (the brass "blare")
    y = tv_lp(s * e, fc, 0.9)
    if kind == 'hn': y = lp(y, 2200) + 0.3 * bp(y, 300, 900)
    return np.tanh(1.4 * y * (0.7 + 0.5 * dyn)) / 1.2

# ---- woodwinds -----------------------------------------------------------------------------------
def flute(m, dur):
    n = int((dur + 0.2) * SR); t = np.arange(n) / SR; f0 = float(mtof(m))
    f = f0 * 2 ** (vib_curve(n, 5.2, 0.14, 0.15) / 12)
    ph = 2 * np.pi * phase(f, n)
    s = np.sin(ph) + 0.22 * np.sin(2 * ph) + 0.08 * np.sin(3 * ph)
    breath = bp(nz(n), f0 * 0.9, f0 * 3.5) * 0.12
    chiff = bp(nz(n), f0 * 2, f0 * 6) * np.exp(-t / 0.03) * 0.4
    e = np.minimum(1, t / 0.05) * np.clip((dur + 0.08 - t) / 0.08, 0, 1)
    return (s + breath + chiff) * e * (1 + 0.08 * np.sin(2 * np.pi * 5.2 * t))
def oboe(m, dur):
    n = int((dur + 0.2) * SR); t = np.arange(n) / SR; f0 = float(mtof(m))
    f = f0 * 2 ** (vib_curve(n, 5.6, 0.12, 0.12) / 12)
    ph = phase(f, n)
    s = np.where((ph % 1) < 0.22, 1.0, -0.28)
    y = 0.4 * lp(s, 4000) + bp(s, 1000, 1500) + 0.7 * bp(s, 2700, 3300)
    e = np.minimum(1, t / 0.03) * np.clip((dur + 0.06 - t) / 0.06, 0, 1)
    return y * e * 0.8
def clarinet(m, dur):
    n = int((dur + 0.2) * SR); t = np.arange(n) / SR; f0 = float(mtof(m))
    ph = phase(f0 * 2 ** (vib_curve(n, 4.5, 0.05, 0.3) / 12), n)
    s = np.sign(np.sin(2 * np.pi * ph))
    e = np.minimum(1, t / 0.04) * np.clip((dur + 0.08 - t) / 0.08, 0, 1)
    return lp(s, 2200, 3) * e * 0.6
def bassoon(m, dur):
    n = int((dur + 0.2) * SR); t = np.arange(n) / SR; f0 = float(mtof(m))
    ph = phase(f0 * 2 ** (vib_curve(n, 5, 0.06, 0.2) / 12), n)
    s = np.where((ph % 1) < 0.12, 1.0, -0.14)
    y = lp(s, 1400) + 0.8 * bp(s, 380, 560)
    e = np.minimum(1, t / 0.04) * np.clip((dur + 0.08 - t) / 0.08, 0, 1)
    return y * e * 0.7

# ---- percussion ------------------------------------------------------------------------------------
def timpani(m, g=1.0, d=2.2):
    """kettle drum: the membrane's modes (1 : 1.5 : 1.99 : 2.44 : 2.98), a little pitch drop, the felt mallet"""
    t = tvec(d); f = float(mtof(m)) * (1 + 0.03 * np.exp(-t / 0.05))
    s = sum(a * np.sin(2 * np.pi * phase(f * r, len(t))) * np.exp(-t / dec)
            for r, a, dec in [(1, 1, 0.9), (1.5, 0.55, 0.6), (1.99, 0.35, 0.45), (2.44, 0.22, 0.3), (2.98, 0.14, 0.25)])
    mallet = lp(noise(d), 700) * np.exp(-t / 0.012) * 1.5
    return (s + mallet) * g
def bass_drum(g=1.0):
    t = tvec(1.6)
    s = np.sin(2 * np.pi * phase(38 + 22 * np.exp(-t / 0.06), len(t))) * np.exp(-t / 0.55)
    return (s * 1.2 + lp(noise(1.6), 200) * np.exp(-t / 0.05)) * g
def cymbal(d=3.0, swell=0.0):
    """crash cymbals: many inharmonic metal partials + noise. swell > 0 = a suspended cymbal roll that grows for swell seconds"""
    t = tvec(d + swell); n = len(t); s = np.zeros(n)
    for _ in range(36):
        f = rng.uniform(2500, 11000)
        s += np.sin(2 * np.pi * f * t + rng.random() * 6) * rng.uniform(0.3, 1)
    s = s / 36 * 1.2 + hp(nz(n), 4000) * 0.8
    if swell > 0:
        e = np.where(t < swell, (t / swell) ** 2.5, np.exp(-(t - swell) / 0.8))
    else:
        e = np.exp(-t / (d * 0.33)) * (1 + 1.5 * np.exp(-t / 0.02))
    return hp(s, 2000) * e
def snare(g=1.0):
    t = tvec(0.25)
    tone = np.sin(2 * np.pi * phase(210 + 40 * np.exp(-t / 0.01), len(t))) * np.exp(-t / 0.05)
    sn = bp(noise(0.25), 2500, 9000) * np.exp(-t / 0.09)
    return (0.6 * tone + 0.9 * sn) * g
def triangle():
    t = tvec(1.5)
    return sum(np.sin(2 * np.pi * f * t) * np.exp(-t / 0.6) for f in (3520, 5280 * 1.01, 7300)) / 3

# ---- colours -------------------------------------------------------------------------------------
def harp(m, d=1.6):
    f = float(mtof(m)); n = int(d * SR); P = max(2, int(round(SR / f)))
    exc = lp(nz(P), 5000) * np.hanning(P)
    a = np.zeros(P + 2); a[0] = 1; a[P] = -0.4985; a[P + 1] = -0.4985
    x = signal.lfilter([1.0], a, np.concatenate([exc, np.zeros(n - P)]))
    x = x / (np.max(np.abs(x)) + 1e-9)
    return (x + 0.4 * bp(x, 180, 600)) * np.clip((d - np.arange(n) / SR) / 0.2, 0, 1)
def celesta(m, d=1.4):
    t = tvec(d); f = float(mtof(m))
    s = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.7) + 0.25 * np.sin(2 * np.pi * f * 4.0 * t) * np.exp(-t / 0.12)
    thunk = bp(noise(d), f, f * 3) * np.exp(-t / 0.006) * 0.4
    return (s + thunk) * np.minimum(1, t / 0.002)
def tubular(m, d=4.0):
    t = tvec(d); f = float(mtof(m))
    s = sum(a * np.sin(2 * np.pi * f * r * t + rng.random()) * np.exp(-t / dec)
            for r, a, dec in [(1, 1, 2.5), (2.0, 0.6, 1.8), (3.01, 0.5, 1.2), (4.16, 0.35, 0.9), (5.43, 0.25, 0.6), (6.79, 0.15, 0.4)])
    return (s + bp(noise(d), 2000, 6000) * np.exp(-t / 0.01) * 0.5) / 2.5
def choir_voice(m, dur, vowel='a', singers=5):
    n = int((dur + 0.4) * SR); t = np.arange(n) / SR; f0 = float(mtof(m)); s = np.zeros(n)
    for p in range(singers):
        f = f0 * 2 ** ((rng.uniform(-8, 8) / 100 + vib_curve(n, rng.uniform(4.8, 5.8), 0.18, 0.25)) / 12)
        ph = 2 * np.pi * phase(f, n) + rng.random() * 6
        v = np.zeros(n)
        for h in range(1, int(min(40, 6000 / f0))): v += np.sin(h * ph) / h ** 1.1
        s += v
    s /= singers
    forms = {'a': [(730, 1.0), (1150, 0.6), (2700, 0.3)], 'o': [(450, 1.0), (850, 0.6), (2600, 0.2)]}[vowel]
    y = sum(g * bp(s, fc * 0.85, fc * 1.15) for fc, g in forms) + 0.1 * hp(nz(n), 5000) * 0.02
    e = np.minimum(1, t / 0.3) * np.clip((dur + 0.3 - t) / 0.3, 0, 1)
    return y * e
def organ(ms, dur):
    """pipe organ: principal stops (16', 8', 4', 2 2/3', 2') — sines with a little chorus and the chiff of each pipe"""
    n = int((dur + 0.5) * SR); t = np.arange(n) / SR; s = np.zeros(n)
    for m in ms:
        f = float(mtof(m))
        for r, a in [(0.5, 0.25), (1, 1.0), (2, 0.8), (3, 0.4), (4, 0.45), (8, 0.2)]:
            s += a * np.sin(2 * np.pi * phase(f * r * (1 + rng.uniform(-0.0008, 0.0008)), n) + rng.random() * 6)
        s += bp(nz(n), f * 2, f * 6) * np.exp(-t / 0.04) * 0.3
    e = np.minimum(1, t / 0.06) * np.clip((dur + 0.4 - t) / 0.4, 0, 1)
    return s / (len(ms) * 3) * e

# ---- the music -----------------------------------------------------------------------------------
score = {k: [] for k in ['melody', 'brassMel', 'horn', 'stab', 'spic', 'pizz', 'timp', 'roll', 'cymbal', 'swell', 'snare', 'harp',
                         'gliss', 'flute', 'oboe', 'celesta', 'choir', 'organ', 'bells', 'chord', 'gp', 'bassdrum', 'runs']}
PAN = {'vn': -0.5, 'va': 0.05, 'vc': 0.35, 'cb': 0.5, 'hn': -0.3, 'tp': 0.25, 'tb': 0.4, 'tu': 0.5, 'fl': -0.1, 'ob': 0.1, 'cl': -0.2, 'bn': 0.2}

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

# chords: name → (bass root MIDI, upper voicing)
CH = {'Dm': (38, [62, 65, 69]), 'Bb': (34, [62, 65, 70]), 'F': (41, [60, 65, 69]), 'C': (36, [60, 64, 67]), 'Gm': (43, [62, 67, 70]),
      'A': (45, [61, 64, 69]), 'A7': (45, [61, 64, 67]), 'Dm/C': (36, [62, 65, 69]), 'D': (38, [62, 66, 69]), 'Bm': (35, [62, 66, 71]),
      'G': (43, [62, 67, 71]), 'F#m': (42, [61, 66, 69]), 'Em': (40, [64, 67, 71])}
PLAN = {}
def plan(k0, names):
    for i, nme in enumerate(names): PLAN[k0 + i] = nme
plan(0, ['Dm'] * 6 + ['Bb', 'A'])
plan(8, ['Dm', 'Bb', 'F', 'C', 'Dm', 'Gm', 'A7', 'Dm'])
plan(16, ['Dm', 'Dm/C', 'Bb', 'A', 'Dm', 'Dm/C', 'Bb', 'A'])
plan(24, ['Dm', 'Bb', 'F', 'C', 'Dm', 'Gm', 'A7', 'Dm'])
plan(32, ['Bb', 'F', 'Gm', 'Dm', 'Bb', 'F', 'Gm', 'A'])
plan(40, ['Dm', 'Bb', 'Gm', 'A', 'Dm', 'Bb', 'Gm', 'A'])
plan(48, ['D', 'Bm', 'G', 'A', 'D', 'F#m', 'G', 'A', 'G', 'A', 'Bm', 'A'])
plan(60, ['D', 'D', 'D', 'D'])
for k in range(BARS): score['chord'].append([k * 4, PLAN[k]])

THEME = ['D5 - - A4 D5 - F5 -', 'G5 - F5 E5 F5 - D5 -', 'C5 - - A4 C5 - F5 -', 'E5 - - - G5 - - -',
         'A5 - - F5 A5 - D6 -', 'D6 - C6 Bb5 A5 - G5 -', 'E5 - F5 G5 A5 - C#6 -', 'D6 - - - - - . .']
THEME_MAJ = ['D5 - - A4 D5 - F#5 -', 'G5 - F#5 E5 F#5 - D5 -', 'B5 - - G5 B5 - D6 -', 'C#6 - - - E6 - - -',
             'F#6 - - D6 F#6 - A6 -', 'A6 - G6 F#6 E6 - C#6 -', 'B5 - C#6 D6 E6 - G6 -', 'E6 - - - - - . .',
             'D6 - - B5 D6 - G6 -', 'E6 - - C#6 E6 - A6 -', 'F#6 - - - D6 - B5 -', 'B5 - A5 G5 A5 - - -']
HORN_CALL = ['D4 - - - A4 - - -', 'D5 - - C5 A4 - - -', 'F4 - - G4 A4 - D5 -', 'C#5 - - - - - - -']
NOCTURNE = ['F5 - - - E5 - D5 -', 'C5 - - - A4 - - -', 'Bb4 - D5 - G5 - - F5', 'F5 - - - E5 - - -',
            'F5 - - - G5 - A5 -', 'C6 - - - A5 - - -', 'Bb5 - A5 - G5 - F5 -', 'E5 - - - C#5 - - -']
HORN_COUNTER = ['A4 - - - - - - -', 'G4 - - - F4 - - -', 'F4 - - - D4 - - -', 'E4 - - - C#4 - - -']

def S(kind, b, m, L, style='legato', g=1.0, players=None, att=None):
    pl = players or {'vn': 7, 'va': 5, 'vc': 5, 'cb': 3}[kind]
    strings.add(bt(b), string_section(m, L * BEAT, kind, pl, style, att), g, PAN[kind] + rng.uniform(-0.05, 0.05))
def BR(kind, b, m, L, dyn=1.0, g=1.0): brass.add(bt(b), brass_note(m, L * BEAT, kind, dyn), g * (0.5 if kind == 'tu' else 1), PAN[kind])
def TIMP(b, m, g=1.0): perc.add(bt(b), timpani(m, g), 0.36, 0.0); score['timp'].append([b, m])
def ROLL(b0, b1, m, g0=0.2, g1=1.0):
    n = int((b1 - b0) * 6)
    for i in range(n): perc.add(bt(b0 + i / 6), timpani(m, (g0 + (g1 - g0) * i / n) * rng.uniform(0.8, 1.0), 0.6), 0.24, rng.uniform(-0.1, 0.1))
    score['roll'].append([b0, b1])
def CYM(b, g=1.0): perc.add(bt(b), cymbal(), 0.3 * g, -0.15); score['cymbal'].append(b)
def SWELL(b0, b1, g=1.0): perc.add(bt(b0), cymbal(1.5, (b1 - b0) * BEAT), 0.25 * g, 0.2); score['swell'].append([b0, b1])
def SN(b, g=1.0, mark=True):
    perc.add(bt(b), snare(), 0.22 * g, 0.15)
    if mark: score['snare'].append(b)
def BD(b, g=1.0): perc.add(bt(b), bass_drum(), 0.3 * g); score['bassdrum'].append(b)

def pad_strings(k, L=4, g=1.0, style='legato', hi=True):
    root, up = CH[PLAN[k]]
    S('cb', k * 4, root - 12 if root >= 40 else root, L, style, 0.28 * g)
    S('vc', k * 4, root, L, style, 0.32 * g)
    S('va', k * 4, up[0], L, style, 0.22 * g)
    if hi:
        S('vn', k * 4, up[1] + 12, L, style, 0.18 * g, 6)

# I. Fanfare 0-8: timpani roll, tremolo strings, horn call, brass chords, snare roll, cymbal
ROLL(0, 8, 38, 0.1, 0.9); TIMP(8, 38, 1.0)
for k in range(0, 8):
    root, up = CH[PLAN[k]]
    S('vc', k * 4, root, 4, 'tremolo', 0.32 * min(1, 0.4 + k * 0.12))
    S('va', k * 4, up[0], 4, 'tremolo', 0.24 * min(1, 0.4 + k * 0.12))
    S('cb', k * 4, root - 12 if root >= 40 else root, 4, 'legato', 0.35)
for b, L, m in parse(HORN_CALL, 2):
    BR('hn', b, m, L, 0.8, 0.3); BR('hn', b, m - 12, L, 0.6, 0.2); score['horn'].append([b, L, m])
for i, k in enumerate((6, 7)):
    root, up = CH[PLAN[k]]
    for b in (k * 4, k * 4 + 1.5, k * 4 + 3):
        for m in up: BR('tp', b, m + 12 if m < 66 else m, 1, 0.9, 0.12)
        BR('tb', b, root + 12, 1, 0.9, 0.2); BR('tu', b, root, 1, 0.9, 0.25)
        score['stab'].append(b)
for i in range(16): SN(28 + i * 0.25, 0.3 + 0.7 * i / 16, False)
SWELL(24, 32, 0.8)

# II. Theme 8-16: violins melody, pizzicato low strings, clarinet + bassoon thirds, soft horns, triangle
CYM(32, 0.9); BD(32)
for b, L, m in parse(THEME, 8):
    S('vn', b, m, L + 0.05, 'legato', 0.8, 8); score['melody'].append([b, L, m])
for k in range(8, 16):
    root, up = CH[PLAN[k]]
    for h, mm in ((0, root), (1, root + 7), (2, root + 12), (3, root + 7)):
        strings.add(bt(k * 4 + h), pizz(mm, 'vc'), 0.3, PAN['vc']); score['pizz'].append([k * 4 + h, mm])
        if h in (0, 2): strings.add(bt(k * 4 + h), pizz(mm - 12, 'cb'), 0.35, PAN['cb'])
    winds.add(bar(k), clarinet(up[1], 4 * BEAT), 0.12, PAN['cl']); winds.add(bar(k), bassoon(root, 4 * BEAT), 0.14, PAN['bn'])
    BR('hn', k * 4, up[0] - 12, 4, 0.4, 0.12)
    if k % 2 == 0: perc.add(bt(k * 4 + 2), triangle(), 0.05, 0.4)
    if k in (8, 12): TIMP(k * 4, root, 0.7)

# III. Battle 16-24: spiccato ostinato, lament bass, brass stabs, snare, horn counter-melody, flute runs
for k in range(16, 24):
    root, up = CH[PLAN[k]]
    S('cb', k * 4, root - 12 if root >= 40 else root, 4, 'legato', 0.28); S('vc', k * 4, root, 4, 'legato', 0.26)
    pat = [up[2] + 12, up[0] + 12, up[1] + 12, up[0] + 12] * 2
    for h in range(8):
        S('vn', k * 4 + h * 0.5, pat[h], 0.4, 'spiccato', 0.42, 6); score['spic'].append([k * 4 + h * 0.5, pat[h]])
        S('va', k * 4 + h * 0.5, pat[h] - 12, 0.4, 'spiccato', 0.25, 4)
    for b in (k * 4, k * 4 + 1.5):
        for m in up: BR('tb', b, m - 12, 0.6, 1.0, 0.13)
        BR('tu', b, root, 0.6, 1.0, 0.25); score['stab'].append(b)
    TIMP(k * 4, root if root > 40 else root + 12, 0.8)
    for h in (2, 2.75, 3, 3.5): SN(k * 4 + h, 0.6 + 0.2 * (h == 3))
for b, L, m in parse(HORN_COUNTER * 2, 16):
    BR('hn', b, m, L, 0.7, 0.26); score['horn'].append([b, L, m])
for k in (19, 23):                                                           # flute + violin runs up to the next bar
    seq = [62, 64, 65, 67, 69, 70, 73, 74]
    for i, m in enumerate(seq):
        winds.add(bt(k * 4 + 2 + i * 0.25), flute(m + 12, 0.28 * BEAT), 0.12, PAN['fl'])
    strings.add(bt(k * 4 + 2), run(62, 86, 2 * BEAT), 0.3, PAN['vn']); score['runs'].append([k * 4 + 2, 2, 1])
SWELL(92, 96, 0.9)

# IV. Tutti 24-32: brass theme, string runs and high sustains, timpani + bass drum, cymbals, marching snare, bells
for b, L, m in parse(THEME, 24):
    BR('tp', b, m, L, 1.0, 0.42); BR('hn', b, m - 12, L, 0.9, 0.3); score['brassMel'].append([b, L, m])
for k in range(24, 32):
    root, up = CH[PLAN[k]]
    pad_strings(k, 4, 1.0, 'legato', hi=False)
    S('vn', k * 4, up[2] + 24, 3, 'legato', 0.12, 6)
    if k % 2 == 1:
        strings.add(bt(k * 4 + 3), run(74, 86, 1 * BEAT), 0.28, PAN['vn']); score['runs'].append([k * 4 + 3, 1, 1])
    BR('tb', k * 4, root + 12, 4, 0.8, 0.15); BR('tu', k * 4, root, 4, 0.8, 0.22)
    TIMP(k * 4, root if root > 40 else root + 12, 1.0); BD(k * 4, 0.8)
    for h in (0, 0.75, 1, 2, 2.75, 3): SN(k * 4 + h, 0.55)
    if k in (24, 28): CYM(k * 4)
    winds.add(bar(k), flute(up[2] + 12, 4 * BEAT), 0.08, PAN['fl'])
    winds.add(bar(k), oboe(up[1] + 12, 4 * BEAT), 0.06, PAN['ob'])
TIMP(126, 45, 1.0); TIMP(127, 45, 1.0)

# V. Nocturne 32-40: harp arpeggios, flute (then oboe), celesta, hushed strings, a harp glissando
for k in range(32, 40):
    root, up = CH[PLAN[k]]
    S('vc', k * 4, root, 4, 'legato', 0.16, 4, 0.5); S('va', k * 4, up[0], 4, 'legato', 0.12, 4, 0.5)
    arp = [root, root + 7, root + 12, up[0] + 12, up[1] + 12, up[2] + 12, up[1] + 12, up[0] + 12]
    for h, m in enumerate(arp):
        harpb.add(bt(k * 4 + h * 0.5), harp(m), 0.2, -0.6); score['harp'].append([k * 4 + h * 0.5, m])
    if k >= 36:
        for h in (0.5, 1.5, 2.5, 3.5):
            m = up[int(h) % 3] + 24
            winds.add(bt(k * 4 + h), celesta(m), 0.1, 0.3); score['celesta'].append([k * 4 + h, m])
for b, L, m in parse(NOCTURNE, 32):
    inst = flute if b < 36 * 4 else oboe
    winds.add(bt(b), inst(m, L * BEAT + 0.05), 0.24 if inst is flute else 0.2, PAN['fl'] if inst is flute else PAN['ob'])
    score['flute' if inst is flute else 'oboe'].append([b, L, m])
for k in (35, 39):                                                            # harp glissandos
    notes = [m for m in range(50, 91) if (m - 62) % 12 in (0, 2, 4, 5, 7, 9, 10)]
    if k == 39: notes = notes[::-1]
    for i, m in enumerate(notes): harpb.add(bt(k * 4 + 2 + i * 2 / len(notes)), harp(m, 1.2), 0.12, -0.6 + 1.0 * i / len(notes))
    score['gliss'].append([k * 4 + 2, 2, 1 if k == 35 else -1])

# VI. Crescendo 40-48: spiccato 16ths, timpani crescendo, choir from 44, brass rising stabs, snare roll, cymbal swell
for k in range(40, 48):
    root, up = CH[PLAN[k]]
    g = 0.5 + 0.5 * (k - 40) / 8
    L = 4 if k < 47 else 3                                                        # the last bar stops a beat early (the pause)
    S('cb', k * 4, root - 12 if root >= 40 else root, L, 'legato', 0.25 * g + 0.06); S('vc', k * 4, root, L, 'tremolo', 0.26 * g)
    pat = [up[0] + 12, up[1] + 12, up[2] + 12, up[1] + 12]
    for h in range(16 if k < 47 else 12):
        m = pat[h % 4] + (12 if k >= 44 and h % 8 >= 4 else 0)
        S('vn', k * 4 + h * 0.25, m, 0.2, 'spiccato', 0.34 * g, 5); score['spic'].append([k * 4 + h * 0.25, m])
    TIMP(k * 4, root if root > 40 else root + 12, g); TIMP(k * 4 + 2, root if root > 40 else root + 12, g * 0.7)
    if k >= 44:
        choirb.add(bar(k), choir_voice(up[0], L * BEAT, 'a'), 0.16 * g, -0.2); choirb.add(bar(k), choir_voice(up[2], L * BEAT, 'a'), 0.14 * g, 0.2)
        choirb.add(bar(k), choir_voice(root + 12, L * BEAT, 'o'), 0.14 * g, 0.0)
        score['choir'].append([k * 4, L])
    BR('hn', k * 4, up[1], L, 0.6 + 0.3 * g, 0.18 * g)
for i, b in enumerate((187, 188, 189, 190)):                                  # rising brass stabs (A pedal), then silence
    for m in (61 + i, 64 + i, 69 + i): BR('tp', b, m, 0.7, 1.0, 0.12)
    BR('tb', b, 57 + i, 0.7, 1.0, 0.2); BR('tu', b, 45, 0.7, 1.0, 0.22); score['stab'].append(b)
ROLL(176, 190.7, 45, 0.2, 1.0)
for i in range(38): SN(186 + i * 0.125, 0.3 + 0.7 * i / 38, False)
SWELL(180, 190.7, 1.0)
score['gp'].append(191)                                                       # general pause: one beat of silence... then the finale

# VII. Finale 48-60 (D major): everything — trumpets + violins theme, horns, trombones, tuba, organ, choir, tubular bells
for b, L, m in parse(THEME_MAJ, 48):
    S('vn', b, m, L + 0.05, 'legato', 0.8, 8); score['melody'].append([b, L, m])
    BR('tp', b, m - 12, L, 1.0, 0.32); score['brassMel'].append([b, L, m - 12])
for k in range(48, 60):
    root, up = CH[PLAN[k]]
    pad_strings(k, 4, 1.0, 'legato', hi=False)
    BR('hn', k * 4, up[0], 2, 0.9, 0.2); BR('hn', k * 4 + 2, up[1], 2, 0.9, 0.2)
    BR('tb', k * 4, root + 12, 4, 0.9, 0.16); BR('tu', k * 4, root, 4, 0.9, 0.22)
    perc.add(bar(k), organ([root, root + 12] + up, 4 * BEAT), 0.3, 0.0); score['organ'].append([k * 4, 4])
    for v, (m, vw) in enumerate(((up[0], 'a'), (up[2], 'a'), (root + 12, 'o'))):
        choirb.add(bar(k), choir_voice(m, 4 * BEAT, vw), 0.13, (-0.25, 0.25, 0)[v])
    score['choir'].append([k * 4, 4])
    TIMP(k * 4, root if root > 40 else root + 12, 1.0); BD(k * 4, 0.9)
    for h in (0, 1, 2, 2.5, 3): SN(k * 4 + h, 0.45)
    if k % 2 == 0:
        perc.add(bar(k), tubular(up[2] + 12), 0.2, -0.3); score['bells'].append([k * 4, up[2] + 12])
    if k % 4 == 0: CYM(k * 4)
    winds.add(bar(k), flute(up[2] + 24, 4 * BEAT), 0.07, PAN['fl'])
    if k % 2 == 1:
        strings.add(bt(k * 4 + 3), run(74, 86, BEAT), 0.26, PAN['vn']); score['runs'].append([k * 4 + 3, 1, 1])
TIMP(192, 38, 1.2); BD(192, 1.2); CYM(192, 1.2)

# coda 60-64: a held D major chord, a fanfare, three hammer blows and the last roll
for k in (60, 61):
    pad_strings(k, 4, 1.1, 'tremolo')
    perc.add(bar(k), organ([38, 50, 62, 66, 69], 4 * BEAT), 0.3); score['organ'].append([k * 4, 4])
    choirb.add(bar(k), choir_voice(66, 4 * BEAT, 'a'), 0.15, -0.2); choirb.add(bar(k), choir_voice(69, 4 * BEAT, 'a'), 0.15, 0.2)
    score['choir'].append([k * 4, 4])
for b, L, m in parse(['D5 - - - - - - -', 'A4 - D5 - F#5 - A5 -'], 60):
    BR('tp', b, m, L, 1.0, 0.26); BR('hn', b, m - 12, L, 1.0, 0.24); score['brassMel'].append([b, L, m])
ROLL(240, 248, 38, 0.2, 1.0)
for b in (248, 249.5, 251):                                                    # three hammer blows
    for m in (62, 66, 69, 74): BR('tp', b, m, 1.2, 1.0, 0.13)
    for m in (50, 57): BR('tb', b, m, 1.2, 1.0, 0.2)
    BR('tu', b, 38, 1.2, 1.0, 0.25); BR('hn', b, 62, 1.2, 1.0, 0.2)
    pad_strings(62, 1.2, 1.2, 'marcato')
    TIMP(b, 38, 1.2); BD(b, 1.1); score['stab'].append(b)
CYM(251, 1.3); perc.add(bt(251), tubular(74, 6), 0.3)
pad_strings(62, 1, 1.0, 'legato')
for k in (62, 63):
    S('cb', k * 4 + 1 if k == 62 else k * 4, 26, 4, 'legato', 0.4)
perc.add(bt(251), organ([26, 38, 50, 62, 66, 69, 74], 5 * BEAT), 0.35); score['organ'].append([251, 5])
choirb.add(bt(251), choir_voice(62, 5 * BEAT, 'a'), 0.18, -0.2); choirb.add(bt(251), choir_voice(66, 5 * BEAT, 'a'), 0.16, 0.2)
choirb.add(bt(251), choir_voice(69, 5 * BEAT, 'a'), 0.16, 0.0)
for m in (62, 66, 69, 74):
    BR('tp', 251, m, 5, 1.0, 0.13)
BR('tb', 251, 50, 5, 1.0, 0.2); BR('tu', 251, 38, 5, 1.0, 0.22)
S('vn', 251, 86, 5, 'tremolo', 0.25, 6); S('vn', 251, 78, 5, 'tremolo', 0.25, 6)
ROLL(251, 256, 38, 0.6, 1.0); TIMP(256, 38, 1.4); BD(256, 1.3)

# ---- mix: a concert hall --------------------------------------------------------------------------
def hall(st, mix_, dur=3.0, decay=0.95):
    tt = np.arange(int(dur * SR)) / SR
    out = []
    for ch in range(2):
        ir = rng.standard_normal(len(tt)) * np.exp(-tt / decay)
        ir = lp(ir, 6000) * (0.5 + 0.5 * np.exp(-tt / 0.6))
        ir[:int(0.018 * SR)] = 0
        for d, g in ((0.021, 0.9), (0.033, 0.7), (0.047, 0.6), (0.061, 0.5)):
            ir[int((d + 0.002 * ch) * SR)] += g * 8
        ir /= np.sqrt(np.sum(ir ** 2))
        out.append(signal.fftconvolve(st[ch], ir)[:N])
    return np.vstack(out) * mix_

parts = [strings.stereo() * 1.0, brass.stereo() * 1.0, winds.stereo(), perc.stereo(), harpb.stereo(), choirb.stereo()]
dry = sum(parts)
wet = hall(strings.stereo() + brass.stereo() * 0.9 + winds.stereo() + perc.stereo() * 0.7 + harpb.stereo() + choirb.stereo() * 1.2, 0.4)
mix = dry * 0.75 + wet
mix -= np.mean(mix, axis=1, keepdims=True)
mix = np.vstack([hp(mix[0], 32, 2), hp(mix[1], 32, 2)])
mix /= np.max(np.abs(mix))
# a slow glue compressor (keeps the quiet parts quiet, but not too quiet), then a fast look-ahead limiter
lvl = np.maximum(lp(np.sqrt(np.maximum(lp(np.mean(mix ** 2, axis=0), 3), 0)), 3), 1e-4)
g = np.minimum(1, (0.12 / np.maximum(lvl, 1e-4)) ** 0.3)
mix = mix * g
mix /= np.max(np.abs(mix))
pk = np.max(np.abs(mix), axis=0)
pk = np.maximum.reduce([np.roll(pk, -i) for i in range(0, int(0.005 * SR), 8)])
DRIVE, THR = 3.0, 0.9
gl = np.minimum(1, THR / np.maximum(pk * DRIVE, 1e-6))
rel = np.exp(-1 / (0.15 * SR))
gl = signal.lfilter([1 - rel], [1, -rel], gl[::-1])[::-1]
gl = np.minimum(gl, np.minimum(1, THR / np.maximum(pk * DRIVE, 1e-6)) * 1.15)
mix = np.tanh(mix * DRIVE * gl / THR * 0.9) * THR
endi = int((bt(256) + 5.0) * SR)
mix = mix[:, :endi]
mix[:, -int(2.0 * SR):] *= np.linspace(1, 0, int(2.0 * SR)) ** 1.5
mix *= 0.95 / np.max(np.abs(mix))

from scipy.io import wavfile
wavfile.write('overture.wav', SR, (mix.T * 32767).astype(np.int16))
for key in score:
    if score[key] and not isinstance(score[key][0], list): score[key].sort()
    elif score[key]: score[key].sort(key=lambda v: v[0])
score['end'] = round(mix.shape[1] / SR, 2)
json.dump(score, open('score.json', 'w'), default=lambda o: o.item() if hasattr(o, 'item') else o)
print('done', mix.shape[1] / SR)
