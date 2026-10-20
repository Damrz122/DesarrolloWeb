package com.tienda.ecommerce.producto;
import com.tienda.ecommerce.common.RecursoNoEncontradoException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
public class InventarioService {
    private final ProductoRepository productos;
    public InventarioService(ProductoRepository productos) { this.productos=productos; }
    @Transactional public void actualizar(Long id,int stock) {
        Producto p=productos.findById(id).orElseThrow(()->new RecursoNoEncontradoException("Producto no encontrado"));
        if(stock<0) throw new com.tienda.ecommerce.common.BadRequestException("Stock no válido");
        p.setStock(stock);productos.save(p);
    }
}
