# Proposta di architettura — Pluto (raggi e tavolette)

Documento di discussione, da condividere con CRAMS. Non è una decisione definitiva: è una base di partenza per scegliere insieme la direzione del software.

> **Aggiornamento 14/10/2026**: dopo la prima stesura di questo documento abbiamo ricevuto il manuale tecnico originale del Soundbeam e il feedback di un musicista esperto che lo usa con CRAMS. Entrambi correggono un punto tecnico (vedi sotto) e aggiungono indicazioni importanti sul target utente. Dettagli in [`soundbeam-tecnico.md`](soundbeam-tecnico.md).

## Punto di partenza

- L'obiettivo confermato da CRAMS è **sostituire e affiancare il Soundbeam** con due famiglie di oggetti: **raggi** (controllo continuo, impugnabili) e **tavolette** (solo on/off).
- Il **suono associato a ogni oggetto** è definito insieme a un musicista di CRAMS: è una scelta creativa, da poter modificare senza un tecnico.
- Il **software originale non è recuperabile**: va riscritto.
- L'**eobody III** (Eowave) è una scheda USB-MIDI che converte già i segnali dei sensori in MIDI in hardware. Quindi il software da scrivere non è il firmware del sensore, ma tutto ciò che sta **sopra** il MIDI.
- **Correzione tecnica**: il Soundbeam originale non manda un valore continuo (Control Change) come meccanismo principale. Manda la **distanza quantizzata in una nota MIDI**, scelta da una sequenza/scala precaricata (vedi [`soundbeam-tecnico.md`](soundbeam-tecnico.md) per i dettagli). Il CC continuo esiste solo come livello opzionale aggiuntivo. I raggi dovrebbero probabilmente seguire lo stesso principio — posizione/pressione → nota da una sequenza — non un controllo continuo puro, da confermare con CRAMS.

## Architettura a strati

```
[ Oggetti fisici ]   raggi (posizione/pressione)     tavolette (on/off)
        │                       │                          │
        └───────────── cablati sui jack ───────────────────┘
                                │
                  [ eobody III sensorbox ]  ← conversione in hardware, nessun software nostro
                                │  USB-MIDI
                                │  · raggi → nota scelta da una sequenza (come il beam Soundbeam)
                                │  · tavolette → Note On / Note Off (stesso motore sequenza/trigger)
                                ▼
                  [ Motore sonoro + mappatura ]  ← qui va il software da scrivere
                                │
                                ▼
                          Audio in uscita
```

Lo strato centrale fa due cose:
1. **Mappatura configurabile**: quale sequenza di note/suoni corrisponde a quale raggio/tavoletta, con che modalità di trigger.
2. **Generazione audio**: produce i suoni (campioni, synth, effetti) in base alla mappatura.

La mappatura deve poter essere **modificata dal musicista senza toccare il codice**.

## Feedback di un musicista esperto di Soundbeam (14/10/2026)

Oltre alla correzione tecnica, un musicista che collabora con CRAMS e usa il Soundbeam da anni ha dato un'indicazione strategica importante, citata per intero in [`soundbeam-tecnico.md`](soundbeam-tecnico.md):

- **Priorità assoluta alla latenza** — più di qualunque altra feature.
- **Progettare per educatori/operatori, non per musicisti professionisti**: chi usa oggi il Soundbeam coi propri settaggi e repertorio non lo cambierà comunque — il nostro sistema ha senso per un mercato diverso: neofiti, educatori, insegnanti delle primarie, uso ludico, non performance professionale.

Questo sposta la domanda da "A o B" a: **chi usa cosa, e quando**. La preparazione dei suoni (repertorio, mapping) resta compito del musicista; l'uso quotidiano in sessione (avviare, cambiare raggio/tavoletta, gestire il paziente) deve poter essere fatto da un educatore senza competenze tecniche o musicali.

## Due strade per lo strato sonoro

### A. Riusare un DAW esistente (Ableton Live o Max/MSP)

- Il progetto diventa una **patch/set** che il musicista può aprire e modificare.
- Pro: il musicista probabilmente lo conosce già; nessun codice da mantenere; la logica creativa resta nelle sue mani.
- Contro: licenza commerciale; serve un PC abbastanza potente; meno controllo su latenza e su logiche specifiche; **non è pensato per essere operato da un educatore durante una sessione** — richiede competenze che il target indicato dal musicista non ha.

### B. App custom leggera (es. Python o Node, con libreria MIDI e player di campioni)

- Un programma unico, installabile su un mini-PC dedicato da portare nelle RSA e nei centri.
- Pro: nessuna licenza; interfaccia semplice pensata per operatori non tecnici; controllo diretto sulla latenza; logiche specifiche possibili (es. quantizzazione posizione→nota come il Soundbeam originale).
- Contro: va scritta e mantenuta da zero; se il tecnico manca di nuovo, il problema si ripresenta, a meno che non sia documentata bene fin dall'inizio.

## Raccomandazione aggiornata

Il feedback del musicista sposta la raccomandazione verso un approccio ibrido, non più "A poi eventualmente B":

- **Preparazione del suono (offline, fatta dal musicista)**: può restare su strumenti che già conosce (DAW/Max), usati per definire repertorio e settaggi.
- **Runtime in sessione (ciò che useranno gli educatori con i pazienti)**: merita un'**app custom leggera (B)**, pensata apposta per bassa latenza e un'interfaccia minima — accendi, scegli il set di suoni già pronto, usa i raggi/tavolette. Non un ambiente di produzione musicale.

Il primo prototipo tecnico (collegare un sensore, verificare note in uscita dall'eobody, misurare la latenza reale) resta comunque il primo passo concreto, indipendentemente da questa scelta.

## Da chiarire con CRAMS

1. **Sensore dei raggi**: pressione, piegamento, capacitivo, accelerometro? Se i jack dell'eobody bastano, non serve elettronica custom; altrimenti serve la scheda Arduino e quindi firmware.
2. **Comportamento dei raggi**: nota-da-sequenza come i beam Soundbeam, o qualcos'altro? (vedi correzione tecnica sopra)
3. **Quanti oggetti** in un set tipico (raggi e tavolette), per dimensionare i canali dell'eobody (16 jack disponibili).
4. **Il musicista di riferimento**: è disponibile a definire repertorio/settaggi in modo continuativo? Con quali strumenti lavora già?
5. **Ambiente d'uso**: quale computer useranno nelle RSA e nei centri? Serve funzionamento offline?
6. **Feedback al paziente**: serve che il paziente senta/veda in modo immediato l'effetto del proprio gesto? Dove viene gestito (suono, luce, altro)?
7. **Manutenzione**: chi terrà il sistema nel tempo? Serve una persona di riferimento tecnico, o il musicista/educatore da soli?

## Prossimi passi proposti

- Verificare con un sensore di prova che l'eobody invii correttamente MIDI su USB, misurando la latenza reale end-to-end.
- Costruire un primo prototipo con un solo raggio e una sola tavoletta, con suoni scelti dal musicista, usando lo stesso principio posizione→nota del Soundbeam originale.
- Documentare ogni scelta in questo repository, così la documentazione non si perde di nuovo.
