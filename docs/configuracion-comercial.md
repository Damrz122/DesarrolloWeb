# Configuración comercial y accesos

La aplicación lee monedas, cotizaciones, métodos de pago, formularios, roles y permisos desde PostgreSQL en cada petición. Un cambio hecho desde el panel o con SQL se aplica sin reiniciar Docker.

## Reglas que no se deben romper

- No elimines usuarios, pedidos, pagos, detalles ni conversaciones para “cuadrar” una configuración. Desactiva (`activo = FALSE`) lo que ya no se use.
- Cada pedido conserva su moneda, el precio original de cada producto, la cotización usada y el nombre/formulario del método de pago.
- `PEN` es la moneda contable base. Los reportes consolidados suman únicamente importes con equivalente histórico en PEN (`pedidos.total_base_pen`). Los pedidos antiguos en otra moneda sin conversión se muestran separados y nunca se suman como si fueran soles.
- Un pedido usa una sola moneda de cobro. El total se calcula en el servidor; el navegador no puede imponer precios.
- Los roles del sistema (`ADMIN`, `CLIENTE`) están protegidos por disparadores de base de datos. No se pueden eliminar, renombrar, desactivar ni alterar los permisos de `ADMIN`.
- Debe existir al menos un usuario con rol `ADMIN` activo. La base rechaza la operación que intente dejar el sistema sin administrador.
- Los códigos de moneda son ISO de tres letras y sus decimales deben coincidir con los oficiales (por ejemplo USD 2, JPY 0). No se pueden cambiar los decimales de una moneda ya usada en productos o pedidos.

## Respaldo previo

El respaldo se guarda dentro del contenedor y luego se copia al equipo:

```powershell
docker exec electronix-postgres sh -c 'pg_dump -U $POSTGRES_USER -d $POSTGRES_DB -Fc -f /tmp/electronix-backup.dump'
docker cp electronix-postgres:/tmp/electronix-backup.dump C:\ruta\segura\electronix-backup.dump
```

Para comprobar un respaldo, restáuralo en una base nueva; no sobrescribas la base real:

```powershell
docker exec electronix-postgres sh -c 'createdb -U $POSTGRES_USER electronix_restore_check'
docker exec electronix-postgres sh -c 'pg_restore -U $POSTGRES_USER -d electronix_restore_check --no-owner --exit-on-error /tmp/electronix-backup.dump'
```

## Panel administrativo

En `http://localhost:8090` inicia sesión con el administrador y abre **Configuración**. Desde allí puedes:

- Crear o editar monedas y activarlas/desactivarlas.
- Registrar cotizaciones con vigencia; una cotización nueva no modifica pedidos anteriores.
- Crear o editar métodos de pago, orden, monedas aceptadas y campos del formulario.
- Crear roles, asignar permisos y activarlos/desactivarlos.
- En **Usuarios**, asignar el rol configurado a cada cuenta.

Los permisos se aplican en el backend en cada petición. Si retiras un permiso, el usuario pierde el acceso aunque conserve un token antiguo. La interfaz solo oculta acciones; la API es la que decide.

## Ejemplos por SQL

### Moneda nueva

```sql
INSERT INTO monedas (codigo, nombre, simbolo, locale, decimales, activa)
VALUES ('EUR', 'Euro', '€', 'es-ES', 2, TRUE);
```

### Cotización

La tasa significa: **1 unidad de `moneda_origen` = tasa unidades de `moneda_destino`**.

```sql
INSERT INTO tipos_cambio (moneda_origen, moneda_destino, tasa, vigente_desde, activo)
VALUES ('EUR', 'PEN', 3.95000000, NOW(), TRUE);
```

Si no hay tasa directa, el sistema intenta la inversa y, cuando ambas monedas no son PEN, calcula el cruce pasando por PEN. Si falta una cotización vigente, el checkout se detiene; no inventa una tasa.

### Método de pago manual

```sql
INSERT INTO metodos_pago_config
    (codigo, nombre, descripcion, instrucciones, procesamiento,
     requiere_referencia, etiqueta_referencia, prefijo_transaccion,
     icono, formulario_json, orden, activo)
VALUES
    ('BANCO_BCP', 'Transferencia BCP', 'Transfiere a la cuenta BCP.',
     'Envía el comprobante y espera la verificación.',
     'VERIFICACION_MANUAL', TRUE, 'N° de operación BCP', 'BCP-',
     'TRANSFERENCIA',
     '[{"clave":"operacion","etiqueta":"N° de operación","tipo":"text","obligatorio":true,"maxLongitud":30,"opciones":[]}]',
     60, TRUE);

INSERT INTO metodo_pago_monedas (metodo_codigo, moneda_codigo)
VALUES ('BANCO_BCP', 'PEN'), ('BANCO_BCP', 'USD');
```

`procesamiento` solo admite `SIMULADO`, `VERIFICACION_MANUAL` o `CONTRA_ENTREGA`. Un método simulado no cobra dinero real. Para conectar una pasarela bancaria real hace falta implementar el código de integración; no se activa solo con SQL.

La migración `V14__quitar_restriccion_metodos_pago.sql` elimina la restricción heredada `pagos_metodo_pago_check`, que limitaba los pagos a los códigos originales. Si actualizas una base existente antes de reconstruir la aplicación, puedes aplicarla una vez con:

```sql
ALTER TABLE pagos DROP CONSTRAINT IF EXISTS pagos_metodo_pago_check;
```

Después de V14, los códigos nuevos que cumplan el patrón `^[A-Z][A-Z0-9_]{1,49}$` se aceptan en `pagos.metodo_pago`. No elimines pagos ni pedidos históricos para cambiar de método.

Los tipos de campo permitidos son `text`, `tel`, `select`, `date` y `textarea`. `formulario_json` debe ser un arreglo JSON válido. No solicites números de tarjeta, CVV ni contraseñas.

### Rol y permisos

```sql
INSERT INTO roles_config (codigo, nombre, descripcion, sistema, activo)
VALUES ('ALMACENERO', 'Almacenero', 'Consulta productos y actualiza stock.', FALSE, TRUE);

INSERT INTO rol_permisos (rol_codigo, permiso_codigo) VALUES
    ('ALMACENERO', 'ADMIN_ACCESO'),
    ('ALMACENERO', 'PRODUCTOS_VER'),
    ('ALMACENERO', 'INVENTARIO_GESTIONAR');

UPDATE usuarios SET rol = 'ALMACENERO' WHERE email = 'almacen@ejemplo.com';
```

`ADMIN_ACCESO` permite entrar al panel; los demás permisos habilitan páginas y acciones concretas. Un rol sin `ADMIN_ACCESO` puede comprar si tiene `COMPRAR`, pero no entra al panel.

Para retirar un permiso:

```sql
DELETE FROM rol_permisos
WHERE rol_codigo = 'ALMACENERO' AND permiso_codigo = 'INVENTARIO_GESTIONAR';
```

El cambio se aplica en la siguiente petición del usuario, sin reiniciar.

### Desactivar sin borrar

```sql
UPDATE metodos_pago_config SET activo = FALSE WHERE codigo = 'BANCO_BCP';
UPDATE monedas SET activa = FALSE WHERE codigo = 'EUR';
```

No borres filas que ya tengan pedidos o pagos asociados: los disparadores y claves foráneas protegen el historial, pero desactivar es la forma correcta de retirarlas del checkout.

## Verificación rápida

```powershell
# Estado de la aplicación y migración
docker compose ps
docker logs electronix-app --tail 30

# Login y permisos (no guardes la contraseña en archivos)
$body = @{ email='Admin@gmail.com'; password='TU_CONTRASEÑA' } | ConvertTo-Json
$login = Invoke-RestMethod -Uri 'http://localhost:8090/api/auth/login' -Method Post -ContentType 'application/json' -Body $body
$login.datos.permisos

# Catálogo público
Invoke-RestMethod -Uri 'http://localhost:8090/api/monedas'
Invoke-RestMethod -Uri 'http://localhost:8090/api/pagos/metodos'
```

## Pruebas

```powershell
mvn -q test
```

Las pruebas cubren conversión de carrito mixto, cotización firmada, rechazo de precios alterados, métodos incompatibles con la moneda, campos obligatorios, roles dinámicos sin reemitir token, reportes separados por moneda y bloqueo de configuración a clientes.
