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
  let noiseState = 0; // per il filtro passa-basso del rumore, vedi sotto

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let s = 0;
    for (const p of partials) {
      s += p.amp * Math.sin(2 * Math.PI * p.freq * t) * Math.exp(-t / p.decay);
    }
    if (noiseBurst && t < noiseBurst.duration) {
      // Rumore bianco grezzo = fruscio/statico, poco realistico per un "colpo"
      // (legno, metallo...). Lo filtriamo con un semplice passa-basso a un
      // polo (media mobile esponenziale) per renderlo un "thump" morbido
      // invece che un fruscio. "alpha" piu' basso = filtro piu' marcato.
      const raw = Math.random() * 2 - 1;
      const alpha = noiseBurst.alpha ?? 0.3;
      noiseState += (raw - noiseState) * alpha;
      s += noiseState * noiseBurst.amp * (1 - t / noiseBurst.duration);
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

// legno — Tavoletta 1: "colpo di legno" (claves) - componente intonata
// chiara e acuta, rumore solo come breve transiente d'attacco filtrato
writeWav(
  path.join(OUT_DIR, "legno.wav"),
  synth({
    duration: 0.18,
    attack: 0.001,
    noiseBurst: { amp: 0.35, duration: 0.012, alpha: 0.35 },
    partials: [
      { freq: F0 * 4.0, amp: 0.6, decay: 0.06 },
      { freq: F0 * 5.63, amp: 0.3, decay: 0.045 },
    ],
  })
);

// metallo — Tavoletta 2: partials inarmoniche brillanti con intervalli piu'
// distinti (meno "ammassate"), rumore d'attacco filtrato e piu' discreto
writeWav(
  path.join(OUT_DIR, "metallo.wav"),
  synth({
    duration: 0.9,
    attack: 0.002,
    noiseBurst: { amp: 0.12, duration: 0.015, alpha: 0.3 },
    partials: [
      { freq: F0 * 1.0, amp: 0.4, decay: 0.5 },
      { freq: F0 * 1.8, amp: 0.32, decay: 0.45 },
      { freq: F0 * 2.6, amp: 0.26, decay: 0.4 },
      { freq: F0 * 3.7, amp: 0.2, decay: 0.32 },
      { freq: F0 * 5.1, amp: 0.14, decay: 0.26 },
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
