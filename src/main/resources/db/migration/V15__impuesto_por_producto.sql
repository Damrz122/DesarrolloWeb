-- Impuesto adicional configurable por producto. Los importes de pedidos se
-- congelan en detalles_pedido para que cambios posteriores no alteren ventas.
ALTER TABLE productos ADD COLUMN IF NOT EXISTS impuesto_porcentaje NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE productos ADD CONSTRAINT chk_producto_impuesto_porcentaje
    CHECK (impuesto_porcentaje >= 0 AND impuesto_porcentaje <= 100);

ALTER TABLE detalles_pedido ADD COLUMN IF NOT EXISTS impuesto_porcentaje NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE detalles_pedido ADD COLUMN IF NOT EXISTS impuesto_monto NUMERIC(19,4) NOT NULL DEFAULT 0;
ALTER TABLE detalles_pedido ADD CONSTRAINT chk_detalle_impuesto_porcentaje
    CHECK (impuesto_porcentaje >= 0 AND impuesto_porcentaje <= 100);
ALTER TABLE detalles_pedido ADD CONSTRAINT chk_detalle_impuesto_monto
    CHECK (impuesto_monto >= 0);
