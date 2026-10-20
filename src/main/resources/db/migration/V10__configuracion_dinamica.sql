-- Catálogos administrables: no borrar filas usadas por operaciones históricas;
-- se desactivan con el campo activo.

CREATE TABLE IF NOT EXISTS monedas (
    codigo VARCHAR(3) PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL,
    simbolo VARCHAR(12) NOT NULL,
    locale VARCHAR(20) NOT NULL DEFAULT 'es-PE',
    decimales INTEGER NOT NULL DEFAULT 2 CHECK (decimales BETWEEN 0 AND 4),
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO monedas (codigo, nombre, simbolo, locale, decimales, activa)
VALUES ('PEN', 'Sol peruano', 'S/', 'es-PE', 2, TRUE),
       ('USD', 'Dólar estadounidense', 'US$', 'en-US', 2, TRUE)
ON CONFLICT (codigo) DO NOTHING;

CREATE TABLE IF NOT EXISTS tipos_cambio (
    id BIGSERIAL PRIMARY KEY,
    moneda_origen VARCHAR(3) NOT NULL REFERENCES monedas(codigo),
    moneda_destino VARCHAR(3) NOT NULL REFERENCES monedas(codigo),
    tasa NUMERIC(19,8) NOT NULL CHECK (tasa > 0),
    vigente_desde TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_tipos_cambio_monedas_distintas CHECK (moneda_origen <> moneda_destino)
);
CREATE INDEX IF NOT EXISTS idx_tipos_cambio_vigencia ON tipos_cambio (moneda_origen, moneda_destino, vigente_desde DESC);

CREATE TABLE IF NOT EXISTS roles_config (
    codigo VARCHAR(40) PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    sistema BOOLEAN NOT NULL DEFAULT FALSE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permisos (
    codigo VARCHAR(80) PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    descripcion VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS rol_permisos (
    rol_codigo VARCHAR(40) NOT NULL REFERENCES roles_config(codigo),
    permiso_codigo VARCHAR(80) NOT NULL REFERENCES permisos(codigo),
    PRIMARY KEY (rol_codigo, permiso_codigo)
);

INSERT INTO roles_config (codigo, nombre, descripcion, sistema, activo)
VALUES ('ADMIN', 'Administrador', 'Acceso completo al sistema', TRUE, TRUE),
       ('CLIENTE', 'Cliente', 'Compra y consulta sus propios pedidos', TRUE, TRUE)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO permisos (codigo, nombre, descripcion) VALUES
    ('ADMIN_ACCESO', 'Acceso administrativo', 'Accede al panel administrativo'),
    ('PRODUCTOS_GESTIONAR', 'Gestionar productos', 'Crea, edita y desactiva productos'),
    ('INVENTARIO_GESTIONAR', 'Gestionar inventario', 'Actualiza stock'),
    ('PEDIDOS_GESTIONAR', 'Gestionar pedidos', 'Consulta y actualiza pedidos'),
    ('PAGOS_VERIFICAR', 'Verificar pagos', 'Aprueba o rechaza pagos pendientes'),
    ('USUARIOS_GESTIONAR', 'Gestionar usuarios', 'Administra cuentas'),
    ('CONFIGURACION_GESTIONAR', 'Gestionar configuración', 'Administra roles, monedas y pagos')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO rol_permisos (rol_codigo, permiso_codigo)
SELECT 'ADMIN', codigo FROM permisos
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS metodos_pago_config (
    codigo VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),
    instrucciones TEXT,
    procesamiento VARCHAR(30) NOT NULL CHECK (procesamiento IN ('SIMULADO', 'VERIFICACION_MANUAL', 'CONTRA_ENTREGA')),
    requiere_referencia BOOLEAN NOT NULL DEFAULT FALSE,
    etiqueta_referencia VARCHAR(100),
    prefijo_transaccion VARCHAR(20) NOT NULL DEFAULT 'TX-',
    icono VARCHAR(40) NOT NULL DEFAULT 'PAGO',
    formulario_json TEXT NOT NULL DEFAULT '[]',
    orden INTEGER NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_metodos_pago_codigo CHECK (codigo ~ '^[A-Z][A-Z0-9_]{1,49}$')
);

CREATE TABLE IF NOT EXISTS metodo_pago_monedas (
    metodo_codigo VARCHAR(50) NOT NULL REFERENCES metodos_pago_config(codigo),
    moneda_codigo VARCHAR(3) NOT NULL REFERENCES monedas(codigo),
    PRIMARY KEY (metodo_codigo, moneda_codigo)
);

INSERT INTO metodos_pago_config
    (codigo, nombre, descripcion, procesamiento, requiere_referencia, etiqueta_referencia, prefijo_transaccion, icono, orden, activo)
VALUES
    ('PAGO_CONTRAENTREGA', 'Pago contra entrega', 'Pagas al recibir tu pedido.', 'CONTRA_ENTREGA', FALSE, NULL, 'COD-', 'ENTREGA', 10, TRUE),
    ('TARJETA_CREDITO', 'Tarjeta de crédito o débito', 'Pasarela simulada sin cargos reales.', 'SIMULADO', FALSE, NULL, 'TX-', 'TARJETA', 20, TRUE),
    ('YAPE', 'Yape', 'Registra tu número de operación para verificación.', 'VERIFICACION_MANUAL', TRUE, 'N° de operación Yape', 'YAPE-', 'YAPE', 30, TRUE),
    ('PLIN', 'Plin', 'Registra tu número de operación para verificación.', 'VERIFICACION_MANUAL', TRUE, 'N° de operación Plin', 'PLIN-', 'PLIN', 40, TRUE),
    ('TRANSFERENCIA_BANCARIA', 'Transferencia bancaria', 'Registra tu comprobante para verificación.', 'VERIFICACION_MANUAL', TRUE, 'N° de operación o comprobante', 'TRF-', 'TRANSFERENCIA', 50, TRUE)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO metodo_pago_monedas (metodo_codigo, moneda_codigo)
SELECT m.codigo, 'PEN' FROM metodos_pago_config m
ON CONFLICT DO NOTHING;

ALTER TABLE pagos ADD COLUMN IF NOT EXISTS procesamiento_pago VARCHAR(30);
ALTER TABLE pagos ALTER COLUMN metodo_pago TYPE VARCHAR(50);
UPDATE pagos
SET procesamiento_pago = CASE
    WHEN metodo_pago = 'PAGO_CONTRAENTREGA' THEN 'CONTRA_ENTREGA'
    WHEN metodo_pago IN ('YAPE', 'PLIN', 'TRANSFERENCIA_BANCARIA') THEN 'VERIFICACION_MANUAL'
    ELSE 'SIMULADO'
END
WHERE procesamiento_pago IS NULL;
ALTER TABLE pagos ALTER COLUMN procesamiento_pago SET NOT NULL;
