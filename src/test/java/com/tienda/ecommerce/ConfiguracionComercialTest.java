package com.tienda.ecommerce;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tienda.ecommerce.auth.JwtService;
import com.tienda.ecommerce.carrito.*;
import com.tienda.ecommerce.carrito.dto.ItemCarritoRequest;
import com.tienda.ecommerce.common.BadRequestException;
import com.tienda.ecommerce.configuracion.*;
import com.tienda.ecommerce.pago.*;
import com.tienda.ecommerce.pedido.*;
import com.tienda.ecommerce.pedido.dto.CrearPedidoRequest;
import com.tienda.ecommerce.producto.*;
import com.tienda.ecommerce.usuario.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class ConfiguracionComercialTest {
    @Autowired MonedaRepository monedas;
    @Autowired TipoCambioRepository tasas;
    @Autowired RolConfigRepository roles;
    @Autowired UsuarioRepository usuarios;
    @Autowired ProductoRepository productos;
    @Autowired CategoriaRepository categorias;
    @Autowired MetodoPagoConfigRepository metodos;
    @Autowired FormularioPagoService formularios;
    @Autowired CarritoService carritos;
    @Autowired CotizacionService cotizaciones;
    @Autowired PedidoService pedidos;
    @Autowired PedidoRepository pedidoRepository;
    @Autowired JwtService jwt;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    static final AtomicInteger secuencia = new AtomicInteger(900000);

    Usuario usuario(Rol rol) {
        int n=secuencia.incrementAndGet();
        return usuarios.saveAndFlush(new Usuario(null,"Prueba","Comercial",null,TipoDocumento.DNI,
                String.format("%08d",n),"test"+n+"@example.com","hash-no-utilizado",rol,true));
    }
    Producto producto(String moneda, String precio) {
        Producto p=new Producto(null,"Producto "+secuencia.incrementAndGet(),"Prueba",new BigDecimal(precio),20,null,categorias.findAll().get(0),true);
        p.setMonedaCodigo(moneda);return productos.saveAndFlush(p);
    }
    void tasa(String origen, String destino, String tasa) {
        TipoCambio t=new TipoCambio();t.setMonedaOrigen(origen);t.setMonedaDestino(destino);t.setTasa(new BigDecimal(tasa));t.setVigenteDesde(LocalDateTime.now().minusMinutes(1));tasas.saveAndFlush(t);
    }
    CrearPedidoRequest request(Usuario u, String moneda, String metodo) {
        var q=cotizaciones.generar(u.getId(),moneda);
        CrearPedidoRequest r=new CrearPedidoRequest("Dirección de prueba 123","987654321");r.setMetodoPago(metodo);r.setCotizacionToken(q.token());
        r.setVersionMetodo(formularios.version(metodos.findById(metodo).orElseThrow()));r.setDatosPago(Map.of());return r;
    }
    @Test void convierteCarritoMixtoSinSumarMonedasCrudas() {
        Usuario u=usuario(Rol.CLIENTE);tasa("USD","PEN","3.60");
        carritos.agregarItem(u.getId(),new ItemCarritoRequest(producto("PEN","360").getId(),1));
        carritos.agregarItem(u.getId(),new ItemCarritoRequest(producto("USD","25").getId(),1));
        var q=cotizaciones.generar(u.getId(),"USD");
        assertEquals(0,new BigDecimal("125").compareTo(q.datos().total()));
        assertEquals(0,new BigDecimal("450").compareTo(q.datos().totalBasePen()));
    }
    @Test void pedidoCongelaImporteMonedaYNombreDelMetodo() {
        Usuario u=usuario(Rol.CLIENTE);tasa("USD","PEN","3.60");Producto p=producto("USD","12.50");
        carritos.agregarItem(u.getId(),new ItemCarritoRequest(p.getId(),1));
        var respuesta=pedidos.crearDesdeCarrito(u.getId(),request(u,"USD","TARJETA_CREDITO"));
        assertEquals("USD",respuesta.getMonedaCodigo());assertEquals(0,new BigDecimal("45").compareTo(respuesta.getTotalBasePen()));
        var entidad=pedidoRepository.findById(respuesta.getId()).orElseThrow();String nombre=entidad.getPago().getMetodoNombre();
        var m=metodos.findById("TARJETA_CREDITO").orElseThrow();m.setNombre("Otro nombre");metodos.saveAndFlush(m);
        assertEquals(nombre,entidad.getPago().getMetodoNombre());assertEquals("USD",entidad.getDetalles().get(0).getMonedaOriginal());
        assertTrue(carritos.obtenerCarrito(u.getId()).getItems().isEmpty());
    }
    @Test void rechazaCambioDePrecioDespuesDeCotizar() {
        Usuario u=usuario(Rol.CLIENTE);Producto p=producto("PEN","100");carritos.agregarItem(u.getId(),new ItemCarritoRequest(p.getId(),1));
        var r=request(u,"PEN","TARJETA_CREDITO");p.setPrecio(new BigDecimal("110"));productos.saveAndFlush(p);
        assertThrows(BadRequestException.class,()->pedidos.crearDesdeCarrito(u.getId(),r));assertEquals(20,p.getStock());
    }
    @Test void rechazaMetodoIncompatibleAunqueSeEnvieDirectamente() {
        Usuario u=usuario(Rol.CLIENTE);tasa("USD","PEN","3.60");Producto p=producto("USD","10");carritos.agregarItem(u.getId(),new ItemCarritoRequest(p.getId(),1));
        var m=metodos.findById("YAPE").orElseThrow();m.setMonedas(Set.of("PEN"));metodos.saveAndFlush(m);
        var r=request(u,"USD","YAPE");r.setReferenciaComprobante("OP123456");
        assertThrows(BadRequestException.class,()->pedidos.crearDesdeCarrito(u.getId(),r));assertEquals(20,p.getStock());
    }
    @Test void camposDeMetodoNuevoSonObligatoriosEnServidor() {
        Usuario u=usuario(Rol.CLIENTE);Producto p=producto("PEN","10");carritos.agregarItem(u.getId(),new ItemCarritoRequest(p.getId(),1));
        var m=new MetodoPagoConfig();m.setCodigo("BANCO_PRUEBA");m.setNombre("Banco prueba");m.setProcesamiento("VERIFICACION_MANUAL");m.setIcono("PAGO");m.setPrefijoTransaccion("BP-");m.setMonedas(Set.of("PEN"));
        m.setFormularioJson("[{\"clave\":\"operacion\",\"etiqueta\":\"Operación\",\"tipo\":\"text\",\"obligatorio\":true,\"maxLongitud\":20}]");metodos.saveAndFlush(m);
        var r=request(u,"PEN","BANCO_PRUEBA");
        assertThrows(BadRequestException.class,()->pedidos.crearDesdeCarrito(u.getId(),r));assertEquals(20,p.getStock());
    }
    @Test void faltaDeCotizacionNoInventaUnaTasa() {
        Usuario u=usuario(Rol.CLIENTE);carritos.agregarItem(u.getId(),new ItemCarritoRequest(producto("USD","10").getId(),1));
        assertThrows(BadRequestException.class,()->cotizaciones.generar(u.getId(),"USD"));
    }
    @Test void tokensAlteradosNoGeneranPedidos() {
        Usuario u=usuario(Rol.CLIENTE);Producto p=producto("PEN","10");carritos.agregarItem(u.getId(),new ItemCarritoRequest(p.getId(),1));
        var r=request(u,"PEN","TARJETA_CREDITO");r.setCotizacionToken(r.getCotizacionToken()+"a");
        assertThrows(BadRequestException.class,()->pedidos.crearDesdeCarrito(u.getId(),r));assertEquals(20,p.getStock());
    }
    @Test void rolDinamicoAplicaPermisosVigentesSinReemitirToken() throws Exception {
        RolConfig rol=new RolConfig();rol.setCodigo("ALMACENERO");rol.setNombre("Almacenero");rol.setPermisos(Set.of("ADMIN_ACCESO","PRODUCTOS_VER","INVENTARIO_GESTIONAR"));roles.saveAndFlush(rol);
        Usuario u=usuario(Rol.valueOf("ALMACENERO"));String token=jwt.generarToken(u);
        mvc.perform(get("/api/productos/admin").header("Authorization","Bearer "+token)).andExpect(status().isOk());
        mvc.perform(get("/api/usuarios").header("Authorization","Bearer "+token)).andExpect(status().isForbidden());
        rol.getPermisos().clear();roles.saveAndFlush(rol);
        mvc.perform(get("/api/productos/admin").header("Authorization","Bearer "+token)).andExpect(status().isForbidden());
        u.setActivo(false);usuarios.saveAndFlush(u);
        mvc.perform(get("/api/usuarios/me").header("Authorization","Bearer "+token)).andExpect(status().is4xxClientError());
    }
    @Test void apiConfiguracionNoPermiteClientesYExigeAsociarMonedas() throws Exception {
        Usuario cliente=usuario(Rol.CLIENTE),admin=usuario(Rol.ADMIN);
        mvc.perform(get("/api/admin/configuracion/roles").header("Authorization","Bearer "+jwt.generarToken(cliente))).andExpect(status().isForbidden());
        var body=Map.of("codigo","BANCO_API","nombre","Banco API","procesamiento","VERIFICACION_MANUAL","prefijoTransaccion","TX-","icono","PAGO","monedas",List.of("PEN"),"formularioJson","[]");
        mvc.perform(post("/api/admin/configuracion/metodos-pago").header("Authorization","Bearer "+jwt.generarToken(admin)).contentType("application/json").content(json.writeValueAsString(body))).andExpect(status().isOk());
        mvc.perform(get("/api/pagos/metodos?moneda=PEN")).andExpect(status().isOk()).andExpect(jsonPath("$.datos[?(@.codigo == 'BANCO_API')]").isNotEmpty());
        mvc.perform(get("/api/pagos/metodos?moneda=USD")).andExpect(status().isOk()).andExpect(jsonPath("$.datos[?(@.codigo == 'BANCO_API')]").isEmpty());
    }
}
