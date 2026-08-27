# Entregable APF1 — API REST de Catálogo de Productos y Categorías

Este documento describe la especificación y ejemplos de consumo de los endpoints desarrollados en el primer incremento (APF1) para el catálogo público y administrativo.

---

## 1. Endpoints Públicos de Categorías

### Listar todas las categorías
- **Método:** `GET`
- **Ruta:** `/api/categorias`
- **Respuesta (200 OK):**
```json
{
  "exito": true,
  "mensaje": "Categorías obtenidas correctamente",
  "datos": [
    {
      "id": 1,
      "nombre": "Laptops y Computadoras",
      "descripcion": "Laptops ultraligeras, gamers y estaciones de trabajo"
    },
    {
      "id": 2,
      "nombre": "Smartphones",
      "descripcion": "Teléfonos móviles de última generación y accesorios"
    }
  ],
  "timestamp": "2026-08-26T19:40:00"
}
```

---

## 2. Endpoints Públicos de Productos (Catálogo)

### Listar catálogo con filtros y paginación
- **Método:** `GET`
- **Ruta:** `/api/productos?nombre=&categoriaId=&precioMin=&precioMax=&page=0&size=12&sortBy=fechaCreacion&direction=desc`
- **Parámetros query (opcionales):**
  - `nombre`: Filtro por coincidencia parcial en nombre (ej. `MacBook`).
  - `categoriaId`: Filtro por ID de categoría (ej. `1`).
  - `precioMin`: Precio mínimo (ej. `1000.00`).
  - `precioMax`: Precio máximo (ej. `5000.00`).
  - `page`: Número de página (inicio en 0).
  - `size`: Tamaño de página (por defecto 12).
  - `sortBy`: Campo de ordenamiento (ej. `precio`, `nombre`, `fechaCreacion`).
  - `direction`: Dirección (`asc` o `desc`).
- **Respuesta (200 OK):**
```json
{
  "exito": true,
  "mensaje": "Catálogo de productos obtenido",
  "datos": {
    "contenido": [
      {
        "id": 1,
        "nombre": "MacBook Pro 14\" M3",
        "descripcion": "Chip M3 Pro, 18GB RAM, 512GB SSD. Color Gris Espacial.",
        "precio": 7999.00,
        "stock": 8,
        "imagenUrl": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8...",
        "categoriaId": 1,
        "categoriaNombre": "Laptops y Computadoras",
        "activo": true,
        "fechaCreacion": "2026-08-26T19:42:00"
      }
    ],
    "pagina": 0,
    "tamano": 12,
    "totalElementos": 10,
    "totalPaginas": 1,
    "ultima": true
  },
  "timestamp": "2026-08-26T19:42:10"
}
```

### Obtener detalle de un producto por ID
- **Método:** `GET`
- **Ruta:** `/api/productos/{id}`
- **Respuesta (200 OK):**
```json
{
  "exito": true,
  "mensaje": "Detalle del producto",
  "datos": {
    "id": 1,
    "nombre": "MacBook Pro 14\" M3",
    "descripcion": "Chip M3 Pro, 18GB RAM, 512GB SSD. Color Gris Espacial.",
    "precio": 7999.00,
    "stock": 8,
    "imagenUrl": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8...",
    "categoriaId": 1,
    "categoriaNombre": "Laptops y Computadoras",
    "activo": true,
    "fechaCreacion": "2026-08-26T19:42:00"
  },
  "timestamp": "2026-08-26T19:42:15"
}
```

---

## 3. Endpoints Administrativos (Requiere ROLE_ADMIN)

- `POST /api/categorias`: Crear nueva categoría
- `PUT /api/categorias/{id}`: Modificar categoría existente
- `DELETE /api/categorias/{id}`: Eliminar categoría
- `GET /api/productos/admin`: Listar todos los productos incluyendo inactivos
- `POST /api/productos`: Crear nuevo producto con stock y precio
- `PUT /api/productos/{id}`: Actualizar datos de producto
- `DELETE /api/productos/{id}`: Desactivación lógica (*soft delete*)
