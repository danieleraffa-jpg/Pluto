# Materiale di riferimento

File originali recuperati, non scritti da noi — tenuti qui solo come riferimento tecnico interno per il recupero di Pluto, non per ridistribuzione.

- **soundbeam-desktop-manual-2004.pdf** — manuale utente del "Desktop Soundbeam" (v1, settembre 2004), ricevuto da un musicista esperto di Soundbeam che collabora con CRAMS, estratto dal CD-Rom di installazione originale. Descrive esattamente hardware e software del sistema Soundbeam dell'epoca usato da CRAMS. Fonte primaria più dettagliata che abbiamo sul funzionamento reale del sistema da sostituire.
- **soundbeam-desktop-revision-notes.pdf** — note di revisione del software dallo stesso CD.
- **eobody3-poster-nime2011.pdf** — poster ufficiale NIME 2011 di Eowave (Marc Sirguy, Emmanuelle Gallin) sull'eobody3: spiega l'architettura interna, i formati di input/output e soprattutto il filtro/noise-gate applicato al segnale — chiave per capire l'intermittenza degli switch sul lato B. Trovato pubblicamente su una cartella Google Drive condivisa da Eowave (`eowave_public/LEGACY/eobody3poster.pdf`), nessuna registrazione richiesta.
- **eowave-diy-bend-kit.pdf** — istruzioni di montaggio del kit DIY "Bend" di Eowave (modulo Eurorack con touch strip, da alimentare su bus board). Trovato nella stessa cartella condivisa (`eowave_public/LEGACY/diy/EOWAVE BEND KIT.pdf`). **Non adatto a Pluto così com'è**: richiede un bus board Eurorack alimentato e componenti attivi (op-amp, condensatori) — troppo complesso rispetto al sensore resistivo semplice pianificato per i raggi (vedi [`../../hardware/raggi/README.md`](../../hardware/raggi/README.md)). Tenuto solo come riferimento.

Vedi la sintesi tecnica in [`../soundbeam-tecnico.md`](../soundbeam-tecnico.md) e in [`../../hardware/eobody-iii/README.md`](../../hardware/eobody-iii/README.md) per i punti rilevanti per Pluto senza dover riaprire i PDF.
