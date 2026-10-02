package com.tienda.ecommerce.producto;

import com.tienda.ecommerce.common.BadRequestException;
import com.tienda.ecommerce.common.PaginaResponse;
import com.tienda.ecommerce.common.RecursoNoEncontradoException;
import com.tienda.ecommerce.producto.dto.ProductoRequest;
import com.tienda.ecommerce.producto.dto.ProductoResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductoServiceTest {

    @Mock
    private ProductoRepository productoRepository;

    @Mock
    private CategoriaRepository categoriaRepository;

    @InjectMocks
    private ProductoServiceImpl productoService;

    private Categoria categoria;
    private Producto producto;

    @BeforeEach
    void setUp() {
        categoria = new Categoria(1L, "Tecnología", "Artículos de computación y celulares");
        producto = new Producto(1L, "Laptop Gamer", "Potente procesador y tarjeta gráfica",
                BigDecimal.valueOf(3500.00), 10, "laptop.jpg", categoria, true);
    }

    @Test
    @DisplayName("Debe listar productos públicos activos con paginación")
    void listarPublico_exitoso() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Producto> paginaSimulada = new PageImpl<>(List.of(producto), pageable, 1);

        when(productoRepository.buscarActivosConFiltros(isNull(), isNull(), isNull(), isNull(), isNull(), eq(pageable)))
                .thenReturn(paginaSimulada);

        PaginaResponse<ProductoResponse> resultado = productoService.listarPublico(null, null, null, null, null, pageable);

        assertNotNull(resultado);
        assertEquals(1, resultado.getTotalElementos());
        assertEquals(1, resultado.getContenido().size());
        assertEquals("Laptop Gamer", resultado.getContenido().get(0).getNombre());
        verify(productoRepository, times(1)).buscarActivosConFiltros(isNull(), isNull(), isNull(), isNull(), isNull(), eq(pageable));
    }

    @Test
    @DisplayName("Debe obtener producto por ID cuando está activo")
    void obtenerPorIdPublico_existente() {
        when(productoRepository.findByIdAndActivoTrue(1L)).thenReturn(Optional.of(producto));

        ProductoResponse resultado = productoService.obtenerPorIdPublico(1L);

        assertNotNull(resultado);
        assertEquals(1L, resultado.getId());
        assertEquals("Laptop Gamer", resultado.getNombre());
        assertEquals("Tecnología", resultado.getCategoriaNombre());
        verify(productoRepository, times(1)).findByIdAndActivoTrue(1L);
    }

    @Test
    @DisplayName("Debe lanzar RecursoNoEncontradoException cuando el producto no existe o está inactivo")
    void obtenerPorIdPublico_noExiste() {
        when(productoRepository.findByIdAndActivoTrue(99L)).thenReturn(Optional.empty());

        assertThrows(RecursoNoEncontradoException.class, () -> productoService.obtenerPorIdPublico(99L));
        verify(productoRepository, times(1)).findByIdAndActivoTrue(99L);
    }

    @Test
    @DisplayName("Debe crear un producto correctamente si la categoría existe")
    void crear_exitoso() {
        ProductoRequest request = new ProductoRequest(
                "Teclado Mecánico", "Switches rojos",
                BigDecimal.valueOf(150.00), 25, "teclado.jpg", 1L
        );

        when(categoriaRepository.findById(1L)).thenReturn(Optional.of(categoria));
        when(productoRepository.save(any(Producto.class))).thenAnswer(invocation -> {
            Producto guardado = invocation.getArgument(0);
            guardado.setId(2L);
            return guardado;
        });

        ProductoResponse resultado = productoService.crear(request);

        assertNotNull(resultado);
        assertEquals(2L, resultado.getId());
        assertEquals("Teclado Mecánico", resultado.getNombre());
        assertTrue(resultado.isActivo());
        verify(categoriaRepository, times(1)).findById(1L);
        verify(productoRepository, times(1)).save(any(Producto.class));
    }

    @Test
    @DisplayName("Debe lanzar excepción al crear producto con categoría inexistente")
    void crear_categoriaNoExiste() {
        ProductoRequest request = new ProductoRequest(
                "Teclado", "Desc", BigDecimal.valueOf(100), 5, "img.jpg", 999L
        );

        when(categoriaRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(RecursoNoEncontradoException.class, () -> productoService.crear(request));
        verify(productoRepository, never()).save(any(Producto.class));
    }

    @Test
    @DisplayName("Debe guardar precio de oferta válido con etiqueta OFERTA")
    void crear_ofertaValida() {
        ProductoRequest request = new ProductoRequest(
                "Mouse Gamer", "RGB",
                BigDecimal.valueOf(100.00), 10, "mouse.jpg", 1L
        );
        request.setEtiqueta("OFERTA");
        request.setPrecioOferta(BigDecimal.valueOf(79.90));

        when(categoriaRepository.findById(1L)).thenReturn(Optional.of(categoria));
        when(productoRepository.save(any(Producto.class))).thenAnswer(invocation -> {
            Producto guardado = invocation.getArgument(0);
            guardado.setId(3L);
            return guardado;
        });

        ProductoResponse resultado = productoService.crear(request);

        assertNotNull(resultado);
        assertEquals("OFERTA", resultado.getEtiqueta());
        assertEquals(0, BigDecimal.valueOf(79.90).compareTo(resultado.getPrecioOferta()));
    }

    @Test
    @DisplayName("Debe rechazar OFERTA sin precio de oferta o mayor al base")
    void crear_ofertaInvalida() {
        ProductoRequest sinPrecio = new ProductoRequest(
                "Mouse", "Desc", BigDecimal.valueOf(100), 5, "img.jpg", 1L
        );
        sinPrecio.setEtiqueta("OFERTA");
        when(categoriaRepository.findById(1L)).thenReturn(Optional.of(categoria));
        assertThrows(BadRequestException.class, () -> productoService.crear(sinPrecio));

        ProductoRequest mayorAlBase = new ProductoRequest(
                "Mouse", "Desc", BigDecimal.valueOf(100), 5, "img.jpg", 1L
        );
        mayorAlBase.setEtiqueta("OFERTA");
        mayorAlBase.setPrecioOferta(BigDecimal.valueOf(120));
        assertThrows(BadRequestException.class, () -> productoService.crear(mayorAlBase));
        verify(productoRepository, never()).save(any(Producto.class));
    }

    @Test
    @DisplayName("Debe reemplazar imágenes sin duplicar al actualizar")
    void actualizar_reemplazaImagenes() {
        producto.agregarImagen("vieja.jpg", 0);
        ProductoRequest request = new ProductoRequest(
                "Laptop Gamer", "Desc", BigDecimal.valueOf(3500.00), 10, "nueva.jpg", 1L
        );

        when(productoRepository.findById(1L)).thenReturn(Optional.of(producto));
        when(categoriaRepository.findById(1L)).thenReturn(Optional.of(categoria));
        when(productoRepository.save(any(Producto.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProductoResponse resultado = productoService.actualizar(1L, request);

        assertNotNull(resultado);
        verify(productoRepository, times(1)).saveAndFlush(producto);
        assertEquals(1, producto.getImagenes().size());
        assertEquals("nueva.jpg", producto.getImagenes().get(0).getUrl());
    }

    @Test
    @DisplayName("Debe realizar soft-delete (activo = false) al eliminar producto")    void eliminar_softDelete() {
        when(productoRepository.findById(1L)).thenReturn(Optional.of(producto));
        when(productoRepository.save(any(Producto.class))).thenReturn(producto);

        productoService.eliminar(1L);

        assertFalse(producto.isActivo());
        verify(productoRepository, times(1)).findById(1L);
        verify(productoRepository, times(1)).save(producto);
    }
}
