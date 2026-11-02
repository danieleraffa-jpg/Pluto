#!/data/data/com.termux/files/usr/bin/bash
# Avvia il server Pluto sul tablet (dentro Termux). Non avvia un doppione se
# e' gia' in esecuzione.

DEST="$HOME/pluto-termux"

termux-wake-lock 2>/dev/null

if pgrep -f "pluto-server.js" >/dev/null; then
    echo "Server Pluto gia' in esecuzione."
else
    echo "Avvio server Pluto..."
    cd "$DEST" || exit 1
    nohup node pluto-server.js >"$DEST/server.log" 2>&1 &
fi

echo "Pronto: http://127.0.0.1:5173"
