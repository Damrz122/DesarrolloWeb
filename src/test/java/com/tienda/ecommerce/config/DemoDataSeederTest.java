package com.tienda.ecommerce.config;

import com.tienda.ecommerce.carrito.CarritoRepository;
import com.tienda.ecommerce.chat.ChatMensajeRepository;
import com.tienda.ecommerce.chat.ConversacionChatRepository;
import com.tienda.ecommerce.pedido.DetallePedido;
import com.tienda.ecommerce.pedido.EstadoPedido;
import com.tienda.ecommerce.pedido.Pedido;
import com.tienda.ecommerce.pedido.PedidoRepository;
import com.tienda.ecommerce.producto.CategoriaRepository;
import com.tienda.ecommerce.producto.ProductoImagenRepository;
import com.tienda.ecommerce.producto.ProductoRepository;
import com.tienda.ecommerce.usuario.UsuarioRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
class DemoDataSeederTest {

    @Autowired
    private UsuarioRepository usuarioRepository;
    @Autowired
    private CategoriaRepository categoriaRepository;
    @Autowired
    private ProductoRepository productoRepository;
    @Autowired
    private ProductoImagenRepository productoImagenRepository;
    @Autowired
    private CarritoRepository carritoRepository;
    @Autowired
    private PedidoRepository pedidoRepository;
    @Autowired
    private ConversacionChatRepository conversacionChatRepository;
    @Autowired
    private ChatMensajeRepository chatMensajeRepository;

    private DemoDataSeeder seederPequeno() {
        return new DemoDataSeeder(usuarioRepository, categoriaRepository, productoRepository,
                carritoRepository, pedidoRepository, conversacionChatRepository,
                new BCryptPasswordEncoder(), 10, 2, 12, 8, 10, 4);
    }

    @Test
    @DisplayName("Siembra datos demo respetando invariantes de negocio")
    void siembra_con_invariantes() {
        seederPequeno().run();

        assertEquals(12, usuarioRepository.count(), "10 clientes + 2 admins");
        assertEquals(12, productoRepository.count());
        assertEquals(12, productoImagenRepository.count(), "1 imagen 4FN por producto");
        assertEquals(10, pedidoRepository.count());
        assertTrue(carritoRepository.count() > 0);
        assertTrue(conversacionChatRepository.count() > 0);
        assertTrue(chatMensajeRepository.count() > 0);

        List<Pedido> pedidos = pedidoRepository.findAll();
        Set<String> transacciones = new HashSet<>();
        Set<String> guias = new HashSet<>();
        for (Pedido p : pedidos) {
            BigDecimal suma = p.getDetalles().stream()
                    .map(d -> d.getPrecioUnitario().multiply(BigDecimal.valueOf(d.getCantidad())))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            assertEquals(0, suma.compareTo(p.getTotal()), "total = suma de detalles en pedido " + p.getId());
            assertFalse(p.getDetalles().isEmpty());
            for (DetallePedido d : p.getDetalles()) {
                assertTrue(d.getCantidad() > 0);
                assertTrue(d.getPrecioUnitario().compareTo(BigDecimal.ZERO) >= 0);
            }
            assertNotNull(p.getPago());
            assertEquals(0, p.getPago().getMonto().compareTo(p.getTotal()));
            assertTrue(transacciones.add(p.getPago().getCodigoTransaccion()), "TX única");
            if (p.getEstado() == EstadoPedido.CANCELADO) {
                assertNull(p.getEnvio(), "cancelado no tiene envío");
            } else {
                assertNotNull(p.getEnvio());
                assertTrue(guias.add(p.getEnvio().getNumeroGuia()), "guía única");
                assertEquals(p.getDireccionEnvio(), p.getEnvio().getDireccionDestino());
            }
        }
    }

    @Test
    @DisplayName("Con BD ya sembrada se omite (no duplica)")
    void con_bd_sembrada_se_omite() {
        List<com.tienda.ecommerce.usuario.Usuario> previos = new java.util.ArrayList<>();
        for (int i = 0; i < 51; i++) {
            previos.add(new com.tienda.ecommerce.usuario.Usuario(null,
                    "Previo", "Apellido" + i, null,
                    com.tienda.ecommerce.usuario.TipoDocumento.DNI,
                    String.format("%08d", 73000000 + i),
                    "previo" + i + "@demo.pe", "hash",
                    com.tienda.ecommerce.usuario.Rol.CLIENTE, true));
        }
        usuarioRepository.saveAll(previos);

        seederPequeno().run();

        assertEquals(51, usuarioRepository.count());
        assertEquals(0, pedidoRepository.count(), "no debe sembrar pedidos al omitir");
    }
}
