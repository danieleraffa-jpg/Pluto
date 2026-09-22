# Pluto

Progetto di recupero (hardware + software) di **Pluto**, dispositivo per interazione musicale di gruppo basato sul movimento, sviluppato da CRAMS (Centro Ricerca Arte Musica Spettacolo, Lecco) e usato insieme a Soundbeam in laboratori con persone con disabilità e anziani (RSA, CDD).

Il responsabile tecnico originale del progetto non è più disponibile e non ha lasciato documentazione: questo repository serve a ricostruire, pezzo per pezzo, cosa componeva il sistema e a riscrivere il software necessario per farlo funzionare di nuovo.

## Obiettivo (confermato da CRAMS il 22/09/2026)

Sostituire e affiancare il Soundbeam con una serie di **oggetti fisici** dalle prestazioni analoghe:

- **Raggi** — oggetti impugnabili: il paziente, prendendoli in mano, produce suoni e — in base ai settaggi — può gestire consapevolmente il proprio intervento nella composizione musicale collettiva. Concettualmente equivalgono ai "raggi" ultrasonici del Soundbeam, ma come oggetto fisico maneggiabile invece che come fascio nello spazio.
- **Tavolette** — dispositivi solo on/off (trigger binari, senza controllo continuo).
- Il **settaggio dei suoni/rumori** associati a ogni oggetto viene definito in accordo con un musicista che già collabora con CRAMS — il software deve quindi permettere una mappatura configurabile (non hardcoded) tra input fisico e output sonoro.

## Stato del recupero

- **Sensori**: recuperabili come hardware (in corso) — [`hardware/eobody-iii/`](hardware/eobody-iii/) e [`hardware/custom-nano33-board/`](hardware/custom-nano33-board/) sono probabilmente il "motore" sensore→MIDI su cui costruire raggi e tavolette.
- **Software**: da riscrivere da zero, non risultano copie superstiti del software/patch originali.
- Il nuovo device commerciale Soundbeam (versione aggiornata rispetto a quella usata all'epoca da CRAMS) non replica alcune funzionalità del vecchio setup — dettaglio ancora da verificare con chi usava il sistema (Maurizio Rocca, Domenico Priolo, Stefano Fumagalli).

## Struttura del repository

- [`docs/`](docs/) — ricerca e documentazione raccolta sul progetto originale
- [`hardware/`](hardware/) — inventario e note sui componenti hardware recuperati, incluse le nuove famiglie di oggetti "raggi" e "tavolette"
- [`firmware/`](firmware/) — firmware per le schede custom (es. Arduino Nano 33 IoT)
- [`software/`](software/) — nuova applicazione software da sviluppare
- [`media/`](media/) — foto e materiale visivo dell'hardware recuperato

Vedi anche il progetto correlato **Tablettone**, sviluppato dallo stesso ambito tecnico CRAMS.
