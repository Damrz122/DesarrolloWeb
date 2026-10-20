-- Amplía sin borrar importes, usuarios ni identificadores existentes.
INSERT INTO permisos(codigo, nombre) VALUES
 ('PRODUCTOS_VER', 'Consultar productos administrativos'), ('PRECIOS_GESTIONAR', 'Modificar precios'),
 ('CATEGORIAS_GESTIONAR', 'Gestionar categorías'), ('REPORTES_VER', 'Consultar reportes'),
 ('CHAT_ATENDER', 'Atender soporte'), ('APARIENCIA_GESTIONAR', 'Editar apariencia'), ('COMPRAR', 'Comprar y consultar pedidos propios')
ON CONFLICT DO NOTHING;
INSERT INTO rol_permisos SELECT 'ADMIN', codigo FROM permisos ON CONFLICT DO NOTHING;
INSERT INTO rol_permisos VALUES ('CLIENTE', 'COMPRAR') ON CONFLICT DO NOTHING;

DO $$ DECLARE c RECORD; BEGIN
 FOR c IN SELECT conname FROM pg_constraint WHERE conrelid = 'usuarios'::regclass AND contype = 'c'
   AND pg_get_constraintdef(oid) ~ '\mrol\M'
 LOOP EXECUTE format('ALTER TABLE usuarios DROP CONSTRAINT %I', c.conname); END LOOP;
END $$;
ALTER TABLE usuarios ALTER COLUMN rol TYPE VARCHAR(40);
ALTER TABLE usuarios ADD CONSTRAINT fk_usuario_rol_config FOREIGN KEY(rol) REFERENCES roles_config(codigo);

ALTER TABLE productos ALTER COLUMN precio TYPE NUMERIC(19,4);
ALTER TABLE productos ALTER COLUMN precio_oferta TYPE NUMERIC(19,4);
ALTER TABLE detalles_pedido ALTER COLUMN precio_unitario TYPE NUMERIC(19,4);
ALTER TABLE pedidos ALTER COLUMN total TYPE NUMERIC(19,4);
ALTER TABLE pagos ALTER COLUMN monto TYPE NUMERIC(19,4);
ALTER TABLE pagos ALTER COLUMN metodo_pago TYPE VARCHAR(50);
ALTER TABLE pedidos ADD COLUMN total_base_pen NUMERIC(19,4);
ALTER TABLE pedidos ADD COLUMN cotizacion_id VARCHAR(36) UNIQUE;
ALTER TABLE pedidos ADD COLUMN cambio_snapshot TEXT;
UPDATE pedidos SET total_base_pen = total WHERE moneda_codigo = 'PEN';
ALTER TABLE detalles_pedido ADD COLUMN precio_original NUMERIC(19,4);
ALTER TABLE detalles_pedido ADD COLUMN moneda_original VARCHAR(3);
ALTER TABLE detalles_pedido ADD COLUMN producto_nombre VARCHAR(150);
UPDATE detalles_pedido d SET precio_original = precio_unitario, moneda_original = moneda_codigo,
 producto_nombre = (SELECT nombre FROM productos WHERE id = d.producto_id);
ALTER TABLE pagos ADD COLUMN metodo_nombre VARCHAR(100);
ALTER TABLE pagos ADD COLUMN formulario_snapshot TEXT;
ALTER TABLE pagos ADD COLUMN datos_pago_json TEXT;
UPDATE pagos p SET metodo_nombre = COALESCE((SELECT nombre FROM metodos_pago_config m WHERE m.codigo = p.metodo_pago), p.metodo_pago);

ALTER TABLE monedas ADD CONSTRAINT chk_moneda_codigo CHECK(codigo ~ '^[A-Z]{3}$');
ALTER TABLE metodos_pago_config ADD CONSTRAINT chk_formulario_array CHECK(jsonb_typeof(formulario_json::jsonb) = 'array');

-- Se conserva también TARJETA_DEBITO para el historial legado.
INSERT INTO metodos_pago_config(codigo,nombre,procesamiento,prefijo_transaccion,icono,orden,activo)
VALUES ('TARJETA_DEBITO','Tarjeta de débito (legado)','SIMULADO','TX-','TARJETA',999,FALSE) ON CONFLICT DO NOTHING;
ALTER TABLE pagos ADD CONSTRAINT fk_pago_metodo_config FOREIGN KEY(metodo_pago) REFERENCES metodos_pago_config(codigo);

-- Catálogos usados se desactivan, no se eliminan. ADMIN se protege incluso por SQL normal.
CREATE FUNCTION proteger_rol_sistema() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.sistema AND (TG_OP = 'DELETE' OR NEW.codigo IS DISTINCT FROM OLD.codigo OR NOT NEW.activo OR NEW.sistema IS DISTINCT FROM OLD.sistema) THEN
   RAISE EXCEPTION 'No se puede eliminar, renombrar o desactivar un rol del sistema';
 END IF;
 RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;

CREATE FUNCTION proteger_ultimo_admin() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.rol = 'ADMIN' AND OLD.activo AND (TG_OP = 'DELETE' OR NEW.rol <> 'ADMIN' OR NOT NEW.activo) THEN
   PERFORM pg_advisory_xact_lock(78211001);
   IF NOT EXISTS(SELECT 1 FROM usuarios WHERE rol = 'ADMIN' AND activo AND id <> OLD.id) THEN
     RAISE EXCEPTION 'Debe conservarse al menos un administrador activo';
   END IF;
 END IF;
 RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER proteger_admin BEFORE UPDATE OR DELETE ON usuarios FOR EACH ROW EXECUTE FUNCTION proteger_ultimo_admin();

CREATE FUNCTION proteger_permisos_admin() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.rol_codigo = 'ADMIN' THEN RAISE EXCEPTION 'Los permisos del administrador del sistema están protegidos'; END IF;
 RETURN OLD;
END $$;
CREATE TRIGGER proteger_permisos_sistema BEFORE UPDATE OR DELETE ON rol_permisos FOR EACH ROW EXECUTE FUNCTION proteger_permisos_admin();

CREATE FUNCTION validar_moneda_producto() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE d INTEGER; BEGIN
 SELECT decimales INTO d FROM monedas WHERE codigo = NEW.moneda_codigo;
 IF d IS NULL OR NEW.precio <> round(NEW.precio,d) OR (NEW.precio_oferta IS NOT NULL AND NEW.precio_oferta <> round(NEW.precio_oferta,d)) THEN
   RAISE EXCEPTION 'El precio no respeta los decimales de la moneda';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validar_precio_moneda BEFORE INSERT OR UPDATE OF precio, precio_oferta, moneda_codigo ON productos FOR EACH ROW EXECUTE FUNCTION validar_moneda_producto();
CREATE FUNCTION proteger_precision_moneda() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.codigo = 'PEN' AND NOT NEW.activa THEN RAISE EXCEPTION 'PEN es la moneda contable base'; END IF;
 IF NEW.decimales <> OLD.decimales AND (EXISTS(SELECT 1 FROM productos WHERE moneda_codigo=OLD.codigo) OR EXISTS(SELECT 1 FROM pedidos WHERE moneda_codigo=OLD.codigo)) THEN
   RAISE EXCEPTION 'No se cambian los decimales de una moneda utilizada';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER proteger_precision BEFORE UPDATE ON monedas FOR EACH ROW EXECUTE FUNCTION proteger_precision_moneda();
CREATE TRIGGER proteger_roles BEFORE UPDATE OR DELETE ON roles_config FOR EACH ROW EXECUTE FUNCTION proteger_rol_sistema();

CREATE TABLE auditoria_config (
 id BIGSERIAL PRIMARY KEY, fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 conexion TEXT NOT NULL DEFAULT CURRENT_USER, tabla TEXT NOT NULL, operacion TEXT NOT NULL,
 anterior JSONB, nuevo JSONB
);
CREATE FUNCTION auditar_config() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 INSERT INTO auditoria_config(tabla,operacion,anterior,nuevo)
 VALUES(TG_TABLE_NAME,TG_OP, CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
 CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END);
 RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
DO $$ DECLARE t TEXT; BEGIN
 FOREACH t IN ARRAY ARRAY['monedas','tipos_cambio','roles_config','rol_permisos','metodos_pago_config','metodo_pago_monedas'] LOOP
 EXECUTE format('CREATE TRIGGER auditar_cambios AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION auditar_config()',t);
 END LOOP;
END $$;
