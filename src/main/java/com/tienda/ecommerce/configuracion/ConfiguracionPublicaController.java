package com.tienda.ecommerce.configuracion;

import com.tienda.ecommerce.common.ApiResponse;
import com.tienda.ecommerce.pedido.CotizacionService;
import com.tienda.ecommerce.usuario.UsuarioRepository;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.prepost.PreAuthorize;
import java.util.List;
import java.util.Map;

@RestController
public class ConfiguracionPublicaController {
    private final MonedaRepository monedas;
    private final CotizacionService cotizaciones;
    private final UsuarioRepository usuarios;
    private final RolConfigRepository roles;
    public ConfiguracionPublicaController(MonedaRepository monedas, CotizacionService cotizaciones, UsuarioRepository usuarios, RolConfigRepository roles) {
        this.monedas = monedas; this.cotizaciones = cotizaciones; this.usuarios = usuarios;
        this.roles = roles;
    }
    @GetMapping("/api/monedas")
    public ApiResponse<List<Moneda>> monedas() { return ApiResponse.exito("Monedas disponibles", monedas.findAll().stream().filter(Moneda::isActiva).toList()); }
    @GetMapping("/api/roles")
    @PreAuthorize("hasAnyAuthority('USUARIOS_GESTIONAR','CONFIGURACION_GESTIONAR')")
    public ApiResponse<List<RolConfig>> roles() { return ApiResponse.exito("Roles registrados", roles.findAll()); }
    @PostMapping("/api/checkout/cotizacion")
    @PreAuthorize("hasAuthority('COMPRAR')")
    public ApiResponse<CotizacionService.Respuesta> cotizar(Authentication auth, @RequestBody Map<String,String> body) {
        var usuario = usuarios.findByEmail(auth.getName()).orElseThrow();
        return ApiResponse.exito("Cotización válida por 5 minutos", cotizaciones.generar(usuario.getId(), body.getOrDefault("monedaCodigo", "PEN")));
    }
}
