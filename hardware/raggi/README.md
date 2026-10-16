# Raggi

Oggetti impugnabili: il paziente, prendendoli in mano, produce suoni e — in base ai settaggi — può gestire consapevolmente il proprio intervento nella composizione musicale collettiva. Equivalente fisico/maneggiabile dei raggi ultrasonici del Soundbeam.

## Decisione (14/10/2026): costruirli su misura ha senso

Non esiste probabilmente un prodotto commerciale pronto che sia esattamente "un oggetto impugnabile per pazienti con disabilità, con risposta graduale alla presa/al movimento". Costruirlo su misura è ragionevole perché l'elettronica richiesta è semplice: gli ingressi sensore dell'eobody III sono un partitore di tensione 0-5V su jack TRS (vedi [`../eobody-iii/README.md`](../eobody-iii/README.md)) — qualunque componente resistivo (sensore di pressione FSR, flex sensor per il piegamento) collegato ai tre pin del jack funziona **senza microcontrollore e senza firmware**.

Candidati più semplici da cui partire, in ordine di probabile facilità:
1. **Sensore di pressione FSR** (Force Sensing Resistor) — l'utente stringe il raggio, più stringe più cambia il segnale. Economico, robusto, molto comune nei progetti di tecnologia assistiva.
2. **Flex sensor** — il raggio si piega quando viene mosso/tenuto in modi diversi. Più fragile nel tempo di un FSR.

## Test rapido senza un vero sensore (16/10/2026)

Prima di procurarsi un FSR vero, per confermare solo che un jack dell'eobody legga qualcosa e lo mandi come MIDI a [`software/pluto-runtime`](../../software/pluto-runtime/), si può usare quello che si ha già sottomano, collegato a un cavo jack 6.35mm (formato confermato, vedi [`../eobody-iii/README.md`](../eobody-iii/README.md)):

1. **Un pedale volume/espressione per chitarra** (se disponibile) — ha già dentro un potenziometro cablato esattamente come serve (punta=segnale, anello=5V, calza=massa), nessun collegamento da fare.
2. **Qualunque oggetto con un potenziometro e uscita jack** (vecchia tastiera MIDI con pedale, mixer, ecc.).
3. **Un cavo jack economico tagliato da un lato**, coi fili di punta e calza nudi toccati insieme (anche solo con le dita) — test grezzo ma sufficiente a confermare che il jack risponde.

## Da fare

- [ ] Chiarire con CRAMS che tipo di gesto deve rilevare il raggio (stringere/premere → FSR; piegare → flex sensor; muovere nello spazio → accelerometro, più complesso elettronicamente)
- [ ] Definire quanti raggi servono in un set tipico (per capire quanti ingressi eobody servono, insieme alle tavolette — vedi nota sul conteggio reale dei jack in [`../eobody-iii/README.md`](../eobody-iii/README.md))
- [ ] Fare il test rapido sopra per confermare che almeno un jack risponda
- [ ] Procurarsi 1 sensore FSR (il candidato più semplice) e un jack 6.35mm per il primo prototipo vero di collegamento diretto all'eobody
- [ ] Prototipo fisico: sensore + jack dentro un involucro impugnabile, robusto e pulibile (uso con pazienti fragili)
- [ ] **Documentare qui schema elettrico e wiring appena costruito il primo prototipo** — è il problema che ha causato la perdita del Pluto originale, non va ripetuto
- [ ] Coordinarsi con il musicista di riferimento CRAMS per il mapping suono ↔ gesto (vedi [`../../software/pluto-runtime/config/mapping.js`](../../software/pluto-runtime/config/mapping.js))
