# Raggi

Oggetti impugnabili: il paziente, prendendoli in mano, produce suoni e — in base ai settaggi — può gestire consapevolmente il proprio intervento nella composizione musicale collettiva. Equivalente fisico/maneggiabile dei raggi ultrasonici del Soundbeam.

## Decisione (14/10/2026): costruirli su misura ha senso

Non esiste probabilmente un prodotto commerciale pronto che sia esattamente "un oggetto impugnabile per pazienti con disabilità, con risposta graduale alla presa/al movimento". Costruirlo su misura è ragionevole perché l'elettronica richiesta è semplice: gli ingressi sensore dell'eobody III sono un partitore di tensione 0-5V su jack TRS (vedi [`../eobody-iii/README.md`](../eobody-iii/README.md)) — qualunque componente resistivo (sensore di pressione FSR, flex sensor per il piegamento) collegato ai tre pin del jack funziona **senza microcontrollore e senza firmware**.

Candidati più semplici da cui partire, in ordine di probabile facilità:
1. **Sensore di pressione FSR** (Force Sensing Resistor) — l'utente stringe il raggio, più stringe più cambia il segnale. Economico, robusto, molto comune nei progetti di tecnologia assistiva.
2. **Flex sensor** — il raggio si piega quando viene mosso/tenuto in modi diversi. Più fragile nel tempo di un FSR.

## Da fare

- [ ] Chiarire con CRAMS che tipo di gesto deve rilevare il raggio (stringere/premere → FSR; piegare → flex sensor; muovere nello spazio → accelerometro, più complesso elettronicamente)
- [ ] Definire quanti raggi servono in un set tipico (per capire quanti dei 16 ingressi eobody servono, insieme alle tavolette)
- [ ] Procurarsi 1 sensore FSR (il candidato più semplice) e un jack TRS per il primo prototipo di collegamento diretto all'eobody
- [ ] Verificare la dimensione del jack dell'eobody (6.35mm o 3.5mm) prima di comprare/cablare il connettore
- [ ] Prototipo fisico: sensore + jack dentro un involucro impugnabile, robusto e pulibile (uso con pazienti fragili)
- [ ] **Documentare qui schema elettrico e wiring appena costruito il primo prototipo** — è il problema che ha causato la perdita del Pluto originale, non va ripetuto
- [ ] Coordinarsi con il musicista di riferimento CRAMS per il mapping suono ↔ gesto (vedi [`../../software/pluto-runtime/config/mapping.js`](../../software/pluto-runtime/config/mapping.js))
