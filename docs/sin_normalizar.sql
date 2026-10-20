-- ============================================================
-- BASE DE DATOS SIN NORMALIZAR (0FN) - NovaStore
-- Solo para contraste en sustentación. NO usar en código.
-- El modelo real normalizado 3FN está en docs/diagrama-er.dbml
-- Cómo probar: docker exec -it electronix-postgres psql -U postgres -d ecommerce -f /tmp/sin_normalizar.sql
-- O pégalo en Adminer http://localhost:8091 (BD ecommerce)
-- ============================================================

DROP TABLE IF EXISTS pedidos_plano;
DROP TABLE IF EXISTS productos_plano;
DROP TABLE IF EXISTS usuarios_plano;
DROP TABLE IF EXISTS chat_plano;

-- 1) PRODUCTOS sin normalizar: categoría duplicada + imágenes con comas (viola 1FN y 3FN)
CREATE TABLE productos_plano (
  producto_id   BIGSERIAL PRIMARY KEY,
  nombre        VARCHAR(150) NOT NULL,
  descripcion   VARCHAR(1000),
  precio        DECIMAL(10,2) NOT NULL,
  stock         INT NOT NULL,
  -- 1FN: lista multivaluada en un solo campo
  imagenes      VARCHAR(2000), -- ej: 'url1,url2,url3'
  -- 3FN: transitivo, debería ser categoria_id FK -> categorias
  categoria_nombre      VARCHAR(100),
  categoria_descripcion VARCHAR(255)
);

-- 2) USUARIOS + CARRITO aplastados (viola 1FN y 3FN)
CREATE TABLE usuarios_plano (
  usuario_id       BIGSERIAL PRIMARY KEY,
  nombres          VARCHAR(100),
  apellido_paterno VARCHAR(100),
  apellido_materno VARCHAR(100),
  email            VARCHAR(150),
  rol              VARCHAR(20),
  -- 1FN: carrito metido dentro del usuario como columnas repetidas
  carrito_producto1 VARCHAR(150),
  carrito_cantidad1 INT,
  carrito_producto2 VARCHAR(150),
  carrito_cantidad2 INT,
  carrito_producto3 VARCHAR(150),
  carrito_cantidad3 INT
};

-- 3) PEDIDOS aplastado: cliente + productos + pago + envío en una sola fila (viola 1FN, 2FN, 3FN)
CREATE TABLE pedidos_plano (
  pedido_id        BIGSERIAL PRIMARY KEY,
  fecha            TIMESTAMP NOT NULL DEFAULT NOW(),
  estado           VARCHAR(30),
  -- 3FN: datos del cliente repetidos en cada pedido (deberían vivir en usuarios)
  cliente_nombre   VARCHAR(200),
  cliente_email    VARCHAR(150),
  cliente_telefono VARCHAR(30),
  cliente_direccion VARCHAR(255),
  -- 3FN: categoría repetida (debería ser FK)
  categoria_nombre VARCHAR(100),
  -- 1FN: grupo repetido, ¿y si el pedido tiene 4 productos? no entra
  producto1_nombre   VARCHAR(150),
  producto1_cantidad INT,
  producto1_precio   DECIMAL(10,2),
  producto2_nombre   VARCHAR(150),
  producto2_cantidad INT,
  producto2_precio   DECIMAL(10,2),
  producto3_nombre   VARCHAR(150),
  producto3_cantidad INT,
  producto3_precio   DECIMAL(10,2),
  -- 3FN: dependen entre sí, no de la PK
  total            DECIMAL(10,2),
  metodo_pago      VARCHAR(30),
  estado_pago      VARCHAR(30),
  empresa_courier VARCHAR(100),
  numero_guia      VARCHAR(100),
  direccion_destino VARCHAR(255)
);

-- 4) CHAT aplastado (viola 1FN)
CREATE TABLE chat_plano (
  conversacion_id BIGSERIAL PRIMARY KEY,
  cliente_nombre  VARCHAR(200),
  admin_nombre    VARCHAR(200),
  estado          VARCHAR(30),
  -- 1FN: mensajes metidos como columnas, no como filas hijas
  mensaje1 VARCHAR(1000),
  mensaje2 VARCHAR(1000),
  mensaje3 VARCHAR(1000)
};

-- ============================================================
-- DATOS DE EJEMPLO: aquí se VEN las anomalías
-- ============================================================

INSERT INTO productos_plano (nombre, precio, stock, imagenes, categoria_nombre, categoria_descripcion) VALUES
('MacBook Air M2', 2585.45, 10, 'url1,url2,url3', 'Laptops y Computadoras', 'Laptops ultraligeras y gamers'),
('Mouse Logitech', 120.00, 50, 'url4,url5', 'Laptops y Computadoras', 'Laptops ultraligeras y gamers');
-- Anomalía de actualización: si cambia la descripción de la categoría hay que actualizar N productos.
-- Anomalía de borrado: si borras los 2 productos, pierdes la categoría.

INSERT INTO pedidos_plano (
  fecha, estado, cliente_nombre, cliente_email, cliente_telefono, cliente_direccion, categoria_nombre,
  producto1_nombre, producto1_cantidad, producto1_precio,
  producto2_nombre, producto2_cantidad, producto2_precio,
  total, metodo_pago, estado_pago, empresa_courier, numero_guia
) VALUES
(NOW(), 'ENTREGADO', 'Juan Perez', 'juan@gmail.com', '999111', 'Av. Lima 123', 'Laptops y Computadoras',
 'MacBook Air M2', 2, 2585.45,
 'Mouse Logitech', 1, 120.00,
 5290.90, 'YAPE', 'APROBADO', 'Olva', 'GUIA-001'),
(NOW(), 'ENTREGADO', 'Juan Perez', 'juan@gmail.com', '999111', 'Av. Lima 123', 'Laptops y Computadoras',
 'MacBook Air M2', 1, 2585.45,
 NULL, NULL, NULL,
 2585.45, 'YAPE', 'APROBADO', 'Olva', 'GUIA-002');
-- Redundancia: email/dirección de Juan repetidos. Si cambia su email -> actualizar N pedidos.
-- 1FN: pedido con 4 productos ya no entra (solo hay hasta producto3).

-- ============================================================
-- PREGUNTAS PARA EL INGENIERO (contraste con 3FN):
-- 1. ¿Qué pasa si un pedido tiene 10 productos? (no entra -> 1FN)
-- 2. ¿Qué pasa si cambia el email del cliente? (actualizar N filas -> 3FN)
-- 3. ¿Qué pasa si borras el último producto de una categoría? (pierdes la categoría -> 3FN)
-- Solución 3FN real: ver docs/diagrama-er.dbml
--   productos.categoria_id -> categorias.id (JOIN, no duplicado)
--   pedidos.usuario_id -> usuarios.id (JOIN, no duplicado)
--   detalles_pedido una fila por producto (sin límite producto1..N)
--   producto_imagenes una fila por imagen (sin comas)
--   pagos / envios en tablas 1-a-1 separadas
-- ============================================================
