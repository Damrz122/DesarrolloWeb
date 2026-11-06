#!/usr/bin/env bash
set -e

# ==============================================================================
# Electronix - Script Integral: Levantar Backend, Base de Datos y Túnel Cloudflare
# ==============================================================================

DIR_RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR_RAIZ"

echo "=========================================================="
echo "⚡ ELECTRONIX: Iniciando Plataforma y Túnel Cloudflare"
echo "=========================================================="

# 1. Verificar archivo .env
if [ ! -f ".env" ]; then
    echo "⚠️ Archivo .env no encontrado. Creando a partir de .env.example..."
    cp .env.example .env
    echo "✅ Archivo .env creado. Puedes personalizar contraseñas si lo deseas."
fi

# 2. Asegurar que CORS_ORIGINS incluya el túnel de Cloudflare
if ! grep -q "trycloudflare.com" .env 2>/dev/null; then
    echo "🔧 Ajustando CORS_ORIGINS en .env para admitir túnel Cloudflare..."
    sed -i 's/CORS_ORIGINS=.*/CORS_ORIGINS=http:\/\/localhost:8090,http:\/\/localhost:8080,http:\/\/localhost:3000,https:\/\/*.trycloudflare.com,https:\/\/*.loca.lt/' .env
fi

# 3. Levantar contenedores Docker
echo ""
echo "🐳 Iniciando contenedores Docker (App, PostgreSQL 16, Adminer)..."
docker compose up -d

# 4. Esperar que el backend esté listo
echo ""
echo "⏳ Esperando que el backend de Electronix responda en http://localhost:8090..."
MAX_REINTENTOS=30
CONTEO=0
until curl -s -o /dev/null -w "%{http_code}" http://localhost:8090/api/sitio/publico | grep -q "200"; do
    sleep 2
    CONTEO=$((CONTEO+1))
    if [ $CONTEO -ge $MAX_REINTENTOS ]; then
        echo "❌ Tiempo de espera agotado esperando que la aplicación inicie."
        echo "Revisa los logs con: docker compose logs -f ecommerce-app"
        exit 1
    fi
    printf "."
done
echo ""
echo "✅ Backend de Electronix en línea y operativo."

# 5. Configurar ejecutable de Cloudflare Tunnel
mkdir -p "$DIR_RAIZ/scripts/bin"
CLOUDFLARED="$DIR_RAIZ/scripts/bin/cloudflared"

if [ ! -f "$CLOUDFLARED" ]; then
    echo ""
    echo "⬇️ Descargando binario oficial de Cloudflare Tunnel (cloudflared)..."
    ARCH=$(uname -m)
    case "$ARCH" in
        x86_64) URL_CF="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64" ;;
        aarch64|arm64) URL_CF="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64" ;;
        *) echo "Arquitectura $ARCH no soportada automáticamente. Descarga cloudflared manualmente."; exit 1 ;;
    esac
    curl -sSL "$URL_CF" -o "$CLOUDFLARED"
    chmod +x "$CLOUDFLARED"
    echo "✅ cloudflared listo."
fi

# 6. Iniciar el túnel en segundo plano y capturar la URL
LOG_TUNEL="$DIR_RAIZ/scripts/bin/tunnel.log"
rm -f "$LOG_TUNEL"

echo ""
echo "🌐 Iniciando túnel Cloudflare hacia http://localhost:8090..."
"$CLOUDFLARED" tunnel --edge-ip-version 4 --protocol http2 --url http://localhost:8090 > "$LOG_TUNEL" 2>&1 &
PID_TUNEL=$!

# Esperar captura de la URL pública
URL_TUNEL=""
for i in {1..35}; do
    sleep 1
    printf "."
    URL_TUNEL=$(grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' "$LOG_TUNEL" | head -n 1 || true)
    if [ -n "$URL_TUNEL" ]; then
        break
    fi
done
echo ""

if [ -z "$URL_TUNEL" ]; then
    echo "⚠️ No se detectó la URL del túnel en los primeros segundos. Revisa $LOG_TUNEL"
else
    echo "=========================================================="
    echo "🎉 ¡TÚNEL CLOUDFLARE ACTIVO!"
    echo "🔗 URL PÚBLICA HTTPS: $URL_TUNEL"
    echo "=========================================================="

    # Actualizar strings.xml de la app Android con la nueva URL
    STRINGS_XML="$DIR_RAIZ/android/app/src/main/res/values/strings.xml"
    if [ -f "$STRINGS_XML" ]; then
        sed -i -E "s|<string name=\"default_server_url\">.*</string>|<string name=\"default_server_url\">$URL_TUNEL</string>|" "$STRINGS_XML"
        echo "📱 URL sincronizada automáticamente en la app Android: $STRINGS_XML"
    fi
fi

echo ""
echo "----------------------------------------------------------"
echo "📌 ACCESOS:"
echo " - Tienda Web / APK:      $URL_TUNEL (o http://localhost:8090)"
echo " - Adminer (Gestor BD):   http://localhost:8091"
echo " - Cuenta Demo Admin:     Admin@gmail.com / Admin1221:)"
echo "----------------------------------------------------------"
echo "Presiona Ctrl+C para detener el túnel cuando termines."
echo ""

# Manejar cierre limpio al recibir Ctrl+C
trap 'echo ""; echo "🛑 Deteniendo túnel..."; kill $PID_TUNEL 2>/dev/null || true; exit 0' INT TERM
wait $PID_TUNEL
