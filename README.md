# NovaStore — Sistema de Comercio Electrónico

Plataforma web integral de comercio electrónico para pequeños y medianos comercios, desarrollada bajo principios de calidad **SOLID**, **Clean Code**, arquitectura por capas (*package-by-feature*) y empaquetado autónomo en un único artefacto ejecutable (`.jar`).

---

## 1. Stack Tecnológico

| Capa | Tecnología |
|---|---|
| **Backend** | Java 21 LTS, Spring Boot 3.3.4 (Web, Validation, Data JPA, Security, WebSocket) |
| **ORM / Persistencia** | Hibernate 6 + PostgreSQL 16 (con soporte H2 para pruebas automatizadas) |
| **Seguridad** | Stateless JWT (JJWT 0.12.6), contraseñas con hashing BCrypt, control por roles (`ADMIN`, `CLIENTE`) |
| **Tiempo Real** | Spring WebSocket con protocolo STOMP sobre SockJS |
| **Frontend** | HTML5 semántico, CSS3 con Tailwind CSS, JavaScript ES6+ modular |
| **Construcción** | Apache Maven 3.9+ |
| **Contenedores** | Docker Compose (PostgreSQL 16) |

---

## 2. Estructura del Proyecto

```
SISTEMA WEB/
├── docker-compose.yml              # Contenedor PostgreSQL 16 local
├── pom.xml                         # Dependencias Maven y configuración del build
├── API_CATALOGO.md                 # Especificación de endpoints de catálogo (APF1)
├── src/
│   ├── main/
│   │   ├── java/com/tienda/ecommerce/
│   │   │   ├── config/             # SecurityConfig, WebSocketConfig, AppConfig, JwtProperties, DataInitializer
│   │   │   ├── common/             # ApiResponse<T>, GlobalExceptionHandler, PaginaResponse<T>, Excepciones de negocio
│   │   │   ├── auth/               # AuthController, AuthService (+impl), JwtService, JwtAuthFilter, DTOs
│   │   │   ├── usuario/            # Usuario (Entity), Rol (Enum), UsuarioRepository, UsuarioService (+impl), UsuarioController, DTOs
│   │   │   ├── producto/           # Producto, Categoria (Entities), Repositorios, Servicios (+impl), Controllers, DTOs
│   │   │   ├── carrito/            # Carrito, ItemCarrito (Entities), Repositorios, CarritoService (+impl), CarritoController, DTOs
│   │   │   ├── pedido/             # Pedido, DetallePedido (Entities), EstadoPedido (Enum), PedidoService (+impl), PedidoController, DTOs
│   │   │   ├── chat/               # ConversacionChat, ChatMensaje (Entities), Repositorios, ChatService (+impl), ChatWebSocketController, DTOs
│   │   │   └── reporte/            # ReporteVentasService (+impl), ReporteController, DTOs
│   │   └── resources/
│   │       ├── application.yml     # Configuración con perfiles dev y prod
│   │       └── static/             # Frontend completo embebido en el backend
│   │           ├── index.html            # Catálogo interactivo con filtros en vivo
│   │           ├── producto.html         # Ficha técnica y detalle del producto
│   │           ├── carrito.html          # Vista y gestión de ítems del carrito
│   │           ├── checkout.html         # Formulario de despacho y generación de orden
│   │           ├── mis-pedidos.html      # Historial de compras y seguimiento
│   │           ├── login.html            # Inicio de sesión con accesos rápidos de prueba
│   │           ├── registro.html         # Registro de nuevos clientes
│   │           ├── admin/
│   │           │   ├── dashboard.html    # Panel de métricas y resumen general
│   │           │   ├── productos.html    # CRUD e inventario con soft-delete
│   │           │   ├── categorias.html   # Gestión de categorías
│   │           │   ├── pedidos.html      # Gestión logística y cambio de estados
│   │           │   ├── reportes.html     # Reporte de ingresos y alerta de stock bajo
│   │           │   └── chat.html         # Consola de atención al cliente en tiempo real
│   │           └── assets/
│   │               ├── css/              # output.css y tokens visuales
│   │               └── js/               # api.js, auth.js, cart.js, chat.js, ui/
│   └── test/                             # Pruebas unitarias con JUnit 5 + Mockito y de integración con @SpringBootTest
```

---

## 3. Credenciales de Demostración Sembradas

Al iniciar por primera vez, el sistema precarga automáticamente datos iniciales (`DataInitializer`):

| Rol | Email | Contraseña |
|---|---|---|
| **Administrador** | `admin@tienda.com` | `admin123` |
| **Cliente Demo** | `cliente@tienda.com` | `cliente123` |

*(La pantalla `login.html` incluye botones directos para cargar estas credenciales con un solo clic).*

---

## 4. Guía de Ejecución Local

### Paso 1: Levantar la Base de Datos con Docker Compose
```bash
docker compose up -d
```
Esto iniciará un contenedor PostgreSQL 16 en el puerto `5432` con la base de datos `ecommerce`.

### Paso 2: Ejecutar el Backend
```bash
mvn spring-boot:run
```

O ejecutando directamente el archivo `.jar` compilado:
```bash
java -jar target/ecommerce-0.0.1-SNAPSHOT.jar
```

### Paso 3: Abrir la Aplicación en el Navegador
Abre [http://localhost:8080](http://localhost:8080) para acceder al catálogo público.

---

## 5. Ejecución de Pruebas Automatizadas

Para correr toda la suite de pruebas unitarias y de integración:
```bash
mvn clean test
```

Para generar el paquete `.jar` de producción:
```bash
mvn clean package
```

---

## 6. Principales Endpoints de la API REST

### Autenticación
- `POST /api/auth/registro`: Registro de nuevos clientes
- `POST /api/auth/login`: Inicio de sesión (devuelve token JWT)

### Catálogo (Público)
- `GET /api/categorias`: Listado de categorías
- `GET /api/productos`: Catálogo paginado con filtros (`nombre`, `categoriaId`, `precioMin`, `precioMax`, `page`, `size`, `sortBy`)
- `GET /api/productos/{id}`: Detalle de producto

### Carrito de Compras (`CLIENTE`)
- `GET /api/carrito`: Consultar carrito actual
- `POST /api/carrito/items`: Agregar ítem (valida stock disponible)
- `PUT /api/carrito/items/{id}`: Modificar cantidad de un ítem
- `DELETE /api/carrito/items/{id}`: Remover ítem del carrito

### Pedidos
- `POST /api/pedidos`: Crear pedido desde el carrito de forma transaccional (`@Transactional`: descuenta stock, crea detalles y vacía el carrito)
- `GET /api/pedidos/mios`: Historial de pedidos del cliente
- `GET /api/pedidos/{id}`: Detalle del pedido
- `GET /api/pedidos`: Listado administrativo con filtros de estado (`ADMIN`)
- `PATCH /api/pedidos/{id}/estado`: Modificar estado del pedido (`ADMIN`)

### Chat en Tiempo Real (WebSocket STOMP)
- Conexión: `/ws-chat` (SockJS / WebSocket)
- Enviar mensaje: `/app/chat.enviar`
- Suscripción: `/topic/chat/{conversacionId}`
- `GET /api/chat/mi-conversacion`: Obtener conversación activa del cliente
- `GET /api/chat/conversaciones`: Lista de conversaciones activas (`ADMIN`)
- `GET /api/chat/conversaciones/{id}/mensajes`: Historial de mensajes

### Reportes (`ADMIN`)
- `GET /api/reportes/ventas?desde=&hasta=`: Resumen de facturación, ticket promedio, desglose diario y productos con bajo stock

---

## 7. Despliegue en la Nube (Render, Railway, Fly.io)

El proyecto está preparado para desplegarse como un único servicio web utilizando las siguientes variables de entorno:

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto de escucha | `8080` |
| `DB_URL` | URL JDBC de PostgreSQL | `jdbc:postgresql://host:5432/ecommerce` |
| `DB_USER` | Usuario de base de datos | `postgres` |
| `DB_PASSWORD` | Contraseña de base de datos | `secreto` |
| `JWT_SECRET` | Clave secreta HMAC para firmar JWT | `cadena-hex-o-base64-segura-de-256-bits` |
| `JWT_EXPIRATION` | Tiempo de vida del JWT en milisegundos | `86400000` |
| `SPRING_PROFILES_ACTIVE` | Perfil de configuración | `prod` |
