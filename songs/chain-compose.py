"""CHAIN REACTION — original song for the dodge game (theme: a "switch on!" chain-reaction machine, like an I Wanna avoidance stage).
144 BPM bright electro-pop in D major (the final chorus goes up a whole step to E major). No vocals.
Beat 0 at t = 0.5 s; 1 beat = 60/144 s (about 0.42 s); 1 bar = about 1.67 s.

The rhythm section is a machine: every sound is a part of a chain-reaction contraption.
  switch       — the big "click!" (two sharp clicks + a thump + a rising chime). Turns sections on and off
  click        — little switch clicks used as hi-hats
  tick / tock  — a wooden clock (the intro and the break)
  domino       — dominoes falling = fast xylophone runs (each domino is one note)
  marble       — a marble rolling down a rail (filtered noise that speeds up)
  boing        — a spring
  ding         — the bell at the end of a chain
  music box    — the hook played on a music box (intro / outro)
  pluck chords — staccato off-beat chords (verse); supersaw chords with sidechain pumping (choruses)
  chip lead    — a square-wave lead (verse); the chorus hook is square + detuned saw
Writes chain.wav and score.json (beat numbers for the chart).

Run:  python3 chain-compose.py      (needs numpy + scipy)
Form (bars): intro "OFF" 0-4 / verse "ON!" 4-12 / pre-chorus "CHAIN" 12-20 / CHORUS 1 20-36 /
break "MACHINE" 36-44 / build 44-52 / CHORUS 2 (+2 semitones) 52-68 / outro "OFF" 68-72.
"""
import json
import numpy as np
from scipy import signal

SR = 44100
BPM = 144
BEAT = 60 / BPM
T0 = 0.5
BARS = 72
N = int((T0 + BARS * 4 * BEAT + 6.0) * SR)
rng = np.random.default_rng(1440)

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

drums, bass, keys, lead, mech, pad, fxb = (Bus() for _ in range(7))

# ---- tools -------------------------------------------------------------------------------
def tvec(d): return np.arange(int(d * SR)) / SR
def noise(d): return rng.standard_normal(int(d * SR))
def lp(x, fc, o=2): return signal.sosfilt(signal.butter(o, min(fc, SR * 0.45), 'low', fs=SR, output='sos'), x)
def hp(x, fc, o=2): return signal.sosfilt(signal.butter(o, fc, 'high', fs=SR, output='sos'), x)
def bpf(x, lo, hi, o=2): return signal.sosfilt(signal.butter(o, [lo, min(hi, SR * 0.45)], 'band', fs=SR, output='sos'), x)
def env(dur, a=0.004, r=0.04):
    tt = tvec(dur)
    return np.minimum(1, tt / max(a, 1e-4)) * np.clip((dur - tt) / max(r, 1e-4), 0, 1)
def phase(f, n): return np.cumsum(np.broadcast_to(np.asarray(f, float), (n,))) / SR
def sq(ph, duty=0.5): return np.where((ph % 1.0) < duty, 1.0, -1.0)
def saw(ph): return 2 * (ph % 1.0) - 1
def tri(ph): return 2 * np.abs(2 * (ph % 1.0) - 1) - 1

# ---- drums ---------------------------------------------------------------------------------
def kick(g=1.0):
    d = 0.32; tt = tvec(d)
    f = 48 + 120 * np.exp(-tt / 0.03)
    body = np.sin(2 * np.pi * phase(f, len(tt))) * np.exp(-tt / 0.13)
    click = hp(noise(0.006), 2500) * 0.4
    body[:len(click)] += click
    return np.tanh(body * 1.6) * g

def clap(g=1.0):
    d = 0.22; out = np.zeros(int(d * SR))
    for o in (0, 0.009, 0.018):
        n = bpf(noise(d - o), 900, 6000) * np.exp(-tvec(d - o) / (0.012 if o < 0.018 else 0.07))
        i = int(o * SR); out[i:i + len(n)] += n[:len(out) - i]
    return out * 0.6 * g

def click(g=1.0, f=3600):
    """a small switch click (used as the hi-hat)"""
    d = 0.03; tt = tvec(d)
    s = hp(noise(d), 4000) * np.exp(-tt / 0.004) + np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.006) * 0.6
    return s * g

def switch(g=1.0):
    """the big switch: "ka-CHIK!" + a thump + a rising chime"""
    d = 0.9; out = np.zeros(int(d * SR)); tt = tvec(d)
    c1 = click(0.8, 2400); c2 = click(1.3, 3200)
    out[:len(c1)] += c1; o = int(0.035 * SR); out[o:o + len(c2)] += c2
    th = np.sin(2 * np.pi * phase(60 + 80 * np.exp(-tt / 0.02), len(tt))) * np.exp(-tt / 0.08)
    out += th * 0.9
    for i, m in enumerate((86, 90, 93, 98)):                   # D6 F#6 A6 D7: "pi-ro-ri-ri"
        s = int((0.05 + i * 0.045) * SR); tt2 = tvec(d - s / SR)
        out[s:] += np.sin(2 * np.pi * mtof(m) * tt2) * np.exp(-tt2 / 0.18) * 0.25
    return out * g

def power_down(g=1.0):
    d = 1.6; tt = tvec(d)
    f = 880 * np.exp(-tt / 0.45) + 40
    s = sq(phase(f, len(tt)), 0.3) * np.exp(-tt / 0.6) * 0.3
    return lp(s, 3000) * g

def tick(g=1.0, hi=True):
    d = 0.08; tt = tvec(d); f = 1900 if hi else 1250
    s = (np.sin(2 * np.pi * f * tt) + 0.5 * np.sin(2 * np.pi * f * 2.76 * tt)) * np.exp(-tt / 0.012)
    return s * 0.5 * g

def xylo(m, g=1.0):
    """one domino = one xylophone note (wooden bar: fundamental + the 4th partial)"""
    d = 0.35; tt = tvec(d); f = mtof(m)
    s = np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.09) + 0.35 * np.sin(2 * np.pi * f * 3.93 * tt) * np.exp(-tt / 0.02)
    s[:int(0.003 * SR)] *= np.linspace(0, 1, int(0.003 * SR))
    clack = bpf(noise(0.012), 1500, 5000) * np.exp(-tvec(0.012) / 0.003) * 0.4
    s[:len(clack)] += clack
    return s * 0.5 * g

def marble(dur, g=1.0):
    """a marble rolling down a rail: a rumble whose pitch and speed rise, ending in a little 'tok'"""
    tt = tvec(dur); n = len(tt)
    rate = 18 + 40 * (tt / dur) ** 1.5
    am = 0.6 + 0.4 * np.sin(2 * np.pi * phase(rate, n))
    s = np.zeros(n); blk = 2048; zb = noise(dur)
    for i in range(0, n, blk):
        u = i / n
        s[i:i + blk] = bpf(zb[i:i + blk], 300 + 900 * u, 1400 + 3000 * u)
    s *= am * env(dur, 0.1, 0.05) * (0.5 + 0.5 * tt / dur)
    return s * 0.6 * g

def boing(g=1.0):
    d = 0.5; tt = tvec(d)
    f = 220 + 500 * np.exp(-tt / 0.08) + 60 * np.sin(2 * np.pi * 18 * tt) * np.exp(-tt / 0.2)
    return np.sin(2 * np.pi * phase(f, len(tt))) * np.exp(-tt / 0.16) * 0.5 * g

def ding(m=93, g=1.0):
    d = 1.6; tt = tvec(d); f = mtof(m)
    s = np.sin(2 * np.pi * f * tt + 2.2 * np.exp(-tt / 0.3) * np.sin(2 * np.pi * f * 3.5 * tt)) * np.exp(-tt / 0.5)
    return s * 0.4 * g

def music_box(m, g=1.0):
    d = 0.9; tt = tvec(d); f = mtof(m)
    s = np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.35) + 0.3 * np.sin(2 * np.pi * f * 3 * tt) * np.exp(-tt / 0.08) + 0.12 * np.sin(2 * np.pi * f * 5.4 * tt) * np.exp(-tt / 0.03)
    return s * 0.35 * g

def crash(g=1.0):
    d = 1.8; return hp(noise(d), 4000) * np.exp(-tvec(d) / 0.5) * 0.4 * g

def impact(g=1.0):
    d = 1.4; tt = tvec(d)
    s = np.sin(2 * np.pi * phase(30 + 90 * np.exp(-tt / 0.06), len(tt))) * np.exp(-tt / 0.4)
    return np.tanh(s * 1.5) * g

def riser(dur):
    tt = tvec(dur); n = len(tt)
    s = np.zeros(n); blk = 2048; z = noise(dur)
    for i in range(0, n, blk):
        u = i / n
        s[i:i + blk] = bpf(z[i:i + blk], 400 + 5000 * u ** 2, 1200 + 9000 * u ** 2)
    s += 0.2 * saw(phase(200 * 2 ** (3 * tt / dur), n))
    return s * (tt / dur) ** 2 * 0.5

# ---- bass, keys, leads ----------------------------------------------------------------------------
def bass_note(m, dur, g=1.0):
    tt = tvec(dur); f = mtof(m)
    s = 0.7 * np.sin(2 * np.pi * f * tt) + 0.4 * lp(saw(phase(f, len(tt))), 900)
    return np.tanh(s * 1.4) * env(dur, 0.004, 0.03) * g

def pluck_chord(ms, dur=0.16, g=1.0):
    tt = tvec(dur); out = np.zeros(len(tt))
    for m in ms:
        for det in (-0.08, 0.08):
            out += saw(phase(mtof(m + det), len(tt)))
    cut = 600 + 5000 * np.exp(-tt / 0.03)
    s = np.zeros(len(tt)); blk = 256
    for i in range(0, len(tt), blk):
        s[i:i + blk] = lp(out[i:i + blk], cut[i])
    return s * env(dur, 0.002, 0.04) * 0.18 * g

def supersaw(ms, dur, cutoff=5200, g=1.0):
    tt = tvec(dur); out = np.zeros(len(tt))
    for m in ms:
        for dv in np.linspace(-0.22, 0.22, 5):
            out += saw(phase(mtof(m + dv), len(tt)) + rng.random())
    return lp(out, cutoff) * env(dur, 0.01, 0.1) * 0.06 * g

def chip(m, dur, g=1.0, duty=0.25):
    tt = tvec(dur)
    vib = 1 + 0.006 * np.sin(2 * np.pi * 6 * tt) * np.clip((tt - 0.1) / 0.1, 0, 1)
    s = sq(phase(mtof(m) * vib, len(tt)), duty)
    return lp(s, 6000) * env(dur, 0.003, 0.03) * 0.16 * g

def hook_lead(m, dur, g=1.0):
    tt = tvec(dur)
    vib = 1 + 0.007 * np.sin(2 * np.pi * 5.5 * tt) * np.clip((tt - 0.12) / 0.1, 0, 1)
    f = mtof(m) * vib
    s = 0.6 * sq(phase(f, len(tt)), 0.5) + 0.5 * saw(phase(f * 1.006, len(tt))) + 0.5 * saw(phase(f * 0.994, len(tt)))
    return lp(s, 7000) * env(dur, 0.005, 0.05) * 0.13 * g

def stab(ms, g=1.0):
    """the off-beat 'pew' stab in the chorus: a chord whose pitch jumps up into place"""
    d = 0.14; tt = tvec(d); out = np.zeros(len(tt))
    bend = 1 - 0.06 * np.exp(-tt / 0.012)
    for m in ms: out += sq(phase(mtof(m) * bend, len(tt)), 0.4)
    return lp(out, 4500) * env(d, 0.002, 0.04) * 0.07 * g

# ---- the music --------------------------------------------------------------------------------
score = {k: [] for k in ('kick', 'clap', 'click', 'switch', 'tick', 'domino', 'marble', 'boing', 'ding', 'box',
                         'lead', 'hook', 'chord', 'stab', 'bass', 'crash', 'impact', 'riser', 'roll', 'gap', 'off')}
S16 = 0.25

# chords: verse D Bm G A / pre-chorus Em F#m G A / chorus G A F#m Bm (the "royal road" progression)
VERSE = [('D', ['D4', 'F#4', 'A4']), ('B', ['D4', 'F#4', 'B4']), ('G', ['D4', 'G4', 'B4']), ('A', ['C#4', 'E4', 'A4'])]
PRE   = [('E', ['E4', 'G4', 'B4']), ('F#', ['F#4', 'A4', 'C#5']), ('G', ['G4', 'B4', 'D5']), ('A', ['A4', 'C#5', 'E5'])]
CHORUS = [('G', ['G4', 'B4', 'D5']), ('A', ['A4', 'C#5', 'E5']), ('F#', ['F#4', 'A4', 'C#5']), ('B', ['F#4', 'B4', 'D5'])]
ROOT = {'D': 'D2', 'B': 'B1', 'G': 'G1', 'A': 'A1', 'E': 'E2', 'F#': 'F#1'}

VERSE_LEAD = [
    [(0, 2, 'F#5'), (2, 2, 'A5'), (4, 2, 'D6'), (6, 2, 'A5'), (8, 2, 'F#5'), (10, 2, 'E5'), (12, 4, 'D5')],
    [(0, 2, 'D5'), (2, 2, 'F#5'), (4, 2, 'B5'), (6, 2, 'A5'), (8, 4, 'F#5'), (12, 2, 'E5'), (14, 2, 'F#5')],
    [(0, 2, 'G5'), (2, 2, 'B5'), (4, 3, 'D6'), (7, 1, 'C#6'), (8, 2, 'B5'), (10, 2, 'A5'), (12, 4, 'G5')],
    [(0, 3, 'A5'), (3, 1, 'G5'), (4, 2, 'F#5'), (6, 2, 'E5'), (8, 4, 'C#5'), (12, 4, 'E5')],
]
HOOK = [
    [(0, 2, 'B5'), (2, 2, 'A5'), (4, 2, 'B5'), (6, 4, 'D6'), (10, 2, 'B5'), (12, 4, 'A5')],
    [(0, 2, 'C#6'), (2, 2, 'B5'), (4, 2, 'A5'), (6, 4, 'E5'), (10, 2, 'F#5'), (12, 4, 'A5')],
    [(0, 2, 'A5'), (2, 2, 'C#6'), (4, 3, 'E6'), (7, 1, 'D6'), (8, 4, 'C#6'), (12, 2, 'A5'), (14, 2, 'B5')],
    [(0, 3, 'D6'), (3, 3, 'C#6'), (6, 2, 'B5'), (8, 4, 'F#5'), (12, 2, 'A5'), (14, 2, 'C#6')],
]
HOOK_END = [(0, 2, 'D6'), (2, 2, 'E6'), (4, 4, 'F#6'), (8, 2, 'E6'), (10, 2, 'D6'), (12, 4, 'D6')]

def drums_bar(B, kind):
    """kind: 'verse' / 'pre' / 'chorus' / 'half'"""
    if kind == 'half':
        for p in (0, 10): drums.add(bt(B + p * S16), kick(), 0.8); score['kick'].append(B + p * S16)
        drums.add(bt(B + 2), clap(), 0.45); score['clap'].append(B + 2)
    else:
        for b in range(4): drums.add(bt(B + b), kick(), 0.85); score['kick'].append(B + b)
        for b in (1, 3): drums.add(bt(B + b), clap(), 0.5, 0.05); score['clap'].append(B + b)
    hats = range(16) if kind == 'chorus' else range(2, 16, 4) if kind == 'half' else range(2, 16, 2)
    for h in hats:
        acc = h % 4 == 2
        drums.add(bt(B + h * S16), click(0.9 if acc else 0.5, 3600 if acc else 4200), 0.22 if acc else 0.14, 0.3 if h % 2 else -0.2)
        score['click'].append(B + h * S16)

def put_lead(B, line, fn, key, g, shift=0):
    for (p, L, nm) in line:
        m = midi(nm) + shift
        lead.add(bt(B + p * S16), fn(m, L * S16 * BEAT * 0.92), g, 0.1)
        score[key].append([B + p * S16, L * S16, m])

def put_switch(B, g=0.7):
    fxb.add(bt(B), switch(), g); score['switch'].append(B)

def domino_run(B0, notes, step=S16, g=0.5, pan0=-0.7):
    """a row of dominoes falling: one xylophone note each, panned left → right"""
    for i, m in enumerate(notes):
        b = B0 + i * step
        mech.add(bt(b), xylo(m), g, pan0 + 1.4 * i / max(1, len(notes) - 1))
        score['domino'].append([b, m])

def chord_tones(ch, shift=0, lo=69, n=16):
    """ascending arpeggio of a chord from note lo upward (n notes)"""
    pcs = [midi(x) % 12 for x in ch]
    out, m = [], lo
    while len(out) < n:
        if m % 12 in pcs: out.append(m + shift)
        m += 1
    return out

for k in range(BARS):
    B = k * 4
    # ---- INTRO "OFF" 0-4: a clock ticks, the hook on a music box, then dominoes → the switch
    if k < 4:
        for b in range(4):
            mech.add(bt(B + b), tick(1, b % 2 == 0), 0.35, 0.4 if b % 2 else -0.4); score['tick'].append(B + b)
        if k < 3:
            line = HOOK[k]
            for (p, L, nm) in line:
                keys.add(bt(B + p * S16), music_box(midi(nm)), 0.5, 0.2); score['box'].append([B + p * S16, midi(nm)])
        if k == 2: mech.add(bt(B), marble(4 * BEAT), 0.5); score['marble'].append([B, 4.0])
        if k == 3:
            domino_run(B, chord_tones(['D4', 'F#4', 'A4'], 0, 74, 16))
            score['gap'].append(B + 3.5)
    # ---- VERSE "ON!" 4-12
    elif k < 12:
        if k == 4:
            put_switch(B, 0.8); drums.add(bt(B), crash(), 0.25); score['crash'].append(B)
        nm, ch = VERSE[k % 4]
        drums_bar(B, 'verse')
        for e in range(8):                                    # bouncing octave bass on 8ths
            m = midi(ROOT[nm]) + (12 if e % 2 else 0)
            bass.add(bt(B + e * 0.5), bass_note(m, 0.5 * BEAT * 0.8), 0.42); score['bass'].append([B + e * 0.5, 0.5, m])
        for e in (1, 3, 5, 7):                                # off-beat plucks
            keys.add(bt(B + e * 0.5), pluck_chord([midi(x) for x in ch]), 0.6, -0.15)
        put_lead(B, VERSE_LEAD[k % 4], chip, 'lead', 0.85)
        if k >= 8:                                            # a xylophone answers on beat 4
            domino_run(B + 3, chord_tones(ch, 0, 81, 4), S16, 0.35, 0.3)
    # ---- PRE-CHORUS "CHAIN" 12-20: dominoes, marbles, springs; snare roll 18-20
    elif k < 20:
        nm, ch = PRE[k % 4]
        drums_bar(B, 'half')
        bass.add(bt(B), bass_note(midi(ROOT[nm]), 4 * BEAT * 0.95), 0.4); score['bass'].append([B, 4.0, midi(ROOT[nm])])
        pad.add(bt(B), supersaw([midi(x) for x in ch], 4 * BEAT, 2200), 0.6)
        if k % 2 == 0:
            domino_run(B, chord_tones(ch, 0, 67, 8), 0.5, 0.5)           # slow row of 8 (8ths)
        else:
            domino_run(B, chord_tones(ch, 0, 74, 12), S16, 0.45)         # faster row of 12 (16ths)
            mech.add(bt(B + 3), boing(), 0.5); score['boing'].append(B + 3)
        if k in (13, 17): mech.add(bt(B), marble(3 * BEAT), 0.45); score['marble'].append([B, 3.0])
        if k >= 18:
            t = 0.0
            while t < 4 - 1e-6:
                p = (B - 72 + t) / 8
                drums.add(bt(B + t), clap(0.4 + 0.6 * p), 0.25 + 0.2 * p); score['roll'].append(B + t)
                t += 0.5 if p < 0.25 else 0.25 if p < 0.6 else 0.125
        if k == 18: fxb.add(bar(18), riser(8 * BEAT), 0.4); score['riser'].append(B)
        if k == 19: score['gap'].append(B + 3.5)
    # ---- CHORUS 1 20-36 / CHORUS 2 52-68 (+2)
    elif 20 <= k < 36 or 52 <= k < 68:
        c0 = 20 if k < 36 else 52
        shift = 0 if k < 36 else 2
        j = k - c0
        nm, ch = CHORUS[j % 4]
        chm = [midi(x) + shift for x in ch]
        if j % 4 == 0:
            put_switch(B, 0.55 if j else 0.8)
        if j % 8 == 0:
            drums.add(bt(B), crash(), 0.3); score['crash'].append(B)
            if j == 0: fxb.add(bt(B), impact(), 0.6); score['impact'].append(B)
        drums_bar(B, 'chorus')
        root = midi(ROOT[nm]) + shift
        for e in range(8):
            bass.add(bt(B + e * 0.5), bass_note(root + (12 if e in (3, 7) else 0), 0.5 * BEAT * 0.85), 0.45)
            score['bass'].append([B + e * 0.5, 0.5, root])
        pad.add(bt(B), supersaw(chm + [chm[0] + 12], 4 * BEAT), 1.0); score['chord'].append([B, chm[0]])
        for e in (1, 3, 5, 7):
            keys.add(bt(B + e * 0.5), stab([m + 12 for m in chm]), 1.0, 0.2 if e % 4 == 1 else -0.2); score['stab'].append(B + e * 0.5)
        line = HOOK_END if (j % 8 == 7) else HOOK[j % 4]
        put_lead(B, line, hook_lead, 'hook', 1.7, shift)
        if k >= 52 and j % 2 == 1:                              # chorus 2: dominoes on beat 4 of every other bar
            domino_run(B + 3, chord_tones(ch, shift, 79, 4), S16, 0.4, -0.3)
    # ---- BREAK "MACHINE" 36-44: only the machine. Clock, marbles, domino melodies, a bell at the end of each chain
    elif k < 44:
        j = k - 36
        for b in range(4):
            mech.add(bt(B + b), tick(1, b % 2 == 0), 0.3, 0.4 if b % 2 else -0.4); score['tick'].append(B + b)
        nm, ch = CHORUS[j % 4]
        pad.add(bt(B), supersaw([midi(x) for x in ch], 4 * BEAT, 1400), 0.45)
        if j % 2 == 0:
            mech.add(bt(B), marble(2 * BEAT), 0.5); score['marble'].append([B, 2.0])
            domino_run(B + 2, chord_tones(ch, 0, 72, 8), S16, 0.5)
        else:
            for (p, L, nm2) in HOOK[j % 4]:
                keys.add(bt(B + p * S16), music_box(midi(nm2)), 0.5, -0.2); score['box'].append([B + p * S16, midi(nm2)])
            mech.add(bt(B + 3), ding(93 if j % 4 == 1 else 97), 0.5); score['ding'].append(B + 3)
        if j >= 4:
            for p in (0, 2): drums.add(bt(B + p), kick(), 0.6); score['kick'].append(B + p)
            bass.add(bt(B), bass_note(midi(ROOT[nm]), 4 * BEAT * 0.9), 0.35); score['bass'].append([B, 4.0, midi(ROOT[nm])])
        if k == 43: fxb.add(bt(B), riser(4 * BEAT), 0.35); score['riser'].append(B); score['gap'].append(B + 3.5)
    # ---- BUILD 44-52: switches click faster and faster
    elif k < 52:
        j = k - 44
        nm, ch = PRE[j % 4]
        if j == 0: put_switch(B, 0.7)
        drums_bar(B, 'verse' if j < 4 else 'pre')
        bass.add(bt(B), bass_note(midi(ROOT[nm]), 4 * BEAT * 0.95), 0.42); score['bass'].append([B, 4.0, midi(ROOT[nm])])
        pad.add(bt(B), supersaw([midi(x) for x in ch], 4 * BEAT, 1500 + 600 * j), 0.7)
        for e in (1, 3, 5, 7): keys.add(bt(B + e * 0.5), pluck_chord([midi(x) for x in ch]), 0.8, -0.15)
        step = 1.0 if j < 2 else 0.5 if j < 4 else 0.25 if j < 6 else 0.125
        t = 0.0
        while t < 4 - 1e-6:                                    # the "switch" machine-gun
            fxb.add(bt(B + t), click(1, 2800 + 200 * j), 0.3, 0.3 * np.sin(t * 3)); score['switch'].append(B + t) if step >= 1 else None
            t += step
        put_lead(B, VERSE_LEAD[j % 4], chip, 'lead', 0.8, 12 if j >= 4 else 0)
        if j >= 4:
            tt = 0.0
            while tt < 4 - 1e-6:
                p = (j - 4 + tt / 4) / 4
                drums.add(bt(B + tt), clap(0.4 + 0.6 * p), 0.25 + 0.25 * p); score['roll'].append(B + tt)
                tt += 0.5 if p < 0.25 else 0.25 if p < 0.6 else 0.125
        if j == 4: fxb.add(bt(B), riser(16 * BEAT), 0.45); score['riser'].append(B)
        if j == 7: score['gap'].append(B + 3.5)
    # ---- OUTRO "OFF" 68-72: the last chord, the hook on the music box, the switch turns off
    else:
        j = k - 68
        if j == 0:
            drums.add(bt(B), crash(), 0.3); fxb.add(bt(B), impact(), 0.6); score['crash'].append(B); score['impact'].append(B)
            drums.add(bt(B), kick(), 0.85); score['kick'].append(B)
            pad.add(bt(B), supersaw([midi(x) + 2 for x in ['D4', 'F#4', 'A4', 'D5']], 12 * BEAT, 3000), 0.9)
            bass.add(bt(B), bass_note(midi('D2') + 2, 8 * BEAT), 0.4); score['bass'].append([B, 8.0, midi('D2') + 2])
        if j < 3:
            for (p, L, nm) in (HOOK_END if j == 2 else HOOK[j]):
                keys.add(bt(B + p * S16), music_box(midi(nm) + 2), 0.5, 0.2); score['box'].append([B + p * S16, midi(nm) + 2])
            for b in range(4):
                mech.add(bt(B + b), tick(1, b % 2 == 0), 0.3); score['tick'].append(B + b)
        if j == 3:
            fxb.add(bt(B), switch(), 0.8); fxb.add(bt(B) + 0.05, power_down(), 0.5); score['off'].append(B)

# ---- mix ---------------------------------------------------------------------------------------------
def duck_curve(beats, depth, tau):
    d = np.ones(N, np.float32)
    for b in beats:
        i = int(bt(b) * SR); n = int(0.3 * SR)
        if i >= N: continue
        seg = 1 - depth * np.exp(-np.arange(min(n, N - i)) / SR / tau)
        d[i:i + len(seg)] = np.minimum(d[i:i + len(seg)], seg)
    return d
dk = duck_curve(score['kick'], 0.7, 0.09)                    # chorus pads pump with the kick
for bus_ in (pad, keys):
    bus_.L *= dk; bus_.R *= dk
dkb = duck_curve(score['kick'], 0.5, 0.05)
bass.L *= dkb; bass.R *= dkb

def reverb(st, mix, dur=2.2, decay=0.6):
    tt = np.arange(int(dur * SR)) / SR
    out = []
    for ch in range(2):
        ir = lp(rng.standard_normal(len(tt)) * np.exp(-tt / decay), 7000); ir[:int(0.015 * SR)] *= 0.2
        ir /= np.sqrt(np.sum(ir ** 2))
        out.append(signal.fftconvolve(st[ch], ir)[:N])
    return np.vstack(out) * mix

drums.L *= 0.62; drums.R *= 0.62
dry = drums.stereo() + bass.stereo() + keys.stereo() + lead.stereo() + mech.stereo() + pad.stereo() + fxb.stereo()
wet = reverb(keys.stereo() * 0.8 + lead.stereo() * 0.6 + mech.stereo() * 0.9 + pad.stereo() * 0.5 + drums.stereo() * 0.08 + fxb.stereo() * 0.4, 0.28)
mix = dry + wet
# the choruses are the loudest part: everything else sits a little lower going into the master
sec = np.full(N, 0.8)
for a_, b_, v_ in ((0, 4, 0.7), (20, 36, 1.0), (36, 44, 0.75), (52, 68, 1.0), (68, 72, 0.85)):
    sec[int(bar(a_) * SR):int(bar(b_) * SR)] = v_
sec = lp(sec, 8)
mix = mix * sec
mix -= np.mean(mix, axis=1, keepdims=True)
lowm = lp((mix[0] + mix[1]) / 2, 120, 4)
mix = np.vstack([hp(mix[0], 120, 4) + lowm, hp(mix[1], 120, 4) + lowm])

# a moment of silence just before each drop (the last half beat), so the switch hits harder
gate = np.ones(N)
for b in score['gap']:
    i0, i1 = int(bt(b) * SR), int(bt(b + 0.5) * SR) - int(0.004 * SR)
    gate[i0:i1] = 0; gate[i0 - 220:i0] = np.linspace(1, 0, 220)
mix = mix * gate

# clean pop master: gentle soft clip with a look-ahead limiter
mix /= np.max(np.abs(mix))
pk = np.max(np.abs(mix), axis=0)
win = int(0.005 * SR)
pk = np.maximum.reduce([np.roll(pk, -i) for i in range(0, win, 8)])
DRIVE, THR = 2.2, 0.92
g = np.minimum(1, THR / np.maximum(pk * DRIVE, 1e-6))
rel = np.exp(-1 / (0.12 * SR))
g = signal.lfilter([1 - rel], [1, -rel], g[::-1])[::-1]
g = np.minimum(g, np.minimum(1, THR / np.maximum(pk * DRIVE, 1e-6)) * 1.2)
mix = np.tanh(mix * DRIVE * g / THR * 0.95) * THR
endi = int((bar(71) + 2.4) * SR)
mix = mix[:, :endi]
fade = int(0.3 * SR); mix[:, -fade:] *= np.linspace(1, 0, fade)
mix *= 0.95 / np.max(np.abs(mix))

from scipy.io import wavfile
wavfile.write('chain.wav', SR, (mix.T * 32767).astype(np.int16))
for key in ('kick', 'clap', 'click', 'switch', 'tick', 'boing', 'ding', 'stab', 'crash', 'impact', 'riser', 'roll', 'gap', 'off'):
    score[key] = sorted(set(round(x, 4) for x in score[key]))
for key in ('domino', 'marble', 'box', 'lead', 'hook', 'chord', 'bass'): score[key].sort(key=lambda e: e[0])
score['end'] = round(mix.shape[1] / SR, 2)
json.dump(score, open('score.json', 'w'), default=lambda o: o.item() if hasattr(o, 'item') else o)
print('done', mix.shape[1] / SR)
