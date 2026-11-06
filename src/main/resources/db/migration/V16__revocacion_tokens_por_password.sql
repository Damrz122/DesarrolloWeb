-- V16: Revocación de tokens JWT tras cambio de contraseña
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS password_modificado_en TIMESTAMP;
