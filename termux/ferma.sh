#!/data/data/com.termux/files/usr/bin/bash
# Ferma il server Pluto sul tablet.
pkill -f "pluto-server.js" && echo "Server Pluto fermato." || echo "Non era in esecuzione."
