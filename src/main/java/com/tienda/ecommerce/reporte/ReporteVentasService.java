package com.tienda.ecommerce.reporte;

import com.tienda.ecommerce.reporte.dto.ReporteVentasResponse;
import java.time.LocalDate;

public interface ReporteVentasService {
    ReporteVentasResponse generarReporteVentas(LocalDate desde, LocalDate hasta);
}
