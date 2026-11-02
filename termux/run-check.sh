#!/data/data/com.termux/files/usr/bin/bash
if pgrep -f "pluto-server.js" >/dev/null; then
  echo "RUNNING" > /sdcard/Download/pluto-check.log
else
  echo "NOTRUNNING" > /sdcard/Download/pluto-check.log
fi
