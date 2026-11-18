package com.tienda.ecommerce.pedido;

import com.tienda.ecommerce.carrito.Carrito;
import com.tienda.ecommerce.carrito.CarritoRepository;
import com.tienda.ecommerce.common.BadRequestException;
import com.tienda.ecommerce.crm.CrmService;
import com.tienda.ecommerce.crm.TipoDescuento;
import com.tienda.ecommerce.crm.dto.SimularCanjePuntosResponse;
import com.tienda.ecommerce.crm.dto.ValidarCuponResponse;
import com.tienda.ecommerce.usuario.Usuario;
import com.tienda.ecommerce.usuario.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CheckoutBeneficiosControllerTest {
    final CotizacionService cotizaciones = mock(CotizacionService.class);
    final CarritoRepository carritos = mock(CarritoRepository.class);
    final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    final CrmService crm = mock(CrmService.class);
    final Usuario usuario = mock(Usuario.class);
    final Carrito carrito = mock(Carrito.class);
    final CheckoutBeneficiosController controller = new CheckoutBeneficiosController(cotizaciones, carritos, usuarios, crm);
    final UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken("cliente@example.test", "",
            AuthorityUtils.createAuthorityList("COMPRAR", "CRM_VER_PUNTOS"));

    @BeforeEach
    void preparar() {
        when(usuario.getId()).thenReturn(17L);
        when(usuarios.findByEmail(auth.getName())).thenReturn(Optional.of(usuario));
        when(carritos.findByUsuarioIdConItems(17L)).thenReturn(Optional.of(carrito));
        // USD 100, tipo de cambio 4 PEN por USD.
        when(cotizaciones.verificar("firmada", 17L, carrito)).thenReturn(new CotizacionService.Datos(
                "q1", 17L, "huella", "USD", new BigDecimal("100"), new BigDecimal("4"),
                new BigDecimal("400"), List.of()));
    }

    @Test void combinaSinConsumirSaldoCupoNiStockYConvierteEnServidor() {
        when(crm.validarCupon("CUPON", 17L, new BigDecimal("400"))).thenReturn(
                ValidarCuponResponse.exitoso("CUPON", "", TipoDescuento.MONTO_FIJO, BigDecimal.TEN,
                        new BigDecimal("40"), new BigDecimal("360"), true, ""));
        when(crm.simularCanje(17L, 500, new BigDecimal("400"))).thenReturn(
                SimularCanjePuntosResponse.exitoso(500, 500, 200, new BigDecimal("20"), new BigDecimal("380"), ""));
        var res = controller.previsualizar(auth, new CheckoutBeneficiosController.Solicitud("firmada", "CUPON", 500)).getDatos();
        assertEquals(0, new BigDecimal("85").compareTo(res.total()));
        assertEquals(0, new BigDecimal("10").compareTo(res.descuentoCupon()));
        assertEquals(200, res.puntosCanjeados());
        assertEquals("USD", res.monedaCodigo());
        verify(crm).validarCupon("CUPON", 17L, new BigDecimal("400"));
        verify(crm).simularCanje(17L, 500, new BigDecimal("400"));
        verifyNoMoreInteractions(crm);
        verify(carritos).findByUsuarioIdConItems(17L);
        verifyNoMoreInteractions(carritos);
    }

    @Test void rechazaCombinacionNoPermitida() {
        when(crm.validarCupon("SOLO", 17L, new BigDecimal("400"))).thenReturn(
                ValidarCuponResponse.exitoso("SOLO", "", TipoDescuento.PORCENTAJE, BigDecimal.TEN,
                        new BigDecimal("40"), new BigDecimal("360"), false, ""));
        assertThrows(BadRequestException.class, () -> controller.previsualizar(auth,
                new CheckoutBeneficiosController.Solicitud("firmada", "SOLO", 100)));
        verify(crm, never()).simularCanje(anyLong(), anyInt(), any());
    }

    @Test void rechazaCuponVencidoYSaldoInsuficiente() {
        when(crm.validarCupon("VENCIDO", 17L, new BigDecimal("400")))
                .thenReturn(ValidarCuponResponse.invalido("VENCIDO", "El cupón ha expirado"));
        assertThrows(BadRequestException.class, () -> controller.previsualizar(auth,
                new CheckoutBeneficiosController.Solicitud("firmada", "VENCIDO", 0)));
        when(crm.simularCanje(17L, 100, new BigDecimal("400")))
                .thenReturn(SimularCanjePuntosResponse.invalido(50, 100, "Saldo insuficiente"));
        assertThrows(BadRequestException.class, () -> controller.previsualizar(auth,
                new CheckoutBeneficiosController.Solicitud("firmada", null, 100)));
    }

    @Test void noSimulaPuntosSinPermiso() {
        var sinPermiso = new UsernamePasswordAuthenticationToken(auth.getName(), "",
                AuthorityUtils.createAuthorityList("COMPRAR"));
        assertThrows(AccessDeniedException.class, () -> controller.previsualizar(sinPermiso,
                new CheckoutBeneficiosController.Solicitud("firmada", null, 100)));
        verifyNoInteractions(crm);
    }
}
