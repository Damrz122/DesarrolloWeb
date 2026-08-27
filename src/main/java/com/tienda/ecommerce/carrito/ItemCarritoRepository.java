package com.tienda.ecommerce.carrito;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ItemCarritoRepository extends JpaRepository<ItemCarrito, Long> {
    Optional<ItemCarrito> findByCarritoIdAndProductoId(Long carritoId, Long productoId);
}
