# Pluto

Progetto di recupero (hardware + software) di **Pluto**, dispositivo per interazione musicale di gruppo basato sul movimento, sviluppato da CRAMS (Centro Ricerca Arte Musica Spettacolo, Lecco) e usato insieme a Soundbeam in laboratori con persone con disabilità e anziani (RSA, CDD).

Il responsabile tecnico originale del progetto non è più disponibile e non ha lasciato documentazione: questo repository serve a ricostruire, pezzo per pezzo, cosa componeva il sistema e a riscrivere il software necessario per farlo funzionare di nuovo.

## Stato del recupero

- **Sensori**: recuperabili come hardware (in corso).
- **Software**: da riscrivere da zero, non risultano copie superstiti del software/patch originali.
- Il nuovo device commerciale Soundbeam (versione aggiornata rispetto a quella usata all'epoca da CRAMS) non replica alcune funzionalità del vecchio setup — dettaglio ancora da verificare con chi usava il sistema (Maurizio Rocca, Domenico Priolo, Stefano Fumagalli).

## Struttura del repository

- [`docs/`](docs/) — ricerca e documentazione raccolta sul progetto originale
- [`hardware/`](hardware/) — inventario e note sui componenti hardware recuperati
- [`firmware/`](firmware/) — firmware per le schede custom (es. Arduino Nano 33 IoT)
- [`software/`](software/) — nuova applicazione software da sviluppare
- [`media/`](media/) — foto e materiale visivo dell'hardware recuperato

Vedi anche il progetto correlato **Tablettone**, sviluppato dallo stesso ambito tecnico CRAMS.
