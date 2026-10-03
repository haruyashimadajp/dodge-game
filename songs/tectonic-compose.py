"""TECTONIC — original song for the dodge game (theme: heavy bass / earthquake).
140 BPM heavy dubstep in F minor; the second drop switches to a double-time drum & bass section.
Beat 0 at t = 0.5 s; 1 beat = 60/140 s (about 0.43 s); 1 bar = about 1.71 s.
Sounds: a sub-bass rumble, huge kicks with a sub tail, a big roomy snare, FM "growl" basses that talk
(the filter and formants move: "yoi", "wow", wobbles, stutters, dives), a detuned reese bass, dark supersaw pads,
an FM bell hook, a plucked arpeggio, a siren, risers, sub drops and earthquake impacts.
Writes tectonic.wav and score.json (beat times for the chart).

Run:  python3 tectonic-compose.py      (needs numpy + scipy)
Then: ffmpeg -i tectonic.wav -b:a 192k Tectonic.mp3, and copy score.json into songs/tectonic-score.js.
Form (bars): rumble 0-8 / build 8-16 / DROP 16-32 / aftershock (break) 32-40 / build 40-48 /
DROP 2 48-56 / double-time 56-64 / collapse (outro) 64-68.
"""
import json
import numpy as np
from scipy import signal

SR = 44100
BPM = 140
BEAT = 60 / BPM
T0 = 0.5
BARS = 68
N = int((T0 + BARS * 4 * BEAT + 6.0) * SR)
rng = np.random.default_rng(1406)

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

drums, snareb, sub, bass, pads, lead, fxb = (Bus() for _ in range(7))

# ---- tools -------------------------------------------------------------------------------
def tvec(d): return np.arange(int(d * SR)) / SR
def noise(d): return rng.standard_normal(int(d * SR))
def lp(x, fc, o=2): return signal.sosfilt(signal.butter(o, min(fc, SR * 0.45), 'low', fs=SR, output='sos'), x)
def hp(x, fc, o=2): return signal.sosfilt(signal.butter(o, fc, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=2): return signal.sosfilt(signal.butter(o, [lo, min(hi, SR * 0.45)], 'band', fs=SR, output='sos'), x)
def env(dur, a=0.004, r=0.04):
    tt = tvec(dur)
    return np.minimum(1, tt / max(a, 1e-4)) * np.clip((dur - tt) / max(r, 1e-4), 0, 1)
def phase(f, n): return np.cumsum(np.broadcast_to(np.asarray(f, float), (n,))) / SR
def saw_ph(f, n): return 2 * ((phase(f, n) + rng.random()) % 1.0) - 1

def tv_filter(x, fc, q, kind='low', blk=64):
    """resonant RBJ biquad whose cutoff follows the array fc (Hz, one value per sample)"""
    out = np.empty_like(x); zi = np.zeros((1, 2))
    for i in range(0, len(x), blk):
        f = float(np.clip(fc[min(i, len(fc) - 1)], 30, SR * 0.42))
        w0 = 2 * np.pi * f / SR; al = np.sin(w0) / (2 * q); c = np.cos(w0)
        if kind == 'low': b = [(1 - c) / 2, 1 - c, (1 - c) / 2]
        else: b = [al, 0, -al]                                      # band-pass (0 dB peak)
        a0 = 1 + al
        sos = np.array([[b[0] / a0, b[1] / a0, b[2] / a0, 1, -2 * c / a0, (1 - al) / a0]])
        out[i:i + blk], zi = signal.sosfilt(sos, x[i:i + blk], zi=zi)
    return out

def sweep_lp(x, f0, f1):
    fc = f0 * (f1 / f0) ** (np.arange(len(x)) / max(1, len(x) - 1))
    return tv_filter(x, fc, 0.8)

# ---- bass sounds -----------------------------------------------------------------------------
def lfo_for(shape, tt, dur, rate):
    u = tt / max(dur, 1e-3)
    if shape == 'wob':   return 0.5 - 0.5 * np.cos(2 * np.pi * tt / (rate * BEAT))
    if shape == 'yoi':   return np.sin(np.pi * np.clip(u * 1.15, 0, 1)) ** 0.7
    if shape == 'wow':   return np.clip(u * 3, 0, 1) * (1 - 0.6 * u)
    if shape == 'up':    return u ** 0.8
    if shape == 'down':  return (1 - u) ** 1.3
    if shape == 'stab':  return np.exp(-tt / 0.05) * 0.9 + 0.1
    if shape == 'stut':  return ((tt / (rate * BEAT)) % 1.0 < 0.5) * 0.9 + 0.05
    if shape == 'dive':  return 0.9 - 0.7 * u
    if shape == 'screech': return 0.75 + 0.25 * np.sin(2 * np.pi * 7 * tt)
    return np.full_like(tt, 0.5)

def growl(m, dur, shape='wob', rate=0.5, drive=3.0):
    """FM growl bass: the FM index, the filter and two formants all follow one LFO, so it 'talks'"""
    tt = tvec(dur); n = len(tt)
    lfo = lfo_for(shape, tt, dur, rate)
    bend = np.zeros(n)
    if shape == 'dive': bend = -24 * (tt / dur) ** 2
    if shape == 'yoi':  bend = -5 * np.exp(-tt / 0.04)
    if shape == 'screech': bend = 3 * np.exp(-tt / 0.08)
    f = float(mtof(m)) * 2 ** (bend / 12)
    ph = 2 * np.pi * phase(f, n)
    ratio = 2.0 if shape != 'screech' else 3.01
    car = np.sin(ph + (0.6 + 7.5 * lfo) * np.sin(ratio * ph + 1.3 * lfo))
    sw = saw_ph(f * 1.003, n) + saw_ph(f * 0.997, n)
    x = np.tanh(drive * (0.7 * car + 0.35 * sw))
    v = lfo
    f1 = 280 + 700 * v; f2 = 800 + 1700 * v; fl = 160 + 4200 * v ** 1.5
    if shape == 'screech': f1 = f1 * 2.2; f2 = f2 * 1.8; fl = fl + 3000
    y = 1.1 * tv_filter(x, f1, 6, 'band') + 0.8 * tv_filter(x, f2, 7, 'band') + 0.6 * tv_filter(x, fl, 3.5)
    y = np.tanh(2.2 * y)
    y = y + 0.35 * np.roll(y, int(SR / max(60, float(mtof(m)) * 3)))   # a little metal (comb)
    y = hp(y, 95, 3)
    return np.tanh(1.4 * y) * env(dur, 0.003, 0.02)

def sub_tone(m, dur, a=0.004, r=0.03):
    tt = tvec(dur); f = float(mtof(m))
    while f > 70: f /= 2
    return np.tanh(2.0 * np.sin(2 * np.pi * f * tt)) * 0.8 * env(dur, a, r)     # driven a little: the harmonics carry it on small speakers

def reese(m, dur, cut0=300, cut1=2500, lfo_rate=0):
    """detuned saw bass, darker and wider than the growl; the filter opens over the note"""
    tt = tvec(dur); n = len(tt); f = float(mtof(m))
    s = saw_ph(f * 2 ** (0.14 / 12), n) + saw_ph(f * 2 ** (-0.14 / 12), n) + 0.6 * saw_ph(f * 2, n)
    u = tt / max(dur, 1e-3)
    fc = cut0 * (cut1 / cut0) ** np.clip(u * 1.5, 0, 1)
    if lfo_rate: fc = fc * (0.55 + 0.45 * np.cos(2 * np.pi * tt / (lfo_rate * BEAT)))
    y = np.tanh(2.0 * tv_filter(s / 2.6, fc, 2.5))
    return hp(y, 90, 2) * env(dur, 0.004, 0.03)

# ---- drums -------------------------------------------------------------------------------------
def kick(g=1.0, tail=0.5):
    tt = tvec(tail); f = 46 + 210 * np.exp(-tt / 0.028) + 30 * np.exp(-tt / 0.004)
    body = np.sin(2 * np.pi * phase(f, len(tt))) * np.exp(-tt / (tail * 0.45))
    click = hp(noise(tail), 3000) * np.exp(-tt / 0.003) * 0.6
    return np.tanh(2.2 * body + click) * g
def snare(g=1.0):
    d = 0.45; tt = tvec(d)
    tone = np.sin(2 * np.pi * phase(185 + 60 * np.exp(-tt / 0.01), len(tt))) * np.exp(-tt / 0.07)
    nz = bp(noise(d), 900, 9000) * np.exp(-tt / 0.16)
    clap = np.zeros(len(tt))
    for dd in (0, 0.008, 0.017):
        mk = tt >= dd; clap[mk] += np.exp(-(tt[mk] - dd) / 0.012)
    clap = bp(noise(d), 1200, 5000) * clap * 0.6
    return np.tanh(1.8 * (0.9 * tone + 0.9 * nz + clap)) * g
def hat(o=False):
    d = 0.22 if o else 0.05
    return hp(noise(d), 8500) * np.exp(-tvec(d) / (0.07 if o else 0.012))
def ride():
    d = 0.5; tt = tvec(d)
    s = sum(np.sin(2 * np.pi * f * tt) for f in (3150, 4430, 5870, 7210)) / 4
    return (0.5 * s + hp(noise(d), 7000)) * np.exp(-tt / 0.18)
def crash(d=2.2): return hp(noise(d), 3500) * np.exp(-tvec(d) / 0.6)

def impact(d=3.0):
    """earthquake hit: a falling sub boom, a distorted thud and a long dirty noise tail"""
    tt = tvec(d)
    boom = np.sin(2 * np.pi * phase(28 + 70 * np.exp(-tt / 0.18), len(tt))) * np.exp(-tt / 1.0)
    thud = lp(noise(d), 400) * np.exp(-tt / 0.12) * 3
    tail = bp(noise(d), 200, 3000) * np.exp(-tt / 0.6) * 0.5
    return np.tanh(1.6 * (boom * 1.4 + thud + tail))
def subdrop(d=2.0):
    tt = tvec(d)
    return np.tanh(1.5 * np.sin(2 * np.pi * phase(90 * (30 / 90) ** (tt / d), len(tt)))) * np.minimum(1, tt / 0.01) * np.clip((d - tt) / 0.3, 0, 1)
def riser(d):
    tt = tvec(d); u = tt / d
    nz = sweep_lp(noise(d), 300, 14000) * u ** 2
    tone = saw_ph(110 * 8 ** u, len(tt)) * u ** 2 * 0.25
    return nz + lp(tone, 6000)
def downlifter(d=2.0):
    tt = tvec(d); u = tt / d
    return sweep_lp(noise(d), 9000, 200) * (1 - u) ** 2
def siren(d):
    tt = tvec(d)
    f = 600 * 2 ** (np.sin(2 * np.pi * tt / (2 * BEAT)) * 0.5 + tt / d)
    s = np.sign(np.sin(2 * np.pi * phase(f, len(tt))))
    return lp(s, 3000) * np.minimum(1, tt / 0.3) * np.clip((d - tt) / 0.05, 0, 1)

# ---- tonal sounds ---------------------------------------------------------------------------------
def supersaw(ms, dur, cut=1600, voices=6, spread=0.22, a=0.3, r=0.6):
    n = int(dur * SR); s = np.zeros(n)
    for m in ms:
        for v in range(voices):
            d = (v - (voices - 1) / 2) / ((voices - 1) / 2) * spread
            s += saw_ph(float(mtof(m)) * 2 ** (d / 12), n)
    return 4.0 * lp(s / (voices * len(ms)), cut) * env(dur, a, r)
def bell(m, dur=1.6):
    tt = tvec(dur); f = float(mtof(m))
    s = np.sin(2 * np.pi * f * tt + 2.2 * np.exp(-tt / 0.25) * np.sin(2 * np.pi * f * 3.5 * tt)) * np.exp(-tt / 0.7)
    s += 0.3 * np.sin(2 * np.pi * f * 2 * tt) * np.exp(-tt / 0.3)
    return s * env(dur, 0.002, 0.2)
def pluck(m, dur=0.3, cut=3000):
    tt = tvec(dur); n = len(tt); f = float(mtof(m))
    s = saw_ph(f, n) + saw_ph(f * 1.005, n)
    return tv_filter(s * 0.5, 200 + cut * np.exp(-tt / 0.06), 2.0) * env(dur, 0.002, 0.05)

# ---- the score ---------------------------------------------------------------------------------------
score = {'kick': [], 'snare': [], 'growl': [], 'reese': [], 'impact': [], 'subdrop': [], 'hook': [], 'arp': [], 'roll': [], 'siren': [], 'crash': []}
def K(b, g=1.0, tail=0.5): drums.add(bt(b), kick(g, tail), 0.62); score['kick'].append(b)
def S(b, g=1.0, mark=True):
    snareb.add(bt(b), snare(), 0.36 * g, 0.03)
    if mark: score['snare'].append(b)
def HH(b, g=1.0, o=False): drums.add(bt(b), hat(o), (0.09 if o else 0.11) * g, 0.35 if (b * 2) % 2 else -0.35)
def RD(b, g=1.0): drums.add(bt(b), ride(), 0.06 * g, 0.4)
def CR(b, g=1.0): drums.add(bt(b), crash(), 0.2 * g, -0.25); score['crash'].append(b)
def IMP(b, g=1.0): fxb.add(bt(b), impact(), 0.62 * g); score['impact'].append(b)
def SD(b, d=2.0): sub.add(bt(b), subdrop(d), 0.55); score['subdrop'].append(b)

F2 = midi('F2')
def G(b, L, off, shape='wob', rate=0.5, g=1.0, subon=True):
    m = F2 + off
    bass.add(bt(b), growl(m, L * BEAT, shape, rate), 0.42 * g)
    if subon and shape not in ('screech',):
        sub.add(bt(b), sub_tone(m, L * BEAT if shape != 'dive' else min(L, 0.5) * BEAT), 0.42 * g)
    score['growl'].append([b, L, off, shape, round(rate, 4)])

# Fm – Db – Bbm – C  (i – VI – iv – V)
CH = {'Fm': [29, 53, 56, 60, 65], 'Db': [25, 53, 56, 61, 65], 'Bbm': [34, 53, 58, 61, 65], 'C': [24, 52, 55, 60, 64]}
PROG = ['Fm', 'Db', 'Bbm', 'C']
def chord_at(k): return CH[PROG[k % 4]]

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

HOOK = ['F5 - - Ab5 - - C6 -', 'Db6 - - C6 - Ab5 Bb5 -', 'Bb5 - - Ab5 - - F5 -', 'G5 - - - E5 - - -']

# drop phrases: (beat in bar, length in beats, semitones above F2, shape, rate)
PA = [(0, 0.75, 0, 'yoi'), (0.75, 0.25, 0, 'stab'), (1, 1, 0, 'wob', 0.25), (2, 0.5, 3, 'down'), (2.5, 0.5, 0, 'stab'), (3, 1, -2, 'wob', 1 / 3)]
PB = [(0, 1.5, 0, 'wow'), (1.5, 0.25, 12, 'stab'), (1.75, 0.25, 12, 'stab'), (2, 0.5, 7, 'yoi'), (2.5, 0.5, 5, 'down'), (3, 1, 0, 'wob', 1 / 3)]
PC = [(0, 0.5, 0, 'yoi'), (0.5, 0.5, 0, 'yoi'), (1, 1, -4, 'up'), (2, 1, 3, 'wob', 0.5), (3, 0.5, 1, 'down'), (3.5, 0.5, 0, 'stut', 1 / 8)]
PD = [(0, 1, 0, 'wob', 0.25), (1, 0.5, 8, 'yoi'), (1.5, 0.5, 7, 'yoi'), (2, 2, 0, 'dive')]
# second drop: meaner (more stutters, a screech in every 2 bars)
QA = [(0, 0.5, 0, 'yoi'), (0.5, 0.25, 0, 'stab'), (0.75, 0.25, 0, 'stab'), (1, 1, 0, 'stut', 1 / 8), (2, 0.5, 3, 'yoi'), (2.5, 0.5, 1, 'down'), (3, 1, 0, 'wob', 1 / 6)]
QB = [(0, 1, 0, 'wow'), (1, 0.5, 24, 'screech'), (1.5, 0.5, 22, 'screech'), (2, 1, -2, 'wob', 0.25), (3, 0.5, 0, 'yoi'), (3.5, 0.5, 12, 'stab')]
QC = [(0, 0.75, 0, 'yoi'), (0.75, 0.75, 0, 'yoi'), (1.5, 0.5, 3, 'stab'), (2, 1, 0, 'wob', 1 / 3), (3, 1, -4, 'up')]
QD = [(0, 0.5, 0, 'stab'), (0.5, 0.5, 0, 'stab'), (1, 0.5, 8, 'screech'), (1.5, 0.5, 7, 'screech'), (2, 2, 0, 'dive')]

def drop_drums(k, fill):
    B = k * 4
    K(B, 1.0, 0.7)
    S(B + 2)
    if k % 2 == 1: K(B + 2.75, 0.8)
    if k % 4 == 1: K(B + 3.5, 0.8)
    for h in range(8): HH(B + h * 0.5 + 0.25 * 0, 0.7 + 0.3 * (h % 2))
    if fill:
        for i, h in enumerate((3, 3.25, 3.5, 3.75)): S(B + h, 0.5 + 0.15 * i)

def dnb_drums(k):
    B = k * 4
    K(B, 1.0, 0.4); K(B + 2.5, 0.9, 0.4)
    S(B + 1); S(B + 3)
    for h in range(8): HH(B + h * 0.5 + 0.25, 0.8)
    for h in range(4): RD(B + h)
    if k % 2 == 1: K(B + 1.75, 0.6, 0.3)
    if k % 4 == 3:
        for h in (3.5, 3.75): S(B + h, 0.6)

for k in range(BARS):
    B = k * 4; ch = chord_at(k)
    # ---- rumble (intro) 0-8 / aftershock 32-40: pads, bell hook, sub swells
    if k < 8 or 32 <= k < 40:
        pads.add(bar(k), supersaw(ch[1:], 4 * BEAT + 0.6, 900 if k < 4 else 1500, 6, 0.22, 0.5, 0.8), 0.12)
        sub.add(bar(k), sub_tone(ch[0] + 12, 4 * BEAT, 0.6, 0.6), 0.2)
    if k in (0, 4, 32, 36): IMP(B, 0.8 if k in (0, 32) else 0.6)
    if 34 <= k < 40:
        K(B, 0.7, 0.6); K(B + 0.75, 0.45, 0.4)                       # heartbeat
    # ---- builds 8-16 and 40-48
    if 8 <= k < 16 or 40 <= k < 48:
        late = k in (14, 15, 46, 47)
        pads.add(bar(k), supersaw(ch[1:], 4 * BEAT + 0.2, 1200 + 250 * (k % 8), 6, 0.22, 0.05, 0.3), 0.1)
        if not late:
            K(B); S(B + 2)
            if k % 2: K(B + 2.75, 0.7)
            for h in range(8): HH(B + h * 0.5, 0.6 + 0.3 * (h % 2), o=h % 2 == 1)
            reese_m = ch[0] + 12
            bass.add(bar(k), reese(reese_m, 4 * BEAT, 250, 900 + 120 * (k % 8), lfo_rate=2), 0.2)
            sub.add(bar(k), sub_tone(reese_m, 4 * BEAT), 0.22)
            score['reese'].append([B, 4, reese_m])
        for h in range(16):                                               # 16th arp
            m = ch[1 + (0, 1, 2, 3, 2, 1, 3, 1)[h % 8]] + 12
            lead.add(bt(B + h * 0.25), pluck(m, 0.25, 1500 + 400 * (k % 8)), 0.08, -0.3 + 0.6 * ((h % 4) / 3))
            score['arp'].append([B + h * 0.25, m])
        if late:                                                          # snare roll that speeds up
            per = {14: 0.5, 15: 0.25, 46: 0.5, 47: 0.25}[k]
            if k in (15, 47):
                for i in range(int(2 / per)): S(B + i * per, 0.5 + 0.25 * i * per / 2, False); score['roll'].append(B + i * per)
                for i in range(16): S(B + 2 + i * 0.125, 0.75 + 0.25 * i / 16, False); score['roll'].append(B + 2 + i * 0.125)
            else:
                for i in range(int(4 / per)): S(B + i * per, 0.4 + 0.3 * i * per / 4, False); score['roll'].append(B + i * per)
            K(B, 0.8)
    if k in (14, 46): fxb.add(bar(k), riser(8 * BEAT), 0.22)
    if k in (15, 47): fxb.add(bt(B + 1), siren(2.5 * BEAT), 0.06, 0.2); score['siren'].append(B + 1)
    # ---- drops 16-32 and 48-56 (half-time)
    if 16 <= k < 32 or 48 <= k < 56:
        j = (k - 16) if k < 32 else (k - 48)
        pats = [PA, PB, PC, PD] if k < 32 else [QA, QB, QC, QD]
        pat = pats[j % 4]
        if k < 32 and j >= 8 and j % 4 == 2: pat = PA                      # second half a little different
        last = (k == 31)
        drop_drums(k, fill=(j % 4 == 3))
        for p in pat:
            if last and p[0] >= 2: continue
            G(B + p[0], p[1], p[2], p[3], p[4] if len(p) > 4 else 0.5, 1.0)
        if j % 8 == 0: CR(B)
        if j % 4 == 0 and k >= 48:
            for i, m in enumerate((77, 80, 84)): lead.add(bt(B + i * 0.5), bell(m, 1.2), 0.07, 0.3 - 0.3 * i)
    if k in (16, 48): IMP(B, 1.0); SD(B - 1, 1 * BEAT)
    if k == 31: fxb.add(bt(B + 2), downlifter(2 * BEAT), 0.18); score['subdrop'].append(B + 2); sub.add(bt(B + 2), subdrop(2 * BEAT), 0.5)
    # ---- double time 56-64
    if 56 <= k < 64:
        dnb_drums(k)
        line = [0, 0, 3, 0, -2, 0, 7, 5, 0, 0, 3, 0, 8, 7, 3, 1] if k % 2 == 0 else [0, 0, 3, 0, -2, 0, 12, 10, 0, 0, -4, 0, -2, -2, 1, 3]
        for h in range(16):
            m = F2 + line[h]
            if h % 4 == 3 and k % 4 == 3: continue
            bass.add(bt(B + h * 0.25), reese(m, 0.25 * BEAT + 0.01, 900, 5000), 0.3)
            sub.add(bt(B + h * 0.25), sub_tone(m, 0.25 * BEAT), 0.36)
            score['reese'].append([B + h * 0.25, 0.25, m])
        for h in (0.5, 1.5, 2.75, 3.5):                                   # growl stabs on the off-beats
            off = (12, 7, 3, 15)[int(h) % 4]
            bass.add(bt(B + h), growl(F2 + off, 0.25 * BEAT, 'stab'), 0.34)
            score['growl'].append([B + h, 0.25, off, 'stab', 0])
        pads.add(bar(k), supersaw(ch[1:], 4 * BEAT + 0.1, 2400, 6, 0.25, 0.02, 0.1), 0.07)
        if k == 56: IMP(B, 0.9); CR(B)
        if k == 60: CR(B)
    # ---- collapse 64-68
    if k == 64:
        IMP(B, 1.0); CR(B, 1.2); K(B, 1.2, 1.2); SD(B + 4, 3.0)
        G(B, 2, 0, 'wow', 0.5, 1.1); G(B + 2, 2, 0, 'dive', 0.5, 1.0)
    if 64 <= k < 68:
        pads.add(bar(k), supersaw(CH['Fm'][1:], 4 * BEAT + 0.6, 1100 - 150 * (k - 64), 6, 0.22, 0.3, 1.0), 0.1 * (1 - (k - 64) / 5))

hook_notes = parse(HOOK, 4) + parse(HOOK, 36) + parse(HOOK, 24, 12) + parse(HOOK, 64)
for (b, L, m) in hook_notes:
    gain = 0.13 if b < 24 * 4 or b >= 64 * 4 else (0.05 if b < 32 * 4 else 0.13)
    lead.add(bt(b), bell(m, max(1.2, L * BEAT + 0.6)), gain, 0.15)
    score['hook'].append([b, L, m])

# ---- mix ---------------------------------------------------------------------------------------------
def duck_curve(beats, depth, tau):
    d = np.ones(N, np.float32)
    for b in beats:
        i = int(bt(b) * SR); n = int(0.3 * SR)
        if i >= N: continue
        seg = 1 - depth * np.exp(-np.arange(min(n, N - i)) / SR / tau)
        d[i:i + len(seg)] = np.minimum(d[i:i + len(seg)], seg)
    return d
dk = duck_curve(score['kick'], 0.8, 0.09)
for bus_ in (sub, pads):
    bus_.L *= dk; bus_.R *= dk
dk2 = duck_curve(score['kick'] + score['snare'], 0.45, 0.06)
bass.L *= dk2; bass.R *= dk2
# the growls get a little width: a short delay on one side, highs only
w = hp(bass.R, 400); bass.R = (bass.R * 0.75 + 0.25 * np.concatenate([np.zeros(int(0.012 * SR)), w[:-int(0.012 * SR)]])).astype(np.float32)
pads.R = np.concatenate([np.zeros(int(0.015 * SR), np.float32), pads.R[:-int(0.015 * SR)]])

def reverb(st, mix, dur=2.8, decay=0.8):
    tt = np.arange(int(dur * SR)) / SR
    out = []
    for ch in range(2):
        ir = lp(rng.standard_normal(len(tt)) * np.exp(-tt / decay), 6000); ir /= np.sqrt(np.sum(ir ** 2))
        out.append(signal.fftconvolve(st[ch], ir)[:N])
    return np.vstack(out) * mix

dry = drums.stereo() + snareb.stereo() + sub.stereo() * 1.15 + bass.stereo() + pads.stereo() + lead.stereo() + fxb.stereo()
wet = reverb(snareb.stereo() * 0.8 + lead.stereo() + pads.stereo() * 0.6 + fxb.stereo() * 0.5, 0.3)
mix = dry + wet
mix -= np.mean(mix, axis=1, keepdims=True)
# bass stays mono below 120 Hz
lowm = lp((mix[0] + mix[1]) / 2, 120, 4)
mix = np.vstack([hp(mix[0], 120, 4) + lowm, hp(mix[1], 120, 4) + lowm])
# limiter: look 5 ms ahead, pull the gain down fast and let it back up slowly, then a soft clip
mix /= np.max(np.abs(mix))
pk = np.max(np.abs(mix), axis=0)
win = int(0.005 * SR)
pk = np.maximum.reduce([np.roll(pk, -i) for i in range(0, win, 8)])
DRIVE, THR = 3.2, 0.9
g = np.minimum(1, THR / np.maximum(pk * DRIVE, 1e-6))
rel = np.exp(-1 / (0.12 * SR))
g = signal.lfilter([1 - rel], [1, -rel], g[::-1])[::-1]            # smooth (the gain is already early, so smooth backwards)
g = np.minimum(g, np.minimum(1, THR / np.maximum(pk * DRIVE, 1e-6)) * 1.15)
mix = np.tanh(mix * DRIVE * g / THR * 0.9) * THR
endi = int((bar(68) + 0.5) * SR)
mix = mix[:, :endi]
mix[:, -int(3.0 * SR):] *= np.linspace(1, 0, int(3.0 * SR)) ** 1.5
mix *= 0.95 / np.max(np.abs(mix))

from scipy.io import wavfile
wavfile.write('tectonic.wav', SR, (mix.T * 32767).astype(np.int16))
score['end'] = round(mix.shape[1] / SR, 2)
json.dump(score, open('score.json', 'w'), default=lambda o: o.item() if hasattr(o, 'item') else o)
print('done', mix.shape[1] / SR)
