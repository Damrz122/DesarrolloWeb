-- V8: contraentrega entregada se considera cobrada.
-- Los pedidos COD que ya figuran ENTREGADO pero con pago PENDIENTE
-- pasan a APROBADO para que "Ventas del mes" los incluya.
UPDATE pagos SET estado_pago = 'APROBADO', fecha_pago = NOW()
WHERE estado_pago = 'PENDIENTE'
  AND metodo_pago = 'PAGO_CONTRAENTREGA'
  AND pedido_id IN (SELECT id FROM pedidos WHERE estado = 'ENTREGADO');
