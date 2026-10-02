package com.tienda.ecommerce.sitio;

import java.util.Map;

public interface SitioService {
    Map<String, String> obtenerTodo();

    Map<String, String> guardarTodo(Map<String, String> cambios);
}
