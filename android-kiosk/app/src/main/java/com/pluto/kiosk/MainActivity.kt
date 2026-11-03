package com.pluto.kiosk

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import java.net.InetSocketAddress
import java.net.Socket

/**
 * Mostra a schermo intero, in una WebView, la UI servita da pluto-runtime: di
 * default quella che gira sul tablet stesso (127.0.0.1, via Termux), oppure
 * un server in rete locale (es. il PC, durante lo sviluppo).
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var prefs: SharedPreferences
    private val retryHandler = Handler(Looper.getMainLooper())
    private var retryRunnable: Runnable? = null

    private var termuxLaunched = false
    private var serverLoaded = false

    private var cornerTapCount = 0
    private var lastCornerTapTime = 0L

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        prefs = getSharedPreferences(getString(R.string.prefs_name), Context.MODE_PRIVATE)

        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)
        setupWebView()

        // Tocco nascosto nell'angolo in alto a sinistra (5 volte in rapida successione)
        // per riaprire le impostazioni server senza uscire dalla kiosk mode.
        findViewById<View>(android.R.id.content).setOnTouchListener { _, event ->
            if (event.rawX < 120 && event.rawY < 120) {
                val now = System.currentTimeMillis()
                if (now - lastCornerTapTime > 1500) cornerTapCount = 0
                lastCornerTapTime = now
                cornerTapCount++
                if (cornerTapCount >= 5) {
                    cornerTapCount = 0
                    showSettingsDialog()
                }
            }
            false
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack()
                // altrimenti ignora: in kiosk mode non si esce con il tasto indietro
            }
        })

        // Di default il server gira sul tablet stesso (Termux, vedi termux/README.md):
        // nessuna configurazione al primo avvio. Un server remoto si imposta col gesto nascosto.
        loadServer(serverUrl())

        // Il trascinamento manuale dell'icona dal cassetto app alla Home non funziona
        // su tutti i launcher (es. quello del Freeski C12): offriamo una sola volta
        // all'avvio la richiesta "ufficiale" di Android, che apre un popup di conferma
        // con un tasto solo. Ripetibile a mano dal gesto nascosto (vedi showSettingsDialog).
        if (!prefs.getBoolean(KEY_OFFERED_PIN, false)) {
            prefs.edit().putBoolean(KEY_OFFERED_PIN, true).apply()
            requestPinShortcut()
        }
    }

    /** Chiede al launcher di aggiungere l'icona alla Home, con conferma dell'utente. */
    private fun requestPinShortcut() {
        if (!ShortcutManagerCompat.isRequestPinShortcutSupported(this)) {
            Toast.makeText(
                this,
                "Il launcher non supporta l'aggiunta diretta: trascina l'icona a mano dal cassetto app",
                Toast.LENGTH_LONG
            ).show()
            return
        }
        val shortcut = ShortcutInfoCompat.Builder(this, "pluto_home")
            .setShortLabel(getString(R.string.app_name))
            .setIcon(IconCompat.createWithResource(this, R.mipmap.ic_launcher))
            .setIntent(Intent(this, MainActivity::class.java).setAction(Intent.ACTION_MAIN))
            .build()
        ShortcutManagerCompat.requestPinShortcut(this, shortcut, null)
    }

    private fun usesLocalServer(): Boolean =
        serverUrl().let { it.contains("://127.0.0.1") || it.contains("://localhost") }

    /**
     * Server locale spento: apre Termux, che all'apertura (~/.bashrc, impostato da
     * termux/installa.sh) avvia il server Pluto e poi riporta in primo piano questa app.
     * Non si usa RUN_COMMAND/Termux:Boot in background perche' su alcuni tablet (es.
     * Freeski C12, Allwinner) il gestore energetico del produttore blocca i servizi
     * di Termux se Termux non e' in primo piano.
     */
    private fun startLocalServer() {
        if (!usesLocalServer() || termuxLaunched) return
        termuxLaunched = true
        // La WebView puo' segnalare errori anche a server acceso (es. primo caricamento):
        // apro Termux solo se la porta del server e' davvero chiusa.
        val uri = Uri.parse(serverUrl())
        Thread {
            val listening = try {
                Socket().use { it.connect(InetSocketAddress(uri.host, uri.port.takeIf { p -> p > 0 } ?: 80), 1000) }
                true
            } catch (_: Exception) {
                false
            }
            runOnUiThread { if (listening) termuxLaunched = false else openTermux() }
        }.start()
    }

    /**
     * Riporta questa app in primo piano da sola, senza passare per Termux o per
     * l'altra app (Tablettone): e' una cosa che Pluto fa a se stesso quando il
     * SUO server e' pronto, non un'azione imposta dall'esterno via "am start" nello
     * script di avvio (quello causava il conflitto, vedi android-kiosk/README.md).
     * Funziona solo se questa activity esiste gia' (l'utente ha toccato l'icona di
     * Pluto): se non e' stata toccata, non esiste nulla da riportare in primo piano,
     * quindi nessun rischio di contendersi lo schermo con Tablettone dopo un riavvio.
     */
    private fun bringSelfToFront() {
        startActivity(
            Intent(this, MainActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
        )
    }

    private fun openTermux() {
        try {
            startActivity(
                Intent().setClassName("com.termux", "com.termux.app.TermuxActivity")
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            )
        } catch (e: Exception) {
            Toast.makeText(this, "Termux non trovato: impossibile avviare il server", Toast.LENGTH_LONG).show()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            useWideViewPort = true
            loadWithOverviewMode = true
            mediaPlaybackRequiresUserGesture = false
            builtInZoomControls = false
            displayZoomControls = false
            setSupportZoom(false)
            cacheMode = android.webkit.WebSettings.LOAD_NO_CACHE
        }
        webView.addJavascriptInterface(PlutoJsBridge(), "PlutoApp")

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                progressBar.visibility = View.GONE
                if (url != null && url.startsWith("http")) {
                    val tornaDaTermux = termuxLaunched
                    serverLoaded = true
                    termuxLaunched = false
                    if (tornaDaTermux) bringSelfToFront()
                    startKioskLock()
                }
            }

            override fun onReceivedError(
                view: WebView?,
                errorCode: Int,
                description: String?,
                failingUrl: String?
            ) {
                super.onReceivedError(view, errorCode, description, failingUrl)
                Log.w("PlutoKiosk", "Errore caricamento $failingUrl: $errorCode $description")
                serverLoaded = false
                // Al posto della pagina d'errore di Chromium mostra un messaggio neutro
                view?.loadDataWithBaseURL(
                    null, STARTING_PAGE_HTML, "text/html", "utf-8", null
                )
                startLocalServer()
                scheduleRetry()
            }
        }
    }

    private fun scheduleRetry() {
        progressBar.visibility = View.VISIBLE
        retryRunnable?.let { retryHandler.removeCallbacks(it) }
        val runnable = Runnable { retryLoad() }
        retryRunnable = runnable
        retryHandler.postDelayed(runnable, 3000)
    }

    /**
     * Ritenta il caricamento. Per il server locale non chiede subito alla WebView di
     * ricaricare: mentre l'app e' in background (dietro Termux) la WebView non porta
     * mai a termine il caricamento, ne' con successo ne' con errore, quindi un retry
     * basato sui suoi eventi resterebbe bloccato per sempre. Si controlla invece la
     * porta con una semplice connessione di rete (funziona anche in background) e solo
     * quando risponde si riporta l'app in primo piano e si carica davvero la pagina.
     */
    private fun retryLoad() {
        val url = serverUrl()
        if (!usesLocalServer()) {
            loadServer(url)
            return
        }
        val uri = Uri.parse(url)
        Thread {
            val listening = try {
                Socket().use { it.connect(InetSocketAddress(uri.host, uri.port.takeIf { p -> p > 0 } ?: 80), 1000) }
                true
            } catch (_: Exception) {
                false
            }
            runOnUiThread {
                if (listening) {
                    bringSelfToFront()
                    loadServer(url)
                } else {
                    scheduleRetry()
                }
            }
        }.start()
    }

    private fun serverUrl(): String =
        prefs.getString(getString(R.string.pref_server_url), null)
            ?.takeIf { it.isNotBlank() }
            ?: getString(R.string.default_server_url)

    private fun loadServer(url: String) {
        progressBar.visibility = View.VISIBLE
        webView.loadUrl(url)
    }

    private fun showSettingsDialog() {
        val input = EditText(this)
        input.setText(serverUrl())
        input.hint = getString(R.string.dialog_hint_server)

        val builder = AlertDialog.Builder(this)
            .setTitle(R.string.dialog_title_server)
            .setView(input)
            .setPositiveButton(R.string.dialog_button_ok) { _, _ ->
                val url = input.text.toString().trim()
                if (url.isNotEmpty()) {
                    prefs.edit()
                        .putString(getString(R.string.pref_server_url), url)
                        .apply()
                    loadServer(url)
                }
            }

        builder.setNeutralButton("Esci dalla kiosk mode") { _, _ ->
            stopKioskAndFinish()
        }

        builder.setNegativeButton("Aggiungi icona a Home") { _, _ ->
            requestPinShortcut()
        }

        builder.show()
    }

    private fun stopKioskAndFinish() {
        try {
            stopLockTask()
        } catch (_: IllegalArgumentException) {
            // non era in lock task mode, nulla da fare
        }
        // Torna esplicitamente alla Home del tablet: chiudendo e basta si tornerebbe
        // al task precedente, che puo' essere Termux (quando ha riaperto lui l'app)
        startActivity(
            Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        )
        finishAndRemoveTask()
    }

    /** Chiamabile dalle pagine di Pluto come window.PlutoApp.chiudi(). */
    private inner class PlutoJsBridge {
        @JavascriptInterface
        fun chiudi() {
            runOnUiThread { stopKioskAndFinish() }
        }
    }

    override fun onResume() {
        super.onResume()
        hideSystemBars()
        if (serverLoaded) startKioskLock()
    }

    /** Screen pinning solo a Pluto caricato: prima bloccherebbe l'apertura di Termux. */
    private fun startKioskLock() {
        try {
            startLockTask()
        } catch (_: Exception) {
            // dispositivo/OEM che non consente lo screen pinning automatico:
            // l'app resta comunque a schermo intero, solo senza il blocco anti-uscita
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemBars()
    }

    private fun hideSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        val controller = WindowCompat.getInsetsController(window, window.decorView)
        controller.hide(WindowInsetsCompat.Type.systemBars())
        controller.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    }

    companion object {
        private const val KEY_OFFERED_PIN = "offered_pin_shortcut"
        private const val STARTING_PAGE_HTML =
            "<html><body style='background:#000;color:#fff;font-family:sans-serif;" +
                "display:flex;align-items:center;justify-content:center;height:100vh;margin:0'>" +
                "<h1>Avvio di Pluto in corso&hellip;</h1></body></html>"
    }

    override fun onDestroy() {
        retryRunnable?.let { retryHandler.removeCallbacks(it) }
        super.onDestroy()
    }
}
