# Radar distanza (sperimentale) — funzionante (17/10/2026)

Terza famiglia di oggetti, non richiesta esplicitamente da CRAMS (che ha chiesto raggi + tavolette) ma esplorata per avvicinarsi al principio del beam spaziale del Soundbeam originale: un sensore che rileva la distanza di qualcuno nello spazio, senza bisogno di contatto fisico — **testato e funzionante** con un Arduino Mega 2560 + HC-SR04.

## Storia breve

Il primo tentativo con un **HC-SR501** (PIR a infrarossi, solo presenza sì/no, non misura la distanza) non ha funzionato: confermato via Monitor Seriale di Arduino IDE che il sensore non generava mai un segnale, indipendentemente dal software — quasi certamente un esemplare difettoso, non un problema di cablaggio (alimentazione verificata corretta via foto). Firmware comunque tenuto in [`firmware/presenza-pir/`](../../firmware/presenza-pir/) per un'eventuale prova futura con un altro PIR.

Passato a un **HC-SR04** (sensore a ultrasuoni) — **funziona**: dà un vero valore continuo di distanza, esattamente il principio del beam originale del Soundbeam (non solo sì/no come il PIR).

## Collegamento: non passa dall'eobody

A differenza di raggi e tavolette, questo sensore **non usa l'eobody III**: è collegato direttamente a un Arduino (testato con una Mega 2560; va bene qualsiasi modello con Seriale USB — nessuna differenza tra Uno R3, Leonardo, Mega, R4 WiFi perché si usa solo la Seriale di base, non il MIDI), che parla con [`software/pluto-runtime`](../../software/pluto-runtime/) via **Web Serial API** invece che Web MIDI. Scelta fatta apposta per evitare l'incertezza sul supporto MIDI nativo delle diverse schede Arduino, e per bypassare del tutto i problemi di ingresso fluttuante visti con l'eobody (vedi [`../eobody-iii/README.md`](../eobody-iii/README.md)) — gli ingressi digitali di un Arduino hanno il pull-up integrato via software, zero resistenze da saldare.

Firmware: [`firmware/distanza-ultrasuoni/distanza-ultrasuoni.ino`](../../firmware/distanza-ultrasuoni/distanza-ultrasuoni.ino) (HC-SR04, funzionante) — [`firmware/presenza-pir/`](../../firmware/presenza-pir/) (HC-SR501, non testato con successo).

## Cablaggio HC-SR04 (Arduino Mega 2560)

| HC-SR04 | → | Arduino Mega |
|---|---|---|
| VCC | → | 5V |
| GND | → | GND |
| Trig | → | pin 2 |
| Echo | → | pin 3 |

## Come funziona nel software

Il canale si chiama `radar` in [`software/pluto-runtime/config/mapping.js`](../../software/pluto-runtime/config/mapping.js) — non è un canale MIDI (nessun numero 1-16), riceve dati via Seriale. Si comporta come un vero **raggio**: la distanza (tra `minCm` e `maxCm`, configurabili) viene quantizzata su una nota scelta da `scale`, stesso principio "posizione → nota da una sequenza" dei raggi collegati all'eobody. Fuori dalla portata configurata (o nessun eco rilevato) = silenzio, come l'area inattiva di un beam Soundbeam.

## Da fare

- [x] Caricare il firmware su un Arduino e collegare fisicamente un sensore di prova
- [x] Testare con pluto-runtime — **funzionante** con HC-SR04
- [ ] Tarare `minCm`/`maxCm`/`scale` in base allo spazio reale d'uso
- [ ] Decidere con CRAMS se questo oggetto ha senso nel progetto (non era nella richiesta originale raggi+tavolette) o se è solo un esperimento
- [ ] Se si vuole comunque riprovare un sensore di presenza semplice (non continuo), procurarsi un secondo HC-SR501 (il primo sembra difettoso) — il firmware è già pronto
