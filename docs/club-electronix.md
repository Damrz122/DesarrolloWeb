# Electronix Club y recorrido de compra

## Presentación

- `puntos.html` comparte el navbar, la tipografía local, las superficies claras
  y el acento azul del escaparate. No presenta una tarjeta bancaria ni referencias
  a otro programa comercial.
- Las condiciones y niveles se consultan en el servidor. No se promete envío
  gratuito, canje total, vencimiento de puntos, regalos o descuentos fijos.
- El saldo solo aparece después de una consulta válida de la billetera; un error
  no se presenta como saldo cero o bono de bienvenida. El historial enlaza cada
  movimiento con su pedido cuando existe `pedidoId`.
- Mis pedidos conserva filtros, enlaces profundos y estados de pago/entrega
  independientes. La billetera es un resumen compacto, no un bloque flotante.
- El panel CRM conserva sus acciones y temas. Los diálogos recuperan el foco,
  se cierran con Escape y mantienen la navegación por teclado dentro del panel.

## Contratos

- `GET /api/crm/puntos/reglas`: solo parámetros públicos del programa, sin datos
  personales. Lee la configuración vigente sin crearla ni modificarla.
- `GET /api/crm/niveles`: niveles configurados, sin una lista fija en HTML.
- `GET /api/crm/puntos/mi-billetera`: requiere `CRM_VER_PUNTOS`.
- `POST /api/crm/puntos/simular`: recibe `puntosACanjear` y `subtotalBasePen`.
  Es una consulta orientativa; no consume puntos.
- `POST /api/checkout/beneficios`: recibe `cotizacionToken`, `cuponCodigo` y
  `puntosACanjear`. Requiere `COMPRAR` y, si usa puntos, `CRM_VER_PUNTOS`.
  Verifica la cotización firmada, revisa compatibilidad y devuelve el total
  y ambos descuentos en la moneda de cobro. No consume cupos, saldo ni stock.
- `POST /api/pedidos` conserva la validación transaccional definitiva. El cliente
  envía el token, el código y los puntos revisados, nunca precios o descuentos.
  Los formularios respetan `campos`, `clave`, `tipo`, `opciones`,
  `requiereReferencia`, `procesamiento` y `version` del método de pago.

Al editar beneficios se invalida la vista previa anterior. Al cambiar la
cotización se vuelven a consultar; antes de crear el pedido se revisan otra vez.
Si cambian los importes, se exige revisar y confirmar de nuevo. Se descartan
respuestas antiguas y se bloquean acciones duplicadas.

## Activación y pruebas

Los archivos estáticos se ven en desarrollo sin reiniciar. **Los dos endpoints
nuevos requieren recompilar y reiniciar el backend**; no basta con actualizar
HTML/JS. Este trabajo no reinicia contenedores ni modifica datos reales.

```sh
node --test scripts/tests/*.test.mjs
PLAYWRIGHT_MODULE=/ruta/a/playwright node scripts/tests/club-ui.browser.mjs
PLAYWRIGHT_MODULE=/ruta/a/playwright node scripts/tests/crm-ui.browser.mjs
PLAYWRIGHT_MODULE=/ruta/a/playwright node scripts/tests/purchase-ui.browser.mjs
mvn -Dtest=CheckoutBeneficiosControllerTest,ConfiguracionComercialTest,CrmSecurityIntegrationTest,CrmServiceTest,PedidoServiceTest test
git diff --check
```

Los navegadores usan API y sesiones simuladas; los tests Java usan H2 en memoria.
La prueba Node de CRM contra servidor real queda desactivada salvo que se provea
explícitamente `CRM_TEST_TOKEN`; ya no intenta iniciar sesión con una contraseña.

La suite Java completa incluye monitorización y Redis real desechable:
`RedisCacheIntegrationTest` activa `test,redis-test`, verifica cache hits, TTL,
expiración, categorías e invalidación por inventario y compra en H2 aislado.
Las pruebas ordinarias no dependen de un Redis externo.

Consulta `docs/despliegue-gratuito.md` para Render Free, Neon y Upstash.
