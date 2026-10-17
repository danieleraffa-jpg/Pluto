# Eowave eobody III Sensorbox

Interfaccia USB/MIDI commerciale (Eowave, Francia). **16 ingressi jack** confermati, 8 per lato, etichettati a1-a8 e b1-b8 sul pannello frontale.

## Specifiche ingressi sensore

- Ingressi **analogici 0-5V**, 12-bit di risoluzione, 32-bit di elaborazione interna (da ricerca web, 14/10/2026).
- Connettore **jack TRS**: punta = segnale, anello = alimentazione 5V, calza = massa — stesso standard di tutta la linea sensori Eowave.
- **Formato jack confermato (16/10/2026): 6.35mm (1/4"), il formato "grande"** — a occhio sul pannello fisico, non il mini-jack da 3.5mm.
- Alimentazione 5V disponibile direttamente sull'anello del jack: un sensore resistivo semplice (FSR, flex sensor, potenziometro) funziona collegato come **partitore di tensione**, senza bisogno di elettronica aggiuntiva.

## Cavi (14/10/2026)

Il dispositivo arrivato a Daniele era senza alcun cavo (nemmeno di alimentazione). Buona notizia trovata via ricerca: l'eobody III è descritto come **"auto-powered" via USB** — collegato a un PC non serve un alimentatore separato, basta un cavo USB dati. L'alimentazione 5V esterna è un'opzione pensata solo per l'uso standalone (senza PC, per pilotare direttamente un sintetizzatore hardware via MIDI out), non per il nostro caso d'uso.

**Risolto (16/10/2026)**: Daniele ha trovato il cavo USB giusto e collegato l'eobody III al PC. Confermato riconosciuto sia da Windows (appare come dispositivo "eobody_core", VID 0x0666 = Eowave, con MIDI endpoint attivo) sia da [`software/pluto-runtime`](../../software/pluto-runtime/) via Web MIDI — nello stato dell'app compare "MIDI: eobody_core" in verde. Tutta la catena USB → Windows → Web MIDI → app funziona.

## Mappatura canale/CC (17/10/2026, test con switch accessibili)

Test sistematico con lo stesso switch (AbleNet Big Buddy Button, mono) provato su ogni jack di entrambi i lati, tramite adattatore 3.5mm→6.35mm:

- **Tutti i messaggi arrivano sul canale MIDI 1**, come Control Change (CC).
- **Numerazione CC confermata**: jack lato A = CC pari al numero stampato (a1→CC1, ... a8→CC8); jack lato B = numero + 8 (b1→CC9, ... b8→CC16). Schema pulito e prevedibile.
- **Lato A non reagisce alla pressione di uno switch** — testato su tutti gli 8 jack del lato A, nessuna variazione quando si preme/rilascia (solo rumore meccanico in fase di inserimento del jack, che si esaurisce).
- **Lato B reagisce alla pressione di uno switch** — testato su tutti gli 8 jack del lato B, ognuno produce un messaggio quando si preme (non sempre al 100% delle pressioni, un po' di intermittenza da capire meglio, ma funziona).

**Ipotesi di lavoro**: il lato A è configurato di fabbrica per sensori continui (adatto ai **raggi**), il lato B per interruttori on/off (adatto alle **tavolette**) — coincide comodamente con le due famiglie di oggetti del progetto. Da confermare testando un vero sensore continuo (FSR/pedale) sul lato A.

### Intermittenza sul lato B (indagine chiusa per ora)

Sia con uno switch mono (AbleNet Big Buddy Button) che con uno stereo, la pressione genera un messaggio solo a volte, in modo irregolare — ma **quando succede, arriva sempre come coppia pulita** (premuto+rilasciato insieme), mai un segnale isolato o rumoroso. Indica un contatto meccanico non sempre saldo (adattatore o presa) più che un problema di segnale elettrico disturbato o di configurazione del canale. Provato a ruotare/reinserire i jack più volte: nessun miglioramento. Senza multimetro o adattatori diversi da provare, qui ci fermiamo — prossimo passo utile è l'editor ufficiale Eowave (vedi sotto), che potrebbe mostrare soglie di debounce regolabili.

## Da fare

- [x] Procurarsi il cavo USB giusto — risolto, era "auto-powered", non serve alimentatore separato
- [x] Testare il collegamento USB e verificare che il dispositivo sia riconosciuto come device MIDI — confermato sia da Windows che da pluto-runtime
- [x] Confermare il numero di jack fisici — 16, 8 per lato (a1-a8, b1-b8)
- [x] Mappare canale/CC per jack — vedi sopra: canale 1 sempre, CC = numero jack (lato A) o numero+8 (lato B)
- [x] Capire perché gli switch non reagivano — confermato che è il lato A a non rispondere, non i pulsanti; lato B funziona
- [x] Indagare l'intermittenza sul lato B con gli strumenti disponibili — probabile contatto meccanico incerto, non risolvibile senza multimetro/adattatori diversi
- [ ] Trovare/leggere il numero di serie sul dispositivo e registrarlo su eowave.com per accedere a editor, manuale e patch ufficiali — prossimo passo prioritario, potrebbe spiegare/risolvere l'intermittenza
- [ ] Testare un sensore continuo vero (FSR o pedale) sul lato A, per confermare l'ipotesi "lato A = raggi, lato B = tavolette"
- [ ] Aggiornare [`software/pluto-runtime/config/mapping.js`](../../software/pluto-runtime/config/mapping.js) con la mappatura reale una volta assegnati raggi/tavolette ai jack definitivi
- [ ] Elencare i sensori fisicamente collegati (tipo, canale a/b, numero) quando il set è definitivo
