# Pluto — app/icona per il tablet

Stesso schema dell'app Tablettone (`C:\Tablettone\android-kiosk\`): una piccola app Android con una WebView a schermo intero che carica pluto-runtime, pensata per dare un'icona vera sul tablet invece di dover aprire Chrome e digitare l'indirizzo ogni volta.

## Cosa fa

- Apre `http://127.0.0.1:5173` (il server Pluto su Termux, vedi [`../termux/README.md`](../termux/README.md)) a schermo intero, senza barra degli indirizzi.
- Se il server è spento, apre Termux (che lo riavvia da solo, vedi `termux/avvio-da-app.sh`) e torna automaticamente sull'app appena pronto.
- Si blocca sullo schermo (screen pinning) una volta caricato, per evitare uscite accidentali — tocca 5 volte rapide nell'angolo in alto a sinistra per uscire, cambiare indirizzo server (es. per puntare al PC durante lo sviluppo, invece che al tablet stesso), o richiedere di nuovo l'aggiunta dell'icona alla Home.
- Al primo avvio chiede da sola al launcher di aggiungersi alla Home (popup di conferma di sistema) — utile su launcher che supportano questa richiesta standard di Android; su questo tablet non ha funzionato (vedi sotto), ma non fa danno tentarla.

## Compilare e installare

Serve Android Studio (per l'SDK) e il JDK incluso in Android Studio stesso (JBR):

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
cd android-kiosk
.\gradlew assembleDebug
adb install -r app\build\outputs\apk\debug\app-debug.apk
```

L'APK compilato non è incluso nel repository (è un artefatto generato, vedi `.gitignore`) — ricompilarlo quando serve con i comandi sopra, oppure chiedere una copia già pronta.

## Mettere l'icona sulla Home

L'installazione (`adb install`) mette l'app nel cassetto delle app, non sulla Home — va aggiunta manualmente una volta: apri il cassetto app, tieni premuta l'icona "Pluto", trascinala sulla Home.

**Sul launcher di questo tablet (AUMI AI OS) il trascinamento normale non funziona finché è attivo lo stile "Double Layer"** (cassetto app separato dalla Home) — l'icona si solleva ma non passa alla Home, resta nella lista. Soluzione trovata (02/11/2026): tieni premuto uno spazio vuoto della Home → **Impostazioni schermata Home** → **Launcher Style** → cambia da **Double Layer** a **Single Layer**. Dopo il cambio il trascinamento funziona normalmente. È un'impostazione del tablet, non dell'app: va fatta una sola volta e vale per tutte le app, non solo Pluto.

## Convivenza con Tablettone (risolto, 02/11/2026)

Tablettone e Pluto condividono la stessa istanza di Termux sul tablet. In origine, subito dopo un riavvio completo del tablet (quando entrambi i server erano spenti insieme), le due app si contendevano lo schermo: quella che si bloccava per prima impediva il passaggio all'altra.

**Risolto togliendo il "ritorno automatico in primo piano" dagli script di avvio di entrambe le app** (`termux/avvio-da-app.sh`, sia qui che in `C:\Tablettone\termux\`): ora, se Termux deve far ripartire i server da zero, li avvia entrambi in silenzio senza che nessuna delle due app si blocchi sullo schermo da sola. L'utente tocca semplicemente l'icona che vuole, che si apre subito perché il suo server è già pronto. Nessun conflitto possibile, verificato ripetendo più volte lo scenario "riavvio del tablet" via adb.
