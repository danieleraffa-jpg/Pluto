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
                    serverLoaded = true
                    termuxLaunched = false
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
        val runnable = Runnable {
            loadServer(serverUrl())
        }
        retryRunnable = runnable
        retryHandler.postDelayed(runnable, 3000)
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
