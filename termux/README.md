# Pluto standalone sul tablet (Termux)

Stesso schema usato per Tablettone/BrainArt, molto più semplice (nessun database, solo file statici). Risultato: il tablet fa girare Pluto da solo, niente PC né rete necessari a runtime.

Tablet di riferimento: Freeski C12 ("AUMI AI OS"), Android 15, lo stesso già usato per Tablettone — Termux e Node sono già installati lì.

## Installazione (dal PC, via USB/adb)

1. Tablet collegato via USB con "Debug USB" attivo e autorizzato.
2. Dal PC:
   ```
   adb push software/pluto-runtime /sdcard/Download/pluto/
   adb push termux/pluto-server.js termux/avvia.sh termux/ferma.sh termux/installa.sh /sdcard/Download/pluto/
   ```
3. Sul tablet, apri Termux (se non hai già dato accesso ai file: `termux-setup-storage`, poi concedi il permesso quando richiesto).
4. In Termux:
   ```
   bash ~/storage/shared/Download/pluto/installa.sh
   ```
5. Apri Chrome sul tablet su **http://127.0.0.1:5173**.

Rilanciare `installa.sh` dopo aver ricopiato una versione aggiornata di `pluto-runtime` aggiorna il codice sul tablet senza perdere nulla (non c'è un database da preservare qui).

## Avvio/arresto manuale

```
bash ~/pluto-termux/avvia.sh   # avvia (non duplica se gia' attivo)
bash ~/pluto-termux/ferma.sh   # ferma
```

Il server riparte da solo aprendo Termux, se risultava spento (vedi riga aggiunta a `~/.bashrc` da `installa.sh`). Niente avvio automatico all'accensione del tablet (stessa scelta fatta per Tablettone: Termux:Boot non funziona in modo affidabile su questo hardware, va aperto Termux almeno una volta).

## Icona sul tablet

C'è anche un'app Android dedicata (stesso schema di Tablettone) che da' un'icona vera invece di dover aprire Chrome a mano — vedi [`../android-kiosk/README.md`](../android-kiosk/README.md), incluso un limite noto quando Tablettone e Pluto si aprono entrambi per la prima volta dopo un riavvio del tablet.

## Limite noto: Web Serial non disponibile su Chrome Android

Verificato (02/11/2026): il canale "radar" (sensore a ultrasuoni via Arduino, Web Serial API) **non funziona su Chrome Android** — il pulsante "Collega sensore seriale" mostra "Seriale non supportata". È una limitazione del browser su mobile, non del nostro codice. **Web MIDI invece dovrebbe funzionare** (raggi/tavolette via eobody) — va verificato con l'eobody collegato al tablet via USB-OTG.

Se in futuro serve il radar anche su tablet, l'alternativa è **WebUSB** (supportata da Chrome Android, a differenza di Web Serial) — richiederebbe riscrivere la comunicazione con l'Arduino, non prioritario ora.
