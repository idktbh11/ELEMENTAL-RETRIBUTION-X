/*
 * Audio for the orb, the awakening and the element REVEAL:
 *   orb sounds, the shockwave, the drumroll, a distorted guitar riff, and one
 *   signature sound effect per element (SfxBank['element_' + id]).
 */
(function (ERX) {
  'use strict';

  const rand = (a, b) => a + Math.random() * (b - a);
  const semis = (f, n) => f * Math.pow(2, n / 12);

  /** A distortion pedal: WaveShaper -> lowpass -> gain. Returns the input node. */
  function pedal(a, dest, drive, vol, cutoff) {
    const ctx = a.ctx;
    const ws = ctx.createWaveShaper();
    const n = 2048, curve = new Float32Array(n), k = drive;
    for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x)); }
    ws.curve = curve;
    ws.oversample = '4x';
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = cutoff || 3000;
    const g = ctx.createGain();
    g.gain.value = vol;
    ws.connect(lp); lp.connect(g); g.connect(dest);
    setTimeout(() => { try { ws.disconnect(); lp.disconnect(); g.disconnect(); } catch (e) { /* ignore */ } }, 6000);
    return ws;
  }

  /** Root + fifth + octave, sawtooth, through the pedal. */
  function powerChord(a, amp, root, t, dur, o) {
    o = o || {};
    [0, 7, 12].forEach((n, i) => a.tone(amp, {
      wave: 'sawtooth', freq: semis(root, n) * (1 + (i - 1) * 0.002), t, dur,
      vol: 0.16, attack: 0.003, release: o.mute ? 0.03 : 0.35, sustain: o.mute ? 0.4 : 0.8, decay: 0.2,
      vibrato: o.vib ? semis(root, n) * 0.02 : 0, vibratoRate: 6, vibratoDelay: 0.3,
    }));
  }

  function kick(a, d, t, v) { a.tone(d, { wave: 'sine', freq: 140, freqEnd: 40, t, dur: 0.12, vol: v || 0.4, release: 0.1 }); }
  function crashCym(a, d, t, v) { a.noiseBurst(d, { t, dur: 1.4, vol: v || 0.12, type: 'highpass', freq: 5000, attack: 0.002, release: 1.3 }); }

  Object.assign(ERX.MusicTracks, {
    vault: {
      title: 'Do Not Touch The Orb',
      bpm: 66, stepsPerBar: 16, restEvery: 0,
      chords: 'Am Fmaj7 C E Am Fmaj7 Dm E',
      lead: {
        inst: 'bell', vol: 0.04, res: 8,
        notes:
          'A5 - - . . . E6 - | C6 - - . . . A5 - | G5 - - . E5 - - . | G#5 - - - - - - . |' +
          'A5 - - . . . C6 - | E6 - - . . . A6 - | F6 - - . D6 - - . | B5 - - - G#5 - - .',
      },
      arp: { octave: 5, vol: 0.014, wave: 'triangle', pattern: [0, null, 2, null, 1, null, 3, null, 0, null, 2, null, 1, null, 3, null] },
      pad: { octave: 3, vol: 0.016, inst: 'drone' },
    },
  });

  Object.assign(ERX.SfxBank, {
    // ------------------------------------------------------------ the orb
    orbHum(a, d, t, o) {
      const v = (o && o.value) || 0;
      a.tone(d, { wave: 'triangle', freq: 180 + v * 260, t, dur: 0.5, vol: 0.06 + v * 0.05, attack: 0.05, release: 0.2, vibrato: 6 + v * 30, vibratoRate: 9 + v * 10, vibratoDelay: 0.02 });
      a.tone(d, { wave: 'sine', freq: 360 + v * 520, t, dur: 0.5, vol: 0.03, attack: 0.05, release: 0.2, vibrato: 10, vibratoRate: 7 });
    },
    glassCrack(a, d, t) {
      a.noiseBurst(d, { t, dur: 0.05, vol: 0.12, type: 'highpass', freq: 4500, release: 0.05 });
      a.tone(d, { wave: 'sine', freq: rand(2600, 3400), t, dur: 0.01, vol: 0.05, attack: 0.001, release: 0.2 });
    },
    shatter(a, d, t) {
      a.noiseBurst(d, { t, dur: 0.5, vol: 0.22, type: 'highpass', freq: 3000, attack: 0.002, release: 0.5 });
      for (let i = 0; i < 18; i++) a.tone(d, { wave: 'sine', freq: rand(2000, 6000), t: t + rand(0, 0.5), dur: 0.01, vol: 0.04, attack: 0.001, release: rand(0.05, 0.3), pan: rand(-0.8, 0.8) });
    },
    shockwave(a, d, t) {
      a.tone(d, { wave: 'sine', freq: 110, freqEnd: 28, slideTime: 0.9, t, dur: 0.9, vol: 0.5, release: 0.5 });
      a.noiseBurst(d, { t, dur: 1.2, vol: 0.3, type: 'lowpass', freq: 3000, freqEnd: 120, attack: 0.002, release: 1.1 });
      a.tone(d, { wave: 'sawtooth', freq: 900, freqEnd: 60, slideTime: 0.6, t, dur: 0.6, vol: 0.05, release: 0.2 });
    },
    orbDash(a, d, t) {
      a.noiseBurst(d, { t, dur: 0.3, vol: 0.2, type: 'bandpass', freq: 600, freqEnd: 5000, Q: 2, release: 0.2 });
      a.tone(d, { wave: 'square', freq: 300, freqEnd: 2400, slideTime: 0.25, t, dur: 0.25, vol: 0.05, release: 0.05 });
    },
    orbImpact(a, d, t) {
      kick(a, d, t, 0.6);
      a.noiseBurst(d, { t, dur: 0.6, vol: 0.25, type: 'lowpass', freq: 5000, freqEnd: 300, release: 0.6 });
      [523, 659, 784, 1046, 1318].forEach((f, i) => a.tone(d, { wave: 'triangle', freq: f, t: t + i * 0.02, dur: 1.2, vol: 0.04, attack: 0.01, release: 1.0, vibrato: 8, vibratoRate: 6 }));
    },
    /** The power surging through you (nebula). ~4 s. */
    surge(a, d, t) {
      a.tone(d, { wave: 'sawtooth', freq: 55, freqEnd: 330, slideTime: 4, t, dur: 4, vol: 0.07, attack: 0.5, release: 0.3, vibrato: 12, vibratoRate: 11, vibratoDelay: 0.5 });
      a.tone(d, { wave: 'sawtooth', freq: 82, freqEnd: 495, slideTime: 4, t, dur: 4, vol: 0.05, attack: 0.5, release: 0.3, vibrato: 16, vibratoRate: 13, vibratoDelay: 0.5 });
      a.noiseBurst(d, { t, dur: 4, vol: 0.12, type: 'bandpass', freq: 300, freqEnd: 4000, Q: 1, attack: 3.5, release: 0.4 });
    },
    passOut(a, d, t) {
      a.tone(d, { wave: 'sine', freq: 700, freqEnd: 80, slideTime: 1.4, t, dur: 1.4, vol: 0.08, release: 0.4, vibrato: 20, vibratoRate: 5 });
      kick(a, d, t + 1.3, 0.25);
    },
    // ---------------------------------------------------------- the reveal
    revealWord(a, d, t) {
      a.tone(d, { wave: 'sine', freq: 90, freqEnd: 40, t, dur: 0.25, vol: 0.4, release: 0.3 });
      a.noiseBurst(d, { t, dur: 0.08, vol: 0.08, type: 'lowpass', freq: 900, release: 0.1 });
    },
    /** "YOU": a big low BANG. */
    bang(a, d, t) {
      a.noiseBurst(d, { t, dur: 0.05, vol: 0.5, type: 'lowpass', freq: 2600, attack: 0.001, release: 0.45 });
      a.tone(d, { wave: 'sine', freq: 140, freqEnd: 32, t, dur: 0.35, vol: 0.55, attack: 0.001, release: 0.4 });
      a.tone(d, { wave: 'square', freq: 70, freqEnd: 30, t, dur: 0.12, vol: 0.12, attack: 0.001, release: 0.2 });
    },
    /** "GOT": the same bang, but high-pitched. */
    bangHigh(a, d, t) {
      a.noiseBurst(d, { t, dur: 0.04, vol: 0.4, type: 'highpass', freq: 2400, attack: 0.001, release: 0.3 });
      a.tone(d, { wave: 'sine', freq: 620, freqEnd: 180, t, dur: 0.25, vol: 0.35, attack: 0.001, release: 0.3 });
      a.tone(d, { wave: 'square', freq: 1240, freqEnd: 400, t, dur: 0.08, vol: 0.08, attack: 0.001, release: 0.15 });
    },
    drumroll(a, d, t, o) {
      const dur = (o && o.dur) || 2.4;
      for (let s = 0, i = 0; s < dur; s += 0.042, i++) {
        const k = s / dur;
        a.noiseBurst(d, { t: t + s, dur: 0.03, vol: 0.03 + k * k * 0.13, type: 'bandpass', freq: 1800 + (i % 2) * 300, Q: 0.9, attack: 0.001, release: 0.05, pan: (i % 2 ? 0.15 : -0.15) });
      }
      a.tone(d, { wave: 'sine', freq: 70, t, dur, vol: 0.12, attack: dur, release: 0.05 });
    },
    /**
     * The rarity sting: a rising arpeggio, one more note per tier.
     * Common = a polite little "ding", MYTHIC = a full rainbow fanfare + choir.
     */
    raritySting(a, d, t, o) {
      const tier = (o && o.tier) || 0;
      const scale = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568.0, 2093.0];
      const n = 2 + tier;
      const step = tier >= 5 ? 0.09 : 0.11;
      const wave = tier >= 3 ? 'square' : 'triangle';
      for (let i = 0; i < n; i++) {
        const f = scale[i % scale.length] * (i >= scale.length ? 2 : 1);
        a.tone(d, { wave, freq: f, t: t + i * step, dur: 0.1, vol: 0.07, attack: 0.002, release: 0.18 });
      }
      const end = t + n * step;
      // final chord, bigger for rarer tiers
      const chord = tier >= 4 ? [1046.5, 1318.5, 1568.0, 2093.0] : tier >= 2 ? [1046.5, 1318.5, 1568.0] : [1046.5, 1568.0];
      for (const f of chord) a.tone(d, { wave: 'triangle', freq: f, t: end, dur: 0.4 + tier * 0.25, vol: 0.05, attack: 0.005, release: 0.6 + tier * 0.2 });
      if (tier >= 3) a.noiseBurst(d, { t: end, dur: 0.05, vol: 0.12, type: 'highpass', freq: 5000, release: 0.6 });   // sparkle
      if (tier >= 4) a.tone(d, { wave: 'sine', freq: 65.4, freqEnd: 40, t: end, dur: 0.6, vol: 0.3, release: 0.6 });   // boom
      if (tier >= 5) {
        // MYTHIC: a shimmering "aaah" choir + a cascading glitter run
        for (const f of [523.25, 659.25, 783.99, 987.77]) {
          a.tone(d, { wave: 'sawtooth', freq: f, t: end + 0.05, dur: 2.2, vol: 0.018, attack: 0.4, release: 1.2, vibrato: 6, vibratoRate: 5 });
        }
        for (let i = 0; i < 14; i++) a.tone(d, { wave: 'sine', freq: 2093 * Math.pow(0.94, i), t: end + 0.3 + i * 0.07, dur: 0.05, vol: 0.04, release: 0.2, pan: (i % 2 ? 0.6 : -0.6) });
      }
    },
    /** The big distorted guitar riff (in E). ~2.4 s. */
    guitarRiff(a, d, t) {
      const amp = pedal(a, d, 60, 0.35, 3400);
      const E = 82.41, G = 98.0, A = 110.0, D = 73.42;
      const s = 0.1;
      crashCym(a, d, t, 0.12); kick(a, d, t);
      powerChord(a, amp, E, t, s * 0.8, { mute: true });
      powerChord(a, amp, E, t + s, s * 0.8, { mute: true });
      powerChord(a, amp, E, t + s * 2, s * 0.8, { mute: true });
      powerChord(a, amp, G, t + s * 3, s * 1.4);
      powerChord(a, amp, A, t + s * 5, s * 2.5);
      kick(a, d, t + s * 5, 0.3);
      powerChord(a, amp, D, t + s * 8, s * 0.8, { mute: true });
      powerChord(a, amp, E, t + s * 9, 1.4, { vib: true });
      crashCym(a, d, t + s * 9, 0.14); kick(a, d, t + s * 9, 0.45);
    },
  });

  // ------------------------------------------------- element signatures
  // One recipe per element. Each plays alongside the guitar riff.
  const EL = {
    fire(a, d, t) {
      a.noiseBurst(d, { t, dur: 1.2, vol: 0.2, type: 'bandpass', freq: 300, freqEnd: 2200, Q: 0.7, attack: 0.05, release: 1.0 });
      for (let i = 0; i < 14; i++) a.noiseBurst(d, { t: t + rand(0, 1.3), dur: 0.01, vol: 0.06, type: 'highpass', freq: 3000, release: 0.02, pan: rand(-0.7, 0.7) });
    },
    water(a, d, t) {
      a.noiseBurst(d, { t, dur: 0.5, vol: 0.18, type: 'lowpass', freq: 2500, freqEnd: 400, release: 0.5 });
      for (let i = 0; i < 9; i++) { const f = rand(300, 700); a.tone(d, { wave: 'sine', freq: f, freqEnd: f * 2.2, slideTime: 0.06, t: t + 0.2 + i * 0.09, dur: 0.06, vol: 0.06, release: 0.04 }); }
    },
    wind(a, d, t) {
      a.noiseBurst(d, { t, dur: 0.8, vol: 0.2, type: 'bandpass', freq: 400, freqEnd: 2400, Q: 3, attack: 0.3, release: 0.4 });
      a.noiseBurst(d, { t: t + 0.6, dur: 0.8, vol: 0.14, type: 'bandpass', freq: 2400, freqEnd: 500, Q: 3, attack: 0.1, release: 0.6, pan: 0.5 });
    },
    earth(a, d, t) {
      a.tone(d, { wave: 'sine', freq: 55, freqEnd: 35, t, dur: 1.2, vol: 0.35, release: 0.5 });
      for (let i = 0; i < 5; i++) a.noiseBurst(d, { t: t + i * 0.16, dur: 0.12, vol: 0.18, type: 'lowpass', freq: 600, release: 0.15 });
    },
    lightning(a, d, t) {
      a.noiseBurst(d, { t, dur: 0.12, vol: 0.35, type: 'highpass', freq: 1500, attack: 0.001, release: 0.1 });
      a.tone(d, { wave: 'sawtooth', freq: 3000, freqEnd: 80, slideTime: 0.25, t, dur: 0.25, vol: 0.08, release: 0.05 });
      a.noiseBurst(d, { t: t + 0.25, dur: 1.4, vol: 0.25, type: 'lowpass', freq: 200, attack: 0.05, release: 1.2 });
    },
    ice(a, d, t) {
      a.noiseBurst(d, { t, dur: 0.1, vol: 0.12, type: 'highpass', freq: 5000, release: 0.1 });
      [2093, 2637, 3136, 4186, 3520].forEach((f, i) => a.tone(d, { wave: 'sine', freq: f, t: t + i * 0.08, dur: 0.01, vol: 0.07, attack: 0.001, release: 0.6 }));
    },
    nature(a, d, t) {
      for (let i = 0; i < 4; i++) a.tone(d, { wave: 'sine', freq: 2200, freqEnd: 3400, slideTime: 0.07, t: t + i * 0.14 + (i > 1 ? 0.3 : 0), dur: 0.07, vol: 0.06, release: 0.03 });
      a.noiseBurst(d, { t, dur: 1.0, vol: 0.06, type: 'bandpass', freq: 3000, Q: 0.6, attack: 0.3, release: 0.6 });
    },
    darkness(a, d, t) {
      [55, 55 * 1.006, 82.4].forEach((f) => a.tone(d, { wave: 'sawtooth', freq: f, freqEnd: f * 0.7, slideTime: 1.5, t, dur: 1.5, vol: 0.06, attack: 0.4, release: 0.6 }));
      a.noiseBurst(d, { t, dur: 1.2, vol: 0.1, type: 'lowpass', freq: 300, attack: 1.0, release: 0.3 });
    },
    shadow(a, d, t) {
      a.noiseBurst(d, { t, dur: 0.9, vol: 0.14, type: 'bandpass', freq: 1200, freqEnd: 300, Q: 4, attack: 0.2, release: 0.5, pan: -0.6 });
      a.noiseBurst(d, { t: t + 0.4, dur: 0.6, vol: 0.12, type: 'bandpass', freq: 800, freqEnd: 2000, Q: 4, attack: 0.1, release: 0.4, pan: 0.6 });
    },
    light(a, d, t) {
      [1046, 1318, 1568, 2093].forEach((f, i) => a.tone(d, { wave: 'triangle', freq: f, t: t + i * 0.06, dur: 1.2, vol: 0.05, attack: 0.05, release: 0.8, vibrato: 6, vibratoRate: 5 }));
      a.noiseBurst(d, { t, dur: 1.2, vol: 0.05, type: 'highpass', freq: 6000, attack: 0.4, release: 0.6 });
    },
    arcane(a, d, t) {
      [523, 784, 1046, 1568, 2093, 1568, 2637].forEach((f, i) => a.tone(d, { wave: 'pulse25', freq: f, t: t + i * 0.06, dur: 0.12, vol: 0.05, release: 0.3, vibrato: 30, vibratoRate: 12, vibratoDelay: 0.02 }));
    },
    poison(a, d, t) {
      for (let i = 0; i < 14; i++) { const f = rand(120, 320); a.tone(d, { wave: 'sine', freq: f, freqEnd: f * 1.8, slideTime: 0.05, t: t + rand(0, 1.2), dur: 0.05, vol: 0.07, release: 0.04 }); }
      a.noiseBurst(d, { t, dur: 1.2, vol: 0.05, type: 'highpass', freq: 3000, attack: 0.3, release: 0.6 });
    },
    blood(a, d, t) {
      for (const s of [0, 0.22, 0.75, 0.97]) a.tone(d, { wave: 'sine', freq: 70, freqEnd: 40, t: t + s, dur: 0.12, vol: 0.4, release: 0.1 });
      a.tone(d, { wave: 'sawtooth', freq: 65, t, dur: 1.4, vol: 0.04, attack: 0.3, release: 0.4 });
    },
    death(a, d, t) {
      [196, 392, 466, 587, 784].forEach((f, i) => a.tone(d, { wave: 'sine', freq: f, t, dur: 0.01, vol: 0.12 / (i + 1), attack: 0.002, release: 2.0 / (i * 0.5 + 1) }));
      a.noiseBurst(d, { t: t + 0.3, dur: 1.4, vol: 0.06, type: 'bandpass', freq: 500, Q: 2, attack: 0.5, release: 0.8 });
    },
    metal(a, d, t) {
      for (const s of [0, 0.35]) [440, 1056, 1680, 2541].forEach((f, i) => a.tone(d, { wave: 'sine', freq: f * rand(0.98, 1.02), t: t + s, dur: 0.01, vol: 0.12 / (i + 1), attack: 0.001, release: 0.9 / (i + 1) }));
      a.noiseBurst(d, { t, dur: 0.04, vol: 0.12, type: 'bandpass', freq: 2500, release: 0.05 });
    },
    sand(a, d, t) {
      a.noiseBurst(d, { t, dur: 1.4, vol: 0.12, type: 'highpass', freq: 4000, attack: 0.2, release: 0.8 });
      for (let i = 0; i < 20; i++) a.noiseBurst(d, { t: t + rand(0, 1.3), dur: 0.01, vol: 0.04, type: 'highpass', freq: rand(5000, 9000), release: 0.01, pan: rand(-0.8, 0.8) });
    },
    magma(a, d, t) {
      for (let i = 0; i < 8; i++) { const f = rand(60, 140); a.tone(d, { wave: 'sine', freq: f, freqEnd: f * 2, slideTime: 0.1, t: t + i * 0.15, dur: 0.1, vol: 0.2, release: 0.08 }); }
      a.noiseBurst(d, { t, dur: 1.4, vol: 0.18, type: 'lowpass', freq: 500, attack: 0.1, release: 1.0 });
    },
    storm(a, d, t) {
      a.noiseBurst(d, { t, dur: 1.6, vol: 0.1, type: 'highpass', freq: 2500, attack: 0.2, release: 0.6 });
      EL.lightning(a, d, t + 0.3);
    },
    cosmic(a, d, t) {
      a.tone(d, { wave: 'sine', freq: 220, freqEnd: 880, slideTime: 1.2, t, dur: 1.4, vol: 0.08, attack: 0.1, release: 0.6, vibrato: 20, vibratoRate: 3 });
      for (let i = 0; i < 8; i++) a.tone(d, { wave: 'sine', freq: rand(2000, 5000), t: t + rand(0, 1.3), dur: 0.01, vol: 0.04, attack: 0.001, release: 0.3, pan: rand(-0.8, 0.8) });
    },
    void(a, d, t) {
      a.tone(d, { wave: 'sine', freq: 90, freqEnd: 24, slideTime: 1.6, t, dur: 1.6, vol: 0.45, attack: 0.05, release: 0.4 });
      a.noiseBurst(d, { t, dur: 0.9, vol: 0.12, type: 'lowpass', freq: 3000, freqEnd: 60, attack: 0.6, release: 0.05 });
    },
    psychic(a, d, t) {
      a.tone(d, { wave: 'sine', freq: 660, freqEnd: 990, slideTime: 1.2, t, dur: 1.4, vol: 0.08, attack: 0.1, release: 0.4, vibrato: 60, vibratoRate: 6, vibratoDelay: 0.05 });
      a.tone(d, { wave: 'triangle', freq: 330, t, dur: 1.4, vol: 0.04, attack: 0.3, release: 0.4, vibrato: 30, vibratoRate: 4 });
    },
    crystal(a, d, t) {
      [3136, 2637, 2349, 2093, 2637, 3136, 4186].forEach((f, i) => a.tone(d, { wave: 'sine', freq: f, t: t + i * 0.07, dur: 0.01, vol: 0.06, attack: 0.001, release: 0.7, pan: (i % 2 ? 0.5 : -0.5) }));
    },
    moon(a, d, t) {
      [880, 1046, 1318, 1046, 880].forEach((f, i) => a.tone(d, { wave: 'triangle', freq: f, t: t + i * 0.2, dur: 0.18, vol: 0.06, attack: 0.02, release: 0.6 }));
    },
    solar(a, d, t) {
      [261, 329, 392, 523].forEach((f) => a.tone(d, { wave: 'sawtooth', freq: f, t, dur: 1.2, vol: 0.035, attack: 0.4, release: 0.6 }));
      a.noiseBurst(d, { t, dur: 1.4, vol: 0.1, type: 'bandpass', freq: 5000, Q: 0.5, attack: 0.5, release: 0.6 });
    },
    magnetism(a, d, t) {
      a.tone(d, { wave: 'sawtooth', freq: 110, freqEnd: 220, slideTime: 1.2, t, dur: 1.3, vol: 0.08, attack: 0.05, release: 0.3, vibrato: 50, vibratoRate: 8, vibratoDelay: 0.01 });
      a.tone(d, { wave: 'square', freq: 55, t, dur: 1.3, vol: 0.04, attack: 0.05, release: 0.3, vibrato: 25, vibratoRate: 8, vibratoDelay: 0.01 });
    },
    time(a, d, t) {
      for (let i = 0; i < 6; i++) a.noiseBurst(d, { t: t + i * 0.22, dur: 0.01, vol: 0.12, type: 'bandpass', freq: i % 2 ? 2400 : 3200, Q: 6, release: 0.02 });
      [1046, 2093, 3136].forEach((f, i) => a.tone(d, { wave: 'sine', freq: f, t: t + 1.32, dur: 0.01, vol: 0.08 / (i + 1), attack: 0.001, release: 0.9 }));
    },
    gravity(a, d, t) {
      a.tone(d, { wave: 'sine', freq: 220, freqEnd: 30, slideTime: 0.8, t, dur: 0.8, vol: 0.4, release: 0.4 });
      a.noiseBurst(d, { t: t + 0.7, dur: 0.3, vol: 0.2, type: 'lowpass', freq: 400, release: 0.3 });
    },
    sound(a, d, t) {
      // AIRHORN. Obviously.
      for (const s of [0, 0.22, 0.44]) [466, 587, 698].forEach((f) => a.tone(d, { wave: 'sawtooth', freq: f, t: t + s, dur: s === 0.44 ? 0.7 : 0.16, vol: 0.05, attack: 0.01, release: 0.08 }));
    },
    mist(a, d, t) {
      a.noiseBurst(d, { t, dur: 1.6, vol: 0.14, type: 'lowpass', freq: 900, attack: 0.8, release: 0.8 });
      a.tone(d, { wave: 'sine', freq: 440, t, dur: 1.4, vol: 0.03, attack: 0.8, release: 0.6, vibrato: 4, vibratoRate: 2 });
    },
    spirit(a, d, t) {
      a.tone(d, { wave: 'sine', freq: 440, freqEnd: 660, slideTime: 0.6, t, dur: 1.2, vol: 0.08, attack: 0.3, release: 0.5, vibrato: 18, vibratoRate: 5 });
      a.tone(d, { wave: 'sine', freq: 440, freqEnd: 660, slideTime: 0.6, t: t + 0.25, dur: 1.2, vol: 0.03, attack: 0.3, release: 0.5, vibrato: 18, vibratoRate: 5, pan: 0.6 });
    },
    chaos(a, d, t) {
      const keys = Object.keys(EL).filter((k) => k !== 'chaos');
      for (let i = 0; i < 3; i++) EL[keys[Math.floor(Math.random() * keys.length)]](a, d, t + i * 0.3);
      ERX.SfxBank.partyHorn(a, d, t + 1.0);
    },
  };
  for (const id of Object.keys(EL)) ERX.SfxBank['element_' + id] = EL[id];
})(window.ERX = window.ERX || {});
