#!/data/data/com.termux/files/usr/bin/bash
# Eseguito da ~/.bashrc a ogni apertura di Termux. Se il server Pluto e'
# spento lo riavvia. NON riporta l'app in primo piano da solo: se anche
# Tablettone deve ripartire nello stesso momento (tipicamente solo subito
# dopo un riavvio del tablet), le due app si contenderebbero lo schermo e
# chi si blocca per primo impedirebbe il passaggio all'altra. Meglio
# riavviare i server in silenzio e lasciare che sia l'utente a toccare
# l'icona che vuole - a quel punto il server e' gia' pronto e l'apertura
# e' istantanea, nessun passaggio da Termux necessario.

pgrep -f "pluto-server.js" >/dev/null && exit 0

"$HOME/pluto-termux/avvia.sh"
