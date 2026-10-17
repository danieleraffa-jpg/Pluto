# Pluto runtime — prototipo

Prima versione funzionante del software che gli educatori useranno in sessione con raggi e tavolette. Vedi [`docs/proposta-architettura.md`](../../docs/proposta-architettura.md) per il perché di questa scelta tecnica.

## Cos'è

Una pagina web (HTML/JS, nessuna build necessaria) che:
- riceve MIDI da un dispositivo vero via **Web MIDI API** (funzionerà con l'eobody III una volta collegato, senza modifiche al codice);
- per i canali **raggio** trasforma un valore continuo (Control Change) in una nota scelta da una scala — lo stesso principio "posizione → nota da una sequenza" del Soundbeam originale (vedi [`docs/soundbeam-tecnico.md`](../../docs/soundbeam-tecnico.md)), **non** un controllo continuo puro;
- per i canali **tavoletta** suona una nota fissa a ogni pressione (on/off);
- suona con **file audio veri** (`.wav`) quando un canale ne ha uno assegnato in `config/mapping.js` (campo `sample`), altrimenti con un sintetizzatore interno via Web Audio come riserva. I 5 campioni attuali in [`assets/samples/`](assets/samples/) (campana, marimba, legno, metallo, cristallo) sono **sintetizzati via codice** (vedi [`assets/samples/gen-samples.js`](assets/samples/gen-samples.js), `node gen-samples.js` per rigenerarli/modificarli) solo come segnaposto più piacevole dei bip grezzi iniziali — i suoni veri li sceglierà il musicista: basterà sostituire questi file (stesso nome o aggiornando il percorso in `mapping.js`), nessuna modifica al codice;
- mostra un feedback visivo immediato (il riquadro del canale si illumina) — utile sia per testare sia come base per il feedback al paziente;
- ha un **monitor MIDI grezzo** in fondo alla pagina: mostra ogni messaggio ricevuto (canale, tipo, valori) anche se non è ancora configurato in `config/mapping.js`. Serve a scoprire su quale canale/numero manda davvero un jack dell'eobody collegandoci un sensore, invece di doverlo indovinare.
- supporta anche un **sensore a ultrasuoni via Seriale USB** (Arduino + HC-SR04, vedi [`firmware/distanza-ultrasuoni/`](../../firmware/distanza-ultrasuoni/), **testato e funzionante**) — canale "radar", indipendente dall'eobody/MIDI. Pulsante "Collega sensore seriale" in alto a destra. Si comporta come un raggio: la distanza rilevata sceglie una nota dalla scala. Codice pronto anche per un eventuale sensore on/off tipo PIR (vedi [`hardware/radar-presenza/`](../../hardware/radar-presenza/) per la storia completa, incluso un primo tentativo con un PIR risultato difettoso).

## Come si usa adesso (senza hardware)

1. Apri `index.html` in Chrome o Edge (va bene anche con doppio click, non serve un server).
2. Clicca una volta sulla pagina (serve per sbloccare l'audio del browser).
3. Premi i tasti **1-0** per simulare il Raggio 1 (ogni tasto è una nota della scala, come muoversi lungo un beam Soundbeam). Tieni premuto per sentire la nota, rilascia per fermarla.
4. Premi **Q** o **W** per far scattare le due tavolette di test.

## Quando arriva l'hardware vero

Basta collegare l'eobody III via USB: Chrome/Edge lo rileverà automaticamente come dispositivo MIDI (dopo aver dato il permesso quando richiesto dal browser) e i messaggi reali sostituiranno quelli simulati da tastiera, senza bisogno di modificare il codice.

Per il sensore radar: carica [`firmware/distanza-ultrasuoni/distanza-ultrasuoni.ino`](../../firmware/distanza-ultrasuoni/distanza-ultrasuoni.ino) su un Arduino qualsiasi con un HC-SR04 collegato (Trig→pin 2, Echo→pin 3, VCC→5V, GND→GND), poi clicca "Collega sensore seriale" nella pagina e scegli la porta COM dell'Arduino dal menu del browser. Funziona con qualunque Arduino (testato su Mega 2560) perché usa solo la Seriale di base, non MIDI. Se il Monitor Seriale di Arduino IDE è aperto sulla stessa porta, il collegamento fallisce — chiudilo prima.

## Cosa modificare per cambiare suoni/numero di oggetti

Tutto in [`config/mapping.js`](config/mapping.js) — commentato, pensato per essere modificato anche da chi non programma: quali canali MIDI corrispondono a quali raggi/tavolette, che note sono disponibili, che colore ha il feedback visivo.

## Cosa manca (prossimi passi)

- Suoni veri al posto dei campioni segnaposto (scelti dal musicista) — basta sostituire i file in `assets/samples/`, l'infrastruttura per suonarli c'è già.
- Risolvere l'intermittenza degli switch sul lato B dell'eobody (pull-up resistivo, vedi [`hardware/eobody-iii/README.md`](../../hardware/eobody-iii/README.md)) e testare un sensore continuo vero sul lato A.
- Misurare la latenza reale end-to-end con l'hardware collegato (priorità indicata dal musicista consultato).
- Interfaccia più semplice/a schermo intero pensata per un educatore, non per un debug tecnico come questa prima versione.
