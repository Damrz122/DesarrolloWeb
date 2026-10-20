package com.tienda.ecommerce.reporte;

import com.tienda.ecommerce.common.ApiResponse;
import com.tienda.ecommerce.reporte.dto.ReporteVentasResponse;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/reportes")
@PreAuthorize("hasAuthority('REPORTES_VER')")
public class ReporteController {

    private final ReporteVentasService reporteVentasService;

    public ReporteController(ReporteVentasService reporteVentasService) {
        this.reporteVentasService = reporteVentasService;
    }

    @GetMapping("/ventas")
    public ResponseEntity<ApiResponse<ReporteVentasResponse>> obtenerReporteVentas(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta
    ) {
        ReporteVentasResponse reporte = reporteVentasService.generarReporteVentas(desde, hasta);
        return ResponseEntity.ok(ApiResponse.exito("Reporte de ventas generado correctamente", reporte));
    }
}
