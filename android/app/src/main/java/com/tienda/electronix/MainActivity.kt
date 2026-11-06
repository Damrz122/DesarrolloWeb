package com.tienda.electronix

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.*
import android.widget.EditText
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.tienda.electronix.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var prefs: SharedPreferences
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val intent = result.data
            val results: Array<Uri>? = when {
                intent?.dataString != null -> arrayOf(Uri.parse(intent.dataString))
                intent?.clipData != null -> {
                    val count = intent.clipData!!.itemCount
                    Array(count) { i -> intent.clipData!!.getItemAt(i).uri }
                }
                else -> null
            }
            filePathCallback?.onReceiveValue(results)
        } else {
            filePathCallback?.onReceiveValue(null)
        }
        filePathCallback = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        prefs = getSharedPreferences("electronix_prefs", Context.MODE_PRIVATE)

        setupWebView()
        setupSwipeRefresh()
        setupErrorView()
        setupBackNavigation()

        loadServerUrl()
    }

    private fun getServerUrl(): String {
        val defaultUrl = getString(R.string.default_server_url)
        return prefs.getString("server_url", defaultUrl) ?: defaultUrl
    }

    private fun setServerUrl(url: String) {
        val cleaned = url.trim().removeSuffix("/")
        prefs.edit().putString("server_url", cleaned).apply()
        loadServerUrl()
    }

    private fun loadServerUrl() {
        val url = getServerUrl()
        binding.errorView.visibility = View.GONE
        binding.swipeRefresh.visibility = View.VISIBLE
        binding.webView.loadUrl(url)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val webView = binding.webView
        val settings = webView.settings

        // 1. JavaScript y almacenamiento DOM (esencial para JWT en localStorage)
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true

        // 2. Zoom y Viewport responsive
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.setSupportZoom(true)
        settings.builtInZoomControls = false
        settings.displayZoomControls = false

        // 3. Acceso a archivos y contenido mixto
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE

        // 4. Caché estándar
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        // 5. Configurar Cookies
        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        cookieManager.setAcceptThirdPartyCookies(webView, true)

        // WebChromeClient para barra de progreso y subida de archivos
        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                if (newProgress < 100) {
                    binding.progressBar.visibility = View.VISIBLE
                    binding.progressBar.progress = newProgress
                } else {
                    binding.progressBar.visibility = View.GONE
                }
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "image/*"
                    if (fileChooserParams?.mode == FileChooserParams.MODE_OPEN_MULTIPLE) {
                        putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                    }
                }

                fileChooserLauncher.launch(Intent.createChooser(intent, "Seleccionar imagen"))
                return true
            }
        }

        // WebViewClient para control de navegación y captura de errores
        webView.webViewClient = object : WebViewClient() {
            private var hasError = false

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                hasError = false
                super.onPageStarted(view, url, favicon)
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                binding.swipeRefresh.isRefreshing = false
                if (!hasError) {
                    binding.errorView.visibility = View.GONE
                    binding.swipeRefresh.visibility = View.VISIBLE
                }
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                // Solo mostrar pantalla de error para la página principal, no recursos secundarios
                if (request?.isForMainFrame == true) {
                    hasError = true
                    binding.swipeRefresh.isRefreshing = false
                    binding.swipeRefresh.visibility = View.GONE
                    binding.errorView.visibility = View.VISIBLE
                }
                super.onReceivedError(view, request, error)
            }

            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val uri = request?.url ?: return false
                val scheme = uri.scheme ?: return false

                // Redirigir esquemas externos (WhatsApp, teléfono, correo) a apps nativas
                if (scheme == "whatsapp" || scheme == "tel" || scheme == "mailto" || scheme == "intent") {
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, uri)
                        startActivity(intent)
                        return true
                    } catch (e: Exception) {
                        Toast.makeText(this@MainActivity, "No se encontró app para abrir el enlace", Toast.LENGTH_SHORT).show()
                        return true
                    }
                }

                return false // Permitir que el WebView cargue el resto internamente
            }
        }
    }

    private fun setupSwipeRefresh() {
        binding.swipeRefresh.setColorSchemeResources(R.color.primary)
        binding.swipeRefresh.setOnRefreshListener {
            binding.webView.reload()
        }

        // Desactivar SwipeRefresh si la página web tiene scroll hacia abajo
        binding.webView.viewTreeObserver.addOnScrollChangedListener {
            binding.swipeRefresh.isEnabled = (binding.webView.scrollY == 0)
        }
    }

    private fun setupErrorView() {
        binding.btnRetry.setOnClickListener {
            loadServerUrl()
        }

        binding.btnConfigUrl.setOnClickListener {
            showConfigUrlDialog()
        }
    }

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (binding.webView.canGoBack()) {
                    binding.webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }

    private fun showConfigUrlDialog() {
        val input = EditText(this).apply {
            setText(getServerUrl())
            setSelection(text.length)
            hint = getString(R.string.url_dialog_hint)
        }

        AlertDialog.Builder(this)
            .setTitle(R.string.url_dialog_title)
            .setMessage("Ingresa la URL pública de tu túnel (Cloudflare, Localtunnel, ngrok) o la IP de tu red local:")
            .setView(input)
            .setPositiveButton(R.string.save) { _, _ ->
                val newUrl = input.text.toString().trim()
                if (newUrl.isNotEmpty()) {
                    setServerUrl(newUrl)
                }
            }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }
}
