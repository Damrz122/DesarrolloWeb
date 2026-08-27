package com.tienda.ecommerce.producto;

import com.tienda.ecommerce.common.BadRequestException;
import com.tienda.ecommerce.common.RecursoNoEncontradoException;
import com.tienda.ecommerce.producto.dto.CategoriaRequest;
import com.tienda.ecommerce.producto.dto.CategoriaResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CategoriaServiceImpl implements CategoriaService {

    private final CategoriaRepository categoriaRepository;

    public CategoriaServiceImpl(CategoriaRepository categoriaRepository) {
        this.categoriaRepository = categoriaRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoriaResponse> listarTodas() {
        return categoriaRepository.findAll().stream()
                .map(this::mapearADto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CategoriaResponse obtenerPorId(Long id) {
        Categoria categoria = categoriaRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Categoría no encontrada con id: " + id));
        return mapearADto(categoria);
    }

    @Override
    @Transactional
    public CategoriaResponse crear(CategoriaRequest request) {
        if (categoriaRepository.existsByNombreIgnoreCase(request.getNombre().trim())) {
            throw new BadRequestException("Ya existe una categoría con el nombre: " + request.getNombre());
        }
        Categoria categoria = new Categoria();
        categoria.setNombre(request.getNombre().trim());
        categoria.setDescripcion(request.getDescripcion());
        Categoria guardada = categoriaRepository.save(categoria);
        return mapearADto(guardada);
    }

    @Override
    @Transactional
    public CategoriaResponse actualizar(Long id, CategoriaRequest request) {
        Categoria categoria = categoriaRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Categoría no encontrada con id: " + id));

        String nuevoNombre = request.getNombre().trim();
        if (!categoria.getNombre().equalsIgnoreCase(nuevoNombre) && categoriaRepository.existsByNombreIgnoreCase(nuevoNombre)) {
            throw new BadRequestException("Ya existe otra categoría con el nombre: " + nuevoNombre);
        }

        categoria.setNombre(nuevoNombre);
        categoria.setDescripcion(request.getDescripcion());
        Categoria actualizada = categoriaRepository.save(categoria);
        return mapearADto(actualizada);
    }

    @Override
    @Transactional
    public void eliminar(Long id) {
        if (!categoriaRepository.existsById(id)) {
            throw new RecursoNoEncontradoException("Categoría no encontrada con id: " + id);
        }
        categoriaRepository.deleteById(id);
    }

    private CategoriaResponse mapearADto(Categoria c) {
        return new CategoriaResponse(c.getId(), c.getNombre(), c.getDescripcion());
    }
}
