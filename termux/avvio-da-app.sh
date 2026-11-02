#!/data/data/com.termux/files/usr/bin/bash
# Eseguito da ~/.bashrc a ogni apertura di Termux. Se il server Pluto e'
# spento (caso tipico: l'ha aperto l'app Pluto) avvia tutto e torna all'app.
# Se il server e' gia' attivo non fa nulla: Termux resta utilizzabile normalmente.

pgrep -f "pluto-server.js" >/dev/null && exit 0

"$HOME/pluto-termux/avvia.sh"
sleep 1
am start -n com.pluto.kiosk/.MainActivity >/dev/null 2>&1
