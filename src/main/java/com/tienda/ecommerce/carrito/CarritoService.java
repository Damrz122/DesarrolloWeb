package com.tienda.ecommerce.carrito;

import com.tienda.ecommerce.carrito.dto.CarritoResponse;
import com.tienda.ecommerce.carrito.dto.ItemCarritoRequest;

public interface CarritoService {
    CarritoResponse obtenerCarrito(Long usuarioId);
    CarritoResponse agregarItem(Long usuarioId, ItemCarritoRequest request);
    CarritoResponse actualizarCantidadItem(Long usuarioId, Long itemId, int cantidad);
    CarritoResponse removerItem(Long usuarioId, Long itemId);
    void vaciarCarrito(Long usuarioId);
    Carrito obtenerOCrearCarritoEntity(Long usuarioId);
}
