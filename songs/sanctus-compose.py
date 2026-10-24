"""SANCTUS — original song for the dodge game (theme: sacred and strict — the heavens, a fugue, a judgment).
120 BPM in D minor, ending in D major (a Picardy third on the last "Amen").
The main instruments are VIOLIN, HARP and PIANO; a soft choir (vowels only, no lyrics), heavenly bells and distant timpani sit behind them.
Beat 0 at t = 0.5 s; 1 beat = 0.5 s; 1 bar = 2 s.

The sounds are made for this song only:
  violin  — a bowed string: a sawtooth with a delayed vibrato, a little bow noise and the body resonances of the wood
            (solo violin, or a section of 3-4 slightly detuned players; low strings for the long bass notes)
  harp    — a plucked string: bright partials that die away quickly over a warm, long-ringing fundamental
  piano   — hammered strings: slightly stretched (inharmonic) partials, three detuned strings per note, a hammer knock,
            a fast then slow decay, and dampers that stop the note when the key is released
  choir   — a buzzing voice source through vowel formants (a / o / e / u), three singers per part, kept soft
  bells   — inharmonic church bells; timpani far in the distance
  heaven  — a long, bright hall reverb
The form is a strict fugue: one subject, answered at the fifth, three voices + bass, then episodes on the circle of fifths,
a "Dies irae" chant over running figuration, a stretto (entries every bar), a grand pause, and a plagal Amen.
  fugue voice I = piano, voice II = violin, voice III = solo violin (high), bass = piano (left hand) / low strings
  chant = solo violin (+ violins an octave up), Dies irae = violins in octaves over piano chords, running 16ths = harp / piano
Writes sanctus.wav and score.json (beat numbers for the chart).

Run:  python3 sanctus-compose.py      (needs numpy + scipy)
Form (bars): bells 0-4 / INTROITUS (chant) 4-12 / FUGA (exposition 12-20, episodes 20-28) / KYRIE 28-32 /
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

class PianoBus(Bus):
    """the piano is heard from the player's seat: low notes on the left, high notes on the right (the pan given to add() is ignored)"""
    last_m = 60
    def add(self, t, sig, gain=1.0, pan=0.0):
        super().add(t, sig, gain, max(-0.5, min(0.5, (PianoBus.last_m - 64) / 56)))

strings, harpb, choir, bells, timp = (Bus() for _ in range(5))
pianob = PianoBus()

def tvec(d): return np.arange(int(d * SR)) / SR
def noise(d): return rng.standard_normal(int(d * SR))
def lp(x, fc, o=2): return signal.sosfilt(signal.butter(o, min(fc, SR * 0.45), 'low', fs=SR, output='sos'), x)
def hp(x, fc, o=2): return signal.sosfilt(signal.butter(o, fc, 'high', fs=SR, output='sos'), x)
def bpf(x, lo, hi, o=2): return signal.sosfilt(signal.butter(o, [max(20, lo), min(hi, SR * 0.45)], 'band', fs=SR, output='sos'), x)

# ---- instruments ---------------------------------------------------------------------------------
BODY = [(240, 340, 0.9), (420, 600, 0.7), (950, 1300, 0.35), (2400, 3400, 0.55)]   # the wooden body's resonances
def violin(m, dur, g=1.0, n=1, att=0.06):
    """a bowed string. n = 1: solo violin, n > 1: a section (slightly detuned players)"""
    dur = max(dur, 0.08); tt = tvec(dur + 0.25); src = np.zeros(len(tt))
    for s in range(n):
        dl = 0.12 + 0.05 * s
        vib = 1 + (0.0055 + 0.001 * s) * np.sin(2 * np.pi * (5.4 + 0.35 * s) * tt + s * 1.9) * np.clip((tt - dl) / 0.25, 0, 1)
        f = mtof(m) * (1 + (s - (n - 1) / 2) * 0.004) * vib
        ph = np.cumsum(f) / SR + rng.random()
        src += 2 * (ph % 1.0) - 1
    src = lp(src, 7500) / n
    body = 0.25 * src
    for lo, hi, a in BODY: body += a * bpf(src, lo, hi)
    bow = hp(noise(dur + 0.25), 3000) * 0.025
    e = np.minimum(1, tt / att) ** 1.5 * np.clip((dur + 0.25 - tt) / 0.25, 0, 1)
    return (body + bow) * e * 0.32 * g

def harp(m, dur=1.0, g=1.0):
    """a plucked harp string: bright at the pluck, then a warm, long-ringing fundamental"""
    f = mtof(m); L = min(4.0, 1.4 + 2.2 * max(0, (72 - m) / 30) + 0.4)
    tt = tvec(L); out = np.zeros(len(tt))
    base = 2.6 * (2 ** ((60 - m) / 24))
    for h in range(1, 11):
        if f * h > 14000: break
        out += (1 / h ** 1.25) * np.sin(2 * np.pi * f * h * tt + h * 0.7) * np.exp(-tt / (base / (1 + 0.45 * (h - 1))))
    pl = bpf(noise(0.012), 1500, 6000) * np.exp(-tvec(0.012) / 0.003) * 0.2
    out[:len(pl)] += pl
    out[:int(0.002 * SR)] *= np.linspace(0, 1, int(0.002 * SR))
    return out * 0.2 * g

def piano(m, dur, g=1.0, vel=0.8):
    """a concert grand piano note (key held for dur seconds; vel = how hard, 0-1).
    Two slightly detuned strings per note (a gentle beating), partials stretched by the string's stiffness,
    the hammer striking about 1/8 of the way along the string (so those partials are weak), a brighter tone when played harder,
    a two-stage decay (a quick drop, then a long singing aftersound; longer in the bass), a hammer knock, and dampers that stop
    the note when the key is released (the highest notes have no dampers, as on a real piano)."""
    PianoBus.last_m = m
    f0 = float(mtof(m)); dur = max(dur, 0.12)
    damped = m <= 89
    tail = 0.5 if damped else 2.5
    tt = tvec(dur + tail); out = np.zeros(len(tt))
    tau = 3.0 * 2 ** (-(m - 40) / 15)                       # the aftersound's time constant (s): long in the bass, short in the treble
    B = 0.00032 * 2 ** ((m - 60) / 20)                       # string stiffness (inharmonicity)
    roll = 1.85 - 0.9 * vel                                  # softer playing = darker
    bright = 1800 + 5200 * vel
    nmax = 30 if m < 48 else 20 if m < 72 else 12
    seed = (m * 7919) % 1000
    for n in range(1, nmax + 1):
        fn = n * f0 * np.sqrt(1 + B * n * n)
        if fn > 13000: break
        a = abs(np.sin(np.pi * n * 0.125)) / n ** roll / (1 + (fn / bright) ** 2)
        if a < 1e-4: continue
        tn = tau / (1 + (n - 1) * 0.32 * (f0 / 262) ** 0.4)
        env = 0.72 * np.exp(-tt / (tn * 0.22)) + 0.28 * np.exp(-tt / tn)
        c = 0.00025 + 0.00035 * ((seed + n * 37) % 10) / 10   # the two strings are a hair apart → slow beating
        ph1, ph2 = (seed * 0.37 + n) % 6.28, (seed * 0.71 + 2 * n) % 6.28
        out += a * env * (np.sin(2 * np.pi * fn * tt + ph1) + 0.85 * np.sin(2 * np.pi * fn * (1 + c) * tt + ph2))
    na = int(0.0015 * SR); out[:na] *= np.linspace(0, 1, na)  # the hammer hits (very fast attack)
    kn = int(0.04 * SR)
    knock = lp(noise(0.04), 1400) * np.exp(-tvec(0.04) / 0.008) * 0.06 * (0.4 + vel) + bpf(noise(0.04), 70, 350) * np.exp(-tvec(0.04) / 0.02) * 0.05
    out[:kn] += knock[:kn] * max(1, nmax / 12)
    if damped:                                               # key released: the damper stops the strings (a little slower in the bass)
        i0 = int(dur * SR); td = 0.16 if m < 45 else 0.09
        out[i0:] *= np.exp(-(tt[i0:] - dur) / td)
    return out * 0.16 * g * (0.3 + 0.8 * vel)

FORM = {'a': [(730, 90, 1.0), (1090, 110, 0.5), (2440, 160, 0.25)],
        'o': [(570, 80, 1.0), (840, 90, 0.45), (2410, 160, 0.15)],
        'e': [(530, 80, 1.0), (1840, 120, 0.4), (2480, 160, 0.22)],
        'u': [(330, 70, 1.0), (870, 90, 0.25), (2240, 160, 0.08)]}
def voice(m, dur, vowel='a', g=1.0, n=3):
    dur = max(dur, 0.2); tt = tvec(dur + 0.4); out = np.zeros(len(tt))
    for s in range(n):
        vib = 1 + 0.004 * np.sin(2 * np.pi * (5.2 + 0.4 * s) * tt + s * 2.1) * np.clip(tt / 0.4, 0, 1)
        f = mtof(m) * (1 + (s - (n - 1) / 2) * 0.0035) * vib
        ph = np.cumsum(f) / SR
        src = lp(2 * (ph % 1.0) - 1, 3500) + 0.02 * rng.standard_normal(len(tt))
        for (fc, bw, a) in FORM[vowel]: out += a * bpf(src, fc - bw, fc + bw)
    e = np.minimum(1, tt / 0.25) * np.clip((dur + 0.4 - tt) / 0.4, 0, 1)
    return out * e * 0.5 * g / n

BELL_P = [(0.5, 1.0, 4.0), (1.0, 0.8, 3.0), (1.183, 0.5, 2.2), (1.5, 0.35, 1.8), (2.0, 0.6, 1.6), (2.5, 0.2, 1.0), (2.98, 0.25, 0.8), (4.07, 0.12, 0.5)]
def bell(m, g=1.0, dur=6.0):
    tt = tvec(dur); f = mtof(m); out = np.zeros(len(tt))
    for (r, a, dk) in BELL_P:
        out += a * np.sin(2 * np.pi * f * r * tt + r) * np.exp(-tt / dk) * (1 + 0.15 * np.sin(2 * np.pi * 1.3 * r * tt))
    strike = bpf(noise(0.03), 1500, 7000) * np.exp(-tvec(0.03) / 0.006)
    out[:len(strike)] += strike * 0.4
    return out * 0.16 * g

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
SUBJ_CH = ['Dm', 'A', 'Gm', 'A']
VOICE_PAN = {1: -0.3, 2: 0.3, 3: 0.05, 4: 0.0}

def note(voice_no, B, d, m, g=1.0, loud=False):
    """one fugue note on its instrument: I = piano, II = violin, III = solo violin (high), 4 = bass (piano + low strings)"""
    if voice_no == 1: pianob.add(bt(B), piano(m, d * BEAT * 0.95, 1.0, 0.9 if loud else 0.75), g, VOICE_PAN[1])
    elif voice_no == 2: strings.add(bt(B), violin(m, d * BEAT * 0.95, 1.0, 2, 0.04 if d < 0.5 else 0.06), g, VOICE_PAN[2])
    elif voice_no == 3: strings.add(bt(B), violin(m, d * BEAT * 0.95, 1.0, 1, 0.04 if d < 0.5 else 0.07), g * 1.1, VOICE_PAN[3])
    else:
        pianob.add(bt(B), piano(m, d * BEAT * 0.95, 1.0, 0.9), g * 1.1, -0.1); pianob.add(bt(B), piano(m + 12, d * BEAT * 0.95, 1.0, 0.7), g * 0.6, -0.1)
        if d >= 1: strings.add(bt(B), violin(m + 12, d * BEAT * 0.95, 1.0, 3, 0.08), g * 0.6, 0.0)

def play_line(B, line, shift, voice_no, g=1.0, loud=False):
    t = 0.0
    for (d, nm) in line:
        m = midi(nm) + shift
        note(voice_no, B + t, d, m, g, loud)
        score['pedal' if voice_no == 4 else 'fugue'].append([B + t, d, m] + ([] if voice_no == 4 else [voice_no]))
        t += d

def entry(B, shift, voice_no, kind='subject', g=1.0, loud=False):
    score['entry'].append([B, voice_no, kind, shift])
    play_line(B, SUBJ, shift, voice_no, g, loud)

def free_voice(B, chords, octave_base, voice_no, g=0.8):
    """free counterpoint on the harp: the third then the fifth of each half-bar chord"""
    for i, ch in enumerate(chords):
        pcs = CHORD[ch]
        for j, pc in enumerate((pcs[1], pcs[2])):
            m = octave_base + ((pc - octave_base) % 12)
            harpb.add(bt(B + i * 2 + j), harp(m), g, -0.45 + 0.9 * (voice_no == 2))
            score['fugue'].append([B + i * 2 + j, 1, m, voice_no])

def chord_notes(ch, lo, n=4):
    pcs = CHORD[ch]; out = []; m = lo
    while len(out) < n:
        if m % 12 in pcs: out.append(m)
        m += 1
    return out

def roll_chord(B, ch, lo, g=0.6, spread=0.06, n=6):
    """a rolled harp chord (low to high)"""
    for i, m in enumerate(chord_notes(ch, lo, n)):
        harpb.add(bt(B) + i * spread, harp(m), g, -0.5 + i / max(1, n - 1))

def figuration(B, ch, lo=62, inst='harp', g=0.7, desc=False):
    """running 16ths over the chord (one bar of 16 notes going up and down) on harp or piano"""
    tones = chord_notes(ch, lo)
    up = tones + [t + 12 for t in tones]
    pat = up + up[::-1] if not desc else up[::-1] + up
    for i in range(16):
        m = pat[i]
        if inst == 'harp': harpb.add(bt(B + i * 0.25), harp(m), g, 0.4 * np.sin(i * 0.8))
        else: pianob.add(bt(B + i * 0.25), piano(m, 0.25 * BEAT * 0.9, 1.0, 0.85), g, 0.3 * np.sin(i * 0.8))
        score['figura'].append([B + i * 0.25, 0.25, m])

def bass_note(B, d, m, g=1.0):
    """a long bass note: low strings (cello / bass), with a soft piano attack"""
    strings.add(bt(B), violin(m, d * BEAT * 0.97, 1.0, 3, 0.15), 0.9 * g, 0.0)
    strings.add(bt(B), violin(m + 12, d * BEAT * 0.97, 1.0, 3, 0.15), 0.5 * g, 0.0)
    pianob.add(bt(B), piano(m, min(d, 4) * BEAT, 1.0, 0.6), 0.6 * g, -0.1)
    score['pedal'].append([B, d, m])

def sing(B, d, notes, vowel='a', g=1.0, key='choir', root=None):
    for i, nm in enumerate(notes):
        m = midi(nm) if isinstance(nm, str) else nm
        choir.add(bt(B), voice(m, d * BEAT, vowel), g, (i / max(1, len(notes) - 1) - 0.5) * 0.6)
    if key: score[key].append([B, d, root if root is not None else (midi(notes[0]) if isinstance(notes[0], str) else notes[0])])

def string_chord(B, d, ch, lo=50, g=0.5, n=4):
    for i, m in enumerate(chord_notes(ch, lo, n)):
        strings.add(bt(B), violin(m, d * BEAT * 0.97, 1.0, 3, 0.2), g, -0.4 + 0.8 * i / max(1, n - 1))

def toll(B, m=62, g=1.0):
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

# ---- bells 0-4: heavenly bells, a harp rolling slowly, low strings and a soft choir ----
for k in range(4):
    toll(k * 4, 62, 0.5 + 0.05 * k)
    roll_chord(k * 4 + 2, ['Dm', 'Gm', 'Bb', 'A'][k], 50, 0.45, 0.09, 7)
bass_note(0, 16, midi('D2'), 0.7)
sing(4, 12, ['D4', 'A4', 'F5'], 'u', 0.35)

# ---- INTROITUS 4-12: the chant on solo violin (violins an octave up from bar 8), harp chords ----
t = 16.0
for (d, nm) in CHANT:
    m = midi(nm) + 12                                   # the chant sits in the violin's warm low-middle register
    strings.add(bt(t), violin(m, d * BEAT * 0.97, 1.0, 1, 0.09), 1.05, 0.05)
    if t >= 32: strings.add(bt(t), violin(m + 12, d * BEAT * 0.97, 1.0, 3, 0.1), 0.55, -0.1)
    score['chant'].append([t, d, m - 12])
    t += d
for k in range(4, 12, 2):
    bass_note(k * 4, 8, midi('D2'), 0.6)
    for i, ch in enumerate(['Dm', 'Dm', 'Gm', 'Dm'] if k < 8 else ['Dm', 'C', 'Gm', 'A']):
        roll_chord(k * 4 + i * 2, ch, 55, 0.4, 0.05, 5)
    toll(k * 4, 74, 0.25)

# ---- FUGA exposition 12-20: piano, then violin, then solo violin, then the bass ----
entry(48, 0, 1)                                  # bar 12: voice I (piano), subject in D
entry(56, 7, 2, 'answer')                        # bar 14: voice II (violin), answer in A
play_line(56, CS, 7, 1)                          #   piano: countersubject (in A)
entry(64, 12, 3)                                 # bar 16: voice III (solo violin), subject an octave up
play_line(64, CS, 0, 2)                          #   violin: countersubject
free_voice(64, SUBJ_CH, 57, 1)                   #   harp: free
entry(72, -24, 4)                                # bar 18: bass, subject in D
play_line(72, CS, 12, 3)                         #   solo violin: countersubject (octave up)
free_voice(72, SUBJ_CH, 60, 2); free_voice(72, SUBJ_CH, 55, 1)
for k in (12, 16): toll(k * 4, 74, 0.3)
hit(72, midi('D2'), 0.4)

# ---- FUGA episodes 20-28: the subject's head (solo violin) on the circle of fifths, harp arpeggios, piano bass ----
EPI = [('Gm', 7, 'm'), ('C', 0, 'M'), ('F', 5, 'M'), ('Bb', 10, 'M'), ('Edim', 4, 'd'), ('A', 9, 'M'), ('Dm', 2, 'm'), ('A', 9, 'M')]
for j, (ch, pc, q) in enumerate(EPI):
    B = (20 + j) * 4
    root = 72 + ((pc - 72) % 12)
    if root > 77: root -= 12
    third = 3 if q in ('m', 'd') else 4; fifth = 6 if q == 'd' else 7
    head = [(1, root), (1, root + fifth), (.5, root + third), (.5, root + 2), (.5, root), (.5, root - 1)]
    t = 0.0
    for (d, m) in head:
        note(3, B + t, d, m); score['fugue'].append([B + t, d, m, 3]); t += d
    tones = chord_notes(ch, 62); arp = tones + tones[::-1]
    for i in range(16):
        m = arp[i % 8] - (12 if j % 2 else 0)
        harpb.add(bt(B + i * 0.25), harp(m), 0.6, 0.4 * np.sin(i)); score['fugue'].append([B + i * 0.25, 0.25, m, 2])
    r2 = 38 + ((pc - 38) % 12)
    for i, m in enumerate([r2, r2 + 12, r2 + 7, r2 + 12]):
        pianob.add(bt(B + i), piano(m, BEAT * 0.9, 1.0, 0.8), 0.9, -0.15); score['pedal'].append([B + i, 1, m])
    string_chord(B, 4, ch, 55, 0.25, 3)
    if j % 2 == 0: hit(B, r2, 0.35)
toll(27 * 4 + 2, 69, 0.4)

# ---- KYRIE 28-32: the choir, a harp and high violins ----
KY = [(['D3', 'A3', 'F4', 'A4'], 'Dm'), (['Bb2', 'F3', 'D4', 'Bb4'], 'Bb'), (['G2', 'D3', 'Bb3', 'G4'], 'Gm'), (['A2', 'E3', 'C#4', 'A4'], 'A')]
for i, (notes, ch) in enumerate(KY):
    B = (28 + i) * 4
    sing(B, 4, notes, 'e' if i < 3 else 'a', 0.85, key='kyrie', root=midi(notes[0]))
    roll_chord(B, ch, 62, 0.45, 0.07, 6); roll_chord(B + 2, ch, 67, 0.3, 0.05, 4)
    strings.add(bt(B), violin(chord_notes(ch, 81, 1)[0], 4 * BEAT * 0.97, 1.0, 3, 0.4), 0.35, 0.2)
toll(28 * 4, 62, 0.6); toll(30 * 4, 62, 0.5)

# ---- DIES IRAE 32-48: violins in octaves over hammering piano chords and running 16ths (harp, then piano) ----
for ph in range(4):
    B0 = (32 + ph * 4) * 4
    for half, line in enumerate((DIES1, DIES2)):
        Bp = B0 + half * 8
        t = 0.0
        for (d, nm) in line:
            m = midi(nm)
            strings.add(bt(Bp + t), violin(m, d * BEAT * 0.95, 1.0, 4, 0.04), 1.0, -0.15)
            strings.add(bt(Bp + t), violin(m + 12, d * BEAT * 0.95, 1.0, 4, 0.04), 0.75, 0.15)
            score['dies'].append([Bp + t, d, m]); t += d
        for q, ch in enumerate(DIES_CH[half]):
            Bq = Bp + q * 2
            for i, m in enumerate(chord_notes(ch, 50)):
                pianob.add(bt(Bq), piano(m, 2 * BEAT * 0.9, 1.0, 1.0), 0.5, -0.3 + 0.2 * i)
                pianob.add(bt(Bq + 1), piano(m, BEAT * 0.8, 1.0, 0.8), 0.35, -0.3 + 0.2 * i)
            pcs = CHORD[ch]; r = 38 + ((pcs[0] - 38) % 12)
            pianob.add(bt(Bq), piano(r, 2 * BEAT, 1.0, 1.0), 1.0, -0.2); pianob.add(bt(Bq), piano(r - 12, 2 * BEAT, 1.0, 1.0), 0.7, -0.2)
            score['pedal'] += [[Bq, 1, r], [Bq + 1, 1, r + 12]]
        for q in range(2):
            figuration(Bp + q * 4, DIES_CH[half][q * 2], 62 + (ph % 2) * 2, 'harp' if ph < 2 else 'piano', 0.6, desc=(q == 1))
        hit(Bp, midi('D2'), 0.6); hit(Bp + 4, midi('A2'), 0.45)
        toll(Bp, 62, 0.45)
    if ph == 3: roll(B0 + 14, 2, midi('A2'), 0.5)

# ---- STRETTO 48-56: entries every bar, then a dominant pedal, a harp glissando and the grand pause ----
entry(192, 0, 1, 'subject', 1.0, True)
entry(196, 7, 2, 'answer')
entry(200, 12, 3, 'subject')
entry(204, -24, 4, 'subject')
entry(208, 7, 1, 'answer', 1.0, True)
entry(208, 12, 3, 'subject')
for k, ch in zip(range(48, 54), ['Dm', 'A', 'Dm', 'A', 'Dm', 'Gm']):   # the strings and the harp fill out the stretto
    string_chord(k * 4, 4, ch, 50, 0.45, 4); roll_chord(k * 4, ch, 50, 0.4, 0.04, 7)
bass_note(208, 4, midi('D2'))
bass_note(212, 4, midi('G2'))
for k in (48, 50): toll(k * 4, 62, 0.5)
hit(192, midi('D2'), 0.6); hit(200, midi('D2'), 0.6); hit(208, midi('D2'), 0.7)
bass_note(216, 7, midi('A1'), 1.1)
sing(216, 7, ['A3', 'E4', 'C#5', 'A5'], 'a', 0.7, root=midi('A2'))
string_chord(216, 7, 'A', 57, 0.4, 4)
scale = [69, 70, 72, 73, 74, 76, 77, 79, 81, 82, 84, 85, 86, 88, 89, 91]
for i in range(16):
    pianob.add(bt(216 + i * 0.25), piano(scale[i] - 12, 0.25 * BEAT * 0.9, 1.0, 0.9), 0.6); score['figura'].append([216 + i * 0.25, 0.25, scale[i] - 12])
for i in range(12):
    m = scale[min(15, i + 4)]
    harpb.add(bt(220 + i * 0.25), harp(m), 0.6); score['figura'].append([220 + i * 0.25, 0.25, m])
roll(220, 3, midi('A2'), 0.6)
score['gp'].append(223)                           # grand pause: beat 223-224 is silent

# ---- AMEN 56-60: iv → I (plagal), D major at the end; a harp glissando opens the heavens ----
sing(224, 4, ['G3', 'D4', 'Bb4', 'G5'], 'a', 0.8, root=midi('G2'))
string_chord(224, 4, 'Gm', 55, 0.55, 4)
for m in chord_notes('Gm', 43, 5): pianob.add(bt(224), piano(m, 4 * BEAT, 1.0, 0.9), 0.5)
sing(228, 12, ['D4', 'A4', 'F#5', 'D5'], 'a', 0.9, root=midi('D3'))
string_chord(228, 12, 'D', 50, 0.55, 5); strings.add(bt(228), violin(86, 12 * BEAT, 1.0, 3, 0.6), 0.45, 0.2)
for m in chord_notes('D', 38, 6): pianob.add(bt(228), piano(m, 10 * BEAT, 1.0, 0.95), 0.55)
gl = chord_notes('D', 50, 18)
for i, m in enumerate(gl): harpb.add(bt(228) + i * 0.045, harp(m), 0.45, -0.6 + 1.2 * i / len(gl))
score['amen'] += [224, 228]
hit(224, midi('G2'), 0.5); hit(228, midi('D2'), 0.7)
for i, b in enumerate((228, 230, 232, 234, 236)): toll(b, 62 if i % 2 == 0 else 69, 0.8 - 0.1 * i)

# ---- mix ----------------------------------------------------------------------------------------------
def reverb(st, mix, dur=4.5, decay=1.6):
    tt = np.arange(int(dur * SR)) / SR
    out = []
    for ch in range(2):
        ir = lp(rng.standard_normal(len(tt)) * np.exp(-tt / decay), 9000); ir[:int(0.02 * SR)] *= 0.15
        ir /= np.sqrt(np.sum(ir ** 2))
        out.append(signal.fftconvolve(st[ch], ir)[:N])
    return np.vstack(out) * mix

# the piano's body: a short, warm soundboard resonance and a gentle EQ (body bump, soft top end)
def piano_body(bus):
    st = bus.stereo().astype(np.float64)
    tt = np.arange(int(0.12 * SR)) / SR
    out = []
    for ch in range(2):
        ir = lp(rng.standard_normal(len(tt)) * np.exp(-tt / 0.025), 3500); ir /= np.sqrt(np.sum(ir ** 2))
        x = st[ch] + 0.35 * signal.fftconvolve(st[ch], ir)[:N]
        x = hp(x, 30) + 0.25 * bpf(x, 90, 320)
        out.append(lp(x, 9500))
    bus.L, bus.R = out[0].astype(np.float32), out[1].astype(np.float32)
piano_body(pianob)
dry = strings.stereo() * 1.0 + harpb.stereo() * 1.0 + pianob.stereo() * 1.0 + choir.stereo() * 0.8 + bells.stereo() * 0.8 + timp.stereo() * 0.55
wet = reverb(strings.stereo() + harpb.stereo() * 1.1 + pianob.stereo() * 0.8 + choir.stereo() * 1.3 + bells.stereo() + timp.stereo() * 0.5, 0.45)
mix = dry * 0.85 + wet
# louder as it goes: bells → chant → fugue → Dies irae, stretto and Amen
sec = np.full(N, 1.0)
for a_, b_, v_ in ((0, 4, 0.6), (4, 12, 0.62), (12, 20, 0.8), (20, 28, 0.62), (28, 32, 0.8), (32, 48, 0.95), (48, 56, 1.35), (56, 64, 1.35)):
    sec[int(bar(a_) * SR):int(bar(b_) * SR)] = v_
sec = lp(sec, 3)
mix = mix * sec
mix -= np.mean(mix, axis=1, keepdims=True)
for b in score['gp']:                             # grand pause: the sound stops dead (the hall keeps ringing a little)
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
