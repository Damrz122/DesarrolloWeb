package com.tienda.ecommerce.sitio;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

// sitio seed: valores iniciales iguales al home actual. Solo siembra si la tabla esta vacia.
@Component
public class SitioSeed implements ApplicationRunner {

    private final SitioConfigRepository sitioConfigRepository;

    public SitioSeed(SitioConfigRepository sitioConfigRepository) {
        this.sitioConfigRepository = sitioConfigRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (sitioConfigRepository.count() > 0) {
            return;
        }
        List<SitioConfig> filas = new ArrayList<>();
        filas.add(new SitioConfig("site.nombre", "ELECTRONIX"));
        filas.add(new SitioConfig("site.logo", "/assets/img/logo.svg"));
        filas.add(new SitioConfig("tema.primario", "#3564C9"));
        filas.add(new SitioConfig("tema.secundario", "#000000"));
        filas.add(new SitioConfig("hero.slides", """
                [{"titulo":"SUPER OFERTAS","subtitulo":"ESPECIALES","imagen":"https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=1400&auto=format&fit=crop&q=80","fondoTipo":"imagen","fondoColor1":"#000000","fondoColor2":"#000000","mostrarTexto":true,"textoBoton":"","linkUrl":"/productos.html?ofertas=true"},{"titulo":"TECNOLOGÍA GAMER","subtitulo":"HASTA 40% OFF","imagen":"https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1400&auto=format&fit=crop&q=80","fondoTipo":"imagen","fondoColor1":"#000000","fondoColor2":"#000000","mostrarTexto":true,"textoBoton":"Ver ofertas","linkUrl":"/productos.html?categoria=Monitores"},{"titulo":"AUDIO Y VIDEO","subtitulo":"ENVÍO GRATIS","imagen":"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1400&auto=format&fit=crop&q=80","fondoTipo":"imagen","fondoColor1":"#000000","fondoColor2":"#000000","mostrarTexto":true,"textoBoton":"","linkUrl":"/productos.html"}]"""));
        filas.add(new SitioConfig("home.cards", """
                [{"titulo":"OFERTAS","descripcion":"¡OFERTAS EN MILES DE PRODUCTOS PARA TI!","icono":"","boton":"MAS INFORMACIÓN","linkUrl":"/productos.html?ofertas=true"},{"titulo":"+ VENDIDOS","descripcion":"PRODUCTOS MAS VENDIDOS EN ESTE MES","icono":"","boton":"MAS INFORMACIÓN","linkUrl":"/productos.html?orden=recientes"},{"titulo":"RECOMENDACIÓN","descripcion":"MEJORES PRODUCTOS RECOMENDADOS","icono":"","boton":"VER","linkUrl":"/productos.html"},{"titulo":"SOPORTE","descripcion":"¿NECESITAS AYUDA?","icono":"","boton":"AYUDA","linkUrl":"/productos.html"},{"titulo":"TIENDAS","descripcion":"NUESTRAS TIENDAS FÍSICAS","icono":"","boton":"VISITAR","linkUrl":"/productos.html"}]"""));
        filas.add(new SitioConfig("home.equipos.titulo", "EQUIPOS ELECTRONICOS"));
        filas.add(new SitioConfig("home.equipos", """
                [{"nombre":"TELEVISORES","descripcion":"Pantallas y monitores gamer","fondo":"https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80","fondoColor":"#111827","producto":"https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&auto=format&fit=crop&q=80","imagen":"https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80","icono":"","cta":"Ver productos","categoria":"Televisores"},{"nombre":"SMARTPHONES","descripcion":"Última generación y accesorios","fondo":"https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80","fondoColor":"#111827","producto":"https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=500&auto=format&fit=crop&q=80","imagen":"https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80","icono":"","cta":"Ver productos","categoria":"Smartphones"},{"nombre":"PORTATILES","descripcion":"Ultralivianas, gamers y trabajo","fondo":"https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop&q=80","fondoColor":"#111827","producto":"https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&auto=format&fit=crop&q=80","imagen":"https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop&q=80","icono":"","cta":"Ver productos","categoria":"Laptops"},{"nombre":"EQUIPO DE SONIDO","descripcion":"Audífonos, parlantes y más","fondo":"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80","fondoColor":"#111827","producto":"https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500&auto=format&fit=crop&q=80","imagen":"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80","icono":"","cta":"Ver productos","categoria":"Audio"},{"nombre":"ACCESORIOS Y PC","descripcion":"Teclados, ratones y componentes","fondo":"https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80","fondoColor":"#111827","producto":"https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&auto=format&fit=crop&q=80","imagen":"https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80","icono":"","cta":"Ver productos","categoria":"Accesorios"}]"""));
        filas.add(new SitioConfig("home.banners", """
                [{"etiqueta":"¡COMPRA AHORA!","titulo":"LO MEJOR EN HARDWARE Y GAMING","descripcion":"Encuentra periféricos y componentes con entrega inmediata y garantía oficial.","boton":"Ver más","linkUrl":"/productos.html","imagen":"https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=900&auto=format&fit=crop&q=80","estilo":"oscuro"},{"etiqueta":"NUEVA COLECCIÓN","titulo":"PORTÁTILES ULTRALIVIANAS","descripcion":"","boton":"Ver productos •","linkUrl":"/productos.html","imagen":"https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=700&auto=format&fit=crop&q=80","estilo":"azul"}]"""));
        filas.add(new SitioConfig("home.spotlight", """
                [{"kicker":"Gaming","titulo":"Noches gamer sin lag","descripcion":"Arma tu setup con monitores 144Hz y periféricos pro.","boton":"Ver colección","linkUrl":"/productos.html?categoria=Monitores","imagen":"https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=900&auto=format&fit=crop&q=80"},{"kicker":"Audio","titulo":"Sonido que te envuelve","descripcion":"Audífonos y parlantes con cancelación de ruido.","boton":"Escuchar ahora","linkUrl":"/productos.html?categoria=Audio%20y%20Sonido","imagen":"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900&auto=format&fit=crop&q=80"},{"kicker":"Móviles","titulo":"Smartphones destacados","descripcion":"Lo último en fotografía móvil y 5G.","boton":"Descubrir","linkUrl":"/productos.html?categoria=Smartphones","imagen":"https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=900&auto=format&fit=crop&q=80"},{"kicker":"Smart Home","titulo":"Tu casa inteligente","descripcion":"Asistentes, focos y cámaras WiFi en un solo lugar.","boton":"Explorar","linkUrl":"/productos.html","imagen":"https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=900&auto=format&fit=crop&q=80"},{"kicker":"Accesorios","titulo":"Potencia tu PC","descripcion":"Teclados, ratones y componentes al mejor precio.","boton":"Ver más","linkUrl":"/productos.html?categoria=Accesorios%20M%C3%B3viles","imagen":"https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=900&auto=format&fit=crop&q=80"},{"kicker":"Cómputo","titulo":"Portátiles para todo","descripcion":"Ultralivianas, gamers y estaciones de trabajo.","boton":"Comprar ahora","linkUrl":"/productos.html?categoria=Laptops%20y%20Computadoras","imagen":"https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=900&auto=format&fit=crop&q=80"}]"""));
        sitioConfigRepository.saveAll(filas);
    }
}
