// Pluto — runtime minimo.
//
// Cosa fa, in breve:
//  1. Ascolta messaggi MIDI (da un vero dispositivo via Web MIDI, oppure
//     simulati dalla tastiera del computer finche' l'hardware non c'e').
//  2. Per i canali di tipo "raggio" trasforma un valore continuo (Control
//     Change) in una nota scelta da una scala — lo stesso principio
//     "posizione -> nota da una sequenza" del Soundbeam originale (vedi
//     docs/soundbeam-tecnico.md). Se arriva gia' una nota diretta (es. dal
//     test da tastiera), la usa cosi' com'e'.
//  3. Per i canali "tavoletta" suona sempre la stessa nota, una volta per
//     pressione (comportamento on/off).
//  4. Suona con un sintetizzatore semplice via Web Audio (nessun file
//     audio necessario per ora: i suoni veri li sceglierà il musicista in
//     seguito, qui servono solo a verificare che il sistema risponda).
//  5. Da un feedback visivo immediato (il riquadro del canale si illumina).

(function () {
  "use strict";

  const MAPPING = window.PLUTO_MAPPING;
  const stage = document.getElementById("stage");
  const statusEl = document.getElementById("midiStatus");

  // --- stato per canale: traccia l'ultima "division" scelta per i raggi,
  // cosi' possiamo ritriggerare una nota solo quando cambia (comportamento
  // Re-Trigger del manuale Soundbeam), non ad ogni singolo CC ricevuto.
  const channelState = {};
  for (const ch of Object.keys(MAPPING.channels)) {
    channelState[ch] = { lastDivision: null, activeNote: null };
  }

  // ---------------------------------------------------------------------
  // Interfaccia: un riquadro per canale
  // ---------------------------------------------------------------------

  const tileEls = {};

  function buildStage() {
    for (const [ch, cfg] of Object.entries(MAPPING.channels)) {
      const tile = document.createElement("div");
      tile.className = "channel-tile";
      tile.style.setProperty("--tile-color", cfg.color);
      tile.innerHTML = `
        <div>
          <div class="label">${cfg.label}</div>
          <div class="type">${cfg.type}</div>
        </div>
        <div class="note">–</div>
      `;
      stage.appendChild(tile);
      tileEls[ch] = tile;
    }
  }

  function setTileActive(channel, midiNote, on) {
    const tile = tileEls[channel];
    if (!tile) return;
    tile.classList.toggle("active", on);
    tile.querySelector(".note").textContent = on ? noteName(midiNote) : "–";
  }

  function noteName(midiNote) {
    const names = ["Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];
    const octave = Math.floor(midiNote / 12) - 1;
    return `${names[midiNote % 12]}${octave}`;
  }

  // ---------------------------------------------------------------------
  // Motore audio: un sintetizzatore semplice, nessun campione richiesto
  // ---------------------------------------------------------------------

  let audioCtx = null;
  const voices = {}; // channel -> { oscillator, gain }

  function ensureAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function midiToFrequency(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  function startVoice(channel, midiNote, waveform) {
    const ctx = ensureAudioContext();
    stopVoice(channel); // un canale = una nota alla volta, per restare semplici e prevedibili

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = waveform || "sine";
    osc.frequency.value = midiToFrequency(midiNote);

    // inviluppo breve in attacco per evitare "click" udibili
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.01);

    osc.connect(gain).connect(ctx.destination);
    osc.start();

    voices[channel] = { osc, gain };
  }

  function stopVoice(channel, releaseSeconds) {
    const v = voices[channel];
    if (!v) return;
    const ctx = ensureAudioContext();
    const now = ctx.currentTime;
    const release = releaseSeconds ?? 0.08;
    v.gain.gain.cancelScheduledValues(now);
    v.gain.gain.setValueAtTime(v.gain.gain.value, now);
    v.gain.gain.linearRampToValueAtTime(0, now + release);
    v.osc.stop(now + release + 0.02);
    delete voices[channel];
  }

  // Una "tavoletta" suona un colpo breve e si ferma da sola (one-shot),
  // niente da tenere premuto.
  function playOneShot(channel, midiNote, waveform) {
    startVoice(channel, midiNote, waveform);
    setTileActive(channel, midiNote, true);
    setTimeout(() => {
      stopVoice(channel, 0.2);
      setTileActive(channel, midiNote, false);
    }, 180);
  }

  // ---------------------------------------------------------------------
  // Logica "raggio": quantizza un valore continuo (0-127) su una nota
  // della scala configurata — stesso principio delle Divisions Soundbeam.
  // ---------------------------------------------------------------------

  function quantizeToScale(value0to127, scale) {
    const index = Math.min(scale.length - 1, Math.floor((value0to127 / 128) * scale.length));
    return { note: scale[index], divisionIndex: index };
  }

  function handleRaggioContinuous(channel, cfg, value0to127) {
    const state = channelState[channel];
    const { note, divisionIndex } = quantizeToScale(value0to127, cfg.scale);

    if (divisionIndex === state.lastDivision) return; // stessa division, nessun ritrigger (comportamento Re-Trigger)
    state.lastDivision = divisionIndex;
    state.activeNote = note;

    startVoice(channel, note, cfg.waveform);
    setTileActive(channel, note, true);
  }

  function handleRaggioRelease(channel) {
    const state = channelState[channel];
    state.lastDivision = null;
    state.activeNote = null;
    stopVoice(channel);
    setTileActive(channel, null, false);
  }

  // ---------------------------------------------------------------------
  // Ingresso MIDI reale (Web MIDI API)
  // ---------------------------------------------------------------------

  function setStatus(text, kind) {
    statusEl.textContent = `MIDI: ${text}`;
    statusEl.className = "status" + (kind ? " " + kind : "");
  }

  // -----------------------------------------------------------------------
  // Monitor MIDI grezzo: mostra OGNI messaggio in arrivo, indipendentemente
  // dalla mappatura in config/mapping.js. Serve a scoprire su quale canale/
  // numero manda davvero un jack dell'eobody quando ci si collega un
  // sensore, senza doverlo indovinare.
  // -----------------------------------------------------------------------

  const midiLogEl = document.getElementById("midiLog");
  const COMMAND_NAMES = { 0x90: "Note On", 0x80: "Note Off", 0xb0: "Control Change" };

  function logMidiMessage(channel, command, data1, data2) {
    if (!midiLogEl) return;
    const name = COMMAND_NAMES[command] || `0x${command.toString(16)}`;
    const line = document.createElement("div");
    line.textContent = `canale ${channel} · ${name} · dato1=${data1} dato2=${data2}`;
    midiLogEl.prepend(line);
    while (midiLogEl.children.length > 30) midiLogEl.removeChild(midiLogEl.lastChild);
  }

  function onMidiMessage(event) {
    const [statusByte, data1, data2] = event.data;
    const command = statusByte & 0xf0;
    const channel = (statusByte & 0x0f) + 1; // i canali MIDI vanno da 1 a 16

    logMidiMessage(channel, command, data1, data2); // sempre, anche se il canale non e' ancora mappato

    const cfg = MAPPING.channels[channel];
    if (!cfg) return; // canale non (ancora) mappato in config/mapping.js: nessun suono, ma resta visibile nel monitor qui sopra

    if (command === 0x90 && data2 > 0) {
      // Note On diretto (es. un sensore gia' configurato per mandare note dirette)
      if (cfg.type === "tavoletta") playOneShot(channel, cfg.note, cfg.waveform);
      else {
        startVoice(channel, data1, cfg.waveform);
        setTileActive(channel, data1, true);
      }
    } else if (command === 0x80 || (command === 0x90 && data2 === 0)) {
      // Note Off
      if (cfg.type === "raggio") handleRaggioRelease(channel);
    } else if (command === 0xb0) {
      // Control Change: il caso tipico di un sensore continuo (es. eobody)
      if (cfg.type === "raggio") {
        if (data2 === 0) handleRaggioRelease(channel);
        else handleRaggioContinuous(channel, cfg, data2);
      } else if (cfg.type === "tavoletta" && data2 > 0) {
        playOneShot(channel, cfg.note, cfg.waveform);
      }
    }
  }

  function initWebMidi() {
    if (!navigator.requestMIDIAccess) {
      setStatus("non supportato da questo browser (usa Chrome o Edge) — uso solo tastiera", "warn");
      return;
    }
    navigator.requestMIDIAccess({ sysex: false }).then(
      (midiAccess) => {
        attachInputs(midiAccess);
        midiAccess.onstatechange = () => attachInputs(midiAccess);
      },
      () => setStatus("accesso negato — uso solo tastiera", "warn")
    );
  }

  function attachInputs(midiAccess) {
    const inputs = Array.from(midiAccess.inputs.values());
    for (const input of inputs) input.onmidimessage = onMidiMessage;

    if (inputs.length === 0) {
      setStatus("nessun dispositivo collegato — uso tastiera per test", "warn");
    } else {
      setStatus(inputs.map((i) => i.name).join(", "), "ok");
    }
  }

  // ---------------------------------------------------------------------
  // Simulazione da tastiera (finche' l'hardware vero non e' collegato)
  // ---------------------------------------------------------------------

  function initKeyboardSimulation() {
    const { raggioChannel, raggioKeys, tavolette } = MAPPING.testKeyboard;
    const raggioCfg = MAPPING.channels[raggioChannel];

    document.addEventListener("keydown", (e) => {
      ensureAudioContext();
      if (e.repeat) return;

      const keyIndex = raggioKeys.indexOf(e.key);
      if (keyIndex !== -1) {
        // ogni tasto simula una "division" del raggio, come muoversi lungo un beam
        const note = raggioCfg.scale[keyIndex % raggioCfg.scale.length];
        channelState[raggioChannel].lastDivision = keyIndex;
        startVoice(raggioChannel, note, raggioCfg.waveform);
        setTileActive(raggioChannel, note, true);
        return;
      }

      const tavoletta = tavolette.find((t) => t.key === e.key);
      if (tavoletta) {
        const cfg = MAPPING.channels[tavoletta.channel];
        playOneShot(tavoletta.channel, cfg.note, cfg.waveform);
      }
    });

    document.addEventListener("keyup", (e) => {
      const keyIndex = raggioKeys.indexOf(e.key);
      if (keyIndex !== -1) handleRaggioRelease(raggioChannel);
    });
  }

  // ---------------------------------------------------------------------
  // Sensore di presenza via Seriale USB (es. Arduino + PIR HC-SR501,
  // vedi firmware/presenza-pir/). Non passa dall'eobody ne' da Web MIDI:
  // e' una connessione diretta Arduino-browser via Web Serial API.
  // L'Arduino manda "1" quando rileva presenza, "0" quando cessa; qui
  // teniamo il suono acceso finche' dura la presenza (comportamento
  // "sostenuto", diverso dal colpo singolo di una tavoletta).
  // ---------------------------------------------------------------------

  function initRadarSerial() {
    const button = document.getElementById("radarConnect");
    if (!button) return;

    if (!("serial" in navigator)) {
      button.textContent = "Seriale non supportata (usa Chrome/Edge)";
      button.disabled = true;
      return;
    }

    button.addEventListener("click", connectRadarSerial);
  }

  async function connectRadarSerial() {
    const button = document.getElementById("radarConnect");
    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });
      button.textContent = "Sensore seriale collegato";
      button.disabled = true;
      readRadarSerial(port);
    } catch (err) {
      console.error("Connessione al sensore seriale annullata o fallita", err);
      // Errore piu' frequente: un'altra app (es. il Monitor Seriale di Arduino IDE)
      // ha gia' la porta aperta. Lo segnaliamo qui invece di fallire in silenzio.
      button.textContent = "Errore — chiudi il Monitor Seriale di Arduino IDE e riprova";
    }
  }

  async function readRadarSerial(port) {
    const textDecoder = new TextDecoderStream();
    const streamClosed = port.readable.pipeTo(textDecoder.writable);
    const reader = textDecoder.readable.getReader();
    let buffer = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;

        let newlineIndex;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          handleRadarLine(line);
        }
      }
    } finally {
      reader.releaseLock();
      await streamClosed.catch(() => {});
    }
  }

  // Come quantizeToScale, ma su un intervallo arbitrario (es. centimetri)
  // invece del tipico 0-127 MIDI — serve per sensori seriali come l'HC-SR04.
  function quantizeRangeToScale(value, min, max, scale) {
    const clamped = Math.max(min, Math.min(max, value));
    const ratio = (clamped - min) / (max - min);
    const index = Math.min(scale.length - 1, Math.floor(ratio * scale.length));
    return { note: scale[index], divisionIndex: index };
  }

  function handleRadarLine(line) {
    const cfg = MAPPING.channels.radar;
    if (!cfg) return;

    // Compatibilita' con un eventuale sensore on/off (es. PIR HC-SR501): se
    // il firmware manda "1"/"0" invece di un numero, lo trattiamo come un
    // interruttore sostenuto, non come una distanza.
    if (line === "1" || line === "0") {
      ensureAudioContext();
      if (line === "1") {
        const note = cfg.note ?? cfg.scale[0];
        startVoice("radar", note, cfg.waveform);
        setTileActive("radar", note, true);
      } else {
        stopVoice("radar");
        setTileActive("radar", null, false);
      }
      return;
    }

    const distanceCm = Number(line);
    if (!Number.isFinite(distanceCm)) return; // riga non riconosciuta (es. testo di debug): la ignoriamo

    const state = channelState.radar;
    const outOfRange = distanceCm <= 0 || distanceCm > cfg.maxCm;

    if (outOfRange) {
      if (state.lastDivision !== null) {
        state.lastDivision = null;
        stopVoice("radar");
        setTileActive("radar", null, false);
      }
      return;
    }

    ensureAudioContext();
    const { note, divisionIndex } = quantizeRangeToScale(distanceCm, cfg.minCm, cfg.maxCm, cfg.scale);
    if (divisionIndex === state.lastDivision) return; // stessa division, nessun ritrigger (comportamento Re-Trigger)

    state.lastDivision = divisionIndex;
    startVoice("radar", note, cfg.waveform);
    setTileActive("radar", note, true);
  }

  // ---------------------------------------------------------------------

  buildStage();
  initWebMidi();
  initKeyboardSimulation();
  initRadarSerial();
})();
