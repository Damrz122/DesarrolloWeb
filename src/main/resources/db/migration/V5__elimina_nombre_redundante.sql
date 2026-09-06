-- ============================================================
-- V5: elimina la columna redundante nombre (se deriva de
-- nombres + apellidos en Java) y corrige las filas de soporte
-- sembradas con el formato viejo ("Soporte 1" ... "Soporte 5").
-- ============================================================

UPDATE usuarios
SET nombres = 'Soporte',
    apellido_paterno = 'Ecommerce',
    apellido_materno = NULL
WHERE email LIKE 'soporte%@demo.pe';

ALTER TABLE usuarios DROP COLUMN IF EXISTS nombre;
