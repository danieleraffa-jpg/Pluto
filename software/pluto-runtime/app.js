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
    resetChannelGains();
    stage.innerHTML = "";
    buildStage();
    buildMixerPanel();
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
        <div class="channel-tile__top">
          <div>
            <div class="label">${cfg.label}</div>
            <div class="type">${icon}<span>${cfg.type}</span></div>
          </div>
          ${cfg.icon ? `<div class="icon-emoji" aria-hidden="true">${cfg.icon}</div>` : ""}
        </div>
        <div class="note">–</div>
      `;
      // "Tocca per provare": utile all'educatore per sentire/controllare i
      // suoni di un preset senza bisogno di tastiera o hardware collegato —
      // per una tavoletta e' identico a una pressione vera (stessa logica
      // in playOneShot, incluse le modalita' sequence/latching); per un
      // raggio e' solo un'anteprima breve, non interferisce con la lettura
      // della posizione reale (vedi previewChannel).
      tile.addEventListener("click", () => previewChannel(ch, cfg));
      stage.appendChild(tile);
      tileEls[ch] = tile;
    }
  }

  function previewChannel(channel, cfg) {
    ensureAudioContext();
    if (cfg.type === "tavoletta") {
      playOneShot(channel, cfg);
      return;
    }
    // Raggio: nessuna posizione reale da leggere qui, quindi facciamo
    // sentire una nota della scala (una diversa a ogni tocco, cosi' si
    // puo' farsi un'idea dell'intera scala), come un colpo breve.
    const state = channelState[channel];
    const note = cfg.scale[state.sequenceIndex % cfg.scale.length];
    state.sequenceIndex += 1;
    triggerNote(channel, cfg, note);
    setTimeout(() => {
      if (!cfg.sample) stopVoice(channel, 0.2);
      if (state.lastDivision === null) setTileActive(channel, note, false);
    }, 250);
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
  let masterGain = null; // tutto passa di qui: un solo nodo per il volume generale (vedi initVolumeControl)
  const voices = {}; // channel -> { oscillator, gain }

  function ensureAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = readStoredVolume();
      masterGain.connect(audioCtx.destination);
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  // ---------------------------------------------------------------------
  // Mixer per canale: un GainNode (volume/muto/solo) seguito da uno
  // StereoPannerNode (pan) per canale, tra la voce/il campione e il
  // masterGain — il bilanciamento tra i vari sensori, separato dal volume
  // generale. Parte dai campi "volume"/"muted"/"pan" del canale nel preset
  // (il mix di base scelto dal musicista), ma il pannello "Mixer canali"
  // dell'app (vedi buildMixerPanel) li puo' ritoccare "al momento": quella
  // modifica vale solo per la sessione corrente, si perde cambiando preset
  // o ricaricando la pagina — per renderla permanente serve l'editor.
  // "Solo" invece non si salva mai nel preset: e' solo un aiuto per
  // ascoltare un canale alla volta durante la sessione corrente.
  // ---------------------------------------------------------------------

  let channelGains = {}; // channel -> GainNode
  let channelPanners = {}; // channel -> StereoPannerNode
  let channelVolumeOverrides = {}; // channel -> 0..1, impostati dal mixer in questa sessione
  let channelMuteOverrides = {}; // channel -> boolean, impostati dal mixer in questa sessione
  let channelPanOverrides = {}; // channel -> -1..1, impostati dal mixer in questa sessione
  let soloedChannels = new Set(); // canali isolati "al momento" (nessuno = tutti udibili)

  function resetChannelGains() {
    for (const gain of Object.values(channelGains)) {
      try {
        gain.disconnect();
      } catch (err) {
        // gia' scollegato: va bene
      }
    }
    for (const panner of Object.values(channelPanners)) {
      try {
        panner.disconnect();
      } catch (err) {
        // gia' scollegato: va bene
      }
    }
    channelGains = {};
    channelPanners = {};
    // ogni preset riparte dal proprio mix di base, non da quello del preset precedente
    channelVolumeOverrides = {};
    channelMuteOverrides = {};
    channelPanOverrides = {};
    soloedChannels = new Set();
  }

  function channelVolume(channel, cfg) {
    const base = cfg && typeof cfg.volume === "number" ? cfg.volume : 1;
    return channel in channelVolumeOverrides ? channelVolumeOverrides[channel] : base;
  }

  function channelMuted(channel, cfg) {
    const base = !!(cfg && cfg.muted);
    return channel in channelMuteOverrides ? channelMuteOverrides[channel] : base;
  }

  function channelPan(channel, cfg) {
    const base = cfg && typeof cfg.pan === "number" ? cfg.pan : 0;
    return channel in channelPanOverrides ? channelPanOverrides[channel] : base;
  }

  // Ricalcola e applica il guadagno effettivo di un canale, tenendo conto
  // di volume, muto e dell'eventuale "solo" attivo su uno o piu' altri
  // canali (se qualcuno e' in solo, tutti i non-solo restano a zero).
  function updateChannelAudibility(channel) {
    const gain = channelGains[channel];
    if (!gain) return;
    const cfg = MAPPING.channels[channel];
    const muted = channelMuted(channel, cfg);
    const audible = !muted && (soloedChannels.size === 0 || soloedChannels.has(channel));
    gain.gain.value = audible ? channelVolume(channel, cfg) : 0;
  }

  function updateAllChannelsAudibility() {
    for (const channel of Object.keys(MAPPING.channels)) updateChannelAudibility(channel);
  }

  function getChannelGain(channel) {
    const ctx = ensureAudioContext();
    if (!channelGains[channel]) {
      const cfg = MAPPING.channels[channel];
      const gain = ctx.createGain();
      const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (panner) {
        panner.pan.value = channelPan(channel, cfg);
        gain.connect(panner).connect(masterGain);
      } else {
        gain.connect(masterGain); // browser senza StereoPannerNode: niente pan, resto invariato
      }
      channelGains[channel] = gain;
      if (panner) channelPanners[channel] = panner;
      updateChannelAudibility(channel);
    }
    return channelGains[channel];
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

    osc.connect(gain).connect(getChannelGain(channel));
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
  async function playSample(channel, cfg, midiNote) {
    try {
      const buffer = await loadSample(cfg.sample);
      const ctx = ensureAudioContext();
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      source.playbackRate.value = Math.pow(2, (midiNote - SAMPLE_BASE_NOTE) / 12);
      gain.gain.value = 0.9;
      source.connect(gain).connect(getChannelGain(channel));
      source.start();
    } catch (err) {
      console.error("Campione non caricato:", cfg.sample, err);
    }
  }

  // Punto unico per far partire un suono su un canale, sia che usi un
  // campione sia il sintetizzatore — decide quale dei due in base a
  // cfg.sample, cosi' il resto del codice non deve saperlo.
  function triggerNote(channel, cfg, midiNote) {
    if (cfg.sample) playSample(channel, cfg, midiNote);
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
  // Gesto nascosto per raggiungere l'editor dei preset (editor.html) senza
  // dover conoscere/scrivere l'indirizzo a mano: 5 tocchi rapidi sul logo
  // "Pluto" nell'header. Nessun pulsante visibile apposta — l'editor non e'
  // pensato per l'educatore (vedi editor.js), solo per chi prepara i suoni
  // e sa che il gesto esiste. Stesso principio del gesto nascosto gia' in
  // uso nell'app Android (vedi android-kiosk/.../MainActivity.kt).
  // ---------------------------------------------------------------------

  function initEditorGesture() {
    const titleEl = document.querySelector("header h1");
    if (!titleEl) return;

    let count = 0;
    let lastTap = 0;

    titleEl.addEventListener("click", () => {
      const now = Date.now();
      if (now - lastTap > 1500) count = 0;
      lastTap = now;
      count += 1;
      if (count >= 5) {
        count = 0;
        window.location.href = "editor.html";
      }
    });
  }

  // ---------------------------------------------------------------------
  // "Silenzia tutto": spegne subito ogni suono attivo e riporta tutti i
  // riquadri a riposo. Pensato come sicurezza in sessione (es. una
  // tavoletta "latching" rimasta accesa per sbaglio), non serve passare
  // canale per canale.
  // ---------------------------------------------------------------------

  function stopAll() {
    for (const [ch, cfg] of Object.entries(MAPPING.channels)) {
      const state = channelState[ch];
      state.lastDivision = null;
      state.activeNote = null;
      state.latchedOn = false;
      if (!cfg.sample) stopVoice(ch);
      setTileActive(ch, null, false);
    }
  }

  function initStopAll() {
    const button = document.getElementById("stopAll");
    if (!button) return;
    button.addEventListener("click", stopAll);
  }

  // ---------------------------------------------------------------------
  // Volume generale: un solo cursore controlla il guadagno master (vedi
  // masterGain in ensureAudioContext) a cui tutte le voci/campioni sono
  // collegati — non serve toccare il volume di ogni canale singolarmente.
  // Ricordato tra una sessione e l'altra come le altre preferenze sopra.
  // ---------------------------------------------------------------------

  const VOLUME_STORAGE_KEY = "pluto-volume";

  function readStoredVolume() {
    try {
      const raw = localStorage.getItem(VOLUME_STORAGE_KEY);
      const value = raw === null ? NaN : Number(raw);
      if (Number.isFinite(value) && value >= 0 && value <= 1) return value;
    } catch (err) {
      // storage non disponibile: volume di default
    }
    return 0.8;
  }

  function initVolumeControl() {
    const slider = document.getElementById("volumeSlider");
    if (!slider) return;

    slider.value = String(Math.round(readStoredVolume() * 100));

    slider.addEventListener("input", () => {
      const value = Number(slider.value) / 100;
      if (masterGain) masterGain.gain.value = value;
      try {
        localStorage.setItem(VOLUME_STORAGE_KEY, String(value));
      } catch (err) {
        // ignorato: la preferenza semplicemente non viene ricordata
      }
    });
  }

  // ---------------------------------------------------------------------
  // Mixer canali: uno slider per canale, per bilanciare i vari sensori "al
  // momento" (es. durante una prova, per campionare meglio il brano) senza
  // dover aprire l'editor del musicista. Nascosto di default (come la
  // modalita' tecnica) dietro il pulsante "Mixer canali": e' pensato per
  // chi sa cosa sta facendo, non per l'uso quotidiano con il paziente.
  // Le regolazioni fatte qui valgono SOLO per questa sessione (si perdono
  // cambiando preset o ricaricando la pagina) — per salvarle nel preset in
  // modo permanente serve l'editor visuale (editor.html).
  // ---------------------------------------------------------------------

  function panLabel(value) {
    const pct = Math.round(Math.abs(value) * 100);
    if (pct === 0) return "C";
    return value < 0 ? `S${pct}` : `D${pct}`;
  }

  function buildMixerPanel() {
    const container = document.getElementById("mixerSliders");
    if (!container) return;
    container.innerHTML = "";
    for (const [ch, cfg] of Object.entries(MAPPING.channels)) {
      const baseVolume = typeof cfg.volume === "number" ? cfg.volume : 1;
      const basePan = typeof cfg.pan === "number" ? cfg.pan : 0;
      const baseMuted = !!cfg.muted;

      const row = document.createElement("div");
      row.className = "mixer-row";
      row.innerHTML = `
        <div class="mixer-row__head">
          <span class="mixer-row__label">${cfg.label}</span>
          <button type="button" class="mixer-mini-btn" data-role="mute" aria-pressed="${baseMuted}">Muto</button>
          <button type="button" class="mixer-mini-btn" data-role="solo" aria-pressed="false">Solo</button>
        </div>
        <label class="mixer-slider-row">
          <span class="mixer-slider-row__label">Volume</span>
          <input type="range" min="0" max="100" value="${Math.round(baseVolume * 100)}" aria-label="Volume ${cfg.label}" />
          <span class="mixer-slider-row__value" data-role="volumeValue">${Math.round(baseVolume * 100)}%</span>
        </label>
        <label class="mixer-slider-row">
          <span class="mixer-slider-row__label">Pan</span>
          <input type="range" min="-100" max="100" value="${Math.round(basePan * 100)}" aria-label="Pan ${cfg.label}" />
          <span class="mixer-slider-row__value" data-role="panValue">${panLabel(basePan)}</span>
        </label>
      `;

      const muteBtn = row.querySelector('[data-role="mute"]');
      const soloBtn = row.querySelector('[data-role="solo"]');
      const volumeSlider = row.querySelector('input[aria-label^="Volume"]');
      const panSlider = row.querySelector('input[aria-label^="Pan"]');
      const volumeValue = row.querySelector('[data-role="volumeValue"]');
      const panValue = row.querySelector('[data-role="panValue"]');

      volumeSlider.addEventListener("input", () => {
        const value = Number(volumeSlider.value) / 100;
        channelVolumeOverrides[ch] = value;
        volumeValue.textContent = `${volumeSlider.value}%`;
        getChannelGain(ch); // assicura che il nodo esista prima di ricalcolare
        updateChannelAudibility(ch);
      });

      panSlider.addEventListener("input", () => {
        const value = Number(panSlider.value) / 100;
        channelPanOverrides[ch] = value;
        panValue.textContent = panLabel(value);
        getChannelGain(ch);
        if (channelPanners[ch]) channelPanners[ch].pan.value = value;
      });

      muteBtn.addEventListener("click", () => {
        const next = !channelMuted(ch, cfg);
        channelMuteOverrides[ch] = next;
        muteBtn.setAttribute("aria-pressed", String(next));
        muteBtn.classList.toggle("mixer-mini-btn--active", next);
        getChannelGain(ch);
        updateChannelAudibility(ch);
      });

      soloBtn.addEventListener("click", () => {
        if (soloedChannels.has(ch)) soloedChannels.delete(ch);
        else soloedChannels.add(ch);
        // aggiorna lo stato visivo di TUTTI i pulsanti solo, non solo questo:
        // con piu' canali in solo, ognuno deve restare evidenziato
        container.querySelectorAll('[data-role="solo"]').forEach((btn) => {
          const btnChannel = btn.closest(".mixer-row").dataset.channel;
          const active = soloedChannels.has(btnChannel);
          btn.setAttribute("aria-pressed", String(active));
          btn.classList.toggle("mixer-mini-btn--active", active);
        });
        updateAllChannelsAudibility();
      });

      row.dataset.channel = ch;
      container.appendChild(row);
    }
  }

  function initMixerToggle() {
    const button = document.getElementById("mixerToggle");
    const panel = document.getElementById("mixerPanel");
    if (!button || !panel) return;

    let enabled = false;
    try {
      enabled = localStorage.getItem("pluto-mixer-visibile") === "1";
    } catch (err) {
      // storage non disponibile: si parte da nascosto
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
        localStorage.setItem("pluto-mixer-visibile", enabled ? "1" : "0");
      } catch (err) {
        // ignorato: la preferenza semplicemente non viene ricordata
      }
    });

    apply();
  }

  // ---------------------------------------------------------------------
  // Chiudi app: visibile solo dentro il wrapper Android (window.PlutoApp,
  // iniettato da MainActivity.kt), dove serve un modo comodo per uscire
  // dalla kiosk mode senza passare dal gesto nascosto nell'angolo. In un
  // browser normale (es. durante lo sviluppo) non c'e' nulla da chiudere
  // in questo senso, quindi il pulsante resta nascosto. Conferma con un
  // overlay nostro, non window.confirm(): la WebView dell'app non ha un
  // WebChromeClient configurato e potrebbe non mostrare i dialog nativi.
  // ---------------------------------------------------------------------

  function initCloseButton() {
    const button = document.getElementById("closeButton");
    const overlay = document.getElementById("closeConfirm");
    const yesButton = document.getElementById("closeConfirmYes");
    const noButton = document.getElementById("closeConfirmNo");
    if (!button || !overlay || !yesButton || !noButton) return;

    const bridge = window.PlutoApp;
    if (!bridge || typeof bridge.chiudi !== "function") return; // niente da chiudere qui

    button.hidden = false;
    button.addEventListener("click", () => {
      overlay.hidden = false;
    });
    noButton.addEventListener("click", () => {
      overlay.hidden = true;
    });
    yesButton.addEventListener("click", () => {
      bridge.chiudi();
    });
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
  initMixerToggle();
  initStopAll();
  initVolumeControl();
  initEditorGesture();
  initCloseButton();
})();
