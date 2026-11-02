#!/data/data/com.termux/files/usr/bin/bash
# Aggiorna le copie "live" degli script di avvio di entrambe le app,
# cosi' smettono di contendersi lo schermo subito dopo un riavvio.
cp "$HOME/storage/shared/Download/pluto/avvio-da-app.sh" "$HOME/pluto-termux/avvio-da-app.sh"
cp "$HOME/storage/shared/Download/avvio-da-app-tablettone.sh" "$HOME/tablettone-termux/avvio-da-app.sh"
chmod +x "$HOME/pluto-termux/avvio-da-app.sh" "$HOME/tablettone-termux/avvio-da-app.sh"
echo "AGGIORNATI" > /sdcard/Download/pluto-check.log
