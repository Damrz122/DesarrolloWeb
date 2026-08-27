package com.tienda.ecommerce.pedido;

import com.tienda.ecommerce.common.PaginaResponse;
import com.tienda.ecommerce.pedido.dto.CrearPedidoRequest;
import com.tienda.ecommerce.pedido.dto.PedidoResponse;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface PedidoService {
    PedidoResponse crearDesdeCarrito(Long usuarioId, CrearPedidoRequest request);
    List<PedidoResponse> listarMisPedidos(Long usuarioId);
    PedidoResponse obtenerPorId(Long pedidoId, Long usuarioId, boolean esAdmin);
    PaginaResponse<PedidoResponse> listarParaAdmin(EstadoPedido estado, Pageable pageable);
    PedidoResponse cambiarEstado(Long pedidoId, EstadoPedido nuevoEstado);
}
