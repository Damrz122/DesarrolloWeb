package com.tienda.ecommerce.producto;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductoImagenRepository extends JpaRepository<ProductoImagen, Long> {

    List<ProductoImagen> findByProductoIdOrderByOrdenAscIdAsc(Long productoId);

    void deleteByProductoId(Long productoId);
}
