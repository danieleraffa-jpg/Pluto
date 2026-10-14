# Come funzionava davvero il Soundbeam usato da CRAMS

Sintesi tecnica del manuale "Desktop Soundbeam" (v1, settembre 2004 — vedi [`reference/soundbeam-desktop-manual-2004.pdf`](reference/soundbeam-desktop-manual-2004.pdf)), ottenuto da un musicista esperto di Soundbeam che collabora con CRAMS. Corregge e completa le ipotesi del documento [`proposta-architettura.md`](proposta-architettura.md).

## Credits originali (per capire chi sapeva cosa)

Il Desktop Soundbeam fu creato per The Soundbeam Project Ltd (Bristol) da: Adam Fullerton (firmware dell'interfaccia), Gerald McKenzie (applicazione Soundbeam), Mark Newbold (specifiche, installer, manuale), Tim Orr (progettazione hardware). Nessuno di questi nomi coincide con lo staff CRAMS attuale — è il fornitore originale dell'hardware/software commerciale, non chi lo ha adattato per CRAMS.

## Hardware (interfaccia Desktop Soundbeam)

Connessione USB al PC. L'interfaccia comprende:
- **3 interfacce MIDI** separate (3× MIDI IN + 3× MIDI OUT)
- **8 ingressi switch a tensione variabile** (pannello frontale, numerati 1-8) — qui si collegano le "tavolette"/pulsanti on-off
- **4 ingressi/uscite per sensori a ultrasuoni** (pannello posteriore, numerati 1-4) — i "Beam" veri e propri
- Alimentazione 9V AC

## Il meccanismo reale: distanza → NOTA, non un controllo continuo generico

**Correzione importante rispetto alla nostra ipotesi iniziale**: il comportamento di default di un Beam Soundbeam non è mandare un valore continuo (CC) proporzionale alla distanza. È:

1. Il **Range** (Min/Max, 0.20m–6.00m) definisce la lunghezza attiva del beam.
2. Il beam è diviso in **Divisions** (da 1 a 64 sezioni).
3. Ogni Division contiene una **Pitch Sequence**: una nota singola, un accordo (fino a 10 note), oppure un Program Change o un messaggio System Exclusive. Soundbeam include scale preimpostate (cromatica, pentatonica, modi, ecc.) e permette di registrarne di personalizzate da tastiera MIDI o da tastiera del computer.
4. Quando l'utente interrompe il beam a una certa distanza, suona la nota (o l'accordo) associato a quella Division — in pratica il beam **quantizza il movimento in una scala musicale**, non produce un suono "libero".
5. **Divisions Offset** e **Transpose** spostano quale porzione della sequenza/scala è attiva.
6. Il **Trigger Mode** definisce come la nota parte/si ferma: Single Shot, **Re-Trigger** (il più usato — glissando di note mentre ci si muove), Poly Sustain, Re-Trigger Sustain, Cyclic Trigger, Latching, Gated Single/Re-Trigger (nota sostenuta per un tempo impostabile).
7. **Polyphony** limita quante note possono suonare insieme (fino a 32).

In più, **due "MIDI Control Chain" (A e B)** opzionali permettono di inviare *anche* un CC continuo derivato dal movimento (sorgenti: Gate, Relative/Absolute Length, Air Fader, Speed) verso un controller MIDI a scelta (es. Volume, Pan, Modulation) — ma è un **livello aggiuntivo**, non il meccanismo principale. Lo stesso motore (Pitch Sequence + Trigger Mode + Control Chain) si applica identico ai 4 Beam e agli 8 Switch.

## Implicazione per i "raggi" e le "tavolette" di Pluto

La nostra proposta iniziale ipotizzava: raggi = sensore continuo → CC continuo. **Il musicista ci ha corretto su questo punto specifico** (vedi sotto) ed effettivamente il manuale conferma che il paradigma Soundbeam è diverso: distanza/posizione → nota scelta da una sequenza, con CC come opzione secondaria. Per i raggi ha più senso riprodurre lo stesso paradigma — posizione/pressione sul raggio seleziona una nota o un accordo da una sequenza/scala — piuttosto che un controllo continuo puro di un parametro. Da verificare comunque con CRAMS/il musicista quale dei due comportamenti vogliono per i raggi.

Le tavolette (switch on/off) nel sistema originale non sono limitate a un singolo suono fisso: hanno lo stesso motore Pitch Sequence/Trigger Mode dei beam, quindi potrebbero anche loro avanzare in una sequenza a ogni pressione, non solo accendere/spegnere un suono fisso.

## Feedback diretto di un musicista esperto di Soundbeam (14/10/2026)

Risposta ricevuta dopo aver condiviso la proposta di architettura:

> "L'unica cosa che non mi torna è il sensore che invia dei Control Change. Perché? Il sensore ad ultrasuoni manda la distanza dell'oggetto al computer, che suona la nota midi corrispondente. Se accetti un consiglio, elimina la latenza e fai uno strumento adatto agli educatori, non per musicisti. A mio modesto parere, chi usa oggi il Soundbeam con il mio personale settaggio e repertorio, non lo scambia con nient'altro. Si può pensare ad un mercato di neofiti, educatori, insegnanti delle primarie. Ad un utilizzo ludico e non da performance professionale."

Punti chiave:
1. **Conferma tecnica**: distanza → nota MIDI, non CC (vedi sopra — il manuale lo conferma).
2. **Priorità su latenza**: la reattività conta più di qualunque altra feature per chi usa lo strumento con pazienti/utenti.
3. **Target utente**: progettare per educatori/operatori, non per musicisti professionisti — uno strumento semplice da configurare e usare, non una DAW.
4. **Posizionamento**: chi già usa il Soundbeam attuale coi propri settaggi e repertorio non lo cambierà. Il nostro sistema ha senso soprattutto per un mercato diverso: neofiti, educatori, insegnanti delle primarie, uso ludico — non performance professionale.

## Domande ancora aperte

- Conferma dei comportamenti raggi/tavolette: nota-da-sequenza (come Soundbeam) o altro?
- Il musicista che ha risposto è disponibile come consulente continuativo per il repertorio/i settaggi sonori di Pluto?
