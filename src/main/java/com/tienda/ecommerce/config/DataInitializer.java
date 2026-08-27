package com.tienda.ecommerce.config;

import com.tienda.ecommerce.producto.Categoria;
import com.tienda.ecommerce.producto.CategoriaRepository;
import com.tienda.ecommerce.producto.Producto;
import com.tienda.ecommerce.producto.ProductoRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    private final CategoriaRepository categoriaRepository;
    private final ProductoRepository productoRepository;

    public DataInitializer(CategoriaRepository categoriaRepository, ProductoRepository productoRepository) {
        this.categoriaRepository = categoriaRepository;
        this.productoRepository = productoRepository;
    }

    @Override
    public void run(String... args) {
        if (categoriaRepository.count() == 0) {
            Categoria catLaptops = categoriaRepository.save(new Categoria(null, "Laptops y Computadoras", "Laptops ultraligeras, gamers y estaciones de trabajo"));
            Categoria catPhones = categoriaRepository.save(new Categoria(null, "Smartphones", "Teléfonos móviles de última generación y accesorios"));
            Categoria catAudio = categoriaRepository.save(new Categoria(null, "Audio y Sonido", "Audífonos inalámbricos, parlantes y micrófonos"));
            Categoria catPerifericos = categoriaRepository.save(new Categoria(null, "Periféricos", "Teclados mecánicos, ratones gamer y alfombrillas"));
            Categoria catMonitores = categoriaRepository.save(new Categoria(null, "Monitores", "Monitores gamer 144Hz y pantallas para productividad"));

            List<Producto> productosIniciales = List.of(
                    new Producto(null, "MacBook Pro 14\" M3", "Chip M3 Pro, 18GB RAM, 512GB SSD. Color Gris Espacial.",
                            new BigDecimal("7999.00"), 8, "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80", catLaptops, true),

                    new Producto(null, "ASUS ROG Zephyrus G16", "Intel Core Ultra 9, RTX 4070, 32GB RAM, Pantalla OLED 240Hz.",
                            new BigDecimal("6899.00"), 5, "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600&auto=format&fit=crop&q=80", catLaptops, true),

                    new Producto(null, "iPhone 15 Pro Max 256GB", "Acabado en titanio natural, cámara de 48 MP y chip A17 Pro.",
                            new BigDecimal("4999.00"), 12, "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80", catPhones, true),

                    new Producto(null, "Samsung Galaxy S24 Ultra", "Galaxy AI, pantalla AMOLED 2X de 6.8\", 12GB RAM y S-Pen incluido.",
                            new BigDecimal("4599.00"), 10, "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&auto=format&fit=crop&q=80", catPhones, true),

                    new Producto(null, "Sony WH-1000XM5", "Cancelación de ruido líder en la industria, audio Hi-Res y 30h de batería.",
                            new BigDecimal("1299.00"), 20, "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80", catAudio, true),

                    new Producto(null, "AirPods Pro 2da Gen", "Audio adaptativo, cancelación activa de ruido y estuche MagSafe USB-C.",
                            new BigDecimal("949.00"), 15, "https://images.unsplash.com/photo-1588423771073-b8903fbb85b5?w=600&auto=format&fit=crop&q=80", catAudio, true),

                    new Producto(null, "Teclado Keychron Q1 Pro", "Mecánico inalámbrico custom, switches Red, chasis de aluminio CNC.",
                            new BigDecimal("699.00"), 14, "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80", catPerifericos, true),

                    new Producto(null, "Mouse Logitech G Pro X Superlight 2", "Sensor HERO 2, switches híbridos LIGHTFORCE, 60 gramos de peso.",
                            new BigDecimal("499.00"), 18, "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&auto=format&fit=crop&q=80", catPerifericos, true),

                    new Producto(null, "Monitor Dell UltraSharp 27\" 4K", "Panel IPS Black, 98% DCI-P3, hub USB-C con carga de 90W.",
                            new BigDecimal("1899.00"), 7, "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80", catMonitores, true),

                    new Producto(null, "Monitor LG UltraGear 27\" QHD 240Hz", "Nano IPS, 1ms GtG, compatible con G-Sync y FreeSync Premium Pro.",
                            new BigDecimal("1499.00"), 4, "https://images.unsplash.com/photo-1547082299-de196ea013d6?w=600&auto=format&fit=crop&q=80", catMonitores, true)
            );

            productoRepository.saveAll(productosIniciales);
        }
    }
}
