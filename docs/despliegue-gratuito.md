# Electronix: despliegue gratuito para la exposición

Arquitectura: **Render Free** (Java + HTTPS), **Neon Free** (PostgreSQL)
y **Upstash Free** (Redis TCP con TLS). No requiere GCP, AWS, Kubernetes ni Nginx.
El frontend y la API se publican en la misma URL.

> Selecciona solo planes Free y revisa los límites que muestre cada panel.
> Render puede solicitar verificación de cuenta. No aceptes un cambio a un plan
> de pago para continuar: detente y revisa la alternativa con tu equipo.
> Estos servicios gratuitos sirven para una demo, no garantizan disponibilidad.

## 1. Crear PostgreSQL en Neon

1. En [Neon](https://console.neon.tech/) crea un proyecto **Free**.
2. Selecciona una región cercana a Virginia (US East), donde se alojará Render.
3. En **Connect**, copia host, base, usuario y contraseña para PostgreSQL.
   Usa la conexión directa (sin `-pooler`) para este despliegue pequeño:
   Hikari ya limita la aplicación a tres conexiones y Flyway ejecutará migraciones.
4. En Render configurarás:

```text
SPRING_DATASOURCE_URL=jdbc:postgresql://HOST_NEON:5432/BASE?sslmode=require
SPRING_DATASOURCE_USERNAME=USUARIO_NEON
SPRING_DATASOURCE_PASSWORD=CONTRASEÑA_NEON
```

No pegues una URI `postgresql://usuario:clave@host/base` en la variable JDBC.
Usuario y clave van separados; no publiques la cadena completa ni capturas con
estos valores. Usa una **base nueva y vacía**, no un respaldo de clientes.

## 2. Crear Redis en Upstash

1. En [Upstash](https://console.upstash.com/) crea una base Redis **Free**.
2. Elige una región cercana a Render y copia los valores de conexión **TCP/TLS**:
   endpoint/host, puerto y contraseña.
3. En Render configura:

```text
SPRING_DATA_REDIS_HOST=HOST_UPSTASH
SPRING_DATA_REDIS_PORT=PUERTO_DEL_PANEL
SPRING_DATA_REDIS_PASSWORD=CONTRASEÑA_REDIS
SPRING_DATA_REDIS_SSL_ENABLED=true
```

El host no lleva `https://`, `rediss://` ni una ruta. **No uses el REST URL
ni el REST token**: Spring/Lettuce necesita Redis TCP. TLS permanece activo
y valida los certificados del proveedor; no se desactiva la validación SSL.

## 3. Publicar la aplicación en Render

1. Conecta GitHub a [Render](https://dashboard.render.com/).
2. **New → Blueprint**, selecciona `Damrz122/DesarrolloWeb`, rama `main`.
3. Revisa `render.yaml`: un servicio `electronix-demo`, Docker,
   región Virginia, **plan Free**. No crea bases de datos de pago.
4. Completa las variables pendientes de Neon/Upstash y `ADMIN_EMAIL`
   (un correo controlado por el expositor). Si Upstash indica un puerto
   distinto de `6379`, cámbialo en **Environment** antes del primer arranque.
5. Render genera `JWT_SECRET`, `ADMIN_PASSWORD` y `DEMO_USER_PASSWORD`.
   Guárdalos en un gestor de contraseñas desde **Environment**, no en Git.
6. Despliega. La compilación inicial puede tardar varios minutos.
   Espera estado **Live**; no basta con que Docker haya terminado de construir.
7. Abre `https://TU-SERVICIO.onrender.com/actuator/health/readiness`:
   debe responder `{"status":"UP"}`.

El blueprint usa `Dockerfile.render`, ejecuta Java como usuario sin privilegios,
activa `prod,cloud` y usa el puerto `PORT` que proporciona Render.
Los despliegues automáticos están desactivados para evitar cambios durante la
exposición. Tras nuevos commits usa **Manual Deploy → Deploy latest commit**.

### Cuentas demo

- Administrador: el `ADMIN_EMAIL` elegido + `ADMIN_PASSWORD` generado.
- Cliente: `Usuario1@example.test` + `DEMO_USER_PASSWORD` generado.
- Todos los clientes sembrados usan la contraseña demo configurada, no `User1`.
- Se crean datos **ficticios** de demostración en la base vacía.
- Las reglas CRM se leen del servidor; una billetera puede empezar sin saldo
  suficiente. No ofrezcas un canje que el servidor no permita.
- Las contraseñas se guardan con BCrypt y nunca aparecen en los logs.

La siembra solo se ejecuta si no hay usuarios/productos/pedidos. No sobrescribe
una base poblada ni restablece contraseñas. Cambiar una variable de contraseña
después de la primera siembra **no cambia las cuentas existentes**: usa la
funcionalidad de cambio de contraseña o prepara otra base demo vacía.

### CORS y WebSocket

`application-cloud.yml` toma el origen de `RENDER_EXTERNAL_URL` automáticamente.
Si añades un dominio propio, establece `CORS_ORIGINS=https://tu-dominio.example`
o una lista de orígenes separados por comas, sin rutas ni comodín global.
La página utiliza HTTPS y el chat debe conectarse por la misma URL pública.

## 4. Verificación antes de exponer

1. Portada, catálogo e imágenes: sin errores de carga y con la identidad Electronix.
2. Login cliente y administrador; comprobar permisos del panel.
3. Club: reglas, niveles, saldo y movimientos cargan sin errores.
4. Agrega un producto al carrito y revisa moneda, dirección y método de pago.
5. Ensaya una compra **solo en esta base demo aislada**, preferiblemente
   contraentrega o tarjeta explícitamente simulada. No hagas transferencias reales.
6. Verifica confirmación, Mis pedidos, total y nuevo stock.
7. Comprueba que monitorización administrativa no sea accesible sin permiso.
8. No incluyas variables secretas, claves, tokens o correos privados en las diapositivas.

## 5. Límites del plan y respaldo

- Render Free se duerme tras aproximadamente **15 minutos sin tráfico**.
  Abre la aplicación unos minutos antes de presentar y comprueba la disponibilidad.
  El primer acceso puede tardar; no es un fallo de login.
- Neon también puede pausar el cómputo inactivo. La primera conexión puede ser lenta.
- Redis tiene cuotas gratuitas: consulta uso en Upstash y evita pruebas de carga.
- Render Free **no ofrece disco persistente**: archivos subidos a `/uploads`
  pueden perderse al reiniciar o desplegar. Las imágenes incorporadas a
  `src/main/resources/static/assets/` sí se conservan.
- La portada aprobada, tipografía e imágenes promocionales ya forman parte
  del código; no es necesario subir el volumen local ni un dump.
- Si personalizas imágenes para la exposición, usa archivos públicos incorporados
  al proyecto o alojamiento de objetos persistente. No dependas de un upload
  recién hecho en Render Free.
- Mantén la aplicación local funcionando como respaldo y captura un recorrido
  corto por si el proveedor o el internet de la institución fallan.

## Pruebas reproducibles sin tocar datos reales

```sh
mvn test
node --test scripts/tests/*.test.mjs
docker build -f Dockerfile.render -t electronix-render:demo .
python3 scripts/tests/cloud-smoke.py
```

`mvn test` requiere Docker para `RedisCacheIntegrationTest`; crea Redis
desechable autenticado y usa H2 aislado para las compras. No reemplaza la
verificación de Redis por una caché en memoria.
Si no tienes Docker, puedes ejecutar solo las demás pruebas con
`mvn -Dtest='*,!RedisCacheIntegrationTest' test`; eso no verifica Redis.

`cloud-smoke.py` crea una red exclusiva, PostgreSQL vacío, Redis con TLS y una
aplicación limitada a **512 MiB**, valida migraciones/arranque/login/Club/compra
aislada e invalidación de stock. Requiere `openssl`, `keytool` y la imagen
construida arriba. Usa claves temporales, elimina sus propios contenedores/red
al finalizar y guarda logs/resultados en un directorio temporal que imprime
al iniciar (bajo `/tmp/opencode/` si existe). No lee `.env`.

### Si no arranca

- Error de JDBC/SSL: revisa la URL de Neon, `jdbc:` y `sslmode=require`.
- Redis no disponible: revisa TCP host/puerto/contraseña y TLS; no uses REST.
- Error de migración o validación: conserva el log sin secretos. No uses
  `ddl-auto=update`, no edites migraciones aplicadas ni borres tablas para ocultarlo.
- Readiness 503: revisa base/Redis y espera el despertar inicial. Liveness
  indica si Java está vivo; readiness exige que las dependencias estén listas.
- Login demo falla: revisa las credenciales usadas **en la primera siembra**.
- Error de memoria: verifica que `JAVA_TOOL_OPTIONS` coincida con el blueprint;
  no aumentes el plan a uno de pago sin autorización.

Referencias: [Render Free](https://render.com/docs/free),
[Blueprint](https://render.com/docs/blueprint-spec),
[Neon](https://neon.com/pricing),
[Upstash](https://upstash.com/pricing/redis).
