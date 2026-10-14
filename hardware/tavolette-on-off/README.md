# Tavolette (on/off)

Dispositivi a trigger semplice, solo on/off — senza controllo continuo come i "raggi".

## Decisione (14/10/2026): probabilmente non serve costruirle su misura

A differenza dei raggi, per un semplice interruttore on/off esistono già **pulsanti/switch accessibili pronti all'uso**, pensati apposta per persone con disabilità motoria (es. AbleNet, Jelly Switch): economici, robusti, collaudati in ambito assistivo. Ha poco senso reinventarli — meglio comprarne di pronti e collegarli all'eobody III o a un ingresso digitale semplice.

## Da fare

- [ ] Chiarire con CRAMS quante tavolette servono in un set tipico
- [ ] Scegliere un modello di switch accessibile già pronto (tipo AbleNet, Jelly Switch) invece di costruirne uno
- [ ] Verificare il tipo di connettore richiesto dallo switch scelto e come adattarlo all'ingresso dell'eobody III (jack TRS, vedi [`../eobody-iii/README.md`](../eobody-iii/README.md)) — potrebbe servire un piccolo adattatore di cablaggio, non un sensore nuovo
- [ ] Coordinarsi con il musicista di riferimento CRAMS per il suono associato a ogni tavoletta (vedi [`../../software/pluto-runtime/config/mapping.js`](../../software/pluto-runtime/config/mapping.js))
