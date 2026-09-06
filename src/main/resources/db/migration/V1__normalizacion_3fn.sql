UPDATE conversaciones_chat
SET estado = UPPER(TRIM(estado))
WHERE estado IS NOT NULL
  AND UPPER(TRIM(estado)) IN ('ACTIVA', 'CERRADA', 'ARCHIVADA')
  AND estado <> UPPER(TRIM(estado));

UPDATE conversaciones_chat
SET estado = 'CERRADA'
WHERE UPPER(TRIM(estado)) NOT IN ('ACTIVA', 'CERRADA', 'ARCHIVADA');

UPDATE productos SET fecha_creacion = NOW() WHERE fecha_creacion IS NULL;
UPDATE usuarios SET fecha_registro = NOW() WHERE fecha_registro IS NULL;

DELETE FROM items_carrito a USING items_carrito b
WHERE a.id > b.id
  AND a.carrito_id = b.carrito_id
  AND a.producto_id = b.producto_id;

-- ============================================================
-- 1) PRODUCTOS: CHECKs precio/stock + NOT NULL fecha_creacion
-- ============================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_productos_precio_no_negativo') THEN
        ALTER TABLE productos ADD CONSTRAINT chk_productos_precio_no_negativo CHECK (precio >= 0);
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_productos_stock_no_negativo') THEN
        ALTER TABLE productos ADD CONSTRAINT chk_productos_stock_no_negativo CHECK (stock >= 0);
    END IF;
END $$;
-- fecha_creacion pasa a NOT NULL (ya rellenada arriba)
DO $$ BEGIN
    BEGIN
        ALTER TABLE productos ALTER COLUMN fecha_creacion SET NOT NULL;
    EXCEPTION WHEN others THEN NULL;
    END;
END $$;

-- ============================================================
-- 2) ITEMS_CARRITO (2FN/BCNF): UNIQUE + CHECK + índices
-- ============================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_items_carrito_carrito_producto') THEN
        ALTER TABLE items_carrito ADD CONSTRAINT uk_items_carrito_carrito_producto UNIQUE (carrito_id, producto_id);
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_items_carrito_cantidad_positiva') THEN
        ALTER TABLE items_carrito ADD CONSTRAINT chk_items_carrito_cantidad_positiva CHECK (cantidad > 0);
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_items_carrito_carrito ON items_carrito (carrito_id);
CREATE INDEX IF NOT EXISTS idx_items_carrito_producto ON items_carrito (producto_id);

-- ============================================================
-- 3) DETALLES_PEDIDO (3FN doc): precio_unitario es histórico congelado (NO eliminar).
--    Se protege con CHECKs + índices.
-- ============================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_detalle_cantidad_positiva') THEN
        ALTER TABLE detalles_pedido ADD CONSTRAINT chk_detalle_cantidad_positiva CHECK (cantidad > 0);
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_detalle_precio_no_negativo') THEN
        ALTER TABLE detalles_pedido ADD CONSTRAINT chk_detalle_precio_no_negativo CHECK (precio_unitario >= 0);
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_detalle_pedido_id ON detalles_pedido (pedido_id);
CREATE INDEX IF NOT EXISTS idx_detalle_producto_id ON detalles_pedido (producto_id);

-- ============================================================
-- 4) PEDIDOS (3FN): total es derivado SUM(detalles) — se conserva por rendimiento,
--    protegido con CHECK + índice de consulta frecuente (usuario_id, fecha).
-- ============================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pedidos_total_no_negativo') THEN
        ALTER TABLE pedidos ADD CONSTRAINT chk_pedidos_total_no_negativo CHECK (total >= 0);
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_pedido_usuario_fecha ON pedidos (usuario_id, fecha DESC);
-- NOTA 3FN: direccion_envio (pedidos) vs direccion_destino (envios) están duplicadas 1:1.
-- No se elimina ninguna en V1 por compatibilidad. La fuente de verdad para logística es
-- envios.direccion_destino; pedidos.direccion_envio es snapshot de compra. Ver V2 opcional.

-- ============================================================
-- 5) PAGOS (3FN/BCNF): monto duplica pedidos.total (snapshot de cobro, NO eliminar).
--    codigo_transaccion pasa a UNIQUE (era solo índice).
-- ============================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pagos_monto_no_negativo') THEN
        ALTER TABLE pagos ADD CONSTRAINT chk_pagos_monto_no_negativo CHECK (monto >= 0);
    END IF;
END $$;
-- Solo crea UNIQUE si no hay duplicados no-nulos (ya verificado, pero defensivo)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_pagos_codigo_transaccion') THEN
        IF NOT EXISTS (
            SELECT codigo_transaccion FROM pagos
            WHERE codigo_transaccion IS NOT NULL
            GROUP BY codigo_transaccion HAVING COUNT(*) > 1
        ) THEN
            ALTER TABLE pagos ADD CONSTRAINT uk_pagos_codigo_transaccion UNIQUE (codigo_transaccion);
        END IF;
    END IF;
END $$;

-- ============================================================
-- 6) ENVIOS (3FN/BCNF): numero_guia pasa a UNIQUE + checks de coherencia temporal
-- ============================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_envios_numero_guia') THEN
        IF NOT EXISTS (
            SELECT numero_guia FROM envios
            WHERE numero_guia IS NOT NULL
            GROUP BY numero_guia HAVING COUNT(*) > 1
        ) THEN
            ALTER TABLE envios ADD CONSTRAINT uk_envios_numero_guia UNIQUE (numero_guia);
        END IF;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_envios_fechas_coherentes') THEN
        ALTER TABLE envios ADD CONSTRAINT chk_envios_fechas_coherentes CHECK (
            fecha_entrega_real IS NULL OR fecha_despacho IS NULL OR fecha_entrega_real >= fecha_despacho
        );
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_envio_pedido ON envios (pedido_id);

-- ============================================================
-- 7) CONVERSACIONES_CHAT (1FN dominio): CHECK de dominio + índices por participante
-- ============================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_conversacion_estado_dominio') THEN
        ALTER TABLE conversaciones_chat ADD CONSTRAINT chk_conversacion_estado_dominio CHECK (estado IN ('ACTIVA', 'CERRADA', 'ARCHIVADA'));
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_conversacion_cliente ON conversaciones_chat (cliente_id);
CREATE INDEX IF NOT EXISTS idx_conversacion_admin ON conversaciones_chat (admin_id);
CREATE INDEX IF NOT EXISTS idx_conversacion_estado ON conversaciones_chat (estado);

-- ============================================================
-- 8) CHAT_MENSAJES: índices para ORDER BY fecha_envio por conversación
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_chat_mensaje_conversacion_fecha ON chat_mensajes (conversacion_id, fecha_envio);
CREATE INDEX IF NOT EXISTS idx_chat_mensaje_remitente ON chat_mensajes (remitente_id);

-- ============================================================
-- 9) USUARIOS: fecha_registro NOT NULL (ya rellenada)
-- ============================================================
DO $$ BEGIN
    BEGIN
        ALTER TABLE usuarios ALTER COLUMN fecha_registro SET NOT NULL;
    EXCEPTION WHEN others THEN NULL;
    END;
END $$;
