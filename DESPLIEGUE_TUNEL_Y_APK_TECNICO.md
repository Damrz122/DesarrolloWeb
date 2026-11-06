# Documentación Técnica: Despliegue de Túnel Reverso (Cloudflare) y Compilación del Cliente Híbrido Android

Este documento detalla la arquitectura, el flujo de ejecución, los protocolos de red y el pipeline de compilación implementados para exponer la plataforma **Electronix** a la WAN y empaquetar el cliente nativo híbrido (**APK**) para Android.

---

## 1. Topología de Red y Arquitectura del Túnel

### 1.1 Exposición WAN mediante Cloudflare Tunnel (`cloudflared`)
En lugar de recurrir al reenvío de puertos tradicional (*Port Forwarding* / NAT traversal) que expone la IP pública y puertos del enrutador local a escaneos y ataques volumétricos, se implementó un **túnel reverso cifrado** a nivel de capa de aplicación (L7) mediante el binario oficial de Cloudflare (`cloudflared` v2026.10.7).

```
[ Cliente / Navegador / APK ]
              │ (HTTPS / WSS - TLS 1.3)
              ▼
   [ Cloudflare Global Edge ]
   - Terminación TLS / Cifrado Edge
   - Protección DDoS / Mitigación L3/L4/L7
   - Resolución DNS dinámica (*.trycloudflare.com)
              │
              │ Túnel Multiplexado Reverso (HTTP/2 sobre TCP / QUIC)
              ▼
    [ Host Local: cloudflared ]
              │
              │ HTTP In-Mesh Reverse Proxy (Reverse Proxying local)
              ▼
   [ Docker: Spring Boot Backend ] (0.0.0.0:8090)
              │
              │ JDBC Connection Pool (HikariCP)
              ▼
    [ Docker: PostgreSQL 16 ] (ecommerce:5432)
```

#### Parámetros Técnicos de Conexión:
* **Protocolo de Transporte Edge-Connector:** `--protocol http2`. Se forzó HTTP/2 sobre TCP para mitigar problemas de ruteo y timeouts asociados a resolvers locales en redes donde el tráfico UDP/QUIC está sujeto a inspección profunda de paquetes (DPI) o filtrado de CGNAT.
* **Resolución de Pila IP:** `--edge-ip-version 4`. Forzado a IPv4 unicast para evitar retardos por fallas de retorno en interfaces locales con enrutamiento IPv6 no configurado.
* **Terminación TLS:** Cloudflare gestiona los certificados SSL/TLS wildcard de confianza pública en el Edge, entregando tráfico descifrado vía proxy inverso hacia el puerto `8090` del host local.

---

## 2. Ajustes en Backend y Capa de Seguridad

### 2.1 Políticas de Intercambio de Recursos de Origen Cruzado (CORS)
Los subdominios generados dinámicamente por Cloudflare Quick Tunnels siguen el patrón `https://[hash-aleatorio].trycloudflare.com`. Las restricciones de origen del navegador bloquean peticiones API y WebSockets sin la cabecera `Access-Control-Allow-Origin` correspondiente.

* **Implementación en [`SecurityConfig.java`](file:///home/Bruhxx/.gemini/antigravity/scratch/DesarrolloWeb/src/main/java/com/tienda/ecommerce/config/SecurityConfig.java):**
  Se sustituyó `setAllowedOrigins` por `setAllowedOriginPatterns`, permitiendo expresiones regulares y comodines compilados:
  ```java
  configuration.setAllowedOriginPatterns(List.of(
      "http://localhost:8080",
      "http://localhost:8090",
      "http://localhost:3000",
      "https://*.trycloudflare.com",
      "https://*.loca.lt"
  ));
  configuration.setAllowCredentials(true);
  configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
  configuration.setAllowedHeaders(List.of("*"));
  ```
* **Negociación STOMP / WebSockets en [`WebSocketConfig.java`](file:///home/Bruhxx/.gemini/antigravity/scratch/DesarrolloWeb/src/main/java/com/tienda/ecommerce/config/WebSocketConfig.java):**
  El endpoint `/ws-chat` desacopló los orígenes rígidos para permitir el apretón de manos (*handshake*) mediante SockJS y STOMP sobre dominios de túnel:
  ```java
  registry.addEndpoint("/ws-chat")
          .setAllowedOriginPatterns(allowedOrigins)
          .withSockJS();
  ```

### 2.2 Migraciones de Base de Datos Idempotentes (Flyway)
Para garantizar la consistencia relacional en entornos donde Hibernate (`ddl-auto: update`) coexiste con Flyway, se refactorizaron las migraciones V10, V13 y V15:
* Inclusión de cláusulas `IF NOT EXISTS` en agregación de columnas (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`).
* Manejo seguro de constraints mediante `DROP CONSTRAINT IF EXISTS` previo a la reinstanciación.
* Asignación explícita de valores por defecto en columnas `NOT NULL` de esquemas heredados (`formulario_json`, `creado_en`, `actualizado_en`).
* Bloqueo consultivo transaccional (`pg_advisory_xact_lock`) en triggers PL/pgSQL para protección del superadministrador.

---

## 3. Arquitectura del Cliente Móvil Híbrido Android

La aplicación compilada en [`android/`](file:///home/Bruhxx/.gemini/antigravity/scratch/DesarrolloWeb/android) implementa un contenedor nativo (*Native Wrapper*) optimizado alrededor del motor de renderizado Chromium del sistema.

### 3.1 Configuración de Motor Web ([`MainActivity.kt`](file:///home/Bruhxx/.gemini/antigravity/scratch/DesarrolloWeb/android/app/src/main/java/com/tienda/electronix/MainActivity.kt))
* **Aceleración por Hardware y Motor JS:**
  * `javaScriptEnabled = true` y `domStorageEnabled = true` para dar persistencia al `localStorage` (donde se almacenan los tokens JWT y el estado de la sesión).
  * `databaseEnabled = true` para almacenamiento de caché local indexada.
  * `mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW` para compatibilidad en escenarios de transición HTTP/HTTPS.
* **Intercepción y Contrato de Archivos (`WebChromeClient`):**
  * Sobrescritura de `onShowFileChooser` integrando el contrato nativo `ActivityResultContracts.StartActivityForResult`.
  * Permite al usuario capturar fotos con la cámara o seleccionar comprobantes de pago (Yape/Plin/Transferencias) y avatares directamente desde el explorador del dispositivo, resolviendo la promesa del DOM con un callback `ValueCallback<Array<Uri>>`.
* **Despacho de Eventos de Retroceso (`OnBackPressedCallback`):**
  * Se implementó el soporte para `OnBackPressedDispatcher` de AndroidX. Si la pila de historial del WebView (`webView.canGoBack()`) contiene entradas, consume el evento y ejecuta `goBack()`, previniendo la finalización prematura del ciclo de vida de la actividad.
* **Resiliencia ante Fallos de Conexión:**
  * Intercepción en `WebViewClient.onReceivedError` para desplegar una vista nativa de contingencia con reintento gestual (*SwipeRefreshLayout*) y cuadro de diálogo para reconfiguración en caliente del host/túnel mediante `SharedPreferences`.

### 3.2 Identidad Visual y Especificación de Iconos (*Adaptive Icons*)
Se adaptó el isotipo corporativo SVG del header de la web (`/assets/img/logo.svg`):
* **Capa Foreground Vectorial:** [`res/drawable/ic_launcher_foreground.xml`](file:///home/Bruhxx/.gemini/antigravity/scratch/DesarrolloWeb/android/app/src/main/res/drawable/ic_launcher_foreground.xml) compuesto por paths vectoriales en blanco puro (`#FFFFFF`), escalado a 1.6x y desplazado matemáticamente para situarse dentro del radio de seguridad (*safe zone*) del canvas de 108dp.
* **Capa Background:** Definida en [`res/values/colors.xml`](file:///home/Bruhxx/.gemini/antigravity/scratch/DesarrolloWeb/android/app/src/main/res/values/colors.xml) con el color primario de marca `#3564C9`.
* **Soporte Legacy y Densidades:** Generación automatizada mediante Pillow/ImageMagick de matrices rasterizadas PNG para los buckets `mdpi` (48px), `hdpi` (72px), `xhdpi` (96px), `xxhdpi` (144px) y `xxxhdpi` (192px), tanto en variantes rectangulares como circulares (`ic_launcher_round.png`).

---

## 4. Pipeline de Compilación y Toolchain

El proceso de construcción del binario APK opera de manera desacoplada y nativa:

```
[ Código Kotlin + Recursos XML ]
               │
               ▼
[ Android Gradle Plugin (AGP 8.2.2) ] ── (Gradle 8.5 Daemon / JDK 21)
               │
               ├─► Proceso de Recursos (AAPT2: Compilación y Linkeo de Assets/Mipmaps)
               ├─► Kotlin Compiler (kotlinc 1.9.22: Generación de Bytecode JVM)
               ├─► Desugaring & Dexing (D8 Compiler: Bytecode JVM ──► Dalvik Executable .dex)
               ├─► Empaquetado APK (Packaging & Resource Table alignment)
               └─► Firma Criptográfica (Debug Keystore v1/v2/v3 signing schemes)
               │
               ▼
   [ dist/Electronix.apk ] (5.6 MB)
```

---

## 5. Manual de Operación y Automatización

### 5.1 Despliegue de la Infraestructura y Apertura del Túnel
Para iniciar la base de datos, el backend y el enlace WAN en un solo paso:

```bash
bash scripts/levantar-todo.sh
```

**Secuencia de operaciones automatizadas:**
1. Verificación e inicialización de variables de entorno (`.env`).
2. Arranque de los servicios Docker (`electronix-postgres`, `electronix-app`, `electronix-adminer`).
3. Sondeo activo (*Health Checking*) contra el endpoint `/api/sitio/publico` hasta obtener código `200 OK`.
4. Ejecución del binario `cloudflared` con banderas de optimización de enlace (`--edge-ip-version 4 --protocol http2`).
5. Captura mediante expresión regular del subdominio público asignado (`https://*.trycloudflare.com`).
6. Sincronización atómica por script en el archivo [`strings.xml`](file:///home/Bruhxx/.gemini/antigravity/scratch/DesarrolloWeb/android/app/src/main/res/values/strings.xml) de la aplicación Android.

### 5.2 Compilación del Binario Móvil
Para ensamblar la APK lista para instalación:

```bash
bash scripts/compilar-apk.sh
```

**Secuencia interna:**
1. Configuración de variables de entorno de compilación (`JAVA_HOME` apuntando a OpenJDK 21, `ANDROID_HOME` al SDK local).
2. Detección o provisión de `local.properties` (`sdk.dir=/home/Bruhxx/Android/Sdk`).
3. Ejecución de la tarea Gradle `:app:assembleDebug`.
4. Extracción del artefacto desde `android/app/build/outputs/apk/debug/app-debug.apk` y copia final en `dist/Electronix.apk`.

### 5.3 Instalación en Dispositivo Físico o Emulador
Con el dispositivo conectado mediante depuración USB habilitada:

```bash
adb install -r dist/Electronix.apk
```
O transfiriendo directamente el archivo `dist/Electronix.apk` a cualquier teléfono Android para instalación mediante el instalador de paquetes del sistema operativo.
