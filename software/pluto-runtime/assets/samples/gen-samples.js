// Genera alcuni file .wav di esempio (sintetizzati via codice, nessun
// file scaricato/con diritti di terzi) per sostituire i bip grezzi del
// prototipo con timbri piu' piacevoli. Mono, 16-bit PCM, 44100 Hz.

const fs = require("fs");
const path = require("path");

const SAMPLE_RATE = 44100;
const OUT_DIR = __dirname;
fs.mkdirSync(OUT_DIR, { recursive: true });

function synth({ duration, partials, attack = 0.004, noiseBurst = null }) {
  const n = Math.floor(SAMPLE_RATE * duration);
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let s = 0;
    for (const p of partials) {
      s += p.amp * Math.sin(2 * Math.PI * p.freq * t) * Math.exp(-t / p.decay);
    }
    if (noiseBurst && t < noiseBurst.duration) {
      s += (Math.random() * 2 - 1) * noiseBurst.amp * (1 - t / noiseBurst.duration);
    }
    const env = t < attack ? t / attack : 1;
    buf[i] = s * env;
  }
  let max = 0;
  for (const v of buf) max = Math.max(max, Math.abs(v));
  if (max > 0) for (let i = 0; i < n; i++) buf[i] = (buf[i] / max) * 0.9;
  return buf;
}

function writeWav(filePath, samples) {
  const n = samples.length;
  const buffer = Buffer.alloc(44 + n * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + n * 2, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  fs.writeFileSync(filePath, buffer);
  console.log("scritto", filePath, `(${(buffer.length / 1024).toFixed(0)} KB)`);
}

const F0 = 261.6256; // Do centrale (nota MIDI 60), riferimento per tutti i campioni

// campana — Raggio 1: partials inarmoniche, decadimento lungo
writeWav(
  path.join(OUT_DIR, "campana.wav"),
  synth({
    duration: 2.0,
    attack: 0.005,
    partials: [
      { freq: F0 * 1.0, amp: 0.6, decay: 1.6 },
      { freq: F0 * 2.0, amp: 0.35, decay: 1.3 },
      { freq: F0 * 2.76, amp: 0.25, decay: 1.0 },
      { freq: F0 * 3.0, amp: 0.18, decay: 0.9 },
      { freq: F0 * 4.07, amp: 0.12, decay: 0.7 },
    ],
  })
);

// marimba — Raggio 2: fondamentale + ottava alta, click iniziale
writeWav(
  path.join(OUT_DIR, "marimba.wav"),
  synth({
    duration: 1.2,
    attack: 0.003,
    noiseBurst: { amp: 0.15, duration: 0.01 },
    partials: [
      { freq: F0 * 1.0, amp: 0.7, decay: 0.9 },
      { freq: F0 * 3.9, amp: 0.25, decay: 0.5 },
      { freq: F0 * 9.2, amp: 0.12, decay: 0.3 },
    ],
  })
);

// legno — Tavoletta 1: percussivo brevissimo, quasi solo rumore filtrato
writeWav(
  path.join(OUT_DIR, "legno.wav"),
  synth({
    duration: 0.25,
    attack: 0.001,
    noiseBurst: { amp: 0.8, duration: 0.05 },
    partials: [{ freq: F0 * 1.0, amp: 0.3, decay: 0.08 }],
  })
);

// metallo — Tavoletta 2: partials inarmoniche brillanti, decadimento medio
writeWav(
  path.join(OUT_DIR, "metallo.wav"),
  synth({
    duration: 0.9,
    attack: 0.002,
    noiseBurst: { amp: 0.2, duration: 0.02 },
    partials: [
      { freq: F0 * 1.0, amp: 0.4, decay: 0.5 },
      { freq: F0 * 1.6, amp: 0.35, decay: 0.45 },
      { freq: F0 * 2.3, amp: 0.3, decay: 0.4 },
      { freq: F0 * 3.1, amp: 0.25, decay: 0.35 },
      { freq: F0 * 4.2, amp: 0.2, decay: 0.3 },
    ],
  })
);

// cristallo — Radar: timbro arioso/brillante, decadimento lungo
writeWav(
  path.join(OUT_DIR, "cristallo.wav"),
  synth({
    duration: 2.2,
    attack: 0.08,
    partials: [
      { freq: F0 * 2.0, amp: 0.4, decay: 1.8 },
      { freq: F0 * 3.0, amp: 0.3, decay: 1.5 },
      { freq: F0 * 5.0, amp: 0.2, decay: 1.2 },
      { freq: F0 * 7.0, amp: 0.12, decay: 0.9 },
    ],
  })
);
