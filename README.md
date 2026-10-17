# Pluto

Progetto di recupero (hardware + software) di **Pluto**, dispositivo per interazione musicale di gruppo basato sul movimento, sviluppato da CRAMS (Centro Ricerca Arte Musica Spettacolo, Lecco) e usato insieme a Soundbeam in laboratori con persone con disabilità e anziani (RSA, CDD).

Il responsabile tecnico originale del progetto non è più disponibile e non ha lasciato documentazione: questo repository serve a ricostruire, pezzo per pezzo, cosa componeva il sistema e a riscrivere il software necessario per farlo funzionare di nuovo.

## Obiettivo (confermato da CRAMS il 22/09/2026)

Sostituire e affiancare il Soundbeam con una serie di **oggetti fisici** dalle prestazioni analoghe:

- **Raggi** — oggetti impugnabili: il paziente, prendendoli in mano, produce suoni e — in base ai settaggi — può gestire consapevolmente il proprio intervento nella composizione musicale collettiva. Concettualmente equivalgono ai "raggi" ultrasonici del Soundbeam, ma come oggetto fisico maneggiabile invece che come fascio nello spazio.
- **Tavolette** — dispositivi solo on/off (trigger binari, senza controllo continuo).
- Il **settaggio dei suoni/rumori** associati a ogni oggetto viene definito in accordo con un musicista che già collabora con CRAMS — il software deve quindi permettere una mappatura configurabile (non hardcoded) tra input fisico e output sonoro.

## Stato del recupero (17/10/2026)

- **eobody III**: collegato, riconosciuto da Windows e da [`software/pluto-runtime`](software/pluto-runtime/) via Web MIDI. Mappatura canale/CC testata empiricamente: canale 1 sempre, CC = numero jack sul lato A (1-8), numero+8 sul lato B (9-16). Il **lato B risponde agli switch on/off** (adatto alle tavolette), il **lato A per ora no** con un semplice interruttore (ipotesi: riservato ai sensori continui dei raggi, da confermare). Dettagli e stato in [`hardware/eobody-iii/`](hardware/eobody-iii/).
- **Raggi**: da costruire su misura (nessun prodotto pronto adatto), elettronica semplice prevista (sensore resistivo su jack TRS). Non ancora testato un sensore continuo vero sul lato A.
- **Tavolette**: funzionano con switch accessibili pronti (testato AbleNet Big Buddy Button) + adattatore 3.5mm→6.35mm, collegati al lato B dell'eobody. Resta un'intermittenza nelle pressioni da capire, probabile contatto meccanico incerto — prossimo passo: editor ufficiale Eowave (serve registrare il numero di serie del dispositivo).
- **Software**: primo prototipo funzionante in [`software/pluto-runtime/`](software/pluto-runtime/) — riceve MIDI reale, logica raggio/tavoletta implementata, sintetizzatore placeholder (suoni veri da definire col musicista), monitor MIDI grezzo per il debug hardware.
- Il nuovo device commerciale Soundbeam (versione aggiornata rispetto a quella usata all'epoca da CRAMS) non replica alcune funzionalità del vecchio setup — dettaglio ancora da verificare con chi usava il sistema (Maurizio Rocca, Domenico Priolo, Stefano Fumagalli).

## Struttura del repository

- [`docs/`](docs/) — ricerca e documentazione raccolta sul progetto originale
- [`hardware/`](hardware/) — inventario e note sui componenti hardware recuperati, incluse le nuove famiglie di oggetti "raggi" e "tavolette"
- [`firmware/`](firmware/) — firmware per le schede custom (es. Arduino Nano 33 IoT)
- [`software/`](software/) — nuova applicazione software da sviluppare
- [`media/`](media/) — foto e materiale visivo dell'hardware recuperato

Vedi anche il progetto correlato **Tablettone**, sviluppato dallo stesso ambito tecnico CRAMS.
