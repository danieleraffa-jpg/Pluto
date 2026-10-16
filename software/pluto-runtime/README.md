# Pluto runtime — prototipo

Prima versione funzionante del software che gli educatori useranno in sessione con raggi e tavolette. Vedi [`docs/proposta-architettura.md`](../../docs/proposta-architettura.md) per il perché di questa scelta tecnica.

## Cos'è

Una pagina web (HTML/JS, nessuna build necessaria) che:
- riceve MIDI da un dispositivo vero via **Web MIDI API** (funzionerà con l'eobody III una volta collegato, senza modifiche al codice);
- per i canali **raggio** trasforma un valore continuo (Control Change) in una nota scelta da una scala — lo stesso principio "posizione → nota da una sequenza" del Soundbeam originale (vedi [`docs/soundbeam-tecnico.md`](../../docs/soundbeam-tecnico.md)), **non** un controllo continuo puro;
- per i canali **tavoletta** suona una nota fissa a ogni pressione (on/off);
- suona con un sintetizzatore interno via Web Audio — **non servono ancora file audio**: i suoni veri li sceglierà il musicista in un secondo momento, qui servono solo a verificare che il sistema risponda;
- mostra un feedback visivo immediato (il riquadro del canale si illumina) — utile sia per testare sia come base per il feedback al paziente;
- ha un **monitor MIDI grezzo** in fondo alla pagina: mostra ogni messaggio ricevuto (canale, tipo, valori) anche se non è ancora configurato in `config/mapping.js`. Serve a scoprire su quale canale/numero manda davvero un jack dell'eobody collegandoci un sensore, invece di doverlo indovinare.

## Come si usa adesso (senza hardware)

1. Apri `index.html` in Chrome o Edge (va bene anche con doppio click, non serve un server).
2. Clicca una volta sulla pagina (serve per sbloccare l'audio del browser).
3. Premi i tasti **1-0** per simulare il Raggio 1 (ogni tasto è una nota della scala, come muoversi lungo un beam Soundbeam). Tieni premuto per sentire la nota, rilascia per fermarla.
4. Premi **Q** o **W** per far scattare le due tavolette di test.

## Quando arriva l'hardware vero

Basta collegare l'eobody III via USB: Chrome/Edge lo rileverà automaticamente come dispositivo MIDI (dopo aver dato il permesso quando richiesto dal browser) e i messaggi reali sostituiranno quelli simulati da tastiera, senza bisogno di modificare il codice.

## Cosa modificare per cambiare suoni/numero di oggetti

Tutto in [`config/mapping.js`](config/mapping.js) — commentato, pensato per essere modificato anche da chi non programma: quali canali MIDI corrispondono a quali raggi/tavolette, che note sono disponibili, che colore ha il feedback visivo.

## Cosa manca (prossimi passi)

- Suoni veri al posto del sintetizzatore placeholder (campioni scelti dal musicista).
- Collaudo con l'eobody III vero per confermare se manda Control Change (valore continuo, quantizzato da noi) o note dirette per canale, e tarare di conseguenza `config/mapping.js`.
- Misurare la latenza reale end-to-end con l'hardware collegato (priorità indicata dal musicista consultato).
- Interfaccia più semplice/a schermo intero pensata per un educatore, non per un debug tecnico come questa prima versione.
