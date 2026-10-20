package com.tienda.ecommerce.pago;

import com.tienda.ecommerce.common.ApiResponse;
import com.tienda.ecommerce.pago.dto.MetodoPagoPublicoResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/pagos/metodos")
public class MetodoPagoConfigController {
    private final MetodoPagoConfigRepository repository;
    private final FormularioPagoService formularios;
    public MetodoPagoConfigController(MetodoPagoConfigRepository repository, FormularioPagoService formularios) { this.repository = repository; this.formularios = formularios; }

    @GetMapping
    public ResponseEntity<ApiResponse<List<MetodoPagoPublicoResponse>>> listarActivos(@RequestParam(defaultValue = "PEN") String moneda) {
        List<MetodoPagoPublicoResponse> datos = repository.findActivosPorMoneda(moneda.trim().toUpperCase()).stream()
                .map(m -> new MetodoPagoPublicoResponse(m.getCodigo(), m.getNombre(), m.getDescripcion(),
                        m.getInstrucciones(), m.getProcesamiento(), m.isRequiereReferencia(),
                        m.getEtiquetaReferencia(), m.getIcono(), m.getFormularioJson(), m.getOrden(), formularios.campos(m), formularios.version(m)))
                .toList();
        return ResponseEntity.ok(ApiResponse.exito("Métodos de pago disponibles", datos));
    }
}
