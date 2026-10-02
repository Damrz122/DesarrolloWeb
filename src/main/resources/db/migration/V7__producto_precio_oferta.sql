-- V7: precio de oferta del producto (solo aplica con etiqueta OFERTA).
ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_oferta NUMERIC(10,2);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_productos_precio_oferta') THEN
        ALTER TABLE productos ADD CONSTRAINT ck_productos_precio_oferta
            CHECK (precio_oferta IS NULL OR (precio_oferta >= 0 AND precio_oferta < precio));
    END IF;
END
$$;
