# Tavolette (on/off)

Dispositivi a trigger semplice, solo on/off — senza controllo continuo come i "raggi".

## Decisione (14/10/2026): probabilmente non serve costruirle su misura

A differenza dei raggi, per un semplice interruttore on/off esistono già **pulsanti/switch accessibili pronti all'uso**, pensati apposta per persone con disabilità motoria (es. AbleNet, Jelly Switch): economici, robusti, collaudati in ambito assistivo. Ha poco senso reinventarli — meglio comprarne di pronti e collegarli all'eobody III o a un ingresso digitale semplice.

## Connettore (16/10/2026): basta un adattatore, nessun cablaggio custom

Gli switch accessibili standard (Jelly Bean, AbleNet) usano un **jack mono da 3.5mm**, lo standard di tutto il settore della tecnologia assistiva. L'eobody III ha jack da **6.35mm** (vedi [`../eobody-iii/README.md`](../eobody-iii/README.md)). Basta un comune **adattatore passivo 3.5mm → 6.35mm** (economico, reperibile ovunque) — nessuna incompatibilità elettrica: una tavoletta usa solo punta+calza (contatto on/off), non serve il terzo contatto (anello, 5V) usato invece dai sensori continui dei raggi.

## Da fare

- [ ] Chiarire con CRAMS quante tavolette servono in un set tipico
- [ ] Scegliere un modello di switch accessibile già pronto (tipo AbleNet, Jelly Switch) invece di costruirne uno
- [ ] Procurarsi un adattatore jack 3.5mm (femmina) → 6.35mm (maschio) per collegarlo all'eobody
- [ ] Testare con il monitor MIDI di [`software/pluto-runtime`](../../software/pluto-runtime/) che la pressione dello switch generi un messaggio MIDI visibile
- [ ] Coordinarsi con il musicista di riferimento CRAMS per il suono associato a ogni tavoletta (vedi [`../../software/pluto-runtime/config/mapping.js`](../../software/pluto-runtime/config/mapping.js))
