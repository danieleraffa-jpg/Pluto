# Software

Applicazione per sostituire il software originale di Pluto (non recuperabile).

Funzione: ricevere i dati dai sensori (via eobody III e/o scheda custom) e generare/controllare musica in risposta al movimento, replicando l'interazione di gruppo del laboratorio PLUTO-Soundbeam originale.

## [`pluto-runtime/`](pluto-runtime/)

Primo prototipo funzionante: app web (HTML/JS, Web MIDI + Web Audio) pensata per essere usata dagli educatori durante le sessioni — bassa latenza, nessuna installazione complessa. Testabile subito da tastiera, senza hardware collegato. Vedi il suo [README](pluto-runtime/README.md) per come usarlo e [`../docs/proposta-architettura.md`](../docs/proposta-architettura.md) per il perché di questa scelta tecnica.

Non ancora presente: uno strumento di preparazione del repertorio/suoni per il musicista (resterà probabilmente su un DAW esistente, vedi la proposta di architettura).
