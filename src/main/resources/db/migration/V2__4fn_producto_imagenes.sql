-- ============================================================
-- V2: 4FN — galería multivaluada producto ->> url
-- Antes: productos.imagen_url (1 sola imagen).
-- Ahora: producto_imagenes (N imágenes, una fila por imagen).
-- productos.imagen_url se conserva como portada (orden = 0)
-- por compatibilidad con frontend/API.
-- ============================================================

CREATE TABLE IF NOT EXISTS producto_imagenes (
    id BIGSERIAL PRIMARY KEY,
    producto_id BIGINT NOT NULL REFERENCES productos (id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    orden INT NOT NULL DEFAULT 0
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_producto_imagen_url_no_vacia') THEN
        ALTER TABLE producto_imagenes ADD CONSTRAINT chk_producto_imagen_url_no_vacia CHECK (char_length(TRIM(url)) > 0);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_producto_imagen_orden_no_negativo') THEN
        ALTER TABLE producto_imagenes ADD CONSTRAINT chk_producto_imagen_orden_no_negativo CHECK (orden >= 0);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_producto_imagen_url') THEN
        IF NOT EXISTS (
            SELECT producto_id, url FROM producto_imagenes
            GROUP BY producto_id, url HAVING COUNT(*) > 1
        ) THEN
            ALTER TABLE producto_imagenes ADD CONSTRAINT uk_producto_imagen_url UNIQUE (producto_id, url);
        END IF;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_producto_imagen_producto ON producto_imagenes (producto_id, orden);

-- Backfill: la imagen principal existente pasa a ser orden = 0 en 4FN
INSERT INTO producto_imagenes (producto_id, url, orden)
SELECT id, TRIM(imagen_url), 0
FROM productos
WHERE imagen_url IS NOT NULL AND TRIM(imagen_url) <> ''
ON CONFLICT DO NOTHING;
