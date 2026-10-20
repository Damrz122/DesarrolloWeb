-- El estudio guarda capas, ajustes y estilos de las cinco tarjetas.
-- TEXT evita que PostgreSQL corte el JSON al superar VARCHAR(20000).
ALTER TABLE IF EXISTS sitio_config
    ALTER COLUMN valor TYPE TEXT;
