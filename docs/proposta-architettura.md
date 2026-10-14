# Proposta di architettura — Pluto (raggi e tavolette)

Documento di discussione, da condividere con CRAMS. Non è una decisione definitiva: è una base di partenza per scegliere insieme la direzione del software.

## Punto di partenza

- L'obiettivo confermato da CRAMS è **sostituire e affiancare il Soundbeam** con due famiglie di oggetti: **raggi** (controllo continuo, impugnabili) e **tavolette** (solo on/off).
- Il **suono associato a ogni oggetto** è definito insieme a un musicista di CRAMS: è una scelta creativa, da poter modificare senza un tecnico.
- Il **software originale non è recuperabile**: va riscritto.
- L'**eobody III** (Eowave) è una scheda USB-MIDI che converte già i segnali dei sensori in MIDI in hardware. Quindi il software da scrivere non è il firmware del sensore, ma tutto ciò che sta **sopra** il MIDI.

## Architettura a strati

```
[ Oggetti fisici ]   raggi (valore continuo)        tavolette (on/off)
        │                       │                          │
        └───────────── cablati sui jack ───────────────────┘
                                │
                  [ eobody III sensorbox ]  ← conversione in hardware, nessun software nostro
                                │  USB-MIDI
                                │  · raggi → Control Change (CC)
                                │  · tavolette → Note On / Note Off
                                ▼
                  [ Motore sonoro + mappatura ]  ← qui va il software da scrivere
                                │
                                ▼
                          Audio in uscita
```

Lo strato centrale fa due cose:
1. **Mappatura configurabile**: quale CC/nota corrisponde a quale raggio/tavoletta, e a quale suono o parametro sonoro.
2. **Generazione audio**: produce i suoni (campioni, synth, effetti) in base alla mappatura.

La mappatura deve poter essere **modificata dal musicista senza toccare il codice**.

## Due strade per lo strato sonoro

### A. Riusare un DAW esistente (Ableton Live o Max/MSP)

- Il progetto diventa una **patch/set** che il musicista può aprire e modificare.
- Pro: il musicista probabilmente lo conosce già; nessun codice da mantenere; la logica creativa resta nelle sue mani.
- Contro: licenza commerciale; serve un PC abbastanza potente; meno controllo su logiche specifiche (es. feedback al paziente sul proprio contributo).

### B. App custom leggera (es. Python o Node, con libreria MIDI e player di campioni)

- Un programma unico, installabile su un mini-PC dedicato da portare nelle RSA e nei centri.
- Pro: nessuna licenza; interfaccia semplice pensata per operatori non tecnici; logiche specifiche possibili.
- Contro: va scritta e mantenuta da zero; se il tecnico manca di nuovo, il problema si ripresenta, a meno che non sia documentata bene fin dall'inizio.

## Raccomandazione iniziale

Partire da **A** per il primo prototipo: è il modo più veloce per far suonare raggi e tavolette e per verificare con il musicista cosa serve davvero. Se emergono logiche che un DAW non copre bene, valutare **B** solo per quella parte.

## Da chiarire con CRAMS

1. **Sensore dei raggi**: pressione, piegamento, capacitivo, accelerometro? Se i jack dell'eobody bastano, non serve elettronica custom; altrimenti serve la scheda Arduino e quindi firmware.
2. **Quanti oggetti** in un set tipico (raggi e tavolette), per dimensionare i canali dell'eobody (16 jack disponibili).
3. **Il musicista di riferimento**: con quali strumenti lavora già? Questo pesa molto nella scelta A/B.
4. **Ambiente d'uso**: quale computer useranno nelle RSA e nei centri? Serve funzionamento offline?
5. **Feedback al paziente**: serve che il paziente senta/veda in modo immediato l'effetto del proprio gesto? Dove viene gestito (suono, luce, altro)?
6. **Manutenzione**: chi terrà il sistema nel tempo? Serve una persona di riferimento tecnico, o il musicista da solo?

## Prossimi passi proposti

- Verificare con un sensore di prova che l'eobody invii correttamente MIDI su USB (Note On/Off e CC).
- Costruire un primo prototipo con un solo raggio e una sola tavoletta, con suoni scelti dal musicista.
- Documentare ogni scelta in questo repository, così la documentazione non si perde di nuovo.
