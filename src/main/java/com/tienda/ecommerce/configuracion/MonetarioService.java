package com.tienda.ecommerce.configuracion;

import com.tienda.ecommerce.common.BadRequestException;
import org.springframework.stereotype.Service;
import java.math.*;
import java.time.LocalDateTime;
import java.util.Locale;

@Service
public class MonetarioService {
    private final MonedaRepository monedas;
    private final TipoCambioRepository tasas;
    public MonetarioService(MonedaRepository monedas, TipoCambioRepository tasas) { this.monedas = monedas; this.tasas = tasas; }
    public Moneda activa(String codigo) {
        String c = codigo == null ? "PEN" : codigo.trim().toUpperCase(Locale.ROOT);
        return monedas.findById(c).filter(Moneda::isActiva).orElseThrow(() -> new BadRequestException("Moneda no disponible: " + c));
    }
    public void validarPrecio(BigDecimal importe, String codigo) {
        Moneda moneda = activa(codigo);
        if (importe == null || importe.signum() < 0 || importe.precision() - importe.scale() > 15)
            throw new BadRequestException("Importe inválido");
        try { importe.setScale(moneda.getDecimales(), RoundingMode.UNNECESSARY); }
        catch (ArithmeticException e) { throw new BadRequestException(codigo + " admite " + moneda.getDecimales() + " decimales"); }
    }
    public BigDecimal redondear(BigDecimal importe, String codigo) { return importe.setScale(activa(codigo).getDecimales(), RoundingMode.HALF_UP); }
    /** Devuelve cuántas unidades de destino equivale una unidad de origen. */
    public BigDecimal tasa(String origen, String destino) {
        activa(origen); activa(destino);
        if (origen.equals(destino)) return BigDecimal.ONE;
        BigDecimal directa = directaOInversa(origen, destino);
        if (directa != null) return directa;
        if (!origen.equals("PEN") && !destino.equals("PEN")) {
            BigDecimal a = directaOInversa(origen, "PEN"), b = directaOInversa("PEN", destino);
            if (a != null && b != null) return a.multiply(b, MathContext.DECIMAL128);
        }
        throw new BadRequestException("Falta una cotización vigente de " + origen + " a " + destino);
    }
    private BigDecimal directaOInversa(String a, String b) {
        LocalDateTime ahora = LocalDateTime.now();
        var directa = tasas.findFirstByMonedaOrigenAndMonedaDestinoAndActivoTrueAndVigenteDesdeLessThanEqualOrderByVigenteDesdeDescIdDesc(a,b,ahora);
        if (directa.isPresent()) return directa.get().getTasa();
        return tasas.findFirstByMonedaOrigenAndMonedaDestinoAndActivoTrueAndVigenteDesdeLessThanEqualOrderByVigenteDesdeDescIdDesc(b,a,ahora)
                .map(t -> BigDecimal.ONE.divide(t.getTasa(), MathContext.DECIMAL128)).orElse(null);
    }
}
