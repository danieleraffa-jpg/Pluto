# Ricerca sul contesto Pluto / Soundbeam / CRAMS

Note raccolte via ricerca web (22 agosto 2026) per ricostruire il contesto del progetto, in assenza di documentazione tecnica interna.

## CRAMS e Soundbeam

CRAMS (Centro Ricerca Arte Musica Spettacolo, cooperativa di Lecco) dal 2005 collabora con il musicista inglese David Jackson sul sistema **Soundbeam** per l'espressività di persone con disabilità ("Il raggio del suono"). Soundbeam è un prodotto commerciale inglese (The Soundbeam Project/EMS, Bristol, dal 1989): un fascio di ultrasuoni che rileva il movimento e lo converte in MIDI.

Dal 2006 CRAMS ha creato un team di sperimentazione operativa con Soundbeam nell'ambito della disabilità, prima infanzia e scuola primaria (~50 utenti con disabilità da 5 centri della provincia di Lecco, ~60 studenti).

## Pluto

Non esiste documentazione tecnica pubblica su Pluto. È citato, sempre insieme a Soundbeam, in un evento Interreg Italia-Svizzera del **28 febbraio 2025** ("Luoghi di Cultura – Luoghi di Cura", progetto MU.S.E.O., Fondazione IRCSS San Gerardo dei Tintori, Monza):

> **"PLUTO" e "SoundBeam": interactive musical group movement interface**
> Laboratorio interattivo di PLUTO-Soundbeam con ospiti da RSA IRAM Airoldi e Muzzi, e altri CDD e centri vari — a cura di **Maurizio Rocca** e **Domenico Priolo**, coordinamento **Stefano Fumagalli** (ASST/IRAM Lecco, con Dario Galbusera e Francesco Panzeri).

Nello stesso evento compariva anche **"Tablettone" – Art interactive Serious games**, progetto correlato sviluppato dallo stesso ambito tecnico CRAMS (repo `C:\Tablettone`).

## Persone di riferimento (potenziali fonti di informazioni mancanti)

- **Maurizio Rocca**, **Domenico Priolo** — conduttori del laboratorio PLUTO-Soundbeam
- **Stefano Fumagalli** — coordinamento tecnico (ASST/IRAM Lecco)
- **Rossana Becarelli**, **Maria Chiara Ciaccheri**, **Angelo Riva** — CRAMS

## Hardware fotografato (punto di partenza del recupero)

1. **Eowave eobody III Sensorbox** — interfaccia USB/MIDI commerciale (Eowave, Francia), 16 ingressi jack sensore (a1-a8, b1-b8). Editor di configurazione scaricabile da eowave.com previa registrazione del numero di serie del dispositivo. Vedi [`hardware/eobody-iii/`](../hardware/eobody-iii/).
2. **Scheda custom** su millefori con **Arduino Nano 33 IoT** (modulo WiFi/BLE u-blox NINA-W10) — non è un prodotto commerciale, verosimilmente costruita in-house dal responsabile tecnico non più disponibile. Vedi [`hardware/custom-nano33-board/`](../hardware/custom-nano33-board/).

## Obiettivo del progetto (colloquio con CRAMS, 22/09/2026)

Chiesto direttamente a CRAMS a cosa serve Pluto, per capire come procedere. Risposta: l'obiettivo è **sostituire e affiancare il Soundbeam** con una serie di oggetti dalle prestazioni simili:

- **Raggi** — oggetti che il paziente impugna: producono suoni al tocco/movimento e, in base ai settaggi, permettono al paziente di gestire consapevolmente il proprio intervento nella composizione musicale collettiva. Stesso principio dei raggi ultrasonici Soundbeam, ma incarnato in un oggetto fisico maneggiabile.
- **Tavolette** — dispositivi solo on/off, senza controllo continuo (trigger semplici).
- Il **settaggio dei suoni** (che rumore/suono produce ogni oggetto) è definito in accordo con un musicista che già lavora con CRAMS — non è una decisione tecnica ma creativa, concordata caso per caso.

Implicazioni per l'architettura:
- I "raggi" richiedono un **sensore a valore continuo** (es. pressione, piegamento, capacitivo, accelerometro — tipo di sensore ancora da confermare) mappato su un parametro sonoro continuo → compatibile con gli ingressi analogici dell'eobody III.
- Le "tavolette" richiedono solo un **contatto on/off** → possono usare ingressi digitali più semplici (es. GPIO Arduino, o pulsanti accessibili tipo switch AbleNet).
- Il software deve avere un **layer di mappatura configurabile** (dispositivo/canale → suono/parametro), pensato per essere regolato da un musicista non tecnico, non hardcoded nel codice.

Vedi [`hardware/raggi/`](../hardware/raggi/) e [`hardware/tavolette-on-off/`](../hardware/tavolette-on-off/).

## Domande aperte

- Che tipo di sensore useranno i "raggi" per rilevare la presa/il movimento del paziente? (pressione, capacitivo, accelerometro, piegamento...) — da chiarire con CRAMS prima di progettare l'elettronica
- Quante "tavolette" e quanti "raggi" servono in un set tipico (per dimensionare il numero di canali/ingressi)?
- Cosa faceva esattamente il vecchio Soundbeam/Pluto che il nuovo device Soundbeam commerciale non fa più? (da verificare con Rocca/Priolo/Fumagalli)
- Che software generava la musica a partire dai dati sensore (probabile Max/MSP o Ableton Live, standard per questo tipo di installazioni)?
- A cosa serviva esattamente la scheda Arduino custom (nodo sensore wireless? bridge verso il software?) — da verificare leggendo il firmware una volta recuperata la scheda.
- Chi è il musicista di riferimento per il settaggio dei suoni, e come preferisce lavorare (serve un tool/interfaccia dedicata per lui)?
