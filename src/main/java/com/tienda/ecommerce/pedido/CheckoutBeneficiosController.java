package com.tienda.ecommerce.pedido;

import com.tienda.ecommerce.carrito.CarritoRepository;
import com.tienda.ecommerce.common.ApiResponse;
import com.tienda.ecommerce.common.BadRequestException;
import com.tienda.ecommerce.common.RecursoNoEncontradoException;
import com.tienda.ecommerce.crm.CrmService;
import com.tienda.ecommerce.usuario.UsuarioRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Vista previa: usa la cotización firmada y no consume cupos, puntos ni stock. */
@RestController
@RequestMapping("/api/checkout")
public class CheckoutBeneficiosController {
    private final CotizacionService cotizaciones;
    private final CarritoRepository carritos;
    private final UsuarioRepository usuarios;
    private final CrmService crm;

    public CheckoutBeneficiosController(CotizacionService cotizaciones, CarritoRepository carritos,
                                        UsuarioRepository usuarios, CrmService crm) {
        this.cotizaciones = cotizaciones;
        this.carritos = carritos;
        this.usuarios = usuarios;
        this.crm = crm;
    }

    public record Solicitud(@NotBlank String cotizacionToken, @Size(max = 30) String cuponCodigo,
                            @Min(0) Integer puntosACanjear) {}
    public record Resumen(String monedaCodigo, BigDecimal total, String cuponCodigo,
                          BigDecimal descuentoCupon, int puntosCanjeados, BigDecimal descuentoPuntos) {}

    @PostMapping("/beneficios")
    @PreAuthorize("hasAuthority('COMPRAR')")
    @Transactional(readOnly = true)
    public ApiResponse<Resumen> previsualizar(Authentication authentication, @Valid @RequestBody Solicitud request) {
        var usuario = usuarios.findByEmail(authentication.getName())
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));
        var carrito = carritos.findByUsuarioIdConItems(usuario.getId())
                .orElseThrow(() -> new BadRequestException("Tu carrito está vacío"));
        var q = cotizaciones.verificar(request.cotizacionToken(), usuario.getId(), carrito);
        int puntos = request.puntosACanjear() == null ? 0 : request.puntosACanjear();
        if (puntos > 0 && authentication.getAuthorities().stream().noneMatch(a -> a.getAuthority().equals("CRM_VER_PUNTOS"))) {
            throw new AccessDeniedException("Tu cuenta no tiene permiso para canjear puntos");
        }
        String codigo = null;
        BigDecimal descuentoCuponPen = BigDecimal.ZERO, descuentoPuntosPen = BigDecimal.ZERO;
        if (request.cuponCodigo() != null && !request.cuponCodigo().isBlank()) {
            var cupon = crm.validarCupon(request.cuponCodigo(), usuario.getId(), q.totalBasePen());
            if (!cupon.isValido()) throw new BadRequestException(cupon.getMensaje());
            if (puntos > 0 && !cupon.isPermiteCombinarPuntos()) {
                throw new BadRequestException("Este cupón no se puede combinar con puntos. Retira uno de los beneficios.");
            }
            codigo = cupon.getCodigo();
            descuentoCuponPen = cupon.getDescuentoBasePen();
        }
        if (puntos > 0) {
            var canje = crm.simularCanje(usuario.getId(), puntos, q.totalBasePen());
            if (!canje.isValido()) throw new BadRequestException(canje.getMensaje());
            puntos = canje.getPuntosPermitidos();
            descuentoPuntosPen = canje.getDescuentoBasePen();
        }
        // Misma conversión y precisión que crearDesdeCarrito. El pedido vuelve a validar todo bajo bloqueo.
        BigDecimal descuentoCupon = descuentoCuponPen.divide(q.tasaPen(), 4, RoundingMode.HALF_UP);
        BigDecimal descuentoPuntos = descuentoPuntosPen.divide(q.tasaPen(), 4, RoundingMode.HALF_UP);
        BigDecimal total = q.total().subtract(descuentoCupon).max(BigDecimal.ZERO)
                .subtract(descuentoPuntos).max(BigDecimal.ZERO);
        return ApiResponse.exito("Beneficios revisados; aún no se han consumido",
                new Resumen(q.monedaCodigo(), total, codigo, descuentoCupon, puntos, descuentoPuntos));
    }
}
