# Pluto — app/icona per il tablet

Stesso schema dell'app Tablettone (`C:\Tablettone\android-kiosk\`): una piccola app Android con una WebView a schermo intero che carica pluto-runtime, pensata per dare un'icona vera sul tablet invece di dover aprire Chrome e digitare l'indirizzo ogni volta.

## Cosa fa

- Apre `http://127.0.0.1:5173` (il server Pluto su Termux, vedi [`../termux/README.md`](../termux/README.md)) a schermo intero, senza barra degli indirizzi.
- Se il server è spento, apre Termux (che lo riavvia da solo, vedi `termux/avvio-da-app.sh`) e torna automaticamente sull'app appena pronto.
- Si blocca sullo schermo (screen pinning) una volta caricato, per evitare uscite accidentali — tocca 5 volte rapide nell'angolo in alto a sinistra per uscire o cambiare indirizzo server (es. per puntare al PC durante lo sviluppo, invece che al tablet stesso).

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

L'installazione (`adb install`) mette l'app nel cassetto delle app, non sulla Home — va aggiunta manualmente una volta: apri il cassetto app, tieni premuta l'icona "Pluto", trascinala sulla Home. Stesso procedimento già fatto per "Tablettone".

## Limite noto: conflitto con Tablettone dopo un riavvio completo del tablet

Entrambe le app (Tablettone e Pluto) usano lo stesso meccanismo: se il loro server è spento aprono Termux, che li riavvia e torna all'app. Nell'uso normale (il server è già acceso, es. il tablet non è stato appena riavviato) questo non succede: l'icona apre l'app direttamente, senza passare da Termux.

**Solo subito dopo un riavvio completo del tablet**, quando Termux deve far ripartire *entrambi* i server da zero, può capitare che **la prima app ad aprirsi per prima si blocchi sullo schermo e impedisca all'altra di prendere il suo posto** (il blocco schermo di Android impedisce il cambio app finché non si sblocca). Non è un bug del codice, è un conflitto tra le due app che condividono la stessa istanza di Termux.

Soluzione pratica se capita: tocca 5 volte rapide nell'angolo in alto a sinistra dell'app che si è aperta per sbagliare, scegli "Esci dalla kiosk mode", poi apri di nuovo l'icona giusta — a quel punto il suo server è comunque già partito e si aprirà subito senza passare da Termux.
