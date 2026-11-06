// Pluto — editor preset per il musicista.
//
// Pagina separata da index.html/app.js (quella la usa l'educatore in
// sessione, questa la usa chi prepara i suoni). Legge/scrive lo stesso
// window.PLUTO_PRESETS di config/mapping.js, nessun formato nuovo.
//
// Protezione: un PIN semplice, controllato qui lato client (hash, non il
// PIN in chiaro) — un deterrente contro l'apertura per sbaglio, NON una
// vera sicurezza: e' tutto statico, senza server, quindi chi legge questo
// file sorgente puo' comunque aggirarlo. Cambia PIN_HASH per cambiare PIN
// (calcola il nuovo hash SHA-256 del PIN scelto, es. con
// `echo -n "ilmiopin" | sha256sum` o la console del browser:
// `crypto.subtle.digest("SHA-256", new TextEncoder().encode("ilmiopin"))`).
//
// PIN di partenza (DA CAMBIARE): "crams2026"
const PIN_HASH = "47cc2edf528cecff3c60ed949a09490e72c81c6b084376b4871e930efb038fc0";
const UNLOCK_KEY = "pluto-editor-unlocked";

(function () {
  "use strict";

  async function sha256Hex(text) {
    const data = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function initLock() {
    const lock = document.getElementById("lockScreen");
    const app = document.getElementById("editorApp");
    const input = document.getElementById("pinInput");
    const button = document.getElementById("pinSubmit");
    const error = document.getElementById("pinError");

    function unlock() {
      lock.hidden = true;
      app.hidden = false;
      initEditor();
    }

    let already = false;
    try {
      already = sessionStorage.getItem(UNLOCK_KEY) === "1";
    } catch (err) {
      // storage non disponibile: si chiede il PIN ogni volta
    }
    if (already) {
      unlock();
      return;
    }

    async function tryUnlock() {
      const hash = await sha256Hex(input.value.trim());
      if (hash === PIN_HASH) {
        try {
          sessionStorage.setItem(UNLOCK_KEY, "1");
        } catch (err) {
          // ignorato: chiedera' di nuovo il PIN al prossimo caricamento
        }
        unlock();
      } else {
        error.textContent = "PIN errato.";
        input.value = "";
        input.focus();
      }
    }

    button.addEventListener("click", tryUnlock);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") tryUnlock();
    });
    input.focus();
  }

  // =========================================================================
  // Editor vero e proprio (chiamato solo dopo lo sblocco)
  // =========================================================================

  const CHANNEL_KEYS = ["1", "2", "3", "4", "radar", "switchSeriale"];
  const NOTE_NAMES = ["Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];
  const KNOWN_SAMPLES = [
    "assets/samples/campana.wav",
    "assets/samples/marimba.wav",
    "assets/samples/legno.wav",
    "assets/samples/metallo.wav",
    "assets/samples/cristallo.wav",
  ];

  function noteName(midi) {
    const octave = Math.floor(midi / 12) - 1;
    return `${NOTE_NAMES[midi % 12]}${octave}`;
  }

  function midiFromNameOctave(nameIndex, octave) {
    return (octave + 1) * 12 + nameIndex;
  }

  function initEditor() {
    const PRESETS = window.PLUTO_PRESETS;
    let currentPresetId = PRESETS.defaultPreset;
    let currentChannel = CHANNEL_KEYS[0];
    let dirty = false;
    let fileHandle = null; // File System Access API, se disponibile e gia' scelto

    const presetSelect = document.getElementById("presetSelect");
    const channelTabs = document.getElementById("channelTabs");
    const channelForm = document.getElementById("channelForm");
    const saveButton = document.getElementById("saveButton");
    const saveStatus = document.getElementById("saveStatus");

    function activePreset() {
      return PRESETS.presets[currentPresetId];
    }

    function markDirty() {
      dirty = true;
      saveStatus.textContent = "Modifiche non salvate";
    }

    // --- Audio di anteprima: versione minima, solo "suona una volta" -----

    let audioCtx = null;
    function ctx() {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      return audioCtx;
    }
    function midiToFrequency(note) {
      return 440 * Math.pow(2, (note - 69) / 12);
    }
    async function previewNote(cfg, note) {
      const c = ctx();
      if (cfg.sample) {
        try {
          const res = await fetch(cfg.sample);
          const buffer = await c.decodeAudioData(await res.arrayBuffer());
          const source = c.createBufferSource();
          const gain = c.createGain();
          source.buffer = buffer;
          source.playbackRate.value = Math.pow(2, (note - 60) / 12);
          gain.gain.value = 0.9;
          source.connect(gain).connect(c.destination);
          source.start();
        } catch (err) {
          alert(`Campione non trovato o non caricabile: ${cfg.sample}`);
        }
        return;
      }
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = cfg.waveform || "sine";
      osc.frequency.value = midiToFrequency(note);
      const now = c.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.01);
      gain.gain.linearRampToValueAtTime(0, now + 0.5);
      osc.connect(gain).connect(c.destination);
      osc.start();
      osc.stop(now + 0.55);
    }

    // --- Gestione preset (lista, duplica, rinomina, elimina, default) ----

    function slugify(label) {
      const base = label
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      let id = base || "preset";
      let n = 2;
      while (PRESETS.presets[id]) {
        id = `${base || "preset"}-${n}`;
        n += 1;
      }
      return id;
    }

    function renderPresetSelect() {
      presetSelect.innerHTML = "";
      for (const [id, preset] of Object.entries(PRESETS.presets)) {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = id === PRESETS.defaultPreset ? `${preset.label} ★` : preset.label;
        presetSelect.appendChild(option);
      }
      presetSelect.value = currentPresetId;
    }

    presetSelect.addEventListener("change", () => {
      currentPresetId = presetSelect.value;
      renderChannelTabs();
      renderChannelForm();
    });

    document.getElementById("presetDuplicate").addEventListener("click", () => {
      const label = prompt("Nome del nuovo preset:", `${activePreset().label} (copia)`);
      if (!label) return;
      const id = slugify(label);
      PRESETS.presets[id] = {
        label,
        channels: JSON.parse(JSON.stringify(activePreset().channels)),
      };
      currentPresetId = id;
      renderPresetSelect();
      renderChannelTabs();
      renderChannelForm();
      markDirty();
    });

    document.getElementById("presetRename").addEventListener("click", () => {
      const label = prompt("Nuovo nome del preset:", activePreset().label);
      if (!label) return;
      activePreset().label = label;
      renderPresetSelect();
      markDirty();
    });

    document.getElementById("presetDelete").addEventListener("click", () => {
      if (Object.keys(PRESETS.presets).length <= 1) {
        alert("Deve restare almeno un preset.");
        return;
      }
      if (!confirm(`Eliminare il preset "${activePreset().label}"?`)) return;
      delete PRESETS.presets[currentPresetId];
      if (PRESETS.defaultPreset === currentPresetId) {
        PRESETS.defaultPreset = Object.keys(PRESETS.presets)[0];
      }
      currentPresetId = Object.keys(PRESETS.presets)[0];
      renderPresetSelect();
      renderChannelTabs();
      renderChannelForm();
      markDirty();
    });

    document.getElementById("presetSetDefault").addEventListener("click", () => {
      PRESETS.defaultPreset = currentPresetId;
      renderPresetSelect();
      markDirty();
    });

    // --- Tab dei 6 canali (chiavi fisse, legate al cablaggio) ------------

    function renderChannelTabs() {
      channelTabs.innerHTML = "";
      for (const key of CHANNEL_KEYS) {
        const cfg = activePreset().channels[key];
        if (!cfg) continue;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "channel-tab" + (key === currentChannel ? " active" : "");
        button.innerHTML = `${cfg.label}<span class="channel-tab__type">${cfg.type}</span>`;
        button.addEventListener("click", () => {
          currentChannel = key;
          renderChannelTabs();
          renderChannelForm();
        });
        channelTabs.appendChild(button);
      }
    }

    // --- Form del canale selezionato --------------------------------------

    function triggerOptionsFor(type) {
      return type === "raggio"
        ? [
            ["retrigger", "Retrigger (nuova nota a ogni division)"],
            ["latching", "Latching (resta acceso finche' non cambia division)"],
          ]
        : [
            ["oneshot", "Oneshot (nota fissa, colpo breve)"],
            ["sequence", "Sequence (avanza nella scala a ogni pressione)"],
            ["latching", "Latching (accende/spegne un suono sostenuto)"],
          ];
    }

    function usesScale(cfg) {
      return cfg.type === "raggio" || cfg.trigger === "sequence";
    }

    function renderChannelForm() {
      const cfg = activePreset().channels[currentChannel];
      channelForm.innerHTML = "";

      const addField = (labelText, el) => {
        const field = document.createElement("div");
        field.className = "field";
        const label = document.createElement("label");
        label.textContent = labelText;
        field.appendChild(label);
        field.appendChild(el);
        channelForm.appendChild(field);
        return field;
      };

      // Etichetta
      const labelInput = document.createElement("input");
      labelInput.type = "text";
      labelInput.value = cfg.label;
      labelInput.addEventListener("input", () => {
        cfg.label = labelInput.value;
        renderChannelTabs();
        markDirty();
      });
      addField("Etichetta", labelInput);

      // Tipo (sola lettura: legato al cablaggio fisico)
      const typeEl = document.createElement("div");
      typeEl.className = "read-only-value";
      typeEl.textContent = cfg.type === "raggio" ? "Raggio (controllo continuo)" : "Tavoletta (on/off)";
      addField("Tipo (fisso, legato al cablaggio)", typeEl);

      // Trigger
      const triggerSelect = document.createElement("select");
      for (const [value, text] of triggerOptionsFor(cfg.type)) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = text;
        triggerSelect.appendChild(option);
      }
      triggerSelect.value = cfg.trigger || (cfg.type === "raggio" ? "retrigger" : "oneshot");
      triggerSelect.addEventListener("change", () => {
        cfg.trigger = triggerSelect.value;
        if (usesScale(cfg) && !Array.isArray(cfg.scale)) {
          cfg.scale = [typeof cfg.note === "number" ? cfg.note : 60];
        }
        if (!usesScale(cfg) && typeof cfg.note !== "number") {
          cfg.note = Array.isArray(cfg.scale) ? cfg.scale[0] : 60;
        }
        renderChannelForm();
        markDirty();
      });
      addField("Modalita' di trigger", triggerSelect);

      // Note: scala (lista) o nota singola, a seconda della modalita'
      if (usesScale(cfg)) {
        if (!Array.isArray(cfg.scale)) cfg.scale = [60];
        channelForm.appendChild(buildScaleField(cfg, markDirty));
      } else {
        if (typeof cfg.note !== "number") cfg.note = 60;
        channelForm.appendChild(buildSingleNoteField(cfg, markDirty));
      }

      // Min/Max cm, solo per il radar
      if (currentChannel === "radar") {
        const row = document.createElement("div");
        row.className = "field-row";
        const minInput = document.createElement("input");
        minInput.type = "number";
        minInput.value = cfg.minCm ?? 5;
        minInput.addEventListener("input", () => {
          cfg.minCm = Number(minInput.value);
          markDirty();
        });
        const maxInput = document.createElement("input");
        maxInput.type = "number";
        maxInput.value = cfg.maxCm ?? 80;
        maxInput.addEventListener("input", () => {
          cfg.maxCm = Number(maxInput.value);
          markDirty();
        });
        const minField = document.createElement("div");
        minField.className = "field";
        minField.innerHTML = "<label>Distanza minima (cm)</label>";
        minField.appendChild(minInput);
        const maxField = document.createElement("div");
        maxField.className = "field";
        maxField.innerHTML = "<label>Distanza massima (cm)</label>";
        maxField.appendChild(maxInput);
        row.appendChild(minField);
        row.appendChild(maxField);
        channelForm.appendChild(row);
      }

      // Campione audio
      const sampleInput = document.createElement("input");
      sampleInput.type = "text";
      sampleInput.setAttribute("list", "sampleSuggestions");
      sampleInput.placeholder = "assets/samples/nome.wav (vuoto = usa il sintetizzatore)";
      sampleInput.value = cfg.sample || "";
      sampleInput.addEventListener("input", () => {
        cfg.sample = sampleInput.value.trim();
        markDirty();
      });
      const datalist = document.createElement("datalist");
      datalist.id = "sampleSuggestions";
      for (const path of KNOWN_SAMPLES) {
        const option = document.createElement("option");
        option.value = path;
        datalist.appendChild(option);
      }
      const sampleField = addField("Campione audio (.wav, facoltativo)", sampleInput);
      sampleField.appendChild(datalist);

      // Forma d'onda
      const waveformSelect = document.createElement("select");
      for (const w of ["sine", "triangle", "square", "sawtooth"]) {
        const option = document.createElement("option");
        option.value = w;
        option.textContent = w;
        waveformSelect.appendChild(option);
      }
      waveformSelect.value = cfg.waveform || "sine";
      waveformSelect.addEventListener("change", () => {
        cfg.waveform = waveformSelect.value;
        markDirty();
      });
      addField("Forma d'onda (usata se manca il campione)", waveformSelect);

      const row2 = document.createElement("div");
      row2.className = "field-row";

      // Colore
      const colorInput = document.createElement("input");
      colorInput.type = "color";
      colorInput.value = cfg.color || "#7c4fd6";
      colorInput.addEventListener("input", () => {
        cfg.color = colorInput.value;
        markDirty();
      });
      const colorField = document.createElement("div");
      colorField.className = "field";
      colorField.innerHTML = "<label>Colore</label>";
      colorField.appendChild(colorInput);

      // Icona
      const iconInput = document.createElement("input");
      iconInput.type = "text";
      iconInput.value = cfg.icon || "";
      iconInput.placeholder = "🔔";
      iconInput.addEventListener("input", () => {
        cfg.icon = iconInput.value;
        markDirty();
      });
      const iconField = document.createElement("div");
      iconField.className = "field";
      iconField.innerHTML = "<label>Icona (emoji)</label>";
      iconField.appendChild(iconInput);

      row2.appendChild(colorField);
      row2.appendChild(iconField);
      channelForm.appendChild(row2);

      // Prova
      const previewRow = document.createElement("div");
      previewRow.className = "preview-row";
      const previewButton = document.createElement("button");
      previewButton.type = "button";
      previewButton.className = "status-button status-button--active";
      previewButton.textContent = "▶ Prova";
      previewButton.addEventListener("click", () => {
        const note = usesScale(cfg) ? cfg.scale[0] : cfg.note;
        previewNote(cfg, note);
      });
      previewRow.appendChild(previewButton);
      channelForm.appendChild(previewRow);
    }

    function buildSingleNoteField(cfg, onChange) {
      const field = document.createElement("div");
      field.className = "field";
      field.innerHTML = "<label>Nota</label>";

      const row = document.createElement("div");
      row.className = "note-add";
      const nameSelect = document.createElement("select");
      const octaveSelect = document.createElement("select");
      fillNameOctaveSelects(nameSelect, octaveSelect, cfg.note);
      const applyButton = document.createElement("button");
      applyButton.type = "button";
      applyButton.className = "status-button";
      applyButton.textContent = "Imposta";
      applyButton.addEventListener("click", () => {
        cfg.note = midiFromNameOctave(Number(nameSelect.value), Number(octaveSelect.value));
        currentLabel.textContent = noteName(cfg.note);
        onChange();
      });

      const currentLabel = document.createElement("span");
      currentLabel.className = "note-chip";
      currentLabel.textContent = noteName(cfg.note);

      row.appendChild(currentLabel);
      row.appendChild(nameSelect);
      row.appendChild(octaveSelect);
      row.appendChild(applyButton);
      field.appendChild(row);
      return field;
    }

    function buildScaleField(cfg, onChange) {
      const field = document.createElement("div");
      field.className = "field";
      field.innerHTML = "<label>Scala (note in ordine, dalla piu' grave alla piu' acuta)</label>";

      const chips = document.createElement("div");
      chips.className = "note-chips";

      function renderChips() {
        chips.innerHTML = "";
        cfg.scale.sort((a, b) => a - b);
        for (const midi of cfg.scale) {
          const chip = document.createElement("span");
          chip.className = "note-chip";
          chip.textContent = noteName(midi) + " ";
          const remove = document.createElement("button");
          remove.type = "button";
          remove.textContent = "×";
          remove.title = "Rimuovi";
          remove.addEventListener("click", () => {
            if (cfg.scale.length <= 1) {
              alert("La scala deve avere almeno una nota.");
              return;
            }
            cfg.scale = cfg.scale.filter((n) => n !== midi);
            renderChips();
            onChange();
          });
          chip.appendChild(remove);
          chips.appendChild(chip);
        }
      }
      renderChips();

      const row = document.createElement("div");
      row.className = "note-add";
      const nameSelect = document.createElement("select");
      const octaveSelect = document.createElement("select");
      fillNameOctaveSelects(nameSelect, octaveSelect, 60);
      const addButton = document.createElement("button");
      addButton.type = "button";
      addButton.className = "status-button";
      addButton.textContent = "Aggiungi nota";
      addButton.addEventListener("click", () => {
        const midi = midiFromNameOctave(Number(nameSelect.value), Number(octaveSelect.value));
        if (!cfg.scale.includes(midi)) cfg.scale.push(midi);
        renderChips();
        onChange();
      });
      row.appendChild(nameSelect);
      row.appendChild(octaveSelect);
      row.appendChild(addButton);

      field.appendChild(chips);
      field.appendChild(row);
      return field;
    }

    function fillNameOctaveSelects(nameSelect, octaveSelect, initialMidi) {
      NOTE_NAMES.forEach((name, i) => {
        const option = document.createElement("option");
        option.value = String(i);
        option.textContent = name;
        nameSelect.appendChild(option);
      });
      for (let o = -1; o <= 8; o++) {
        const option = document.createElement("option");
        option.value = String(o);
        option.textContent = `ottava ${o}`;
        octaveSelect.appendChild(option);
      }
      const octave = Math.floor(initialMidi / 12) - 1;
      nameSelect.value = String(initialMidi % 12);
      octaveSelect.value = String(octave);
    }

    // --- Salvataggio: serializza PRESETS in testo mapping.js -------------

    const HEADER_COMMENT = `// Mappatura canale MIDI -> oggetto fisico -> suono.
//
// E' un file .js (non .json) di proposito: cosi' la pagina funziona anche
// aperta direttamente come file, senza bisogno di un server web.
//
// Il file definisce PIU' PRESET (set di suoni gia' pronti): l'educatore
// sceglie quale usare dal selettore nell'header dell'app, senza toccare
// file o codice. Ogni preset ha le STESSE CHIAVI di canale (1, 2, 3, 4,
// "radar", "switchSeriale") perche' sono legate al cablaggio fisico
// (quale jack dell'eobody o quale pin Arduino) — cambia solo COSA suona
// ogni canale, non A COSA e' collegato.
//
// Generato/modificato con l'editor visuale (editor.html): per cambiare i
// valori conviene continuare a usare quello, invece di editare questo file
// a mano — un salvataggio dall'editor rigenera questo blocco e il resto del
// file, perdendo eventuali commenti aggiunti a mano sui singoli valori.
//
// Un "raggio" usa una SCALA di note. Una "tavoletta" di norma suona sempre
// e solo UNA nota a ogni pressione, ma puo' anche lei usare una scala se
// "trigger" e' impostato su "sequence".
//
// Ogni canale puo' suonare con un FILE AUDIO vero ("sample", percorso a un
// .wav, registrato alla nota 60/Do centrale) oppure, se manca, con il
// sintetizzatore integrato ("waveform": sine/triangle/square/sawtooth).
//
// Campo "trigger": raggio -> "retrigger" (default) o "latching". tavoletta
// -> "oneshot" (default), "sequence" (richiede "scale") o "latching".
//
// Campo "icon" (facoltativo): un'emoji mostrata in grande sul riquadro.
`;

    function jsString(value) {
      return JSON.stringify(value);
    }

    function serializeChannel(key, cfg) {
      const lines = [];
      lines.push(`          label: ${jsString(cfg.label)},`);
      lines.push(`          type: ${jsString(cfg.type)},`);
      lines.push(`          trigger: ${jsString(cfg.trigger || (cfg.type === "raggio" ? "retrigger" : "oneshot"))},`);
      if (usesScale(cfg)) {
        lines.push(`          scale: [${cfg.scale.join(", ")}],`);
      } else {
        lines.push(`          note: ${cfg.note},`);
      }
      if (key === "radar") {
        lines.push(`          minCm: ${cfg.minCm ?? 5},`);
        lines.push(`          maxCm: ${cfg.maxCm ?? 80},`);
      }
      if (cfg.sample) lines.push(`          sample: ${jsString(cfg.sample)},`);
      lines.push(`          waveform: ${jsString(cfg.waveform || "sine")},`);
      lines.push(`          color: ${jsString(cfg.color || "#7c4fd6")},`);
      if (cfg.icon) lines.push(`          icon: ${jsString(cfg.icon)},`);
      return lines.join("\n");
    }

    function serializeMapping() {
      const parts = [HEADER_COMMENT, "\nwindow.PLUTO_PRESETS = {\n"];
      parts.push(`  defaultPreset: ${jsString(PRESETS.defaultPreset)},\n\n`);
      parts.push("  presets: {\n\n");
      for (const [id, preset] of Object.entries(PRESETS.presets)) {
        parts.push(`    ${/^[a-zA-Z_$][\w$]*$/.test(id) ? id : jsString(id)}: {\n`);
        parts.push(`      label: ${jsString(preset.label)},\n`);
        parts.push("      channels: {\n");
        for (const key of CHANNEL_KEYS) {
          const cfg = preset.channels[key];
          if (!cfg) continue;
          const keyLiteral = /^\d+$/.test(key) ? key : key;
          parts.push(`        ${keyLiteral}: {\n`);
          parts.push(serializeChannel(key, cfg) + "\n");
          parts.push("        },\n");
        }
        parts.push("      },\n");
        parts.push("    },\n\n");
      }
      parts.push("  },\n\n");
      parts.push("  testKeyboard: {\n");
      parts.push(`    raggioChannel: ${jsString(PRESETS.testKeyboard.raggioChannel)},\n`);
      parts.push(`    raggioKeys: [${PRESETS.testKeyboard.raggioKeys.map(jsString).join(", ")}],\n`);
      parts.push("    tavolette: [\n");
      for (const t of PRESETS.testKeyboard.tavolette) {
        parts.push(`      { key: ${jsString(t.key)}, channel: ${jsString(t.channel)} },\n`);
      }
      parts.push("    ],\n");
      parts.push("  },\n");
      parts.push("};\n");
      return parts.join("");
    }

    async function saveViaFileSystemAccess(text) {
      if (!fileHandle) {
        fileHandle = await window.showSaveFilePicker({
          suggestedName: "mapping.js",
          types: [{ description: "JavaScript", accept: { "text/javascript": [".js"] } }],
        });
      }
      const writable = await fileHandle.createWritable();
      await writable.write(text);
      await writable.close();
    }

    function saveViaDownload(text) {
      const blob = new Blob([text], { type: "text/javascript" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mapping.js";
      a.click();
      URL.revokeObjectURL(url);
    }

    saveButton.addEventListener("click", async () => {
      const text = serializeMapping();
      try {
        if (window.showSaveFilePicker) {
          await saveViaFileSystemAccess(text);
          saveStatus.textContent = "Salvato su config/mapping.js";
        } else {
          saveViaDownload(text);
          saveStatus.textContent = "Scaricato: spostalo in config/mapping.js";
        }
        dirty = false;
      } catch (err) {
        if (err && err.name === "AbortError") return; // utente ha annullato la scelta del file
        console.error(err);
        saveStatus.textContent = "Errore nel salvataggio, vedi console";
      }
    });

    window.addEventListener("beforeunload", (e) => {
      if (dirty) e.preventDefault();
    });

    // --- Avvio -------------------------------------------------------------

    renderPresetSelect();
    renderChannelTabs();
    renderChannelForm();
  }

  initLock();
})();
