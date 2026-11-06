// Mappatura canale MIDI -> oggetto fisico -> suono.
//
// E' un file .js (non .json) di proposito: cosi' la pagina funziona anche
// aperta direttamente come file, senza bisogno di un server web, e si
// possono lasciare commenti come questo per spiegare cosa cambiare.
//
// Il file definisce PIU' PRESET (set di suoni gia' pronti): l'educatore
// sceglie quale usare dal selettore nell'header dell'app, senza toccare
// file o codice. Ogni preset ha le STESSE CHIAVI di canale (1, 2, 3, 4,
// "radar", "switchSeriale") perche' sono legate al cablaggio fisico
// (quale jack dell'eobody o quale pin Arduino) — cambia solo COSA suona
// ogni canale, non A COSA e' collegato.
//
// Per aggiungere un preset: copia un blocco esistente dentro "presets",
// dagli una chiave nuova (es. "natale") e un "label" leggibile, poi cambia
// suoni/scale/colori a piacere. Comparira' da solo nel selettore.
//
// Un "raggio" usa una SCALA di note (come le Divisions di un beam
// Soundbeam): piu' note disponibili, piu' sfumature puo' produrre chi lo
// usa. Una "tavoletta" di norma suona sempre e solo UNA nota a ogni
// pressione (comportamento on/off), ma puo' anche lei usare una scala se
// "trigger" e' impostato su "sequence" (vedi sotto).
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
// Campo "trigger" — come parte/si ferma il suono (si puo' omettere: il
// comportamento di default e' quello di sempre, invariato):
//  - raggio: "retrigger" (default) = una nuova nota ogni volta che si
//    cambia "division" lungo il raggio, si ferma al rilascio. "latching" =
//    uguale, ma il suono NON si interrompe al rilascio: resta finche' non
//    si raggiunge una nuova division. Utile per chi non riesce a mantenere
//    ferma una posizione ma deve comunque sentire un suono continuo.
//  - tavoletta: "oneshot" (default) = suona sempre "note", un colpo breve
//    per pressione. "sequence" = richiede anche una "scale": ogni
//    pressione avanza di una nota nella scala (poi ricomincia dall'inizio),
//    sempre come colpo breve — le tavolette Soundbeam funzionano cosi'.
//    "latching" = ogni pressione accende/spegne (come un interruttore) una
//    nota sostenuta, usando "note": utile per un suono di sottofondo che
//    il paziente puo' accendere e lasciare acceso.
//
// Per cambiare le note disponibili: cambia i numeri in "scale" (sono note
// MIDI, 60 = Do centrale). Per cambiare il colore del feedback visivo:
// cambia "color" (formato esadecimale, es. "#e0574a").
//
// Campo "volume" (facoltativo, da 0 a 1, default 1): il bilanciamento di
// questo canale rispetto agli altri — un mix di base pensato per chi
// prepara il preset (es. un campione naturalmente piu' forte di un altro).
// Il musicista lo regola qui o nell'editor visuale; chi usa l'app in
// sessione puo' comunque ritoccarlo al momento dal pannello "Mixer canali"
// (nascosto di default), ma SOLO per quella sessione: non tocca questo
// file e si perde al ricaricamento della pagina.
//
// Campo "icon" (facoltativo): un'emoji mostrata in grande sul riquadro,
// utile a pazienti che non leggono per riconoscere i canali a colpo
// d'occhio — a scelta libera, non serve che corrisponda letteralmente al
// suono (es. 🔔 per il campanello, 🪵 per il legno).

window.PLUTO_PRESETS = {

  defaultPreset: "classico",

  presets: {

    classico: {
      label: "Classico",
      channels: {
        1: {
          label: "Raggio 1",
          type: "raggio",
          trigger: "retrigger",
          scale: [60, 62, 64, 67, 69, 72, 74, 76, 79, 81],
          sample: "assets/samples/campana.wav",
          waveform: "sine", // usato solo se "sample" manca o non si carica
          volume: 1,
          color: "#e0574a",
          icon: "🔔",
        },
        2: {
          label: "Raggio 2",
          type: "raggio",
          trigger: "retrigger",
          scale: [48, 51, 53, 55, 58, 60, 63, 65],
          sample: "assets/samples/marimba.wav",
          waveform: "triangle",
          volume: 1,
          color: "#3c8dbc",
          icon: "🎶",
        },
        3: {
          label: "Tavoletta 1",
          type: "tavoletta",
          trigger: "oneshot",
          note: 60,
          sample: "assets/samples/legno.wav",
          waveform: "square",
          volume: 1,
          color: "#2ca25f",
          icon: "🪵",
        },
        4: {
          label: "Tavoletta 2",
          type: "tavoletta",
          trigger: "oneshot",
          note: 67,
          sample: "assets/samples/metallo.wav",
          waveform: "sawtooth",
          volume: 1,
          color: "#d9a441",
          icon: "⚙️",
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
          volume: 1,
          color: "#8858c8",
          icon: "🔮",
        },
        // "switchSeriale" nemmeno questo e' un canale MIDI: e' un interruttore
        // (es. mini switch su breadboard) collegato a un pin digitale della
        // stessa Arduino del radar, con il pull-up interno del microcontrollore
        // (nessuna resistenza esterna necessaria, a differenza dei jack
        // dell'eobody). Si comporta come una tavoletta: un suono per pressione.
        switchSeriale: {
          label: "Switch Arduino",
          type: "tavoletta",
          trigger: "oneshot",
          note: 72,
          sample: "assets/samples/legno.wav",
          waveform: "square",
          volume: 1,
          color: "#e0a830",
          icon: "🪵",
        },
      },
    },

    // Preset d'esempio per mostrare le nuove modalita' di trigger: una
    // tavoletta "a sequenza" e un raggio "latching" (vedi spiegazione sopra).
    // Siccome riusa inevitabilmente gli stessi 5 file .wav placeholder del
    // preset "classico" (il repertorio vero arrivera' dal musicista), per
    // farlo suonare davvero diverso GIA' AL PRIMO TOCCO ogni canale usa qui
    // un campione DIVERSO dal suo corrispondente in "classico" (mai lo
    // stesso file sullo stesso canale) e un registro (acuto/grave)
    // nettamente scostato, non solo note/colori diversi.
    giocoso: {
      label: "Giocoso",
      channels: {
        1: {
          label: "Raggio 1",
          type: "raggio",
          trigger: "latching", // resta acceso finche' non cambia division, anche se si lascia la presa
          scale: [72, 74, 76, 79, 81, 84, 86, 88], // un'ottava sopra il Raggio 1 di "classico": subito piu' acuto
          sample: "assets/samples/metallo.wav",
          waveform: "sine",
          volume: 1,
          color: "#8858c8",
          icon: "⚙️",
        },
        2: {
          label: "Raggio 2",
          type: "raggio",
          trigger: "retrigger",
          scale: [36, 39, 41, 43, 46, 48, 51, 53], // un'ottava sotto il Raggio 2 di "classico": subito piu' grave
          sample: "assets/samples/legno.wav",
          waveform: "triangle",
          volume: 1,
          color: "#e0574a",
          icon: "🪵",
        },
        3: {
          label: "Tavoletta 1",
          type: "tavoletta",
          trigger: "sequence", // ogni pressione avanza nella scala
          scale: [72, 76, 79, 84], // registro acuto, a differenza della Tavoletta 1 "classico" (nota fissa 60)
          sample: "assets/samples/cristallo.wav",
          waveform: "square",
          volume: 1,
          color: "#3c8dbc",
          icon: "🔮",
        },
        4: {
          label: "Tavoletta 2",
          type: "tavoletta",
          trigger: "latching", // accende/spegne un suono di sottofondo
          note: 43, // registro grave, a differenza della Tavoletta 2 "classico" (nota 67)
          sample: "assets/samples/campana.wav",
          waveform: "sawtooth",
          volume: 1,
          color: "#2ca25f",
          icon: "🔔",
        },
        radar: {
          label: "Radar distanza",
          type: "raggio",
          trigger: "retrigger",
          minCm: 5,
          maxCm: 80,
          scale: [72, 75, 77, 79, 82, 84], // registro acuto, a differenza del Radar "classico"
          sample: "assets/samples/marimba.wav",
          waveform: "triangle",
          volume: 1,
          color: "#d9a441",
          icon: "🎶",
        },
        switchSeriale: {
          label: "Switch Arduino",
          type: "tavoletta",
          trigger: "sequence",
          scale: [34, 41, 46, 53], // registro grave, a differenza dello Switch "classico" (nota fissa 72)
          sample: "assets/samples/cristallo.wav",
          waveform: "square",
          volume: 1,
          color: "#2dbba0",
          icon: "🔮",
        },
      },
    },

  },

  // Simulazione da tastiera del computer, usata finche' l'hardware vero
  // non e' collegato. I tasti 1-0 pilotano il Raggio 1 come un beam
  // Soundbeam: ogni tasto e' una "Division" della scala sopra. Condivisa
  // fra tutti i preset: i tasti corrispondono a NUMERI di canale, stabili
  // a prescindere da quale set di suoni e' attivo.
  testKeyboard: {
    raggioChannel: 1,
    raggioKeys: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    tavolette: [
      { key: "q", channel: 3 },
      { key: "w", channel: 4 },
    ],
  },
};
