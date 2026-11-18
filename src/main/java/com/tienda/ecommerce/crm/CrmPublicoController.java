package com.tienda.ecommerce.crm;

import com.tienda.ecommerce.common.ApiResponse;
import com.tienda.ecommerce.common.RecursoNoEncontradoException;
import com.tienda.ecommerce.crm.dto.BilleteraResponse;
import com.tienda.ecommerce.crm.dto.SimularCanjePuntosRequest;
import com.tienda.ecommerce.crm.dto.SimularCanjePuntosResponse;
import com.tienda.ecommerce.crm.dto.ValidarCuponRequest;
import com.tienda.ecommerce.crm.dto.ValidarCuponResponse;
import com.tienda.ecommerce.usuario.Usuario;
import com.tienda.ecommerce.usuario.UsuarioRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/crm")
public class CrmPublicoController {

    private final CrmService crmService;
    private final UsuarioRepository usuarioRepository;
    private final PuntosConfigRepository puntosConfigRepository;

    public CrmPublicoController(CrmService crmService, UsuarioRepository usuarioRepository,
                               PuntosConfigRepository puntosConfigRepository) {
        this.crmService = crmService;
        this.usuarioRepository = usuarioRepository;
        this.puntosConfigRepository = puntosConfigRepository;
    }

    public record ReglasPublicas(boolean activo, int puntosBienvenida, int minimoPuntosCanje,
                                 int maxCoberturaPorcentaje, java.math.BigDecimal valorPenPorPunto,
                                 java.math.BigDecimal factorSolPorPunto) {}

    @GetMapping("/puntos/reglas")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ApiResponse<ReglasPublicas> reglasPublicas() {
        // Solo reglas del programa: nunca expone billeteras, clientes ni configuración administrativa.
        PuntosConfig c = puntosConfigRepository.findById(1).orElseGet(PuntosConfig::new);
        return ApiResponse.exito(new ReglasPublicas(c.isActivo(), c.getPuntosBienvenida(),
                c.getMinimoPuntosCanje(), c.getMaxCoberturaPorcentaje(), c.getValorPenPorPunto(),
                c.getFactorSolPorPunto()));
    }

    private Usuario obtenerUsuarioAutenticado(Authentication authentication) {
        return usuarioRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado con email: " + authentication.getName()));
    }

    @PostMapping("/cupones/validar")
    @PreAuthorize("hasAuthority('COMPRAR')")
    public ResponseEntity<ApiResponse<ValidarCuponResponse>> validarCupon(
            Authentication authentication,
            @Valid @RequestBody ValidarCuponRequest request
    ) {
        Long usuarioId = null;
        if (authentication != null && authentication.getName() != null) {
            usuarioId = usuarioRepository.findByEmail(authentication.getName())
                    .map(Usuario::getId)
                    .orElse(null);
        }

        ValidarCuponResponse resultado = crmService.validarCupon(
                request.getCodigo(),
                usuarioId,
                request.getSubtotalBasePen()
        );

        return ResponseEntity.ok(ApiResponse.exito(resultado.getMensaje(), resultado));
    }

    @GetMapping({"/puntos/mi-billetera", "/mis-puntos"})
    @PreAuthorize("hasAuthority('CRM_VER_PUNTOS')")
    public ResponseEntity<ApiResponse<BilleteraResponse>> miBilletera(Authentication authentication) {
        Usuario usuario = obtenerUsuarioAutenticado(authentication);
        BilleteraResponse res = crmService.obtenerBilleteraUsuario(usuario.getId());
        return ResponseEntity.ok(ApiResponse.exito("Billetera obtenida exitosamente", res));
    }

    @GetMapping("/niveles")
    public ResponseEntity<ApiResponse<java.util.List<com.tienda.ecommerce.crm.dto.NivelClienteDto>>> listarNiveles() {
        java.util.List<com.tienda.ecommerce.crm.dto.NivelClienteDto> niveles = crmService.listarNiveles();
        return ResponseEntity.ok(ApiResponse.exito("Niveles de fidelización obtenidos", niveles));
    }

    @PostMapping("/puntos/simular")
    @PreAuthorize("hasAuthority('CRM_VER_PUNTOS')")
    public ResponseEntity<ApiResponse<SimularCanjePuntosResponse>> simularCanje(
            Authentication authentication,
            @Valid @RequestBody SimularCanjePuntosRequest request
    ) {
        Usuario usuario = obtenerUsuarioAutenticado(authentication);
        SimularCanjePuntosResponse res = crmService.simularCanje(
                usuario.getId(),
                request.getPuntosACanjear(),
                request.getSubtotalBasePen()
        );
        return ResponseEntity.ok(ApiResponse.exito(res.getMensaje(), res));
    }
}
