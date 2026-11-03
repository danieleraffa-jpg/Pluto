# Pluto — app/icona per il tablet

Stesso schema dell'app Tablettone (`C:\Tablettone\android-kiosk\`): una piccola app Android con una WebView a schermo intero che carica pluto-runtime, pensata per dare un'icona vera sul tablet invece di dover aprire Chrome e digitare l'indirizzo ogni volta.

## Cosa fa

- Apre `http://127.0.0.1:5173` (il server Pluto su Termux, vedi [`../termux/README.md`](../termux/README.md)) a schermo intero, senza barra degli indirizzi.
- Se il server è spento, apre Termux (che lo riavvia da solo, vedi `termux/avvio-da-app.sh`): Pluto resta in attesa in sottofondo controllando la porta del server (non la WebView, che da sola non si accorgerebbe di nulla finché resta in background) e **torna da sola in primo piano** non appena il server risponde — non serve ritoccare l'icona. Richiede il permesso "Visualizza sopra altre app", vedi sotto.
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

## Permesso "Visualizza sopra altre app" (va concesso una volta, dopo l'installazione)

Dopo aver aperto Termux per far ripartire il server, Pluto deve tornare da sola in primo piano. Android però impedisce di default a un'app in background di "autopromuoversi" in primo piano (restrizione "background activity launch") — senza un'eccezione esplicita, Pluto resterebbe bloccata dietro Termux finché non si tocca qualcosa a mano. Il permesso "Visualizza sopra altre app" (`SYSTEM_ALERT_WINDOW`) è il modo standard con cui Android esenta un'app da questa restrizione, anche se Pluto non lo usa per disegnare overlay.

Questo permesso **non si può chiedere con un normale popup di conferma**: va concesso una volta a mano dopo ogni installazione (sopravvive ai riavvii del tablet, va solo rifatto se si reinstalla l'app):

```powershell
adb shell appops set com.pluto.kiosk SYSTEM_ALERT_WINDOW allow
adb shell appops set com.brainart.kiosk SYSTEM_ALERT_WINDOW allow
```

oppure dalle Impostazioni del tablet: **Impostazioni → App → Pluto (e Tablettone) → Accesso speciale alle app → Visualizza sopra ad altre app → consenti**.

## Convivenza con Tablettone (risolto, 03/11/2026)

Tablettone e Pluto condividono la stessa istanza di Termux sul tablet. In origine, subito dopo un riavvio completo del tablet (quando entrambi i server erano spenti insieme), le due app si contendevano lo schermo: quella che si bloccava per prima impediva il passaggio all'altra, perché entrambi gli script di avvio (`termux/avvio-da-app.sh`) riportavano in primo piano la propria app incondizionatamente.

Un primo tentativo (02/11/2026) aveva tolto del tutto il ritorno automatico, lasciando che fosse l'utente a ritoccare l'icona quando il server era pronto — risolveva il conflitto ma era scomodo (serviva chiudere Termux e ritoccare l'icona ogni volta dopo un riavvio).

**Soluzione definitiva:** il ritorno in primo piano ora lo fa **l'app stessa**, non più lo script di Termux (vedi `bringSelfToFront()` in `MainActivity.kt`, con il permesso "Visualizza sopra altre app" sopra). Questo risolve il conflitto in modo strutturale, non per rimozione: l'app di cui l'utente ha toccato l'icona è l'unica la cui `MainActivity` esiste davvero in quel momento, quindi è l'unica che può tornare in primo piano da sola quando il suo server è pronto. Se l'utente non ha mai toccato l'altra app, quella non ha nessuna activity in attesa — il suo server riparte comunque in sottofondo (lo fa comunque `~/.bashrc` per entrambi), ma non c'è nulla che tenti di portarla in primo piano. Nessun conflitto possibile, verificato ripetendo più volte lo scenario "riavvio del tablet" via adb, toccando solo Pluto e poi solo Tablettone.
