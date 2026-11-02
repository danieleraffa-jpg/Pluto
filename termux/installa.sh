#!/data/data/com.termux/files/usr/bin/bash
# Installazione (una tantum) di Pluto sul tablet Android, dentro Termux.
# Si puo' rilanciare senza problemi per aggiornare il codice.
#
# Prerequisiti:
#   - la cartella "pluto" copiata dal PC in Download/pluto sul tablet
#   - eseguito una volta "termux-setup-storage" e concesso l'accesso ai file

set -e

SORGENTE="$HOME/storage/shared/Download/pluto"
DEST="$HOME/pluto-termux"

if [ ! -d "$SORGENTE" ]; then
    echo "ERRORE: non trovo $SORGENTE"
    echo "Hai eseguito termux-setup-storage e copiato la cartella dal PC?"
    exit 1
fi

echo "== 1/3 Node.js =="
if ! command -v node >/dev/null; then
    ln -sf "$PREFIX/etc/termux/mirrors/default" "$PREFIX/etc/termux/chosen_mirrors"
    echo "deb https://packages-cf.termux.dev/apt/termux-main stable main" > "$PREFIX/etc/apt/sources.list"
    pkg update -y
    pkg install -y nodejs-lts
else
    echo "Gia' installato ($(node -v))."
fi

echo "== 2/3 Copio Pluto in $DEST =="
pkill -f "pluto-server.js" || true   # se e' un aggiornamento, riparte col codice nuovo
mkdir -p "$DEST"
cp "$SORGENTE/pluto-server.js" "$DEST/"
cp -r "$SORGENTE/pluto-runtime" "$DEST/"
cp "$SORGENTE/avvia.sh" "$SORGENTE/ferma.sh" "$SORGENTE/avvio-da-app.sh" "$DEST/"
chmod +x "$DEST/avvia.sh" "$DEST/ferma.sh" "$DEST/avvio-da-app.sh"

echo "== 3/3 Avvio automatico quando apri Termux =="
# Se il server e' spento lo riavvia aprendo Termux, e riporta in primo piano
# l'app Pluto (serve soprattutto se anche l'app Tablettone usa lo stesso
# meccanismo: senza questo "am start" finale, l'ultima app a reclamare lo
# schermo e' sempre l'altra). Niente avvio all'accensione del tablet
# (Termux:Boot non serve, basta aprire Termux una volta).
touch "$HOME/.bashrc"
if ! grep -q "pluto-termux/avvio-da-app.sh" "$HOME/.bashrc"; then
    cat >> "$HOME/.bashrc" <<'EOF'
# Pluto: se il server e' spento lo avvia e riapre l'app (vedi termux/README.md)
[ -x ~/pluto-termux/avvio-da-app.sh ] && ~/pluto-termux/avvio-da-app.sh
EOF
fi

"$DEST/avvia.sh"

echo
echo "Installazione completata."
echo "Apri Chrome sul tablet su http://127.0.0.1:5173"
echo "Log del server: $DEST/server.log"
echo "Puoi cancellare Download/pluto dal tablet per liberare spazio."
