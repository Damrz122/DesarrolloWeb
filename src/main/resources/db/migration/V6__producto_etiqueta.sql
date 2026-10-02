-- V6: etiqueta comercial del producto (NUEVO, OFERTA, TENDENCIA o NULL sin etiqueta).
ALTER TABLE productos ADD COLUMN IF NOT EXISTS etiqueta VARCHAR(20);
