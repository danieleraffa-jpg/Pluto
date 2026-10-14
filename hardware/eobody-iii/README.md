# Eowave eobody III Sensorbox

Interfaccia USB/MIDI commerciale (Eowave, Francia). 16 ingressi jack per sensori analogici, etichettati a1-a8 e b1-b8 sul pannello frontale.

## Specifiche ingressi sensore (da ricerca web, 14/10/2026 — da confermare sul dispositivo fisico)

- Ingressi **analogici 0-5V**, 12-bit di risoluzione, 32-bit di elaborazione interna.
- Connettore **jack TRS**: punta = segnale, anello = alimentazione 5V, calza = massa — stesso standard di tutta la linea sensori Eowave.
- Formato jack: 6.35mm (1/4") sui modelli Sensorbox più recenti, 3.5mm su modelli precedenti — **da verificare quale misura ha il nostro esemplare**.
- Alimentazione 5V disponibile direttamente sull'anello del jack: un sensore resistivo semplice (FSR, flex sensor, potenziometro) funziona collegato come **partitore di tensione**, senza bisogno di elettronica aggiuntiva.

## Da fare

- [ ] Trovare/leggere il numero di serie sul dispositivo e registrarlo su eowave.com per accedere a editor, manuale e patch ufficiali — serve anche per confermare dimensione jack (6.35mm o 3.5mm) e se a1-a8/b1-b8 si comportano in modo diverso
- [ ] Elencare i sensori fisicamente collegati (tipo, canale a/b, numero)
- [ ] Testare il collegamento USB e verificare che il dispositivo sia riconosciuto come device MIDI (anche da [`software/pluto-runtime`](../../software/pluto-runtime/), che lo rileverà automaticamente via Web MIDI)
- [ ] Documentare qui la configurazione (mapping sensore → parametro MIDI) una volta recuperata o ricreata
