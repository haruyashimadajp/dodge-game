"""NEON BAILE — original song for the dodge game (theme: Brazilian funk / phonk, a neon street party at night).
130 BPM "montagem" funk in G minor (G Phrygian colour: the flat 2nd Ab shows up in the riffs).
Beat 0 at t = 0.5 s; 1 beat = 60/130 s (about 0.46 s); 1 bar = about 1.85 s.

The sounds are made for this song only:
  tamborzão     — the funk carioca drum pattern (kick on 16ths 0, 3, 6, 10, 12), a dry triple clap,
                  a "tuin" (a pitched zap that drops fast) and a shaker / tambourine that never stops
  808           — a long sine boom driven into hard distortion; it slides between notes (the phonk bass)
  cowbell       — the phonk cowbell: two detuned square waves (ratio 1.48) through a band-pass, pitched to play the riff
  vocal chops   — a synthetic "singer": a buzzing voice source through vowel formants (a / e / o / u / i),
                  chopped short and repeated like a sampled hook ("montagem")
  pad           — a dark detuned saw pad, low-passed (intro and the slowed break)
  riser / tape stop / crash
The SLOWED break (bars 32-40) is played at half time, then the whole mix slows down like a tape stopping.
Writes baile.wav and score.json (beat numbers for the chart).

Run:  python3 baile-compose.py      (needs numpy + scipy)
Then: ffmpeg -i baile.wav -b:a 192k NeonBaile.mp3, and copy score.json into songs/baile-score.js.
Form (bars): intro 0-8 / build 8-16 / DROP "MONTAGEM" 16-32 / SLOWED 32-40 / build 40-48 /
DROP 2 "MANDELÃO" 48-64 / outro 64-68.
"""
import json
import numpy as np
from scipy import signal

SR = 44100
BPM = 130
BEAT = 60 / BPM
T0 = 0.5
BARS = 68
N = int((T0 + BARS * 4 * BEAT + 6.0) * SR)
rng = np.random.default_rng(1300)

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

drums, bass, bell, vox, pad, fxb = (Bus() for _ in range(6))

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
def sq(ph): return np.sign(np.sin(2 * np.pi * ph))
def saw(ph): return 2 * (ph % 1.0) - 1

# ---- the sounds of this song --------------------------------------------------------------
def kick(g=1.0):
    """short punchy funk kick (the 808 carries the low end)"""
    d = 0.32; tt = tvec(d)
    body = np.sin(2 * np.pi * phase(55 + 160 * np.exp(-tt / 0.03), len(tt))) * np.exp(-tt / 0.12)
    click = bp(noise(d), 1500, 6000) * np.exp(-tt / 0.004) * 0.6
    return np.tanh(2.2 * body + click) * g

def clap(g=1.0):
    """the dry funk clap: three fast bursts of band-passed noise, then a short tail"""
    d = 0.35; tt = tvec(d); n = len(tt)
    e = np.zeros(n)
    for k, off in enumerate((0, 0.011, 0.022)):
        i = int(off * SR); e[i:] += np.exp(-(tt[i:] - off) / (0.006 if k < 2 else 0.09))
    return np.tanh(2.0 * bp(noise(d), 900, 5200) * e) * g

def tuin(g=1.0, f0=1900):
    """the 'tuin': a pitched zap that falls fast (the laser sound of funk carioca)"""
    d = 0.22; tt = tvec(d)
    f = f0 * np.exp(-tt / 0.05) + 180
    return np.sin(2 * np.pi * phase(f, len(tt))) * np.exp(-tt / 0.07) * g

def hat(g=1.0, open_=False):
    d = 0.32 if open_ else 0.05; tt = tvec(d)
    s = hp(noise(d), 7000, 3) * np.exp(-tt / (0.11 if open_ else 0.012))
    return s * g

def shaker(g=1.0):
    d = 0.07; n = int(d * SR)
    return bp(noise(d), 4000, 12000) * np.sin(np.pi * np.arange(n) / n) ** 1.5 * g

def b808(m, dur, glide_from=None, drive=4.0):
    """the phonk 808: a sine boom with a little pitch drop, sliding from the last note, then driven hard"""
    n = int(dur * SR); tt = np.arange(n) / SR
    f = float(mtof(m))
    if glide_from is not None:
        f0 = float(mtof(glide_from))
        fr = f0 * (f / f0) ** np.clip(tt / 0.09, 0, 1)
    else:
        fr = f * (1 + 0.6 * np.exp(-tt / 0.02))
    x = np.sin(2 * np.pi * phase(fr, n)) * (0.35 + 0.65 * np.exp(-tt / max(dur * 1.2, 0.2)))
    y = np.tanh(drive * x) / np.tanh(drive)
    y = 0.75 * y + 0.35 * lp(np.tanh(drive * 2.2 * x), 1800)      # the "dirt" on top of the boom
    return y * env(dur, 0.003, 0.04)

def cowbell(m, dur=0.22, g=1.0):
    """the phonk cowbell: two square waves (f and f * 1.48) through a band-pass; a bright hit, then a short ring"""
    tt = tvec(dur); n = len(tt); f = float(mtof(m))
    s = 0.6 * sq(phase(f, n)) + 0.45 * sq(phase(f * 1.48, n))
    s = bp(s, f * 0.9, min(f * 5, 12000), 2)
    e = 0.65 * np.exp(-tt / 0.03) + 0.35 * np.exp(-tt / (dur * 0.6))
    return np.tanh(1.6 * s * e) * env(dur, 0.001, 0.03) * g

FORMANTS = {                                     # (freq, bandwidth, gain) for a high, bright voice
    'a': [(850, 110, 1.0), (1250, 120, 0.6), (2950, 200, 0.25)],
    'e': [(500, 80, 1.0), (1950, 120, 0.5), (2800, 200, 0.25)],
    'i': [(330, 60, 1.0), (2400, 150, 0.45), (3200, 200, 0.25)],
    'o': [(500, 90, 1.0), (850, 100, 0.55), (2850, 200, 0.15)],
    'u': [(350, 70, 1.0), (700, 90, 0.35), (2700, 200, 0.1)],
}
def glottal(f, n, bright=0.75):
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.4 * np.arange(n) / SR)
    ph = 2 * np.pi * phase(f * vib, n)
    s = np.zeros(n)
    for h in range(1, int(min(40, 7000 / np.max(f)))):
        s += np.sin(h * ph) / h ** bright
    return s

def voice(m, dur, vowel='a', slide=0.0, breath=0.12):
    """a vocal chop: a voice source through three formant resonances (+ a little breath)"""
    n = int(dur * SR); tt = np.arange(n) / SR
    f = float(mtof(m)) * 2 ** (slide * np.clip(tt / dur, 0, 1) / 12)
    src = glottal(f, n) + breath * noise(dur)[:n]
    out = np.zeros(n)
    for fc, bw, g in FORMANTS[vowel]:
        b, a = signal.iirpeak(fc, fc / bw, fs=SR)
        out += g * signal.lfilter(b, a, src)
    out = hp(out, 180)
    return np.tanh(0.8 * out / (np.std(out) + 1e-9)) * env(dur, 0.008, 0.05)

def pad_chord(ms, dur, cutoff=1400):
    n = int(dur * SR); s = np.zeros(n)
    for m in ms:
        for det in (-0.12, 0.0, 0.11):
            s += saw(phase(float(mtof(midi(m) + det)), n) + rng.random())
    return lp(s / (3 * len(ms)), cutoff, 2) * env(dur, 0.6, 0.8)

def riser(dur):
    tt = tvec(dur); n = len(tt); u = tt / dur
    nz = noise(dur)
    s = np.zeros(n); blk = 2048
    for i in range(0, n, blk):                                          # a noise sweep that opens up
        fc = 400 + 9000 * u[i] ** 2
        s[i:i + blk] = bp(nz[i:i + blk], fc * 0.7, fc * 1.3, 1)
    tone = np.sin(2 * np.pi * phase(200 * 2 ** (u * 3), n)) * 0.3
    return (s * 0.8 + tone) * u ** 1.5

def crash(g=1.0):
    d = 1.8; tt = tvec(d)
    return hp(noise(d), 4000, 2) * np.exp(-tt / 0.6) * g

def impact(g=1.0):
    d = 1.2; tt = tvec(d)
    boom = np.sin(2 * np.pi * phase(45 + 60 * np.exp(-tt / 0.08), len(tt))) * np.exp(-tt / 0.5)
    return np.tanh(2.5 * boom + lp(noise(d), 300) * np.exp(-tt / 0.05) * 2) * g

# ---- the music -------------------------------------------------------------------------------
# tamborzão (16ths in a bar)
KICK = [0, 3, 6, 10, 12]
CLAP = [4, 12]
TUIN = [7, 15]
# the 808 line (G minor, flat 2nd Ab): [16th, length in 16ths, note]
BASS_A = [(0, 3, 'G1'), (3, 3, 'G1'), (6, 4, 'Bb1'), (10, 2, 'G1'), (12, 4, 'F1')]
BASS_B = [(0, 3, 'G1'), (3, 3, 'G1'), (6, 4, 'D2'), (10, 2, 'C2'), (12, 2, 'Bb1'), (14, 2, 'Ab1')]
# the cowbell hook: two bars, 16ths
BELL_A = [(0, 'G5'), (3, 'G5'), (6, 'Bb5'), (8, 'A5'), (10, 'G5'), (12, 'F5'), (14, 'D5')]
BELL_B = [(0, 'G5'), (3, 'G5'), (6, 'D6'), (8, 'C6'), (10, 'Bb5'), (12, 'Ab5'), (13, 'G5'), (14, 'F5')]
BELL_C = [(0, 'D6'), (2, 'D6'), (3, 'C6'), (6, 'Bb5'), (8, 'D6'), (10, 'Eb6'), (11, 'D6'), (12, 'C6'), (14, 'Bb5')]
BELL_D = [(0, 'G6'), (3, 'F6'), (6, 'D6'), (8, 'Eb6'), (10, 'D6'), (12, 'C6'), (13, 'Bb5'), (14, 'Ab5'), (15, 'G5')]
# vocal chops: [16th, length (16ths), note, vowel]
VOX_A = [(0, 2, 'D5', 'a'), (3, 2, 'D5', 'a'), (6, 3, 'F5', 'e'), (10, 2, 'G5', 'o'), (12, 4, 'D5', 'a')]
VOX_B = [(0, 2, 'Bb4', 'e'), (3, 2, 'C5', 'e'), (6, 3, 'D5', 'a'), (10, 2, 'F5', 'i'), (12, 2, 'G5', 'a'), (14, 2, 'Ab5', 'u')]
CHORDS = [['G3', 'Bb3', 'D4'], ['Eb3', 'G3', 'Bb3'], ['C3', 'Eb3', 'G3'], ['D3', 'F3', 'Ab3']]

score = {k: [] for k in ('kick', 'clap', 'tuin', 'crash', 'impact', 'riser', 'stop', 'bell', 'bass', 'vox', 'roll')}
S16 = 0.25

def put_bass(B, line, oct_=0, prev=[None]):
    for (p, L, nm) in line:
        m = midi(nm) + oct_
        bass.add(bt(B + p * S16), b808(m, L * S16 * BEAT + 0.02, prev[0]), 0.5)
        score['bass'].append([B + p * S16, L * S16, m]); prev[0] = m

def put_bell(B, line, g=0.22, oct_=0, rec=True, pan=0.15):
    for (p, nm) in line:
        m = midi(nm) + oct_
        bell.add(bt(B + p * S16), cowbell(m, 0.2), g, pan)
        if rec: score['bell'].append([B + p * S16, m])

def put_vox(B, line, g=0.2, oct_=0, rec=True, stretch=1.0):
    for (p, L, nm, v) in line:
        m = midi(nm) + oct_
        vox.add(bt(B + p * S16 * stretch), voice(m, L * S16 * BEAT * stretch * 0.9, v, -0.6 if L >= 3 else 0), g, -0.1)
        if rec: score['vox'].append([B + p * S16 * stretch, L * S16 * stretch, m, v])

def funk_drums(B, k, hard=False, sparse=False):
    for p in KICK:
        drums.add(bt(B + p * S16), kick(), 0.6); score['kick'].append(B + p * S16)
    for p in CLAP:
        drums.add(bt(B + p * S16), clap(), 0.42, 0.05); score['clap'].append(B + p * S16)
    if not sparse:
        for p in TUIN:
            drums.add(bt(B + p * S16), tuin(1, 1700 + 400 * (p == 15)), 0.16, 0.35 if p == 7 else -0.35); score['tuin'].append(B + p * S16)
    for h in range(16):
        if sparse and h % 2: continue
        drums.add(bt(B + h * S16), shaker(0.6 + 0.4 * (h % 4 == 2)), 0.09, -0.3)
        if h % 2 == 0: drums.add(bt(B + h * S16), hat(0.7 if h % 4 else 0.4), 0.1, 0.25)
    if hard:
        drums.add(bt(B + 14 * S16), hat(1, True), 0.12, 0.3)
        if k % 2 == 1:                                         # a 32nd-note hat roll into every other bar
            for h in range(8): drums.add(bt(B + 3 + h * 0.125), hat(0.4 + h * 0.08), 0.12, 0.25)

def snare_roll(B0, beats):
    t = 0.0
    while t < beats - 1e-6:
        p = t / beats
        step = 0.5 if p < 0.25 else 0.25 if p < 0.6 else 0.125
        drums.add(bt(B0 + t), clap(0.4 + 0.6 * p), 0.3 + 0.2 * p); score['roll'].append(B0 + t)
        t += step

for k in range(BARS):
    B = k * 4
    a_or_b = k % 2
    # ---- INTRO 0-8: pad + cowbell hook through a closed filter (added later), vocal chops from bar 4
    if k < 8:
        if k % 2 == 0: pad.add(bar(k), pad_chord(CHORDS[(k // 2) % 4], 8 * BEAT + 0.6, 900), 0.34)
        put_bell(B, BELL_A if a_or_b == 0 else BELL_B, 0.26)
        if k >= 4: put_vox(B, VOX_A if a_or_b == 0 else VOX_B, 0.2)
        if k >= 6:
            for h in range(0, 16, 2): drums.add(bt(B + h * S16), shaker(0.7), 0.07, -0.3)
        if k == 7:
            fxb.add(bar(7), riser(4 * BEAT), 0.25); score['riser'].append([B, B + 4])
    # ---- BUILD 8-16: claps + hats, 808 on the downbeats only, cowbell hook, snare roll, riser
    elif k < 16:
        if k == 8: drums.add(bar(8), crash(), 0.18); score['crash'].append(B)
        for p in CLAP: drums.add(bt(B + p * S16), clap(), 0.36); score['clap'].append(B + p * S16)
        for h in range(16):
            drums.add(bt(B + h * S16), shaker(0.6 + 0.4 * (h % 4 == 2)), 0.08, -0.3)
            if h % 2 == 0: drums.add(bt(B + h * S16), hat(0.6), 0.09, 0.25)
        drums.add(bt(B), kick(), 0.6); score['kick'].append(B)
        if k < 14:
            put_bass(B, [(0, 6, 'G1')] if a_or_b == 0 else [(0, 6, 'Eb1')])
            put_bell(B, BELL_A if a_or_b == 0 else BELL_B, 0.2)
            if k >= 12: put_vox(B, VOX_A if a_or_b == 0 else VOX_B, 0.14)
        if k == 14: snare_roll(B, 8); fxb.add(bar(14), riser(8 * BEAT), 0.3); score['riser'].append([B, B + 8])
        if k == 15: put_vox(B + 3, [(0, 3, 'G5', 'a'), (2, 2, 'Bb5', 'e')], 0.22)
    # ---- DROP "MONTAGEM" 16-32
    elif k < 32:
        if k in (16, 24): drums.add(bar(k), crash(), 0.2); fxb.add(bar(k), impact(), 0.45); score['crash'].append(B); score['impact'].append(B)
        funk_drums(B, k, hard=k >= 24)
        put_bass(B, BASS_A if a_or_b == 0 else BASS_B)
        if k < 24: put_bell(B, BELL_A if a_or_b == 0 else BELL_B, 0.34)
        else: put_bell(B, BELL_C if a_or_b == 0 else BELL_D, 0.34)
        if k >= 20: put_vox(B, VOX_A if a_or_b == 0 else VOX_B, 0.17)
        if k == 31:
            for p in (8, 10, 12, 14): drums.add(bt(B + p * S16), tuin(1, 2600), 0.2); score['tuin'].append(B + p * S16)
    # ---- SLOWED 32-40: half time; the hook comes back slow, low and wet; tape stop into the build
    elif k < 40:
        if k == 32: fxb.add(bar(32), impact(0.8), 0.35); score['impact'].append(B)
        if k % 2 == 0: pad.add(bar(k), pad_chord(CHORDS[(k // 2) % 4], 8 * BEAT + 0.6, 1300), 0.26)
        drums.add(bt(B), kick(), 0.6); score['kick'].append(B)
        drums.add(bt(B + 2.5), kick(0.8), 0.5); score['kick'].append(B + 2.5)
        drums.add(bt(B + 2), clap(), 0.4); score['clap'].append(B + 2)
        for h in range(8): drums.add(bt(B + h * 0.5), hat(0.5), 0.08, 0.25)
        root = ['G1', 'Eb1', 'C1', 'D1'][(k // 2) % 4]
        if k % 2 == 0: put_bass(B, [(0, 10, root), (12, 4, root)])
        else: put_bass(B, [(0, 8, root), (8, 8, 'G1')])
        # the cowbell hook at half speed, an octave down
        line = BELL_A if (k // 2) % 2 == 0 else BELL_B
        for (p, nm) in line:
            if p >= 8: continue
            m = midi(nm) - 12
            bell.add(bt(B + p * 0.5), cowbell(m, 0.35), 0.2, 0.1); score['bell'].append([B + p * 0.5, m])
        if k >= 34: put_vox(B, VOX_A if a_or_b == 0 else VOX_B, 0.16, -5, True, 1.0)
        if k == 39: score['stop'].append(B + 2)
    # ---- BUILD 2 40-48: the 808 pumps 8ths, the hook in the vocal, a long roll
    elif k < 48:
        if k == 40: drums.add(bar(40), crash(), 0.18); score['crash'].append(B)
        for p in CLAP: drums.add(bt(B + p * S16), clap(), 0.38); score['clap'].append(B + p * S16)
        for h in range(16):
            drums.add(bt(B + h * S16), shaker(0.6 + 0.4 * (h % 4 == 2)), 0.08, -0.3)
        for h in range(0, 16, 4): drums.add(bt(B + h * S16), kick(0.9), 0.5); score['kick'].append(B + h * S16)
        root = ['G1', 'Eb1', 'C1', 'D1'][(k - 40) // 2 % 4]
        if k < 46: put_bass(B, [(h, 2, root) for h in range(0, 16, 2)])
        put_vox(B, VOX_A if a_or_b == 0 else VOX_B, 0.2)
        if k < 46: put_bell(B, BELL_C if a_or_b == 0 else BELL_D, 0.16)
        if k == 46: snare_roll(B, 8); fxb.add(bar(46), riser(8 * BEAT), 0.32); score['riser'].append([B, B + 8])
    # ---- DROP 2 "MANDELÃO" 48-64: harder, 808 octave jumps, double cowbell, more chops
    elif k < 64:
        if k in (48, 56): drums.add(bar(k), crash(), 0.22); fxb.add(bar(k), impact(1.1), 0.5); score['crash'].append(B); score['impact'].append(B)
        funk_drums(B, k, hard=True)
        if k % 4 == 3:                                          # extra kicks: 16ths 13, 14, 15
            for p in (13, 14, 15): drums.add(bt(B + p * S16), kick(0.8), 0.45); score['kick'].append(B + p * S16)
        line = BASS_A if a_or_b == 0 else BASS_B
        if k >= 56: line = [(p, L, nm[:-1] + str(int(nm[-1]) + (1 if i % 2 else 0))) for i, (p, L, nm) in enumerate(line)]
        put_bass(B, line)
        put_bell(B, BELL_C if a_or_b == 0 else BELL_D, 0.34)
        if k >= 52: put_bell(B, BELL_A if a_or_b == 0 else BELL_B, 0.1, 12, False, -0.35)    # a second, higher cowbell
        put_vox(B, VOX_A if a_or_b == 0 else VOX_B, 0.18)
        if k == 63:
            for p in (8, 10, 12, 13, 14, 15): drums.add(bt(B + p * S16), tuin(1, 2800), 0.2); score['tuin'].append(B + p * S16)
    # ---- OUTRO 64-68: one last hit, the hook alone, slowing to a stop
    else:
        if k == 64:
            drums.add(bar(64), crash(), 0.24); fxb.add(bar(64), impact(1.2), 0.5); score['crash'].append(B); score['impact'].append(B)
            drums.add(bar(64), kick(), 0.7); score['kick'].append(B)
            bass.add(bar(64), b808(midi('G1'), 8 * BEAT, None, 3.0), 0.5); score['bass'].append([B, 8, midi('G1')])
            pad.add(bar(64), pad_chord(CHORDS[0], 16 * BEAT, 1100), 0.25)
        if k < 66: put_bell(B, BELL_A if a_or_b == 0 else BELL_B, 0.16 - 0.04 * (k - 64))
        if k == 65: put_vox(B, [(0, 4, 'D5', 'a'), (6, 6, 'G4', 'o')], 0.16)

# ---- mix ---------------------------------------------------------------------------------------------
def duck_curve(beats, depth, tau):
    d = np.ones(N, np.float32)
    for b in beats:
        i = int(bt(b) * SR); n = int(0.25 * SR)
        if i >= N: continue
        seg = 1 - depth * np.exp(-np.arange(min(n, N - i)) / SR / tau)
        d[i:i + len(seg)] = np.minimum(d[i:i + len(seg)], seg)
    return d
dk = duck_curve(score['kick'], 0.5, 0.06)
for bus_ in (pad, vox):
    bus_.L *= dk; bus_.R *= dk

# intro: everything except the pad through a low-pass that opens over bars 0-8
def sweep_lp(st, i0, i1, f0, f1):
    out = st.copy(); blk = 4096
    for ch in range(2):
        zi = None
        for i in range(i0, i1, blk):
            u = (i - i0) / max(1, i1 - i0)
            sos = signal.butter(2, f0 * (f1 / f0) ** u, 'low', fs=SR, output='sos')
            if zi is None: zi = signal.sosfilt_zi(sos) * 0
            out[ch, i:i + blk], zi = signal.sosfilt(sos, st[ch, i:i + blk], zi=zi)
    return out

def reverb(st, mix, dur=2.6, decay=0.8):
    tt = np.arange(int(dur * SR)) / SR
    out = []
    for ch in range(2):
        ir = lp(rng.standard_normal(len(tt)) * np.exp(-tt / decay), 6000); ir[:int(0.02 * SR)] *= 0.2
        ir /= np.sqrt(np.sum(ir ** 2))
        out.append(signal.fftconvolve(st[ch], ir)[:N])
    return np.vstack(out) * mix

top = bell.stereo() + vox.stereo()
i0, i1 = int(bar(0) * SR), int(bar(8) * SR)
top = sweep_lp(top, i0, i1, 900, 9000)
# the slowed break: the top lines get much more reverb
slow = np.zeros(N, np.float32); slow[int(bar(32) * SR):int(bar(40) * SR)] = 1
slow = lp(slow, 2)
dry = drums.stereo() + bass.stereo() * 1.0 + top + pad.stereo() + fxb.stereo()
wet = reverb(top * (0.6 + 1.6 * slow) + pad.stereo() * 0.8 + drums.stereo() * 0.12, 0.3)
mix = dry + wet
mix -= np.mean(mix, axis=1, keepdims=True)
lowm = lp((mix[0] + mix[1]) / 2, 120, 4)
mix = np.vstack([hp(mix[0], 120, 4) + lowm, hp(mix[1], 120, 4) + lowm])

# tape stop at the end of the slowed break (beats 158 → 160) and at the very end
def tape_stop(mix, b0, b1):
    i0, i1 = int(bt(b0) * SR), int(bt(b1) * SR)
    n = i1 - i0
    speed = (1 - np.arange(n) / n) ** 1.3
    pos = i0 + np.cumsum(speed)
    for ch in range(2):
        mix[ch, i0:i1] = np.interp(pos, np.arange(len(mix[ch])), mix[ch]) * np.clip((1 - np.arange(n) / n) * 3, 0, 1)
    return mix
mix = tape_stop(mix, 158, 160)

# phonk master: drive into a soft clip (loud and a little dirty), with a look-ahead limiter
mix /= np.max(np.abs(mix))
pk = np.max(np.abs(mix), axis=0)
win = int(0.005 * SR)
pk = np.maximum.reduce([np.roll(pk, -i) for i in range(0, win, 8)])
DRIVE, THR = 3.6, 0.9
g = np.minimum(1, THR / np.maximum(pk * DRIVE, 1e-6))
rel = np.exp(-1 / (0.1 * SR))
g = signal.lfilter([1 - rel], [1, -rel], g[::-1])[::-1]
g = np.minimum(g, np.minimum(1, THR / np.maximum(pk * DRIVE, 1e-6)) * 1.2)
mix = np.tanh(mix * DRIVE * g / THR * 0.95) * THR
endb = 66 * 4 + 2
mix = tape_stop(mix, endb - 3, endb)
endi = int((bt(endb) + 1.5) * SR)
mix = mix[:, :endi]
mix *= 0.95 / np.max(np.abs(mix))

from scipy.io import wavfile
wavfile.write('baile.wav', SR, (mix.T * 32767).astype(np.int16))
for key in ('kick', 'clap', 'tuin', 'crash', 'impact', 'stop', 'roll'): score[key] = sorted(set(round(x, 4) for x in score[key]))
for key in ('bell', 'bass', 'vox'): score[key].sort(key=lambda e: e[0])
score['end'] = round(mix.shape[1] / SR, 2)
json.dump(score, open('score.json', 'w'), default=lambda o: o.item() if hasattr(o, 'item') else o)
print('done', mix.shape[1] / SR)
