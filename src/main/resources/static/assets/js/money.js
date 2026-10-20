// Una única fuente para locale y precisión. No mantiene configuración entre recargas.
const monedas = new Map();
try {
    const r = await fetch('/api/monedas', { cache: 'no-store' });
    if (r.ok) for (const m of (await r.json()).datos || []) monedas.set(m.codigo, m);
} catch { /* Intl conserva el formato ISO si el catálogo no está disponible. */ }
export function formatoMoneda(valor, codigo = 'PEN') {
    const c = codigo || 'PEN', m = monedas.get(c);
    try {
        return new Intl.NumberFormat(m?.locale || 'es-PE', {
            style: 'currency', currency: c, currencyDisplay: 'code',
            ...(m ? { minimumFractionDigits: m.decimales, maximumFractionDigits: m.decimales } : {})
        }).format(valor);
    } catch { return `${c} ${Number(valor).toFixed(2)}`; }
}
export function catalogoMonedas() { return [...monedas.values()]; }
