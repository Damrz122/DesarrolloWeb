package com.tienda.ecommerce.reporte;

import com.tienda.ecommerce.pedido.PedidoRepository;
import com.tienda.ecommerce.producto.ProductoService;
import com.tienda.ecommerce.reporte.dto.ProductoBajoStockDTO;
import com.tienda.ecommerce.reporte.dto.ReporteVentasResponse;
import com.tienda.ecommerce.reporte.dto.VentaPorFechaDTO;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class ReporteVentasServiceImpl implements ReporteVentasService {

    private final PedidoRepository pedidoRepository;
    private final ProductoService productoService;

    public ReporteVentasServiceImpl(PedidoRepository pedidoRepository, ProductoService productoService) {
        this.pedidoRepository = pedidoRepository;
        this.productoService = productoService;
    }

    @Override
    @Transactional(readOnly = true)
    public ReporteVentasResponse generarReporteVentas(LocalDate desde, LocalDate hasta) {
        LocalDate fechaInicio = (desde != null) ? desde : LocalDate.now().minusDays(30);
        LocalDate fechaFin = (hasta != null) ? hasta : LocalDate.now();

        LocalDateTime dtDesde = fechaInicio.atStartOfDay();
        LocalDateTime dtHasta = fechaFin.atTime(LocalTime.MAX);

        // 1. Resumen global
        List<Object[]> resumen = pedidoRepository.calcularResumenVentas(dtDesde, dtHasta);
        long totalPedidos = 0;
        BigDecimal totalVentas = BigDecimal.ZERO;

        if (resumen != null && !resumen.isEmpty() && resumen.get(0) != null) {
            Object[] fila = resumen.get(0);
            totalPedidos = fila[0] != null ? ((Number) fila[0]).longValue() : 0L;
            totalVentas = fila[1] != null ? new BigDecimal(fila[1].toString()) : BigDecimal.ZERO;
        }

        BigDecimal ticketPromedio = totalPedidos > 0
                ? totalVentas.divide(BigDecimal.valueOf(totalPedidos), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        // 2. Ventas agrupadas por fecha
        List<Object[]> filasFecha = pedidoRepository.agruparVentasPorFecha(dtDesde, dtHasta);
        List<VentaPorFechaDTO> ventasPorFecha = new ArrayList<>();

        if (filasFecha != null) {
            for (Object[] row : filasFecha) {
                LocalDate dia;
                if (row[0] instanceof LocalDate ld) {
                    dia = ld;
                } else if (row[0] instanceof Date d) {
                    dia = d.toLocalDate();
                } else {
                    dia = LocalDate.parse(row[0].toString());
                }

                BigDecimal totalDia = row[1] != null ? new BigDecimal(row[1].toString()) : BigDecimal.ZERO;
                long cantDia = row[2] != null ? ((Number) row[2]).longValue() : 0L;

                ventasPorFecha.add(new VentaPorFechaDTO(dia, totalDia, cantDia));
            }
        }

        // 3. Productos con bajo stock (umbral <= 5 unidades)
        List<ProductoBajoStockDTO> productosBajoStock = productoService.obtenerProductosBajoStock(5);

        return new ReporteVentasResponse(totalVentas, totalPedidos, ticketPromedio, ventasPorFecha, productosBajoStock);
    }
}
