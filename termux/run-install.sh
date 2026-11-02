#!/data/data/com.termux/files/usr/bin/bash
# Wrapper per pilotare l'installazione da ADB senza dover scrivere caratteri
# speciali di shell (>, ;, &) nel testo digitato via "input text".
bash "$HOME/storage/shared/Download/pluto/installa.sh" > /sdcard/Download/pluto-install.log 2>&1
echo DONE >> /sdcard/Download/pluto-install.log
