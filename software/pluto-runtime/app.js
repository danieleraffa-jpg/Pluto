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
//  3. Per i canali "tavoletta" suona una nota (fissa, o avanzando in una
//     scala, o accendendo/spegnendo un suono sostenuto), in base al campo
//     "trigger" del canale — vedi config/mapping.js.
//  4. Suona con un sintetizzatore semplice via Web Audio (nessun file
//     audio necessario per ora: i suoni veri li sceglierà il musicista in
//     seguito, qui servono solo a verificare che il sistema risponda).
//  5. Da un feedback visivo immediato (il riquadro del canale si illumina).

(function () {
  "use strict";

  const PRESETS = window.PLUTO_PRESETS;
  const stage = document.getElementById("stage");
  const statusEl = document.getElementById("midiStatus");

  // --- stato per canale: traccia l'ultima "division" scelta per i raggi
  // (o la posizione nella sequenza per le tavolette "sequence", o lo stato
  // acceso/spento per "latching"), cosi' possiamo ritriggerare una nota
  // solo quando serve, non ad ogni singolo evento ricevuto.
  let MAPPING = null; // preset attivo: { label, channels }
  let channelState = {};

  function buildChannelState() {
    channelState = {};
    for (const ch of Object.keys(MAPPING.channels)) {
      channelState[ch] = { lastDivision: null, activeNote: null, sequenceIndex: 0, latchedOn: false };
    }
  }

  // ---------------------------------------------------------------------
  // Preset: quale set di suoni e' attivo, scelto dall'educatore
  // ---------------------------------------------------------------------

  const PRESET_STORAGE_KEY = "pluto-preset";

  function resolvePresetId(requestedId) {
    if (requestedId && PRESETS.presets[requestedId]) return requestedId;
    return PRESETS.defaultPreset;
  }

  function setPreset(id) {
    const resolved = resolvePresetId(id);
    MAPPING = PRESETS.presets[resolved];
    buildChannelState();
    stage.innerHTML = "";
    buildStage();
    try {
      localStorage.setItem(PRESET_STORAGE_KEY, resolved);
    } catch (err) {
      // storage non disponibile: la scelta vale solo per questa sessione
    }
    updatePresetSelector(resolved);
    return resolved;
  }

  function initPresetSelector() {
    const select = document.getElementById("presetSelect");
    if (!select) return;

    select.innerHTML = "";
    for (const [id, preset] of Object.entries(PRESETS.presets)) {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = preset.label;
      select.appendChild(option);
    }

    select.addEventListener("change", () => setPreset(select.value));
  }

  function updatePresetSelector(activeId) {
    const select = document.getElementById("presetSelect");
    if (select) select.value = activeId;
  }

  // ---------------------------------------------------------------------
  // Interfaccia: un riquadro per canale
  // ---------------------------------------------------------------------

  const TYPE_ICONS = {
    // "onda" per i raggi (controllo continuo), "tocco" per le tavolette (on/off)
    raggio:
      '<svg viewBox="0 0 24 24" class="type-icon" aria-hidden="true"><path d="M2 12c2 0 2-7 4-7s2 7 4 7 2-7 4-7 2 7 4 7 2-7 4-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    tavoletta:
      '<svg viewBox="0 0 24 24" class="type-icon" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>',
  };

  const tileEls = {};

  function buildStage() {
    for (const [ch, cfg] of Object.entries(MAPPING.channels)) {
      const tile = document.createElement("div");
      tile.className = "channel-tile";
      tile.style.setProperty("--tile-color", cfg.color);
      const icon = TYPE_ICONS[cfg.type] || "";
      tile.innerHTML = `
        <div>
          <div class="label">${cfg.label}</div>
          <div class="type">${icon}<span>${cfg.type}</span></div>
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
    if (on) {
      // Riavvia l'animazione dell'anello (modalita' vivace) anche su
      // trigger ravvicinati: si toglie e si rimette la classe a un frame
      // di distanza, altrimenti il browser non la considera "nuova".
      tile.classList.remove("pulse");
      void tile.offsetWidth; // forza il reflow
      tile.classList.add("pulse");
    }
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

  // ---------------------------------------------------------------------
  // Campioni audio veri (file .wav), alternativa al sintetizzatore. Se un
  // canale ha un campo "sample" in config/mapping.js, usiamo quel file al
  // posto dell'oscillatore — stessa logica di trigger, cambia solo cosa
  // suona. Pensato cosi' apposta: quando arriveranno i suoni scelti dal
  // musicista, basta cambiare il percorso del file in mapping.js, senza
  // toccare questo codice.
  // ---------------------------------------------------------------------

  const SAMPLE_BASE_NOTE = 60; // Do centrale: i file .wav sono registrati a questa altezza
  const sampleCache = {}; // url -> Promise<AudioBuffer>

  function loadSample(url) {
    if (!sampleCache[url]) {
      sampleCache[url] = fetch(url)
        .then((res) => res.arrayBuffer())
        .then((data) => ensureAudioContext().decodeAudioData(data));
    }
    return sampleCache[url];
  }

  // I campioni sono "fire and forget": ogni trigger parte una nuova
  // riproduzione che si esaurisce da sola (come un vero strumento a
  // percussione/mallet), senza bisogno di una voce da fermare esplicitamente.
  async function playSample(cfg, midiNote) {
    try {
      const buffer = await loadSample(cfg.sample);
      const ctx = ensureAudioContext();
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      source.playbackRate.value = Math.pow(2, (midiNote - SAMPLE_BASE_NOTE) / 12);
      gain.gain.value = 0.9;
      source.connect(gain).connect(ctx.destination);
      source.start();
    } catch (err) {
      console.error("Campione non caricato:", cfg.sample, err);
    }
  }

  // Punto unico per far partire un suono su un canale, sia che usi un
  // campione sia il sintetizzatore — decide quale dei due in base a
  // cfg.sample, cosi' il resto del codice non deve saperlo.
  function triggerNote(channel, cfg, midiNote) {
    if (cfg.sample) playSample(cfg, midiNote);
    else startVoice(channel, midiNote, cfg.waveform);
    setTileActive(channel, midiNote, true);
  }

  // Equivalente per il rilascio (fine pressione di un raggio): un campione
  // non va fermato (si esaurisce da solo), un oscillatore si'.
  function releaseNote(channel, cfg) {
    if (!cfg.sample) stopVoice(channel);
    setTileActive(channel, null, false);
  }

  // ---------------------------------------------------------------------
  // Logica "raggio": quantizza un valore continuo (0-127) su una nota
  // della scala configurata — stesso principio delle Divisions Soundbeam.
  // trigger "retrigger" (default): nuova division -> nuova nota, rilascio
  // -> silenzio. trigger "latching": nuova division -> nuova nota, ma il
  // rilascio NON interrompe il suono (resta finche' non cambia division).
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

    triggerNote(channel, cfg, note);
  }

  function handleRaggioRelease(channel) {
    const cfg = MAPPING.channels[channel];
    const state = channelState[channel];
    if (cfg && cfg.trigger === "latching") return; // resta acceso finche' non cambia division
    state.lastDivision = null;
    state.activeNote = null;
    releaseNote(channel, cfg || {});
  }

  // ---------------------------------------------------------------------
  // Logica "tavoletta": trigger "oneshot" (default) = sempre la stessa
  // nota, colpo breve. "sequence" = avanza di una nota nella scala a ogni
  // pressione (come le tavolette Soundbeam, che condividono il motore
  // Pitch Sequence dei beam). "latching" = ogni pressione accende/spegne
  // una nota sostenuta.
  // ---------------------------------------------------------------------

  function playOneShot(channel, cfg) {
    const mode = cfg.trigger || "oneshot";

    if (mode === "latching") {
      const state = channelState[channel];
      state.latchedOn = !state.latchedOn;
      if (state.latchedOn) triggerNote(channel, cfg, cfg.note);
      else releaseNote(channel, cfg);
      return;
    }

    let note = cfg.note;
    if (mode === "sequence" && Array.isArray(cfg.scale) && cfg.scale.length > 0) {
      const state = channelState[channel];
      note = cfg.scale[state.sequenceIndex % cfg.scale.length];
      state.sequenceIndex += 1;
    }

    triggerNote(channel, cfg, note);
    setTimeout(() => {
      if (!cfg.sample) stopVoice(channel, 0.2);
      setTileActive(channel, note, false);
    }, 180);
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
      if (cfg.type === "tavoletta") playOneShot(channel, cfg);
      else triggerNote(channel, cfg, data1);
    } else if (command === 0x80 || (command === 0x90 && data2 === 0)) {
      // Note Off
      if (cfg.type === "raggio") handleRaggioRelease(channel);
    } else if (command === 0xb0) {
      // Control Change: il caso tipico di un sensore continuo (es. eobody)
      if (cfg.type === "raggio") {
        if (data2 === 0) handleRaggioRelease(channel);
        else handleRaggioContinuous(channel, cfg, data2);
      } else if (cfg.type === "tavoletta" && data2 > 0) {
        playOneShot(channel, cfg);
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
    document.addEventListener("keydown", (e) => {
      ensureAudioContext();
      if (e.repeat) return;

      const { raggioChannel, raggioKeys, tavolette } = PRESETS.testKeyboard;
      const raggioCfg = MAPPING.channels[raggioChannel];

      const keyIndex = raggioKeys.indexOf(e.key);
      if (keyIndex !== -1 && raggioCfg) {
        // ogni tasto simula una "division" del raggio, come muoversi lungo un beam
        const note = raggioCfg.scale[keyIndex % raggioCfg.scale.length];
        channelState[raggioChannel].lastDivision = keyIndex;
        triggerNote(raggioChannel, raggioCfg, note);
        return;
      }

      const tavoletta = tavolette.find((t) => t.key === e.key);
      if (tavoletta) {
        const cfg = MAPPING.channels[tavoletta.channel];
        if (cfg) playOneShot(tavoletta.channel, cfg);
      }
    });

    document.addEventListener("keyup", (e) => {
      const { raggioChannel, raggioKeys } = PRESETS.testKeyboard;
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
          handleSerialLine(line);
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

  // Smista una riga ricevuta dall'Arduino al canale giusto. Il firmware
  // attuale (firmware/distanza-ultrasuoni/) manda righe con prefisso
  // "D:<cm>" (distanza) o "S:1"/"S:0" (switch) cosi' i due sensori possono
  // condividere la stessa connessione Seriale. Restano supportati anche i
  // vecchi formati senza prefisso (solo "radar": un numero nudo, o "1"/"0"
  // per un eventuale PIR) per compatibilita' con firmware precedenti.
  function handleSerialLine(line) {
    if (line.startsWith("D:")) handleRadarDistance(line.slice(2));
    else if (line.startsWith("S:")) handleSerialSwitch(line.slice(2));
    else if (line === "1" || line === "0") handleRadarPresence(line);
    else handleRadarDistance(line);
  }

  function handleRadarPresence(line) {
    const cfg = MAPPING.channels.radar;
    if (!cfg) return;
    ensureAudioContext();
    if (line === "1") triggerNote("radar", cfg, cfg.note ?? cfg.scale[0]);
    else releaseNote("radar", cfg);
  }

  function handleRadarDistance(line) {
    const cfg = MAPPING.channels.radar;
    if (!cfg) return;

    const distanceCm = Number(line);
    if (!Number.isFinite(distanceCm)) return; // riga non riconosciuta (es. testo di debug): la ignoriamo

    const state = channelState.radar;
    const outOfRange = distanceCm <= 0 || distanceCm > cfg.maxCm;

    if (outOfRange) {
      if (state.lastDivision !== null) {
        state.lastDivision = null;
        releaseNote("radar", cfg);
      }
      return;
    }

    ensureAudioContext();
    const { note, divisionIndex } = quantizeRangeToScale(distanceCm, cfg.minCm, cfg.maxCm, cfg.scale);
    if (divisionIndex === state.lastDivision) return; // stessa division, nessun ritrigger (comportamento Re-Trigger)

    state.lastDivision = divisionIndex;
    triggerNote("radar", cfg, note);
  }

  // Lo switch sulla Mega si comporta come una tavoletta: un colpo solo
  // alla pressione, il rilascio ("S:0") non fa suonare nulla (tranne che
  // in modalita' "latching", dove il rilascio e' comunque ignorato: solo
  // la pressione conta).
  function handleSerialSwitch(line) {
    const cfg = MAPPING.channels.switchSeriale;
    if (!cfg) return;
    if (line === "1") {
      ensureAudioContext();
      playOneShot("switchSeriale", cfg);
    }
  }

  // ---------------------------------------------------------------------
  // Modalita' tecnica: nasconde/mostra il monitor MIDI e le istruzioni da
  // tastiera. Di default sono nascosti - chi usa il tablet in sessione con
  // un paziente deve vedere solo i riquadri grandi, non un log di debug.
  // La scelta viene ricordata (per questo dispositivo/browser) cosi' non
  // bisogna riattivarla ogni volta.
  // ---------------------------------------------------------------------

  function initTechToggle() {
    const button = document.getElementById("techToggle");
    const panel = document.getElementById("debugPanel");
    if (!button || !panel) return;

    let enabled = false;
    try {
      enabled = localStorage.getItem("pluto-modalita-tecnica") === "1";
    } catch (err) {
      // storage non disponibile (es. navigazione privata): va bene, si parte da spento
    }

    function apply() {
      panel.hidden = !enabled;
      button.setAttribute("aria-pressed", String(enabled));
      button.classList.toggle("status-button--active", enabled);
    }

    button.addEventListener("click", () => {
      enabled = !enabled;
      apply();
      try {
        localStorage.setItem("pluto-modalita-tecnica", enabled ? "1" : "0");
      } catch (err) {
        // ignorato: la preferenza semplicemente non viene ricordata
      }
    });

    apply();
  }

  // ---------------------------------------------------------------------
  // Feedback vivace/sobrio: in piu' al riempimento colore (sempre attivo,
  // istantaneo), la modalita' vivace aggiunge un anello che si espande dal
  // centro del riquadro a ogni trigger (vedi @keyframes pulse-ring in
  // style.css). Di default spento: alcuni pazienti hanno sensibilita'
  // sensoriale diversa, e' l'educatore ad attivarlo consapevolmente per la
  // sessione. Stesso schema di persistenza di "Modalita' tecnica" sopra.
  // ---------------------------------------------------------------------

  function initFeedbackToggle() {
    const button = document.getElementById("feedbackToggle");
    if (!button) return;

    let vivace = false;
    try {
      vivace = localStorage.getItem("pluto-feedback-vivace") === "1";
    } catch (err) {
      // storage non disponibile: si parte da sobrio
    }

    function apply() {
      document.body.classList.toggle("feedback-vivace", vivace);
      button.setAttribute("aria-pressed", String(vivace));
      button.classList.toggle("status-button--active", vivace);
      button.textContent = vivace ? "Feedback vivace" : "Feedback sobrio";
    }

    button.addEventListener("click", () => {
      vivace = !vivace;
      apply();
      try {
        localStorage.setItem("pluto-feedback-vivace", vivace ? "1" : "0");
      } catch (err) {
        // ignorato: la preferenza semplicemente non viene ricordata
      }
    });

    apply();
  }

  // ---------------------------------------------------------------------

  let savedPresetId = null;
  try {
    savedPresetId = localStorage.getItem(PRESET_STORAGE_KEY);
  } catch (err) {
    // storage non disponibile: si parte dal preset di default
  }

  initPresetSelector();
  setPreset(savedPresetId);
  initWebMidi();
  initKeyboardSimulation();
  initRadarSerial();
  initTechToggle();
  initFeedbackToggle();
})();
