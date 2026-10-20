-- La tarjeta simulada se habilita inicialmente para USD; otros métodos se
-- pueden habilitar por SQL o desde la siguiente ampliación del panel.
INSERT INTO metodo_pago_monedas (metodo_codigo, moneda_codigo)
VALUES ('TARJETA_CREDITO', 'USD')
ON CONFLICT DO NOTHING;
