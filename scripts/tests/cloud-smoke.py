#!/usr/bin/env python3
"""Arranque prod/cloud aislado: PostgreSQL vacío, Redis TLS y app con 512 MB.

Requiere Docker, openssl, keytool y la imagen electronix-render:demo.
No lee .env, no importa bases ni usa los contenedores existentes.
"""
import json
import os
from pathlib import Path
import secrets
import subprocess
import tempfile
import time
import urllib.request
import urllib.error

ROOT = Path(tempfile.mkdtemp(prefix="electronix-cloud-",
                            dir="/tmp/opencode" if Path("/tmp/opencode").is_dir() else None))
NET = "electronix-smoke-" + secrets.token_hex(4)
NAMES = []
JVM = ("-Xms64m -Xmx220m -XX:MaxMetaspaceSize=128m -XX:ReservedCodeCacheSize=48m "
       "-XX:MaxDirectMemorySize=32m -Xss512k -XX:+UseSerialGC -XX:ActiveProcessorCount=1")


def run(*args):
    result = subprocess.run(args, text=True, capture_output=True)
    if result.returncode:
        # No volcar argumentos/env con credenciales.
        raise RuntimeError(f"{args[0]} falló: {result.stderr[-2000:]}")
    return result.stdout.strip()


def envfile(name, values):
    path = ROOT / name
    path.write_text("".join(f"{key}={value}\n" for key, value in values.items()))
    path.chmod(0o600)
    return str(path)


def container(suffix, *args):
    name = NET + "-" + suffix
    run("docker", "run", "-d", "--name", name, "--network", NET, *args)
    NAMES.append(name)
    return name


def wait_for(check, seconds=180):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        try:
            value = check()
            if value:
                return value
        except (RuntimeError, OSError, urllib.error.URLError):
            pass
        time.sleep(1)
    raise RuntimeError("El servicio de prueba no estuvo listo dentro del plazo")


def api(path, body=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(BASE + path, headers=headers,
                                 data=json.dumps(body).encode() if body is not None else None)
    with urllib.request.urlopen(req, timeout=10) as response:
        value = json.load(response)
        assert value.get("exito", True), path
        return value.get("datos", value)


try:
    print("Prueba aislada; registros en:", ROOT, flush=True)
    tls = ROOT / "tls"
    tls.mkdir(mode=0o755)
    run("openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
        "-subj", "/CN=redis-smoke", "-addext", "subjectAltName=DNS:redis-smoke",
        "-keyout", str(tls / "redis.key"), "-out", str(tls / "redis.crt"))
    (tls / "redis.key").chmod(0o644)  # Clave efímera de prueba, legible por el contenedor Redis.
    run("keytool", "-importcert", "-noprompt", "-alias", "redis-smoke",
        "-file", str(tls / "redis.crt"), "-keystore", str(tls / "truststore"),
        "-storepass", "smoke-trust-only")
    (tls / "truststore").chmod(0o644)
    run("docker", "network", "create", NET)
    password, admin, client = (secrets.token_urlsafe(24) for _ in range(3))
    pg = container("pg", "--network-alias", "postgres-smoke", "--env-file",
                   envfile("pg.env", {"POSTGRES_DB": "smoke", "POSTGRES_USER": "smoke",
                                      "POSTGRES_PASSWORD": password}), "postgres:16-alpine")
    rd = container("redis", "--network-alias", "redis-smoke", "-v", f"{tls}:/tls:ro",
                   "redis:7-alpine", "redis-server", "--port", "0", "--tls-port", "6379",
                   "--tls-cert-file", "/tls/redis.crt", "--tls-key-file", "/tls/redis.key",
                   "--tls-ca-cert-file", "/tls/redis.crt", "--tls-auth-clients", "no",
                   "--requirepass", "isolated-smoke-redis")
    wait_for(lambda: run("docker", "exec", pg, "pg_isready", "-U", "smoke"))
    app = container("app", "--memory", "512m", "--memory-swap", "512m",
                    "-p", "127.0.0.1::10000", "-v", f"{tls}:/tls:ro", "--env-file",
                    envfile("app.env", {
                        "SPRING_PROFILES_ACTIVE": "prod,cloud",
                        "SPRING_DATASOURCE_URL": "jdbc:postgresql://postgres-smoke:5432/smoke",
                        "SPRING_DATASOURCE_USERNAME": "smoke", "SPRING_DATASOURCE_PASSWORD": password,
                        "SPRING_DATA_REDIS_HOST": "redis-smoke",
                        "SPRING_DATA_REDIS_PASSWORD": "isolated-smoke-redis",
                        "SPRING_DATA_REDIS_SSL_ENABLED": "true",
                        "JWT_SECRET": secrets.token_urlsafe(48), "ADMIN_EMAIL": "speaker@example.test",
                        "ADMIN_PASSWORD": admin, "DEMO_USER_PASSWORD": client,
                        "DEMO_EMAIL_DOMAIN": "example.test", "DEMO_SEED_SECURE": "true",
                        "RENDER_EXTERNAL_URL": "https://electronix-smoke.example.test",
                        "JAVA_TOOL_OPTIONS": JVM + " -Djavax.net.ssl.trustStore=/tls/truststore"
                        " -Djavax.net.ssl.trustStorePassword=smoke-trust-only",
                    }), os.environ.get("SMOKE_IMAGE", "electronix-render:demo"))
    port = run("docker", "port", app, "10000/tcp").rsplit(":", 1)[1]
    BASE = "http://127.0.0.1:" + port
    start = time.monotonic()
    wait_for(lambda: api("/actuator/health/readiness").get("status") == "UP")
    startup = round(time.monotonic() - start, 1)
    print("PASS prod/cloud: Flyway desde PostgreSQL vacío, Hibernate validate y readiness con Redis TLS")
    admin_token = api("/api/auth/login", {"email": "speaker@example.test", "password": admin})["token"]
    token = api("/api/auth/login", {"email": "usuario1@example.test", "password": client})["token"]
    assert admin_token and token
    reglas = api("/api/crm/puntos/reglas")
    assert "minimoPuntosCanje" in reglas
    assert len(api("/api/crm/niveles")) > 0
    assert "saldoPuntos" in api("/api/crm/puntos/mi-billetera", token=token)
    with urllib.request.urlopen(BASE + "/assets/img/promos/hero-espacio.webp") as response:
        assert response.status == 200
    print("PASS claves demo seguras, login cliente/admin, Club y portada incluida en la imagen")
    productos = api("/api/productos?size=200")["contenido"]
    p = next(p for p in productos if p["stock"] > 5)
    pid = p["id"]
    for item in api("/api/carrito", token=token)["items"]:
        req = urllib.request.Request(BASE + "/api/carrito/items/" + str(item["id"]), method="DELETE",
                                     headers={"Authorization": "Bearer " + token})
        urllib.request.urlopen(req).close()
    antes = api(f"/api/productos/{pid}")["stock"]
    api(f"/api/productos/{pid}")  # Lectura desde Redis.
    api("/api/carrito/items", {"productoId": pid, "cantidad": 1}, token)
    quote = api("/api/checkout/cotizacion", {"monedaCodigo": "PEN"}, token)
    previo = api("/api/checkout/beneficios", {"cotizacionToken": quote["token"], "puntosACanjear": 0}, token)
    assert previo["total"] == quote["datos"]["total"]
    metodo = next(m for m in api("/api/pagos/metodos?moneda=PEN")
                  if m["codigo"] == "PAGO_CONTRAENTREGA")
    pedido = api("/api/pedidos", {
        "direccionEnvio": "Calle de prueba aislada 123", "telefono": "987654321",
        "metodoPago": metodo["codigo"], "versionMetodo": metodo["version"],
        "cotizacionToken": quote["token"], "datosPago": {},
    }, token)
    assert pedido["total"] == previo["total"]
    assert api(f"/api/productos/{pid}")["stock"] == antes - 1
    assert not api("/api/carrito", token=token)["items"]
    print("PASS compra exclusivamente aislada, cotización/beneficios, carrito vacío e invalidación de stock")
    stats = run("docker", "stats", "--no-stream", "--format", "{{.MemUsage}}", app)
    state = json.loads(run("docker", "inspect", "--format", "{{json .State}}", app))
    assert not state["OOMKilled"] and state["Running"]
    report = {"startup_seconds": startup, "memory_limit": "512MiB", "memory_observed": stats,
              "redis_tls": True, "fresh_postgres": True, "isolated_purchase": True}
    (ROOT / "report.json").write_text(json.dumps(report, indent=2))
    print("PASS sin OOM; memoria observada:", stats, "; arranque:", startup, "s")
    print("Informe:", ROOT / "report.json")
finally:
    for name in reversed(NAMES):
        if name.endswith("-app"):
            with (ROOT / "app.log").open("w") as log:
                subprocess.run(["docker", "logs", name], stdout=log, stderr=subprocess.STDOUT)
        subprocess.run(["docker", "rm", "-fv", name], capture_output=True)
    subprocess.run(["docker", "network", "rm", NET], capture_output=True)
    for name in ("app.env", "pg.env"):
        (ROOT / name).unlink(missing_ok=True)
    for name in ("redis.key", "truststore"):
        (ROOT / "tls" / name).unlink(missing_ok=True)
