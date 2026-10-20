-- ============================================================
-- V4: identidad del usuario (nombres, apellidos, documento).
-- Parte el nombre completo actual en 3 campos y agrega tipo +
-- número de documento con dominio y unicidad. La columna nombre
-- se conserva como "nombre completo" para compatibilidad.
-- ============================================================

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nombres VARCHAR(100);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS apellido_paterno VARCHAR(100);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS apellido_materno VARCHAR(100);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(5);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS numero_documento VARCHAR(12);

-- Backfill: divide "Nombre ApPaterno ApMaterno..." en partes.
-- Algunas bases ya fueron creadas sin la columna antigua `nombre`, por lo
-- que el backfill solo corresponde cuando dicha columna todavía existe.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'usuarios'
          AND column_name = 'nombre'
    ) THEN
        UPDATE usuarios
        SET nombres = (string_to_array(TRIM(nombre), ' '))[1],
            apellido_paterno = COALESCE(NULLIF((string_to_array(TRIM(nombre), ' '))[2], ''), '-'),
            apellido_materno = NULLIF(array_to_string((string_to_array(TRIM(nombre), ' '))[3:], ' '), '')
        WHERE nombres IS NULL;
    END IF;
END $$;

-- La cuenta administrador no es una persona: identidad del sistema
UPDATE usuarios
SET nombres = 'Administrador', apellido_paterno = 'Sistema', apellido_materno = NULL
WHERE email = 'admin@tienda.com';

UPDATE usuarios SET tipo_documento = 'DNI' WHERE tipo_documento IS NULL;

-- Documento secuencial único para filas existentes (8 dígitos)
WITH seq AS (
    SELECT id, (70000000 + ROW_NUMBER() OVER (ORDER BY id))::TEXT AS doc
    FROM usuarios
    WHERE numero_documento IS NULL
)
UPDATE usuarios u SET numero_documento = s.doc FROM seq s WHERE s.id = u.id;

ALTER TABLE usuarios ALTER COLUMN nombres SET NOT NULL;
ALTER TABLE usuarios ALTER COLUMN apellido_paterno SET NOT NULL;
ALTER TABLE usuarios ALTER COLUMN tipo_documento SET NOT NULL;
ALTER TABLE usuarios ALTER COLUMN numero_documento SET NOT NULL;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_usuarios_numero_documento') THEN
        IF NOT EXISTS (
            SELECT numero_documento FROM usuarios
            GROUP BY numero_documento HAVING COUNT(*) > 1
        ) THEN
            ALTER TABLE usuarios ADD CONSTRAINT uk_usuarios_numero_documento UNIQUE (numero_documento);
        END IF;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_usuarios_tipo_documento') THEN
        ALTER TABLE usuarios ADD CONSTRAINT chk_usuarios_tipo_documento CHECK (tipo_documento IN ('DNI', 'CE'));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_usuarios_numero_documento') THEN
        ALTER TABLE usuarios ADD CONSTRAINT chk_usuarios_numero_documento CHECK (
            (tipo_documento = 'DNI' AND numero_documento ~ '^[0-9]{8}$')
            OR (tipo_documento = 'CE' AND numero_documento ~ '^[A-Za-z0-9]{9}$')
        );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_usuario_documento ON usuarios (tipo_documento, numero_documento);
