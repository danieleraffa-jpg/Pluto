# Pluto runtime — prototipo

Prima versione funzionante del software che gli educatori useranno in sessione con raggi e tavolette. Vedi [`docs/proposta-architettura.md`](../../docs/proposta-architettura.md) per il perché di questa scelta tecnica.

## Cos'è

Una pagina web (HTML/JS, nessuna build necessaria) che:
- riceve MIDI da un dispositivo vero via **Web MIDI API** (funzionerà con l'eobody III una volta collegato, senza modifiche al codice);
- per i canali **raggio** trasforma un valore continuo (Control Change) in una nota scelta da una scala — lo stesso principio "posizione → nota da una sequenza" del Soundbeam originale (vedi [`docs/soundbeam-tecnico.md`](../../docs/soundbeam-tecnico.md)), **non** un controllo continuo puro;
- per i canali **tavoletta** suona una nota fissa a ogni pressione (on/off);
- suona con **file audio veri** (`.wav`) quando un canale ne ha uno assegnato in `config/mapping.js` (campo `sample`), altrimenti con un sintetizzatore interno via Web Audio come riserva. I 5 campioni attuali in [`assets/samples/`](assets/samples/) (campana, marimba, legno, metallo, cristallo) sono **sintetizzati via codice** (vedi [`assets/samples/gen-samples.js`](assets/samples/gen-samples.js), `node gen-samples.js` per rigenerarli/modificarli) solo come segnaposto più piacevole dei bip grezzi iniziali — i suoni veri li sceglierà il musicista: basterà sostituire questi file (stesso nome o aggiornando il percorso in `mapping.js`), nessuna modifica al codice;
- mostra un feedback visivo immediato (il riquadro del canale si illumina, con una leggera animazione) — utile sia per testare sia come base per il feedback al paziente;
- ha un **monitor MIDI grezzo**, utile per scoprire su quale canale/numero manda davvero un jack dell'eobody collegandoci un sensore invece di doverlo indovinare — ma è **nascosto di default**, dietro il pulsante "Modalità tecnica" in alto a destra: chi usa il tablet in sessione con un paziente deve vedere solo i riquadri grandi, non un log di debug. La scelta viene ricordata sul dispositivo;
- pensata per **tablet** (layout responsive, tocco invece che solo mouse, palette calda invece di un dashboard tecnico) — vedi "Uso su tablet" sotto.
- oltre al volume generale, ha un **mixer per canale** (pulsante "Mixer canali", nascosto di default): un cursore per ogni sensore, per bilanciare il mix al momento (es. durante una prova di un brano). Vale solo per la sessione in corso — si perde cambiando preset o ricaricando la pagina; per salvarlo in modo permanente nel preset serve l'editor del musicista (vedi sotto).
- supporta anche un **sensore a ultrasuoni via Seriale USB** (Arduino + HC-SR04, vedi [`firmware/distanza-ultrasuoni/`](../../firmware/distanza-ultrasuoni/), **testato e funzionante**) — canale "radar", indipendente dall'eobody/MIDI. Pulsante "Collega sensore seriale" in alto a destra. Si comporta come un raggio: la distanza rilevata sceglie una nota dalla scala. Codice pronto anche per un eventuale sensore on/off tipo PIR (vedi [`hardware/radar-presenza/`](../../hardware/radar-presenza/) per la storia completa, incluso un primo tentativo con un PIR risultato difettoso).

## Come si usa adesso (senza hardware)

1. Apri `index.html` in Chrome o Edge (va bene anche con doppio click, non serve un server).
2. Clicca una volta sulla pagina (serve per sbloccare l'audio del browser).
3. Premi i tasti **1-0** per simulare il Raggio 1 (ogni tasto è una nota della scala, come muoversi lungo un beam Soundbeam). Tieni premuto per sentire la nota, rilascia per fermarla.
4. Premi **Q** o **W** per far scattare le due tavolette di test.

## Quando arriva l'hardware vero

Basta collegare l'eobody III via USB: Chrome/Edge lo rileverà automaticamente come dispositivo MIDI (dopo aver dato il permesso quando richiesto dal browser) e i messaggi reali sostituiranno quelli simulati da tastiera, senza bisogno di modificare il codice.

Per il sensore radar: carica [`firmware/distanza-ultrasuoni/distanza-ultrasuoni.ino`](../../firmware/distanza-ultrasuoni/distanza-ultrasuoni.ino) su un Arduino qualsiasi con un HC-SR04 collegato (Trig→pin 2, Echo→pin 3, VCC→5V, GND→GND), poi clicca "Collega sensore seriale" nella pagina e scegli la porta COM dell'Arduino dal menu del browser. Funziona con qualunque Arduino (testato su Mega 2560) perché usa solo la Seriale di base, non MIDI. Se il Monitor Seriale di Arduino IDE è aperto sulla stessa porta, il collegamento fallisce — chiudilo prima.

## Uso su tablet

Decisione del progetto (18/10/2026): niente raggi/tavolette wireless (latenza + complessità, vedi discussione nel repo), ma **il runtime gira su un tablet Android** collegato via cavo USB-OTG all'eobody/Arduino — stessa app, stesso Chrome, nessuna riscrittura dell'architettura. Dispositivo di riferimento attuale: tablet **AUMI AI OS** (Freeski C12), già in uso da CRAMS per la versione rivista di Tablettone.

**Verificato e funzionante (02/11/2026)**: Pluto gira in autonomia sul tablet, via Termux, senza bisogno del PC né di una rete — stesso schema già usato per Tablettone. Istruzioni complete in [`termux/README.md`](../../termux/README.md). Limite scoperto testando: **Web Serial non è disponibile su Chrome Android**, quindi il canale "radar" via Arduino non funziona sul tablet (resta utilizzabile su PC). Web MIDI (eobody) dovrebbe funzionare — da confermare collegando l'eobody vero via USB-OTG al tablet.

## Cosa modificare per cambiare suoni/numero di oggetti

Tutto in [`config/mapping.js`](config/mapping.js) — commentato, pensato per essere modificato anche da chi non programma: quali canali MIDI corrispondono a quali raggi/tavolette, che note sono disponibili, che colore ha il feedback visivo. **Meglio però usare l'editor visuale** (vedi sotto): stesso file, ma senza scrivere codice a mano.

## Editor preset per il musicista

Pagina separata, **senza alcun pulsante visibile nell'app che usa l'educatore**: [`editor.html`](editor.html), cioè `http://127.0.0.1:5173/editor.html` sul tablet (o l'indirizzo locale durante lo sviluppo). Per arrivarci senza scrivere l'indirizzo a mano: **tocca 5 volte rapide il logo/titolo "Pluto"** nell'header dell'app principale (stesso tipo di gesto nascosto già usato nell'app Android). Da li', un link "← Torna a Pluto" nell'header dell'editor riporta indietro. Protetta anche da un PIN semplice (costante `PIN_HASH` in [`editor.js`](editor.js), con le istruzioni per cambiarlo) — è un deterrente contro l'apertura per sbaglio, **non una vera sicurezza**: tutto il sito è statico, senza backend, quindi chi legge il codice sorgente può comunque aggirarlo.

Permette di creare/duplicare/rinominare/eliminare preset e modificare ogni canale (etichetta, modalità di trigger, note/scala, campione audio, forma d'onda, **volume**, colore, icona) con un modulo visuale e un pulsante "▶ Prova" per sentire subito il risultato — senza aprire `mapping.js`. Il salvataggio scrive direttamente su `config/mapping.js` (via File System Access API, Chrome/Edge desktop) oppure propone di scaricare il file aggiornato da spostare a mano dove serve. Per aggiungere un suono nuovo va comunque copiato a mano il file `.wav` in `assets/samples/` — l'editor lo seleziona per nome, non carica ancora file audio direttamente.

Il **volume per canale** impostato qui è il mix di base salvato nel preset. Nell'app principale, l'educatore/musicista può ritoccarlo "al momento" dal pannello "Mixer canali" — ma solo per la sessione in corso: per renderlo permanente bisogna tornare qui e salvare.

## Cosa manca (prossimi passi)

- Suoni veri al posto dei campioni segnaposto (scelti dal musicista) — basta sostituire i file in `assets/samples/`, l'infrastruttura per suonarli c'è già.
- Risolvere l'intermittenza degli switch sul lato B dell'eobody (pull-up resistivo, vedi [`hardware/eobody-iii/README.md`](../../hardware/eobody-iii/README.md)) e testare un sensore continuo vero sul lato A.
- Misurare la latenza reale end-to-end con l'hardware collegato (priorità indicata dal musicista consultato).
- Verificare Web MIDI sul tablet con l'eobody vero collegato via USB-OTG (la pagina gira già sul tablet in autonomia, manca solo questo test con l'hardware).
