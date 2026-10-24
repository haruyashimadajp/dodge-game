"""SANCTUS — original song for the dodge game (theme: sacred and strict — a cathedral, a pipe organ fugue, a judgment).
120 BPM in D minor, ending in D major (a Picardy third on the last "Amen"). No lyrics: the choir sings vowels only.
Beat 0 at t = 0.5 s; 1 beat = 0.5 s; 1 bar = 2 s.

The sounds are made for this song only:
  pipe organ  — additive "ranks": principal 8' (harmonics 1-8), octave 4', a mixture (bright upper harmonics) and a reed
                (all harmonics, for the climax), each pipe with a little breathy "chiff" at the start
  choir       — a buzzing voice source through vowel formants (a / o / e), three slightly detuned singers per part
  bells       — church bells: inharmonic partials (hum, prime, minor-third tierce, quint, nominal), long decay
  timpani     — tuned drums (D and A) with a felt thump, and rolls
  cathedral   — a very long reverb (about 5 s)
The core is a strict fugue: one subject, answered at the fifth, three voices + pedal, then episodes on the circle of fifths,
a "Dies irae" chant over toccata figuration, a stretto (entries every bar), a grand pause, and a plagal Amen.
Writes sanctus.wav and score.json (beat numbers for the chart).

Run:  python3 sanctus-compose.py      (needs numpy + scipy)
Form (bars): bells 0-4 / INTROITUS (chant) 4-12 / FUGA (exposition 12-20, episodes 20-28) / KYRIE (choir) 28-32 /
DIES IRAE 32-48 / STRETTO 48-56 (grand pause at the end) / AMEN 56-60.
"""
import json
import numpy as np
from scipy import signal

SR = 44100
BPM = 120
BEAT = 60 / BPM
T0 = 0.5
BARS = 60
N = int((T0 + BARS * 4 * BEAT + 9.0) * SR)
rng = np.random.default_rng(1200)

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

organ, pedal, choir, bells, timp = (Bus() for _ in range(5))

def tvec(d): return np.arange(int(d * SR)) / SR
def noise(d): return rng.standard_normal(int(d * SR))
def lp(x, fc, o=2): return signal.sosfilt(signal.butter(o, min(fc, SR * 0.45), 'low', fs=SR, output='sos'), x)
def hp(x, fc, o=2): return signal.sosfilt(signal.butter(o, fc, 'high', fs=SR, output='sos'), x)
def bpf(x, lo, hi, o=2): return signal.sosfilt(signal.butter(o, [max(20, lo), min(hi, SR * 0.45)], 'band', fs=SR, output='sos'), x)
def env(dur, a=0.004, r=0.04):
    tt = tvec(dur)
    return np.minimum(1, tt / max(a, 1e-4)) * np.clip((dur - tt) / max(r, 1e-4), 0, 1)

# ---- instruments ---------------------------------------------------------------------------------
PRINCIPAL = [1, 0.55, 0.38, 0.26, 0.16, 0.11, 0.08, 0.05]
MIXTURE = {4: 0.22, 6: 0.18, 8: 0.15, 12: 0.1, 16: 0.08}
def organ_pipe(m, dur, reg='principal', g=1.0):
    """one organ note. reg: 'flute' (soft), 'principal', 'full' (+ mixture), 'reed' (+ reed rank)"""
    dur = max(dur, 0.06); tt = tvec(dur + 0.25); f = mtof(m); out = np.zeros(len(tt))
    amps = {1: 1.0, 2: 0.25} if reg == 'flute' else dict(enumerate(PRINCIPAL, 1))
    if reg in ('full', 'reed'):
        for h, a in MIXTURE.items(): amps[h] = amps.get(h, 0) + a
    for h, a in amps.items():
        if f * h > 15000: continue
        out += a * np.sin(2 * np.pi * f * h * (1 + 0.0004 * (h % 3 - 1)) * tt + h)
    if reg == 'reed':
        for h in range(1, 16):
            if f * h > 12000: break
            out += 0.5 / h * np.sin(2 * np.pi * f * h * 1.0015 * tt + 0.3 * h)
    e = np.minimum(1, tt / 0.035) * np.clip((dur + 0.25 - tt) / 0.25, 0, 1) ** 1.5
    out *= e
    chiff = bpf(noise(0.05), f * 1.5, f * 4) * np.exp(-tvec(0.05) / 0.012) * 0.25   # the pipe "speaks"
    out[:len(chiff)] += chiff
    return out * 0.11 * g

FORM = {'a': [(730, 90, 1.0), (1090, 110, 0.5), (2440, 160, 0.25)],
        'o': [(570, 80, 1.0), (840, 90, 0.45), (2410, 160, 0.15)],
        'e': [(530, 80, 1.0), (1840, 120, 0.4), (2480, 160, 0.22)],
        'u': [(330, 70, 1.0), (870, 90, 0.25), (2240, 160, 0.08)]}
def voice(m, dur, vowel='a', g=1.0, n=3):
    """a choir part: n slightly detuned singers, buzzing source → vowel formants, slow swell"""
    dur = max(dur, 0.2); tt = tvec(dur + 0.4); out = np.zeros(len(tt))
    for s in range(n):
        vib = 1 + 0.004 * np.sin(2 * np.pi * (5.2 + 0.4 * s) * tt + s * 2.1) * np.clip(tt / 0.4, 0, 1)
        f = mtof(m) * (1 + (s - (n - 1) / 2) * 0.0035) * vib
        ph = np.cumsum(f) / SR
        src = 2 * (ph % 1.0) - 1
        src = lp(src, 3500) + 0.02 * rng.standard_normal(len(tt))
        v = np.zeros(len(tt))
        for (fc, bw, a) in FORM[vowel]:
            v += a * bpf(src, fc - bw, fc + bw)
        out += v
    e = np.minimum(1, tt / 0.18) * np.clip((dur + 0.4 - tt) / 0.4, 0, 1)
    return out * e * 0.5 * g / n

BELL_P = [(0.5, 1.0, 4.0), (1.0, 0.8, 3.0), (1.183, 0.5, 2.2), (1.5, 0.35, 1.8), (2.0, 0.6, 1.6), (2.5, 0.2, 1.0), (2.98, 0.25, 0.8), (4.07, 0.12, 0.5)]
def bell(m, g=1.0, dur=6.0):
    tt = tvec(dur); f = mtof(m); out = np.zeros(len(tt))
    for (r, a, dk) in BELL_P:
        out += a * np.sin(2 * np.pi * f * r * tt + r) * np.exp(-tt / dk) * (1 + 0.15 * np.sin(2 * np.pi * 1.3 * r * tt))
    strike = bpf(noise(0.03), 1500, 7000) * np.exp(-tvec(0.03) / 0.006)
    out[:len(strike)] += strike * 0.5
    return out * 0.18 * g

def timpani(m, g=1.0):
    d = 2.2; tt = tvec(d); f = mtof(m) * (1 + 0.02 * np.exp(-tt / 0.05))
    out = np.zeros(len(tt))
    for (r, a, dk) in [(1, 1, 0.9), (1.5, 0.5, 0.6), (1.98, 0.3, 0.4), (2.44, 0.15, 0.3)]:
        out += a * np.sin(2 * np.pi * np.cumsum(f * r) / SR) * np.exp(-tt / dk)
    thump = lp(noise(0.06), 400) * np.exp(-tvec(0.06) / 0.015)
    out[:len(thump)] += thump * 0.8
    return out * 0.5 * g

# ---- the music -----------------------------------------------------------------------------------
score = {k: [] for k in ('bell', 'chant', 'fugue', 'figura', 'pedal', 'entry', 'choir', 'dies', 'timp', 'roll', 'gp', 'amen', 'kyrie')}

SUBJ = [(1, 'D4'), (1, 'A4'), (.5, 'F4'), (.5, 'E4'), (.5, 'D4'), (.5, 'C#4'),
        (.5, 'D4'), (.5, 'E4'), (.5, 'F4'), (.5, 'G4'), (.25, 'A4'), (.25, 'Bb4'), (.25, 'A4'), (.25, 'G4'), (.5, 'F4'), (.5, 'E4')]
CS = [(.25, 'F4'), (.25, 'E4'), (.25, 'D4'), (.25, 'E4'), (.25, 'F4'), (.25, 'G4'), (.25, 'A4'), (.25, 'F4'),
      (.25, 'Bb4'), (.25, 'A4'), (.25, 'G4'), (.25, 'F4'), (.25, 'E4'), (.25, 'F4'), (.25, 'G4'), (.25, 'E4'),
      (1, 'A4'), (1, 'D5'), (.5, 'C#5'), (.5, 'D5'), (.5, 'E5'), (.5, 'A4')]
CHORD = {'Dm': [2, 5, 9], 'A': [9, 1, 4], 'Gm': [7, 10, 2], 'Am': [9, 0, 4], 'E': [4, 8, 11], 'C': [0, 4, 7], 'F': [5, 9, 0],
         'Bb': [10, 2, 5], 'Edim': [4, 7, 10], 'D': [2, 6, 9]}
SUBJ_CH = ['Dm', 'A', 'Gm', 'A']           # harmony of the subject, per half bar (in D)
ANS_CH = ['Am', 'E', 'Dm', 'E']            # ... and of the answer (in A)
VOICE_PAN = {1: -0.35, 2: 0.35, 3: 0.0, 4: 0.0}

def play_line(B, line, shift, voice_no, reg='principal', g=1.0, key='fugue'):
    t = 0.0
    for (d, nm) in line:
        m = midi(nm) + shift
        bus = pedal if voice_no == 4 else organ
        bus.add(bt(B + t), organ_pipe(m, d * BEAT * 0.94, reg), g * (1.3 if voice_no == 4 else 1.0), VOICE_PAN[voice_no])
        score['pedal' if voice_no == 4 else key].append([B + t, d, m] + ([] if voice_no == 4 else [voice_no]))
        t += d

def entry(B, shift, voice_no, kind='subject', reg='principal', g=1.0):
    score['entry'].append([B, voice_no, kind, shift])
    play_line(B, SUBJ, shift, voice_no, reg, g)

def free_voice(B, chords, octave_base, voice_no, reg='principal', g=0.8):
    """a simple free counterpoint: the third then the fifth of each half-bar chord, as quarter notes"""
    for i, ch in enumerate(chords):
        pcs = CHORD[ch]
        for j, pc in enumerate((pcs[1], pcs[2])):
            m = octave_base + ((pc - octave_base) % 12)
            organ.add(bt(B + i * 2 + j), organ_pipe(m, BEAT * 0.94, reg), g, VOICE_PAN[voice_no])
            score['fugue'].append([B + i * 2 + j, 1, m, voice_no])

def chord_notes(ch, lo):
    pcs = CHORD[ch]; out = []; m = lo
    while len(out) < 4:
        if m % 12 in pcs: out.append(m)
        m += 1
    return out

def figuration(B, ch, lo=62, reg='full', g=0.7, desc=False):
    """toccata: running 16ths over the chord (one bar of 16 notes going up and down)"""
    tones = chord_notes(ch, lo)
    up = tones + [t + 12 for t in tones]
    pat = up + up[::-1] if not desc else up[::-1] + up
    for i in range(16):
        m = pat[i]
        organ.add(bt(B + i * 0.25), organ_pipe(m, 0.25 * BEAT * 0.9, reg), g, 0.25 * np.sin(i))
        score['figura'].append([B + i * 0.25, 0.25, m])

def pedal_note(B, d, m, reg='principal', g=1.0):
    pedal.add(bt(B), organ_pipe(m, d * BEAT * 0.96, reg), 1.3 * g)
    score['pedal'].append([B, d, m])

def sing(B, d, notes, vowel='a', g=1.0, key='choir', root=None):
    for i, nm in enumerate(notes):
        m = midi(nm) if isinstance(nm, str) else nm
        choir.add(bt(B), voice(m, d * BEAT, vowel), g, (i / max(1, len(notes) - 1) - 0.5) * 0.6)
    if key: score[key].append([B, d, root if root is not None else (midi(notes[0]) if isinstance(notes[0], str) else notes[0])])

def toll(B, m=50, g=1.0):
    bells.add(bt(B), bell(m), g); score['bell'].append([B, m])

def hit(B, m, g=1.0):
    timp.add(bt(B), timpani(m), g); score['timp'].append([B, m])

def roll(B, beats, m, g=0.6):
    t = 0.0
    while t < beats:
        timp.add(bt(B + t), timpani(m, 0.35 + 0.65 * t / beats), g * 0.5); t += 0.125
    score['roll'].append([B, beats])

CHANT = [(1, 'D3'), (1, 'F3'), (1, 'G3'), (1, 'A3'), (2, 'A3'), (1, 'G3'), (1, 'A3'), (1, 'C4'), (1, 'A3'), (1, 'G3'), (1, 'F3'), (2, 'G3'), (2, 'A3'),
         (1, 'A3'), (1, 'C4'), (1, 'D4'), (1, 'C4'), (1, 'A3'), (1, 'G3'), (2, 'A3'), (1, 'F3'), (1, 'G3'), (1, 'F3'), (1, 'E3'), (4, 'D3')]
DIES1 = [(1, 'F4'), (1, 'E4'), (1, 'F4'), (1, 'D4'), (1, 'E4'), (1, 'C4'), (2, 'D4')]
DIES2 = [(1, 'F4'), (1, 'G4'), (1, 'F4'), (1, 'E4'), (1, 'D4'), (1, 'C#4'), (2, 'D4')]
DIES_CH = [['Dm', 'Dm', 'C', 'Dm'], ['F', 'C', 'A', 'Dm']]

# ---- bells 0-4: the great bell, a pedal drone, the choir humming ----
for k in range(4):
    toll(k * 4, 50, 0.55 + 0.05 * k)
pedal_note(0, 16, midi('D2'), 'flute', 0.8)
sing(4, 12, ['D3', 'A3', 'F4'], 'u', 0.5)

# ---- INTROITUS 4-12: plainchant, men in unison (octaves from bar 8), organ drone ----
t = 16.0
for (d, nm) in CHANT:
    m = midi(nm)
    choir.add(bt(t), voice(m, d * BEAT, 'o', n=4), 1.0, -0.05)
    if t >= 32: choir.add(bt(t), voice(m + 12, d * BEAT, 'o', n=3), 0.6, 0.1)
    score['chant'].append([t, d, m])
    t += d
for k in range(4, 12, 2):
    pedal_note(k * 4, 8, midi('D2'), 'flute', 0.7)
    for i, ch in enumerate(['Dm', 'Dm', 'Gm', 'Dm'] if k < 8 else ['Dm', 'C', 'Gm', 'A']):
        for m in chord_notes(ch, 57)[:3]: organ.add(bt(k * 4 + i * 2), organ_pipe(m, 2 * BEAT * 0.95, 'flute'), 0.55)
    toll(k * 4, 62, 0.35)

# ---- FUGA exposition 12-20 ----
entry(48, 0, 1)                                  # bar 12: voice 1, subject in D
entry(56, 7, 2, 'answer')                        # bar 14: voice 2, answer in A
play_line(56, CS, 7, 1)                          #   voice 1: countersubject (in A)
entry(64, 12, 3)                                 # bar 16: voice 3, subject in D (octave up)
play_line(64, CS, 0, 2)                          #   voice 2: countersubject
free_voice(64, SUBJ_CH, 57, 1)                   #   voice 1: free
entry(72, -24, 4, 'subject', 'principal')        # bar 18: pedal, subject in D
play_line(72, CS, 12, 3)                         #   voice 3: countersubject (octave up)
free_voice(72, SUBJ_CH, 60, 2); free_voice(72, SUBJ_CH, 55, 1)
for k in (12, 16): toll(k * 4, 62, 0.3)
hit(72, midi('D2'), 0.6)

# ---- FUGA episodes 20-28: the subject's head on the circle of fifths ----
EPI = [('Gm', 7, 'm'), ('C', 0, 'M'), ('F', 5, 'M'), ('Bb', 10, 'M'), ('Edim', 4, 'd'), ('A', 9, 'M'), ('Dm', 2, 'm'), ('A', 9, 'M')]
for j, (ch, pc, q) in enumerate(EPI):
    B = (20 + j) * 4
    root = 72 + ((pc - 72) % 12)
    if root > 77: root -= 12
    third = 3 if q in ('m', 'd') else 4; fifth = 6 if q == 'd' else 7
    head = [(1, root), (1, root + fifth), (.5, root + third), (.5, root + 2), (.5, root), (.5, root - 1)]
    t = 0.0
    for (d, m) in head:
        organ.add(bt(B + t), organ_pipe(m, d * BEAT * 0.94), 1.0, 0.0); score['fugue'].append([B + t, d, m, 3]); t += d
    tones = chord_notes(ch, 62); arp = tones + tones[::-1]
    for i in range(16):
        m = arp[i % 8] - (12 if j % 2 else 0) + 0
        organ.add(bt(B + i * 0.25), organ_pipe(m, 0.25 * BEAT * 0.9), 0.65, -0.3); score['fugue'].append([B + i * 0.25, 0.25, m, 2])
    r2 = 38 + ((pc - 38) % 12)
    for i, m in enumerate([r2, r2 + 12, r2 + 7, r2 + 12]):
        pedal_note(B + i, 1, m)
    if j % 2 == 0: hit(B, r2, 0.5)
toll(27 * 4 + 2, 57, 0.4)

# ---- KYRIE 28-32: the choir alone ----
KY = [(['D3', 'A3', 'F4', 'A4'], 'Dm'), (['Bb2', 'F3', 'D4', 'Bb4'], 'Bb'), (['G2', 'D3', 'Bb3', 'G4'], 'Gm'), (['A2', 'E3', 'C#4', 'A4'], 'A')]
for i, (notes, ch) in enumerate(KY):
    B = (28 + i) * 4
    sing(B, 4, notes, 'e' if i < 3 else 'a', 1.1, key='kyrie', root=midi(notes[0]))
toll(28 * 4, 50, 0.7); toll(30 * 4, 50, 0.6)

# ---- DIES IRAE 32-48: chant in octaves over toccata figuration, full organ, timpani, bells ----
for ph in range(4):
    B0 = (32 + ph * 4) * 4
    for half, line in enumerate((DIES1, DIES2)):
        Bp = B0 + half * 8
        t = 0.0
        for (d, nm) in line:
            m = midi(nm)
            choir.add(bt(Bp + t), voice(m - 12, d * BEAT, 'a', n=4), 1.0, -0.1)
            choir.add(bt(Bp + t), voice(m, d * BEAT, 'a', n=3), 0.8, 0.1)
            score['dies'].append([Bp + t, d, m]); t += d
        for q, ch in enumerate(DIES_CH[half]):
            Bq = Bp + q * 2
            for m in chord_notes(ch, 50)[:4]: organ.add(bt(Bq), organ_pipe(m, 2 * BEAT * 0.95, 'reed'), 0.45, 0.0)
            pcs = CHORD[ch]; r = 38 + ((pcs[0] - 38) % 12)
            pedal_note(Bq, 1, r, 'reed', 0.9); pedal_note(Bq + 1, 1, r + 12, 'reed', 0.7)
        for q in range(2):
            figuration(Bp + q * 4, DIES_CH[half][q * 2], 62 + (ph % 2) * 2, 'full', 0.55, desc=(q == 1))
        hit(Bp, midi('D2'), 0.8); hit(Bp + 4, midi('A2'), 0.6)
        toll(Bp, 50, 0.6)
    if ph == 3: roll(B0 + 14, 2, midi('A2'))

# ---- STRETTO 48-56: entries every bar, then a dominant pedal and the grand pause ----
entry(192, 0, 1, 'subject', 'full')
entry(196, 7, 2, 'answer', 'full')
entry(200, 12, 3, 'subject', 'full')
entry(204, -24, 4, 'subject', 'reed')
entry(208, 7, 1, 'answer', 'full')
entry(208, 12, 3, 'subject', 'full')
pedal_note(208, 4, midi('D2'), 'reed')
pedal_note(212, 4, midi('G2'), 'reed')
for k in (48, 50): toll(k * 4, 50, 0.6)
hit(192, midi('D2'), 0.8); hit(200, midi('D2'), 0.8); hit(208, midi('D2'), 0.9)
# 54-56: dominant pedal on A, the choir rises, a scale runs up — then everything stops
pedal_note(216, 7, midi('A1'), 'reed', 1.1)
sing(216, 7, ['A2', 'E3', 'C#4', 'A4'], 'a', 1.0, root=midi('A2'))
scale = [69, 70, 72, 73, 74, 76, 77, 79, 81, 82, 84, 85, 86, 88, 89, 91]
for i in range(16):
    organ.add(bt(216 + i * 0.25), organ_pipe(scale[i] - 12, 0.25 * BEAT * 0.9, 'full'), 0.6); score['figura'].append([216 + i * 0.25, 0.25, scale[i] - 12])
for i in range(12):
    organ.add(bt(220 + i * 0.25), organ_pipe(scale[min(15, i + 4)], 0.25 * BEAT * 0.9, 'full'), 0.65); score['figura'].append([220 + i * 0.25, 0.25, scale[min(15, i + 4)]])
roll(220, 3, midi('A2'), 0.8)
score['gp'].append(223)                           # grand pause: beat 223-224 is silent

# ---- AMEN 56-60: iv → I (plagal), D major at the end ----
sing(224, 4, ['G2', 'D3', 'Bb3', 'G4'], 'a', 1.2, root=midi('G2'))
for m in chord_notes('Gm', 55)[:4]: organ.add(bt(224), organ_pipe(m, 4 * BEAT, 'full'), 0.5)
pedal_note(224, 4, midi('G1'), 'reed')
sing(228, 12, ['D3', 'A3', 'F#4', 'D5'], 'a', 1.3, root=midi('D3'))
for m in chord_notes('D', 50)[:4] + [74, 78, 81]: organ.add(bt(228), organ_pipe(m, 12 * BEAT, 'full'), 0.45)
pedal_note(228, 12, midi('D1') + 12, 'reed', 1.1)
score['amen'] += [224, 228]
hit(224, midi('G2'), 0.8); hit(228, midi('D2'), 1.0)
for i, b in enumerate((228, 230, 232, 234, 236)): toll(b, 50 if i % 2 == 0 else 57, 1.0 - 0.12 * i)

# ---- mix ----------------------------------------------------------------------------------------------
def reverb(st, mix, dur=6.0, decay=2.2):
    tt = np.arange(int(dur * SR)) / SR
    out = []
    for ch in range(2):
        ir = lp(rng.standard_normal(len(tt)) * np.exp(-tt / decay), 5000); ir[:int(0.03 * SR)] *= 0.1
        ir /= np.sqrt(np.sum(ir ** 2))
        out.append(signal.fftconvolve(st[ch], ir)[:N])
    return np.vstack(out) * mix

dry = organ.stereo() * 1.0 + pedal.stereo() * 0.9 + choir.stereo() * 1.1 + bells.stereo() + timp.stereo() * 0.8
wet = reverb(organ.stereo() + pedal.stereo() * 0.7 + choir.stereo() * 1.3 + bells.stereo() * 0.9 + timp.stereo() * 0.5, 0.55)
mix = dry * 0.75 + wet
# louder as it goes: quiet bells → chant → fugue → the full organ of Dies irae, stretto and Amen
sec = np.full(N, 1.0)
for a_, b_, v_ in ((0, 4, 0.45), (4, 12, 0.6), (12, 20, 0.72), (20, 28, 0.8), (28, 32, 0.75), (32, 48, 1.0), (48, 56, 1.0), (56, 64, 1.08)):
    sec[int(bar(a_) * SR):int(bar(b_) * SR)] = v_
sec = lp(sec, 3)
mix = mix * sec
mix -= np.mean(mix, axis=1, keepdims=True)
# grand pause: the dry sound stops dead (the cathedral keeps ringing a little)
for b in score['gp']:
    i0, i1 = int(bt(b) * SR), int(bt(b + 1) * SR)
    g = np.ones(N); g[i0:i1] = np.linspace(0.35, 0.0, i1 - i0) ** 2; g[i0 - 300:i0] = np.linspace(1, 0.35, 300)
    mix = mix * g
mix /= np.max(np.abs(mix))
pk = np.max(np.abs(mix), axis=0)
win = int(0.005 * SR)
pk = np.maximum.reduce([np.roll(pk, -i) for i in range(0, win, 8)])
DRIVE, THR = 1.8, 0.92
g = np.minimum(1, THR / np.maximum(pk * DRIVE, 1e-6))
rel = np.exp(-1 / (0.2 * SR))
g = signal.lfilter([1 - rel], [1, -rel], g[::-1])[::-1]
g = np.minimum(g, np.minimum(1, THR / np.maximum(pk * DRIVE, 1e-6)) * 1.2)
mix = np.tanh(mix * DRIVE * g / THR * 0.95) * THR
endi = int((bar(60) + 5.0) * SR)
mix = mix[:, :endi]
fade = int(1.5 * SR); mix[:, -fade:] *= np.linspace(1, 0, fade) ** 2
mix *= 0.95 / np.max(np.abs(mix))

from scipy.io import wavfile
wavfile.write('sanctus.wav', SR, (mix.T * 32767).astype(np.int16))
for key in ('gp', 'amen'): score[key] = sorted(set(score[key]))
for key in ('bell', 'chant', 'fugue', 'figura', 'pedal', 'entry', 'choir', 'dies', 'timp', 'roll', 'kyrie'): score[key].sort(key=lambda e: e[0])
score['end'] = round(mix.shape[1] / SR, 2)
json.dump(score, open('score.json', 'w'), default=lambda o: o.item() if hasattr(o, 'item') else o)
print('done', mix.shape[1] / SR)
