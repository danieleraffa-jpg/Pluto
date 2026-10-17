// Mappatura canale MIDI -> oggetto fisico -> suono.
//
// E' un file .js (non .json) di proposito: cosi' la pagina funziona anche
// aperta direttamente come file, senza bisogno di un server web, e si
// possono lasciare commenti come questo per spiegare cosa cambiare.
//
// Un "raggio" usa una SCALA di note (come le Divisions di un beam
// Soundbeam): piu' note disponibili, piu' sfumature puo' produrre chi lo
// usa. Una "tavoletta" suona sempre e solo UNA nota, ogni volta che viene
// premuta (comportamento on/off).
//
// Ogni canale puo' suonare in due modi:
//  - con un FILE AUDIO vero, se ha un campo "sample" (percorso a un .wav) —
//    e' quello che useremo quando il musicista sceglie i suoni definitivi:
//    basta sostituire il file e/o cambiare questo percorso, senza toccare
//    app.js. Il file va registrato alla nota 60 (Do centrale): per le altre
//    note viene semplicemente riprodotto piu' veloce/lento (pitch-shift).
//  - altrimenti con il sintetizzatore integrato, usando "waveform" (sine /
//    triangle / square / sawtooth) — serve solo come segnaposto finche' non
//    ci sono suoni veri.
//
// Per cambiare le note disponibili: cambia i numeri in "scale" (sono note
// MIDI, 60 = Do centrale). Per cambiare il colore del feedback visivo:
// cambia "color" (formato esadecimale, es. "#e0574a").
//
// Non serve toccare app.js per cambiare questi valori.

window.PLUTO_MAPPING = {

  channels: {
    1: {
      label: "Raggio 1",
      type: "raggio",
      trigger: "retrigger",
      scale: [60, 62, 64, 67, 69, 72, 74, 76, 79, 81],
      sample: "assets/samples/campana.wav",
      waveform: "sine", // usato solo se "sample" manca o non si carica
      color: "#e0574a",
    },
    2: {
      label: "Raggio 2",
      type: "raggio",
      trigger: "retrigger",
      scale: [48, 51, 53, 55, 58, 60, 63, 65],
      sample: "assets/samples/marimba.wav",
      waveform: "triangle",
      color: "#3c8dbc",
    },
    3: {
      label: "Tavoletta 1",
      type: "tavoletta",
      trigger: "oneshot",
      note: 60,
      sample: "assets/samples/legno.wav",
      waveform: "square",
      color: "#2ca25f",
    },
    4: {
      label: "Tavoletta 2",
      type: "tavoletta",
      trigger: "oneshot",
      note: 67,
      sample: "assets/samples/metallo.wav",
      waveform: "sawtooth",
      color: "#d9a441",
    },
    // "radar" non e' un canale MIDI (non ha un numero 1-16): e' un sensore
    // a ultrasuoni HC-SR04 collegato via USB seriale a un Arduino (vedi
    // firmware/distanza-ultrasuoni/), non attraverso l'eobody. Funziona
    // come un raggio: la distanza rilevata (in centimetri, tra minCm e
    // maxCm) sceglie una nota dalla scala - stesso principio "posizione ->
    // nota" dei raggi collegati all'eobody, solo che qui il valore arriva
    // via Seriale invece che via MIDI.
    radar: {
      label: "Radar distanza",
      type: "raggio",
      trigger: "retrigger",
      minCm: 5,
      maxCm: 80,
      scale: [55, 58, 60, 63, 65, 67, 70],
      sample: "assets/samples/cristallo.wav",
      waveform: "triangle",
      color: "#8858c8",
    },
  },

  // Simulazione da tastiera del computer, usata finche' l'hardware vero
  // non e' collegato. I tasti 1-0 pilotano il Raggio 1 come un beam
  // Soundbeam: ogni tasto e' una "Division" della scala sopra.
  testKeyboard: {
    raggioChannel: 1,
    raggioKeys: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    tavolette: [
      { key: "q", channel: 3 },
      { key: "w", channel: 4 },
    ],
  },
};
