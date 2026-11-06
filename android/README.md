# Electronix — Aplicación Móvil Híbrida (Android APK)

Esta carpeta contiene el proyecto nativo de Android configurado para compilar una **versión híbrida (APK)** de **Electronix**, utilizando un `WebView` moderno de alto rendimiento y arquitectura conectada por túnel o red local.

---

## 📱 Características de la App Híbrida

1. **Persistencia de Sesión JWT:** Almacenamiento DOM (`localStorage`) y Cookies activadas para conservar la autenticación del usuario.
2. **Soporte de WebSockets (STOMP):** Compatible con el chat de soporte en tiempo real `/ws-chat`.
3. **Subida de Archivos y Fotos:** `WebChromeClient` implementado con soporte para cámara y galería (`<input type="file">`).
4. **Pull-to-Refresh:** Deslizar hacia abajo para recargar el catálogo o la vista actual.
5. **Navegación Nativa "Atrás":** El botón físico/gesto de retroceso de Android navega dentro del historial web antes de salir de la aplicación.
6. **Manejo de Enlaces Externos:** Enlaces a `whatsapp:`, `tel:`, `mailto:` abren las aplicaciones nativas del teléfono.
7. **Selector Dinámico de URL:** Si el túnel cambia de dirección (por ejemplo al reiniciar Cloudflare o Localtunnel), puedes cambiar la URL desde la pantalla de error o el diálogo de configuración sin tener que recompilar el APK.
8. **Seguridad de Red Flexible:** Permite tanto túneles HTTPS como pruebas en red local HTTP (`192.168.x.x` o `10.0.2.2`).

---

## 🚀 Paso 1: Levantar el Túnel (Exponer el Backend al Móvil)

El backend de Electronix corre en el puerto **`8090`** (en Docker) o **`8080`** (local).
Para acceder desde un teléfono móvil con Internet, utiliza cualquiera de estas opciones de túnel seguro:

### Opción A: Localtunnel (Inmediato, sin instalación)
```bash
npx -y localtunnel --port 8090
```
Generará una URL pública HTTPS como:
`https://curly-lemons-smile.loca.lt`

### Opción B: Cloudflare Tunnel (Recomendado para producción/demo)
Descarga el ejecutable `cloudflared`:
```bash
# En Linux
curl -L --output cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 && chmod +x cloudflared
./cloudflared tunnel --url http://localhost:8090
```
Generará una URL gratuita y estable como:
`https://electronix-demo.trycloudflare.com`

---

## ⚠️ Paso 2: Ajuste de CORS para WebSockets

Para que el chat en vivo por WebSocket STOMP (`/ws-chat`) funcione a través del túnel, asegúrate de que el backend permita el origen de tu túnel. En tu archivo `.env`:

```env
CORS_ORIGINS=https://*.trycloudflare.com,https://*.loca.lt,http://localhost:8080,http://localhost:8090
```

---

## 🛠️ Paso 3: Compilar el APK

### En Android Studio (Recomendado):
1. Abre **Android Studio**.
2. Selecciona **Open** y elige la carpeta `android/` de este repositorio.
3. Espera a que Gradle sincronice las dependencias.
4. (Opcional) Cambia la URL por defecto en `app/src/main/res/values/strings.xml` (`default_server_url`).
5. En el menú superior, ve a **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
6. El archivo `.apk` se generará en `app/build/outputs/apk/debug/app-debug.apk`.
7. Conecta tu teléfono por USB o transfiere el APK para instalarlo.

### Por Línea de Comandos:
```bash
cd android
./gradlew assembleDebug
```
El APK resultante estará en:
`android/app/build/outputs/apk/debug/app-debug.apk`

---

## 📲 Paso 4: Probar en el Dispositivo

- **En Emulador Android:** La URL por defecto ya apunta a `http://10.0.2.2:8090` (que mapea a tu `localhost:8090`).
- **En Teléfono Físico (Misma Red Wi-Fi):** Usa `http://TU_IP_LOCAL:8090` (ej. `http://192.168.1.15:8090`).
- **En Teléfono Físico (Cualquier lugar por Túnel):** Usa la URL HTTPS generada por el túnel (ej. `https://xxx.trycloudflare.com`). Si la URL cambia, presiona "Cambiar URL" en la pantalla de error de la app.
