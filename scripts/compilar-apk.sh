#!/usr/bin/env bash
set -e

DIR_RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR_ANDROID="$DIR_RAIZ/android"
cd "$DIR_ANDROID"

echo "=========================================================="
echo "📱 ELECTRONIX: Compilador de APK Android"
echo "=========================================================="

# 0. Asegurar Java 21 si está disponible
if [ -d "/usr/lib/jvm/java-21-openjdk" ]; then
    export JAVA_HOME="/usr/lib/jvm/java-21-openjdk"
    export PATH="$JAVA_HOME/bin:$PATH"
fi

# 1. Detectar Android SDK
SDK_DIR=""
if [ -n "$ANDROID_HOME" ] && [ -d "$ANDROID_HOME" ]; then
    SDK_DIR="$ANDROID_HOME"
elif [ -n "$ANDROID_SDK_ROOT" ] && [ -d "$ANDROID_SDK_ROOT" ]; then
    SDK_DIR="$ANDROID_SDK_ROOT"
elif [ -d "$HOME/Android/Sdk" ]; then
    SDK_DIR="$HOME/Android/Sdk"
fi

if [ -n "$SDK_DIR" ]; then
    echo "✅ Android SDK detectado en: $SDK_DIR"
    echo "sdk.dir=$SDK_DIR" > local.properties
fi

# 2. Verificar gradlew
if [ ! -f "gradlew" ]; then
    echo "📦 Generando wrapper de Gradle 8.5..."
    if command -v gradle >/dev/null 2>&1; then
        gradle wrapper --gradle-version 8.5
    else
        # Descargar gradlew directamente si no hay gradle en el sistema
        curl -sSL https://raw.githubusercontent.com/gradle/gradle/v8.5.0/gradlew -o gradlew
        chmod +x gradlew
    fi
fi

# 3. Intentar compilación si hay SDK
if [ -n "$SDK_DIR" ] && [ -f "gradlew" ]; then
    echo "🚀 Compilando APK Debug con Gradle..."
    ./gradlew assembleDebug --no-daemon

    APK_GENERADA="$DIR_ANDROID/app/build/outputs/apk/debug/app-debug.apk"
    if [ -f "$APK_GENERADA" ]; then
        mkdir -p "$DIR_RAIZ/dist"
        cp "$APK_GENERADA" "$DIR_RAIZ/dist/Electronix.apk"
        echo ""
        echo "=========================================================="
        echo "🎉 ¡APK COMPILADA CON ÉXITO!"
        echo "📁 Ubicación: $DIR_RAIZ/dist/Electronix.apk"
        echo "=========================================================="
        exit 0
    fi
fi

# 4. Fallback: Instrucciones para Android Studio
echo ""
echo "💡 Para compilar con Android Studio:"
echo " 1. Abre Android Studio."
echo " 2. Selecciona 'Open' y abre la carpeta: $DIR_ANDROID"
echo " 3. Ve a Build > Build Bundle(s) / APK(s) > Build APK(s)"
echo " 4. ¡Listo! El APK se generará en app/build/outputs/apk/debug/app-debug.apk"
