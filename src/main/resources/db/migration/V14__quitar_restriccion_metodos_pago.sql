-- Los metodos de pago configurables viven en metodos_pago_config.
-- La restriccion heredada limitaba pagos.metodo_pago a los seis codigos originales.
ALTER TABLE pagos DROP CONSTRAINT IF EXISTS pagos_metodo_pago_check;
