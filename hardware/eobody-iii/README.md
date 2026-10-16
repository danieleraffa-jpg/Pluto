# Eowave eobody III Sensorbox

Interfaccia USB/MIDI commerciale (Eowave, Francia). 16 ingressi jack per sensori analogici, etichettati a1-a8 e b1-b8 sul pannello frontale.

## Specifiche ingressi sensore (da ricerca web, 14/10/2026 — da confermare sul dispositivo fisico)

- Ingressi **analogici 0-5V**, 12-bit di risoluzione, 32-bit di elaborazione interna.
- Connettore **jack TRS**: punta = segnale, anello = alimentazione 5V, calza = massa — stesso standard di tutta la linea sensori Eowave.
- Formato jack: 6.35mm (1/4") sui modelli Sensorbox più recenti, 3.5mm su modelli precedenti — **da verificare quale misura ha il nostro esemplare**.
- Alimentazione 5V disponibile direttamente sull'anello del jack: un sensore resistivo semplice (FSR, flex sensor, potenziometro) funziona collegato come **partitore di tensione**, senza bisogno di elettronica aggiuntiva.

## Cavi (14/10/2026)

Il dispositivo arrivato a Daniele era senza alcun cavo (nemmeno di alimentazione). Buona notizia trovata via ricerca: l'eobody III è descritto come **"auto-powered" via USB** — collegato a un PC non serve un alimentatore separato, basta un cavo USB dati. L'alimentazione 5V esterna è un'opzione pensata solo per l'uso standalone (senza PC, per pilotare direttamente un sintetizzatore hardware via MIDI out), non per il nostro caso d'uso.

**Risolto (16/10/2026)**: Daniele ha trovato il cavo USB giusto e collegato l'eobody III al PC. Confermato riconosciuto sia da Windows (appare come dispositivo "eobody_core", VID 0x0666 = Eowave, con MIDI endpoint attivo) sia da [`software/pluto-runtime`](../../software/pluto-runtime/) via Web MIDI — nello stato dell'app compare "MIDI: eobody_core" in verde. Tutta la catena USB → Windows → Web MIDI → app funziona.

## Da fare

- [x] Procurarsi il cavo USB giusto — risolto, era "auto-powered", non serve alimentatore separato
- [x] Testare il collegamento USB e verificare che il dispositivo sia riconosciuto come device MIDI — confermato sia da Windows che da pluto-runtime
- [ ] Trovare/leggere il numero di serie sul dispositivo e registrarlo su eowave.com per accedere a editor, manuale e patch ufficiali — serve anche per confermare dimensione jack sensori (6.35mm o 3.5mm) e se a1-a8/b1-b8 si comportano in modo diverso
- [ ] Collegare un sensore di prova a uno dei jack e verificare che generi messaggi MIDI visibili in pluto-runtime (il riquadro del canale corrispondente dovrebbe illuminarsi)
- [ ] Elencare i sensori fisicamente collegati (tipo, canale a/b, numero)
- [ ] Documentare qui la configurazione (mapping sensore → parametro MIDI) una volta recuperata o ricreata
