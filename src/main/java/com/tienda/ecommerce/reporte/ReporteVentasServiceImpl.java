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
import java.time.YearMonth;
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
        // Sin filtros: mes calendario actual (día 1 a fin de mes). Con filtros: rango exacto.
        LocalDate fechaInicio;
        LocalDate fechaFin;
        if (desde == null && hasta == null) {
            YearMonth mesActual = YearMonth.now();
            fechaInicio = mesActual.atDay(1);
            fechaFin = mesActual.atEndOfMonth();
        } else {
            fechaInicio = (desde != null) ? desde : LocalDate.now().minusDays(30);
            fechaFin = (hasta != null) ? hasta : LocalDate.now();
        }

        LocalDateTime dtDesde = fechaInicio.atStartOfDay();
        LocalDateTime dtHasta = fechaFin.atTime(LocalTime.MAX);

        // 1a. Total pedidos: todos menos CANCELADO (incluye PENDIENTE).
        List<Object[]> resumenTotal = pedidoRepository.calcularResumenVentas(dtDesde, dtHasta);
        long totalPedidos = 0;

        if (resumenTotal != null && !resumenTotal.isEmpty() && resumenTotal.get(0) != null) {
            Object[] fila = resumenTotal.get(0);
            totalPedidos = fila[0] != null ? ((Number) fila[0]).longValue() : 0L;
        }

        // 1b. Ventas: solo pedidos con pago APROBADO y estado distinto de CANCELADO.
        List<Object[]> resumenPagado = pedidoRepository.calcularResumenVentasPagadas(dtDesde, dtHasta);
        long pedidosPagados = 0;
        BigDecimal totalVentas = BigDecimal.ZERO;

        if (resumenPagado != null && !resumenPagado.isEmpty() && resumenPagado.get(0) != null) {
            Object[] fila = resumenPagado.get(0);
            pedidosPagados = fila[0] != null ? ((Number) fila[0]).longValue() : 0L;
            totalVentas = fila[1] != null ? new BigDecimal(fila[1].toString()) : BigDecimal.ZERO;
        }

        BigDecimal ticketPromedio = pedidosPagados > 0
                ? totalVentas.divide(BigDecimal.valueOf(pedidosPagados), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        // 2. Ventas agrupadas por fecha (solo pagadas)
        List<Object[]> filasFecha = pedidoRepository.agruparVentasPagadasPorFecha(dtDesde, dtHasta);
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
