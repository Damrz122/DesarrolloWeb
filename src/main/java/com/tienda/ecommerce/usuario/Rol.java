package com.tienda.ecommerce.usuario;

/** Código de catálogo, no enum cerrado. Las constantes mantienen compatibilidad. */
public final class Rol {
    public static final Rol ADMIN = new Rol("ADMIN");
    public static final Rol CLIENTE = new Rol("CLIENTE");
    private final String codigo;
    private Rol(String codigo) { this.codigo = codigo; }
    @com.fasterxml.jackson.annotation.JsonCreator
    public static Rol valueOf(String valor) {
        String codigo = valor == null ? "" : valor.trim().toUpperCase(java.util.Locale.ROOT);
        if (!codigo.matches("[A-Z][A-Z0-9_]{1,39}")) throw new IllegalArgumentException("Código de rol inválido");
        return codigo.equals("ADMIN") ? ADMIN : codigo.equals("CLIENTE") ? CLIENTE : new Rol(codigo);
    }
    @com.fasterxml.jackson.annotation.JsonValue public String name() { return codigo; }
    @Override public String toString() { return codigo; }
    @Override public boolean equals(Object otro) { return otro instanceof Rol r && codigo.equals(r.codigo); }
    @Override public int hashCode() { return codigo.hashCode(); }
}
