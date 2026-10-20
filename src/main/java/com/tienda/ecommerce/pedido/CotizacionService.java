package com.tienda.ecommerce.pedido;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tienda.ecommerce.config.JwtProperties;
import com.tienda.ecommerce.carrito.Carrito;
import com.tienda.ecommerce.carrito.CarritoRepository;
import com.tienda.ecommerce.common.BadRequestException;
import com.tienda.ecommerce.configuracion.MonetarioService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import javax.crypto.SecretKey;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;

@Service
public class CotizacionService {
    public record Linea(Long productoId, String nombre, int cantidad, BigDecimal precioOriginal,
                        String monedaOriginal, BigDecimal tasa, BigDecimal precioBaseUnitario,
                        BigDecimal impuestoPorcentaje, BigDecimal impuestoUnitario, BigDecimal impuestoMonto,
                        BigDecimal precioUnitario, BigDecimal subtotal) {}
    public record Datos(String id, Long usuarioId, String huella, String monedaCodigo, BigDecimal total,
                        BigDecimal tasaPen, BigDecimal totalBasePen, List<Linea> items) {}
    public record Respuesta(String token, Datos datos, Instant venceEn) {}
    private final CarritoRepository carritos;
    private final MonetarioService dinero;
    private final ObjectMapper json;
    private final SecretKey clave;
    public CotizacionService(CarritoRepository carritos, MonetarioService dinero, ObjectMapper json, JwtProperties jwt) {
        this.carritos = carritos; this.dinero = dinero; this.json = json;
        try { clave = Keys.hmacShaKeyFor(MessageDigest.getInstance("SHA-256").digest(
                (jwt.getSecret() + ":checkout-quote-v1").getBytes(StandardCharsets.UTF_8))); }
        catch (Exception e) { throw new IllegalStateException(e); }
    }
    @Transactional(readOnly = true)
    public Respuesta generar(Long usuarioId, String codigo) {
        String moneda = dinero.activa(codigo).getCodigo();
        Carrito carrito = carritos.findByUsuarioIdConItems(usuarioId).orElseThrow(() -> new BadRequestException("Tu carrito está vacío"));
        if (carrito.getItems().isEmpty()) throw new BadRequestException("Tu carrito está vacío");
        List<Linea> lineas = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        for (var item : carrito.getItems()) {
            var p = item.getProducto();
            if (!p.isActivo()) throw new BadRequestException("Producto no disponible: " + p.getNombre());
            BigDecimal tasa = dinero.tasa(p.getMonedaCodigo(), moneda);
            BigDecimal precioBase = dinero.redondear(p.getPrecioVigente().multiply(tasa), moneda);
            BigDecimal impuestoPorcentaje = p.getImpuestoPorcentaje() == null ? BigDecimal.ZERO : p.getImpuestoPorcentaje();
            BigDecimal impuestoUnitario = dinero.redondear(precioBase.multiply(impuestoPorcentaje).movePointLeft(2), moneda);
            BigDecimal precio = precioBase.add(impuestoUnitario);
            BigDecimal impuestoMonto = impuestoUnitario.multiply(BigDecimal.valueOf(item.getCantidad()));
            BigDecimal sub = precio.multiply(BigDecimal.valueOf(item.getCantidad()));
            total = total.add(sub);
            lineas.add(new Linea(p.getId(), p.getNombre(), item.getCantidad(), p.getPrecioVigente(), p.getMonedaCodigo(), tasa,
                    precioBase, impuestoPorcentaje, impuestoUnitario, impuestoMonto, precio, sub));
        }
        BigDecimal tasaPen = dinero.tasa(moneda, "PEN");
        Datos datos = new Datos(UUID.randomUUID().toString(), usuarioId, huella(carrito), moneda, total,
                tasaPen, dinero.redondear(total.multiply(tasaPen), "PEN"), lineas);
        Instant vence = Instant.now().plusSeconds(300);
        try {
            String token = Jwts.builder().subject("checkout").claim("cotizacion", json.writeValueAsString(datos))
                    .expiration(Date.from(vence)).signWith(clave).compact();
            return new Respuesta(token, datos, vence);
        } catch (Exception e) { throw new IllegalStateException(e); }
    }
    public Datos verificar(String token, Long usuarioId, Carrito carrito) {
        try {
            var claims = Jwts.parser().verifyWith(clave).build().parseSignedClaims(token).getPayload();
            Datos datos = json.readValue(claims.get("cotizacion", String.class), Datos.class);
            if (!"checkout".equals(claims.getSubject()) || !usuarioId.equals(datos.usuarioId()) || !huella(carrito).equals(datos.huella()))
                throw new BadRequestException("El carrito cambió; revisa una nueva cotización");
            dinero.activa(datos.monedaCodigo());
            for (Linea linea : datos.items()) dinero.activa(linea.monedaOriginal());
            return datos;
        } catch (BadRequestException e) { throw e; }
        catch (Exception e) { throw new BadRequestException("La cotización venció o no es válida; actualiza el total"); }
    }
    public String huella(Carrito carrito) {
        try {
            String contenido = carrito.getItems().stream().sorted(Comparator.comparing(i -> i.getProducto().getId()))
                    .map(i -> i.getProducto().getId() + ":" + i.getCantidad() + ":" + i.getProducto().getPrecioVigente().stripTrailingZeros().toPlainString()
                            + ":" + i.getProducto().getMonedaCodigo() + ":" + impuestoHuella(i.getProducto()) + ":" + i.getProducto().isActivo()).reduce("", (a,b) -> a + "|" + b);
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(contenido.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) { throw new IllegalStateException(e); }
    }
    private String impuestoHuella(com.tienda.ecommerce.producto.Producto producto) {
        BigDecimal impuesto = producto.getImpuestoPorcentaje() == null ? BigDecimal.ZERO : producto.getImpuestoPorcentaje();
        return impuesto.stripTrailingZeros().toPlainString();
    }
    public String serializar(Datos datos) {
        try { return json.writeValueAsString(datos); } catch (Exception e) { throw new IllegalStateException(e); }
    }
}
