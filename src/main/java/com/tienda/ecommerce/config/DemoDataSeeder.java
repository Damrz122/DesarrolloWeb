package com.tienda.ecommerce.config;

import com.tienda.ecommerce.carrito.Carrito;
import com.tienda.ecommerce.carrito.CarritoRepository;
import com.tienda.ecommerce.carrito.ItemCarrito;
import com.tienda.ecommerce.chat.ChatMensaje;
import com.tienda.ecommerce.chat.ConversacionChat;
import com.tienda.ecommerce.chat.ConversacionChatRepository;
import com.tienda.ecommerce.envio.Envio;
import com.tienda.ecommerce.envio.EstadoEnvio;
import com.tienda.ecommerce.pago.EstadoPago;
import com.tienda.ecommerce.pago.Pago;
import com.tienda.ecommerce.pedido.DetallePedido;
import com.tienda.ecommerce.pedido.EstadoPedido;
import com.tienda.ecommerce.pedido.Pedido;
import com.tienda.ecommerce.pedido.PedidoRepository;
import com.tienda.ecommerce.producto.Categoria;
import com.tienda.ecommerce.producto.CategoriaRepository;
import com.tienda.ecommerce.producto.Producto;
import com.tienda.ecommerce.producto.ProductoRepository;
import com.tienda.ecommerce.usuario.Rol;
import com.tienda.ecommerce.usuario.TipoDocumento;
import com.tienda.ecommerce.usuario.Usuario;
import com.tienda.ecommerce.usuario.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;

/**
     * Datos demo para exposición (50 usuarios activos, sabor Perú).
 * Se ejecuta solo en perfil distinto de "test" y se auto-omite si la BD
 * ya fue sembrada (no duplica al reiniciar).
 */
@Component
@Profile("!test")
@ConditionalOnProperty(name = "app.demo-seed.enabled", havingValue = "true", matchIfMissing = true)
@Order(2)
public class DemoDataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final UsuarioRepository usuarioRepository;
    private final CategoriaRepository categoriaRepository;
    private final ProductoRepository productoRepository;
    private final CarritoRepository carritoRepository;
    private final PedidoRepository pedidoRepository;
    private final ConversacionChatRepository conversacionChatRepository;
    private final PasswordEncoder passwordEncoder;
    private final String demoUserPassword;

    private final int targetClientes;
    private final int targetAdmins;
    private final int targetProductos;
    private final int targetCarritos;
    private final int targetPedidos;
    private final int targetConversaciones;

    public DemoDataSeeder(
            UsuarioRepository usuarioRepository,
            CategoriaRepository categoriaRepository,
            ProductoRepository productoRepository,
            CarritoRepository carritoRepository,
            PedidoRepository pedidoRepository,
            ConversacionChatRepository conversacionChatRepository,
            PasswordEncoder passwordEncoder,
            @Value("${DEMO_USER_PASSWORD:}") String demoUserPassword,
            @Value("${app.demo-seed.clientes:43}") int targetClientes,
            @Value("${app.demo-seed.admins:5}") int targetAdmins,
            @Value("${app.demo-seed.productos:200}") int targetProductos,
            @Value("${app.demo-seed.carritos:150}") int targetCarritos,
            @Value("${app.demo-seed.pedidos:200}") int targetPedidos,
            @Value("${app.demo-seed.conversaciones:40}") int targetConversaciones) {
        this.usuarioRepository = usuarioRepository;
        this.categoriaRepository = categoriaRepository;
        this.productoRepository = productoRepository;
        this.carritoRepository = carritoRepository;
        this.pedidoRepository = pedidoRepository;
        this.conversacionChatRepository = conversacionChatRepository;
        this.passwordEncoder = passwordEncoder;
        this.demoUserPassword = demoUserPassword;
        this.targetClientes = targetClientes;
        this.targetAdmins = targetAdmins;
        this.targetProductos = targetProductos;
        this.targetCarritos = targetCarritos;
        this.targetPedidos = targetPedidos;
        this.targetConversaciones = targetConversaciones;
    }

    @Override
    public void run(String... args) {
        if (usuarioRepository.count() >= 50) {
            log.info("DemoDataSeeder: BD ya sembrada ({} usuarios), se omite.", usuarioRepository.count());
            return;
        }
        log.info("DemoDataSeeder: sembrando datos demo...");
        if (demoUserPassword.isBlank()) {
            throw new IllegalStateException("Define DEMO_USER_PASSWORD para crear usuarios demo");
        }
        Random random = new Random(42);

        List<Usuario> clientes = sembrarUsuarios(random);
        List<Usuario> admins = sembrarAdmins();
        Map<String, Categoria> categorias = sembrarCategorias();
        List<Producto> productos = sembrarProductos(categorias, random);
        sembrarCarritos(clientes, productos, random);
        sembrarPedidos(clientes, productos, random);
        sembrarChat(clientes, admins, random);

        log.info("DemoDataSeeder: listo. usuarios={} productos={} pedidos={}",
                usuarioRepository.count(), productoRepository.count(), pedidoRepository.count());
    }

    // ---------------- usuarios ----------------

    private List<Usuario> sembrarUsuarios(Random random) {
        String hash = passwordEncoder.encode(demoUserPassword);
        List<Usuario> nuevos = new ArrayList<>();
        for (int i = 1; i <= targetClientes; i++) {
            nuevos.add(new Usuario(null,
                    NOMBRES[random.nextInt(NOMBRES.length)],
                    APELLIDOS[random.nextInt(APELLIDOS.length)],
                    APELLIDOS[random.nextInt(APELLIDOS.length)],
                    TipoDocumento.DNI,
                    String.format("%08d", 71000000 + i),
                    String.format("cliente%03d@demo.pe", i), hash, Rol.CLIENTE, true));
        }
        return usuarioRepository.saveAll(nuevos);
    }

    private List<Usuario> sembrarAdmins() {
        String hash = passwordEncoder.encode(demoUserPassword);
        List<Usuario> nuevos = new ArrayList<>();
        for (int i = 1; i <= targetAdmins; i++) {
            nuevos.add(new Usuario(null,
                    NOMBRES[(i * 7) % NOMBRES.length], "Soporte", "Demo",
                    TipoDocumento.DNI,
                    String.format("%08d", 72000000 + i),
                    String.format("soporte%d@demo.pe", i), hash, Rol.ADMIN, true));
        }
        return usuarioRepository.saveAll(nuevos);
    }

    // ---------------- categorías y productos ----------------

    private Map<String, Categoria> sembrarCategorias() {
        Map<String, Categoria> mapa = new HashMap<>();
        for (Categoria c : categoriaRepository.findAll()) {
            mapa.put(c.getNombre(), c);
        }
        List<Categoria> nuevas = new ArrayList<>();
        for (CatDef def : CATALOGO) {
            if (!mapa.containsKey(def.nombre())) {
                nuevas.add(new Categoria(null, def.nombre(), def.descripcion()));
            }
        }
        for (Categoria c : categoriaRepository.saveAll(nuevas)) {
            mapa.put(c.getNombre(), c);
        }
        return mapa;
    }

    private List<Producto> sembrarProductos(Map<String, Categoria> categorias, Random random) {
        List<Producto> nuevos = new ArrayList<>();
        int base = targetProductos / CATALOGO.length;
        int resto = targetProductos - base * CATALOGO.length;
        for (int ci = 0; ci < CATALOGO.length; ci++) {
            CatDef def = CATALOGO[ci];
            Categoria categoria = categorias.get(def.nombre());
            int cantidad = base + (ci < resto ? 1 : 0);
            for (int k = 0; k < cantidad; k++) {
                String nombreBase = def.bases()[k % def.bases().length];
                String sufijo = SUFIJOS[(k / def.bases().length) % SUFIJOS.length];
                int gen = k / (def.bases().length * SUFIJOS.length);
                String nombre = nombreBase + sufijo + (gen > 0 ? " Gen" + (gen + 1) : "");
                double precio = def.precioMin() + random.nextDouble() * (def.precioMax() - def.precioMin());
                String[] imgs = IMAGENES_POR_CATEGORIA.getOrDefault(def.nombre(), IMAGENES_POR_CATEGORIA.get("Laptops y Computadoras"));
                String url = imgs[k % imgs.length];
                Producto p = new Producto(null, nombre,
                        nombreBase.trim() + ", garantía 12 meses, envío a todo el Perú.",
                        BigDecimal.valueOf(precio).setScale(2, RoundingMode.HALF_UP),
                        300 + random.nextInt(401), url, categoria, true);
                p.agregarImagen(url, 0);
                nuevos.add(p);
            }
        }
        return productoRepository.saveAll(nuevos);
    }

    // ---------------- carritos ----------------

    private void sembrarCarritos(List<Usuario> clientes, List<Producto> productos, Random random) {
        List<Carrito> carritos = new ArrayList<>();
        int n = Math.min(targetCarritos, clientes.size());
        for (int i = 0; i < n; i++) {
            Carrito carrito = new Carrito(null, clientes.get(i));
            Set<Long> usados = new HashSet<>();
            int items = 1 + random.nextInt(3);
            for (int j = 0; j < items; j++) {
                Producto p = productos.get(random.nextInt(productos.size()));
                if (usados.add(p.getId())) {
                    carrito.agregarItem(new ItemCarrito(null, carrito, p, 1 + random.nextInt(3)));
                }
            }
            carritos.add(carrito);
        }
        carritoRepository.saveAll(carritos);
    }

    // ---------------- pedidos (venta) ----------------

    private void sembrarPedidos(List<Usuario> clientes, List<Producto> productos, Random random) {
        List<Pedido> pedidos = new ArrayList<>();
        for (int i = 0; i < targetPedidos; i++) {
            Usuario cliente = clientes.get(i % clientes.size());
            EstadoPedido estado = sortearEstado(random);
            LocalDateTime fecha = LocalDateTime.now()
                    .minusDays(random.nextInt(90))
                    .withHour(random.nextInt(24)).withMinute(random.nextInt(60)).withSecond(0).withNano(0);

            Pedido pedido = new Pedido();
            pedido.setUsuario(cliente);
            pedido.setEstado(estado);
            pedido.setDireccionEnvio(direccionAleatoria(random));
            pedido.setTelefono(telefonoAleatorio(random));
            pedido.setFecha(fecha);

            BigDecimal total = BigDecimal.ZERO;
            Set<Long> usados = new HashSet<>();
            int detalles = 2 + random.nextInt(3);
            for (int j = 0; j < detalles; j++) {
                Producto p = productos.get(random.nextInt(productos.size()));
                if (!usados.add(p.getId())) {
                    continue;
                }
                int cantidad = 1 + random.nextInt(3);
                if (p.getStock() < cantidad) {
                    cantidad = Math.max(1, p.getStock());
                }
                p.setStock(p.getStock() - cantidad);
                DetallePedido detalle = new DetallePedido();
                detalle.setPedido(pedido);
                detalle.setProducto(p);
                detalle.setCantidad(cantidad);
                detalle.setPrecioUnitario(p.getPrecioVigente());
                pedido.getDetalles().add(detalle);
                total = total.add(p.getPrecioVigente().multiply(BigDecimal.valueOf(cantidad)));
            }
            pedido.setTotal(total);

            String[] metodos = {"TARJETA_CREDITO", "YAPE", "PLIN", "TRANSFERENCIA_BANCARIA", "PAGO_CONTRAENTREGA"};
            String metodo = metodos[random.nextInt(metodos.length)];
            String procesamiento = "PAGO_CONTRAENTREGA".equals(metodo) ? "CONTRA_ENTREGA"
                    : ("TARJETA_CREDITO".equals(metodo) ? "SIMULADO" : "VERIFICACION_MANUAL");
            EstadoPago estadoPago = estado == EstadoPedido.CANCELADO ? EstadoPago.RECHAZADO
                    : estado == EstadoPedido.PENDIENTE ? EstadoPago.PENDIENTE : EstadoPago.APROBADO;
            Pago pago = new Pago(pedido, metodo, procesamiento, estadoPago, total,
                    String.format("TX-DEMO-%06d", i + 1));
            if ("YAPE".equals(metodo) || "PLIN".equals(metodo)) {
                pago.setReferenciaComprobante("OP-" + (100000 + random.nextInt(900000)));
            }
            pago.setFechaPago(fecha.plusMinutes(5 + random.nextInt(115)));
            pedido.setPago(pago);

            if (estado != EstadoPedido.CANCELADO) {
                Envio envio = new Envio(pedido, pedido.getDireccionEnvio(), "Electronix Express Logistics");
                envio.setNumeroGuia(String.format("GUIA-DEMO-%06d", i + 1));
                envio.setEstadoEnvio(switch (estado) {
                    case ENTREGADO -> EstadoEnvio.ENTREGADO;
                    case ENVIADO -> random.nextBoolean() ? EstadoEnvio.EN_TRANSITO : EstadoEnvio.EN_DISTRIBUCION;
                    default -> EstadoEnvio.PREPARANDO;
                });
                LocalDateTime despacho = fecha.plusDays(1 + random.nextInt(2));
                if (estado == EstadoPedido.PENDIENTE || estado == EstadoPedido.EN_PROCESO) {
                    envio.setFechaDespacho(null);
                    envio.setFechaEstimadaEntrega(fecha.plusDays(3));
                } else {
                    envio.setFechaDespacho(despacho);
                    envio.setFechaEstimadaEntrega(despacho.plusDays(2));
                    if (estado == EstadoPedido.ENTREGADO) {
                        envio.setFechaEntregaReal(despacho.plusDays(1 + random.nextInt(3)));
                    }
                }
                pedido.setEnvio(envio);
            }
            pedidos.add(pedido);
        }
        productoRepository.saveAll(productos);
        pedidoRepository.saveAll(pedidos);
    }

    private EstadoPedido sortearEstado(Random random) {
        int r = random.nextInt(100);
        if (r < 60) return EstadoPedido.ENTREGADO;
        if (r < 80) return EstadoPedido.ENVIADO;
        if (r < 90) return random.nextBoolean() ? EstadoPedido.EN_PROCESO : EstadoPedido.PENDIENTE;
        return EstadoPedido.CANCELADO;
    }

    // ---------------- chat ----------------

    private void sembrarChat(List<Usuario> clientes, List<Usuario> admins, Random random) {
        List<ConversacionChat> conversaciones = new ArrayList<>();
        int mensajesTotales = 0;
        int porConversacion = Math.max(1, 200 / Math.max(1, targetConversaciones));
        for (int i = 0; i < targetConversaciones; i++) {
            Usuario cliente = clientes.get(random.nextInt(clientes.size()));
            Usuario admin = admins.get(random.nextInt(admins.size()));
            int r = random.nextInt(100);
            String estado = r < 50 ? "ACTIVA" : r < 80 ? "CERRADA" : "ARCHIVADA";
            ConversacionChat conv = new ConversacionChat(null, cliente, admin, estado);
            conv.setFechaCreacion(LocalDateTime.now().minusDays(random.nextInt(30)));
            int n = 3 + random.nextInt(porConversacion);
            for (int m = 0; m < n; m++) {
                boolean delCliente = m % 2 == 0;
                String contenido = delCliente
                        ? (m == 0 ? PREGUNTAS[random.nextInt(PREGUNTAS.length)]
                                : RESPUESTAS_CLI[random.nextInt(RESPUESTAS_CLI.length)])
                        : RESPUESTAS_ADMIN[random.nextInt(RESPUESTAS_ADMIN.length)];
                ChatMensaje mensaje = new ChatMensaje(null, conv,
                        delCliente ? cliente : admin, contenido);
                mensaje.setFechaEnvio(conv.getFechaCreacion().plusMinutes((long) m * (5 + random.nextInt(50))));
                conv.agregarMensaje(mensaje);
                mensajesTotales++;
            }
            conversaciones.add(conv);
        }
        conversacionChatRepository.saveAll(conversaciones);
        log.info("DemoDataSeeder: {} conversaciones, {} mensajes.", conversaciones.size(), mensajesTotales);
    }

    // ---------------- datos ----------------

    private String direccionAleatoria(Random random) {
        return CALLES[random.nextInt(CALLES.length)] + " " + (100 + random.nextInt(1900)) + ", "
                + DISTRITOS[random.nextInt(DISTRITOS.length)] + ", Lima";
    }

    private String telefonoAleatorio(Random random) {
        StringBuilder sb = new StringBuilder("9");
        for (int i = 0; i < 8; i++) {
            sb.append(random.nextInt(10));
        }
        return sb.toString();
    }

    private record CatDef(String nombre, String descripcion, double precioMin, double precioMax, String[] bases) {
    }

    private static final String[] NOMBRES = {"Juan", "María", "Pedro", "Rosa", "Luis", "Carmen", "Miguel",
            "Lucía", "Jorge", "Ana", "Carlos", "Elena", "Diego", "Sofía", "Andrés", "Valeria", "Fernando",
            "Camila", "Ricardo", "Daniela", "Raúl", "Patricia", "Hugo", "Gabriela", "Óscar", "Natalia",
            "Pablo", "Alejandra", "Marco", "Fiorella"};

    private static final String[] APELLIDOS = {"Quispe", "Huamán", "Flores", "Rojas", "Torres", "Vargas",
            "Castillo", "Ramos", "Mendoza", "Aguilar", "Salazar", "Paredes", "Gutiérrez", "Chávez", "Ríos",
            "Morales", "Ortega", "Navarro", "Cárdenas", "Ponce", "Velásquez", "Campos", "Reyes", "Fuentes",
            "Cortez", "Luna", "Delgado", "Soto", "Vega", "Toribio"};

    private static final String[] DISTRITOS = {"Miraflores", "San Isidro", "Surco", "La Molina", "Callao",
            "Los Olivos", "San Juan de Lurigancho", "Villa El Salvador", "Pueblo Libre", "Jesús María",
            "Lince", "San Miguel", "Barranco", "Chorrillos", "Independencia"};

    private static final String[] CALLES = {"Av. Larco", "Av. Arequipa", "Jr. de la Unión", "Av. Brasil",
            "Av. Universitaria", "Calle Schell", "Av. Benavides", "Av. La Marina", "Av. Colonial",
            "Av. Tacna", "Av. Javier Prado", "Av. La Paz"};

    private static final String[] SUFIJOS = {"", " Pro", " Max", " Lite", " 2024", " Plus", " Gamer"};

    private static final String U = "?w=600&auto=format&fit=crop&q=80";

    /** 3 fotos reales verificadas (HTTP 200) por categoría. */
    private static final java.util.Map<String, String[]> IMAGENES_POR_CATEGORIA = java.util.Map.ofEntries(
            java.util.Map.entry("Laptops y Computadoras", new String[]{
                    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853" + U,
                    "https://images.unsplash.com/photo-1517336714731-489689fd1ca8" + U,
                    "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2" + U}),
            java.util.Map.entry("Smartphones", new String[]{
                    "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9" + U,
                    "https://images.unsplash.com/photo-1592750475338-74b7b21085ab" + U,
                    "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf" + U}),
            java.util.Map.entry("Audio y Sonido", new String[]{
                    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e" + U,
                    "https://images.unsplash.com/photo-1583394838336-acd977736f90" + U,
                    "https://images.unsplash.com/photo-1590658268037-6bf12165a8df" + U}),
            java.util.Map.entry("Periféricos", new String[]{
                    "https://images.unsplash.com/photo-1587829741301-dc798b83add3" + U,
                    "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46" + U,
                    "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef" + U}),
            java.util.Map.entry("Monitores", new String[]{
                    "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf" + U,
                    "https://images.unsplash.com/photo-1547394765-185e1e68f34e" + U,
                    "https://images.unsplash.com/photo-1585792180666-f7347c490ee2" + U}),
            java.util.Map.entry("Tablets", new String[]{
                    "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0" + U,
                    "https://images.unsplash.com/photo-1561154464-82e9adf32764" + U,
                    "https://images.unsplash.com/photo-1585790050230-5dd28404ccb9" + U}),
            java.util.Map.entry("Gaming y Consolas", new String[]{
                    "https://images.unsplash.com/photo-1552820728-8b83bb6b773f" + U,
                    "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8" + U,
                    "https://images.unsplash.com/photo-1606813907291-d86efa9b94db" + U}),
            java.util.Map.entry("Componentes PC", new String[]{
                    "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea" + U,
                    "https://images.unsplash.com/photo-1591488320449-011701bb6704" + U,
                    "https://images.unsplash.com/photo-1555617981-dac3880eac6e" + U}),
            java.util.Map.entry("Almacenamiento", new String[]{
                    "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b" + U,
                    "https://images.unsplash.com/photo-1597852074816-d933c7d2b988" + U,
                    "https://images.unsplash.com/photo-1618410320928-25228d811631" + U}),
            java.util.Map.entry("Redes y Conectividad", new String[]{
                    "https://images.unsplash.com/photo-1558494949-ef010cbdcc31" + U,
                    "https://images.unsplash.com/photo-1606904825846-647eb07f5be2" + U,
                    "https://images.unsplash.com/photo-1600267175161-cfaa711b4a81" + U}),
            java.util.Map.entry("Cámaras y Drones", new String[]{
                    "https://images.unsplash.com/photo-1516035069371-29a1b244cc32" + U,
                    "https://images.unsplash.com/photo-1502920917128-1aa500764cbd" + U,
                    "https://images.unsplash.com/photo-1473968512647-3e447244af8f" + U}),
            java.util.Map.entry("Hogar Inteligente", new String[]{
                    "https://images.unsplash.com/photo-1543512214-318c7553f230" + U,
                    "https://images.unsplash.com/photo-1512446816042-444d641267d4" + U,
                    "https://images.unsplash.com/photo-1558089687-f282ffcbc126" + U}),
            java.util.Map.entry("Accesorios Móviles", new String[]{
                    "https://images.unsplash.com/photo-1580910051074-3eb694886505" + U,
                    "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb" + U,
                    "https://images.unsplash.com/photo-1616348436168-de43ad0db179" + U}),
            java.util.Map.entry("Impresoras", new String[]{
                    "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6" + U,
                    "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9" + U,
                    "https://images.unsplash.com/photo-1611244419377-b0a760c19719" + U}),
            java.util.Map.entry("Software", new String[]{
                    "https://images.unsplash.com/photo-1550439062-609e1531270e" + U,
                    "https://images.unsplash.com/photo-1517180102446-f3ece451e9d8" + U,
                    "https://images.unsplash.com/photo-1461749280684-dccba630e2f6" + U})
    );

    private static final CatDef[] CATALOGO = {
            new CatDef("Laptops y Computadoras", "Laptops ultraligeras, gamers y estaciones de trabajo",
                    2500, 9500, new String[]{"Laptop Lenovo ThinkPad E14", "Laptop HP Pavilion 15",
                            "Laptop Asus VivoBook 16", "Laptop Acer Nitro 5 Gamer", "Laptop Apple MacBook Air M2",
                            "Laptop Dell Inspiron 14", "Laptop MSI Katana GF66"}),
            new CatDef("Smartphones", "Teléfonos móviles de última generación y accesorios",
                    600, 5500, new String[]{"Celular Samsung Galaxy A54", "Celular Xiaomi Redmi Note 13",
                            "Celular Motorola Moto G84", "Celular iPhone 13", "Celular Honor Magic5 Lite",
                            "Celular Realme 11 Pro", "Celular Oppo Reno 10"}),
            new CatDef("Audio y Sonido", "Audífonos inalámbricos, parlantes y micrófonos",
                    99, 1500, new String[]{"Audífonos Sony WH-CH520", "Parlante JBL Flip 6",
                            "Audífonos Xiaomi Buds 4", "Micrófono HyperX SoloCast", "Parlante Bose SoundLink",
                            "Audífonos Logitech G435", "Barra de sonido LG S40T"}),
            new CatDef("Periféricos", "Teclados mecánicos, ratones gamer y alfombrillas",
                    49, 800, new String[]{"Teclado Logitech K380", "Mouse Genius DX-120",
                            "Teclado Redragon Kumara K552", "Mouse Logitech G203", "Alfombrilla Razer Gigantus",
                            "Webcam Logitech C920", "Hub USB Ugreen 4 puertos"}),
            new CatDef("Monitores", "Monitores gamer 144Hz y pantallas para productividad",
                    500, 2200, new String[]{"Monitor Samsung Odyssey G3 24", "Monitor LG UltraGear 24",
                            "Monitor Dell P2422H 24", "Monitor Gigabyte GS27Q 27", "Monitor Asus TUF VG249Q",
                            "Monitor Lenovo L24i-30", "Monitor AOC 24B2XH"}),
            new CatDef("Tablets", "Tablets Android y iPad para estudio y trabajo",
                    500, 3000, new String[]{"Tablet Samsung Galaxy Tab A9", "Tablet Lenovo Tab M11",
                            "Tablet Xiaomi Pad 6", "Tablet Apple iPad 10ma gen", "Tablet Honor Pad X9",
                            "Tablet TCL Tab 11", "Tablet Huawei MatePad SE"}),
            new CatDef("Gaming y Consolas", "Consolas, mandos y accesorios gamer",
                    200, 3500, new String[]{"Mando Xbox Series inalámbrico", "Consola Nintendo Switch OLED",
                            "Mando PS5 DualSense", "Silla gamer Ergo Pro", "Volante Logitech G29",
                            "Consola Steam Deck 512GB", "Audífonos HyperX Cloud II"}),
            new CatDef("Componentes PC", "Procesadores, tarjetas de video, memorias y placas",
                    150, 2500, new String[]{"Procesador Ryzen 5 5600", "Tarjeta RTX 4060 8GB",
                            "Memoria Kingston 16GB DDR4", "SSD Kingston NV2 1TB", "Placa MSI B550M",
                            "Fuente EVGA 650W Bronze", "Procesador Intel i5-12400F"}),
            new CatDef("Almacenamiento", "Discos externos, SSD portátiles y memorias USB",
                    80, 900, new String[]{"Disco externo Seagate 1TB", "SSD externo Samsung T7 500GB",
                            "USB Kingston 128GB", "Memoria microSD Samsung 256GB", "Disco WD Blue 2TB",
                            "Case HDD Orico USB-C", "NAS Synology DS223j"}),
            new CatDef("Redes y Conectividad", "Routers, repetidores y cableado de red",
                    70, 700, new String[]{"Router TP-Link Archer AX23", "Repetidor Xiaomi AX1500",
                            "Switch TP-Link 8 puertos", "Cable UTP Cat6 20m", "Adaptador WiFi USB TP-Link",
                            "Router Asus RT-AX53U", "Access Point Ubiquiti U6 Lite"}),
            new CatDef("Cámaras y Drones", "Cámaras mirrorless, deportivas y drones",
                    400, 4500, new String[]{"Cámara Canon EOS R50", "Dron DJI Mini 4K",
                            "Cámara GoPro Hero 12", "Cámara Sony ZV-1F", "Dron DJI Avata 2",
                            "Trípode Manfrotto Compact", "Cámara Nikon Z30"}),
            new CatDef("Hogar Inteligente", "Asistentes, focos y cámaras de seguridad WiFi",
                    60, 900, new String[]{"Foco inteligente Xiaomi pack x2", "Asistente Echo Dot 5ta",
                            "Cámara seguridad Tapo C200", "Enchufe inteligente Broadlink",
                            "Aspiradora robot Xiaomi S10", "Chromecast Google TV", "Sensor puerta Aqara"}),
            new CatDef("Accesorios Móviles", "Cargadores, cables, fundas y power banks",
                    20, 300, new String[]{"Cargador Ugreen 65W GaN", "Cable USB-C trenzado 2m",
                            "Funda iPhone 15 silicona", "Mica vidrio templado pack x3", "Soporte celular auto",
                            "Power bank Anker 20000mAh", "Cargador inalámbrico Belkin"}),
            new CatDef("Impresoras", "Impresoras láser, tinta continua y térmicas",
                    300, 1800, new String[]{"Impresora HP Smart Tank 580", "Impresora Epson EcoTank L3250",
                            "Impresora Canon Pixma G3110", "Impresora Brother HL-1212W",
                            "Multifuncional Epson L6270", "Impresora térmica Xprinter", "Escáner Epson DS-1630"}),
            new CatDef("Software", "Licencias originales y suscripciones",
                    50, 1200, new String[]{"Licencia Office 2021 Hogar", "Antivirus Kaspersky Plus 1 año",
                            "Licencia Windows 11 Pro", "Adobe Creative Cloud 1 mes", "AutoCAD LT 1 año",
                            "Antivirus Eset Nod32 3 equipos", "Licencia CorelDRAW 2024"})
    };

    private static final String[] PREGUNTAS = {"Hola, ¿cuánto demora el envío a provincia?",
            "¿El producto tiene garantía?", "¿Aceptan Yape?", "¿Tienen stock del producto?",
            "Hice mi pedido ayer, ¿cuándo llega?", "¿Puedo cambiar la dirección de entrega?",
            "¿La laptop incluye mochila de regalo?", "¿Emiten factura?", "¿El precio incluye IGV?",
            "Mi pago sale pendiente, ¿qué hago?", "¿Hacen envíos a Arequipa?", "¿Puedo recoger en tienda?"};

    private static final String[] RESPUESTAS_ADMIN = {"Hola, con gusto te ayudo. El envío a Lima es 24-48h y a provincia 3-5 días.",
            "Sí, todos los productos tienen 12 meses de garantía.", "Claro, aceptamos Yape, Plin y tarjetas.",
            "Déjame verificar el stock y te confirmo enseguida.", "Tu pedido ya está en camino, te comparto el número de guía.",
            "Listo, actualicé la dirección de entrega.", "Sí, emitimos boleta y factura.",
            "El pago con Yape puede tardar unos minutos en confirmarse."};

    private static final String[] RESPUESTAS_CLI = {"Perfecto, gracias.", "Genial, quedo atento.",
            "¿Me confirmas cuando lo envíen?", "Entendido, muchas gracias.", "Listo, hago el pago ahora.",
            "Excelente servicio, gracias."};
}
