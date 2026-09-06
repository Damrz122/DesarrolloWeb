-- ============================================================
-- V3: imágenes acordes a la categoría de cada producto.
-- Reasigna producto_imagenes.url según la categoría (ciclo de 3
-- fotos reales por categoría) y sincroniza la portada
-- productos.imagen_url con la imagen de orden = 0.
-- Idempotente: re-ejecutar produce el mismo resultado.
-- ============================================================

WITH ranked AS (
    SELECT pi.id AS img_id,
           c.nombre AS cat,
           ROW_NUMBER() OVER (PARTITION BY p.categoria_id ORDER BY p.id) AS rn
    FROM producto_imagenes pi
    JOIN productos p ON p.id = pi.producto_id
    JOIN categorias c ON c.id = p.categoria_id
)
UPDATE producto_imagenes pi
SET url = CASE r.cat
    WHEN 'Laptops y Computadoras' THEN (ARRAY[
        'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=600&auto=format&fit=crop&q=80'])[(r.rn - 1) % 3 + 1]
    WHEN 'Smartphones' THEN (ARRAY[
        'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&auto=format&fit=crop&q=80'])[(r.rn - 1) % 3 + 1]
    WHEN 'Audio y Sonido' THEN (ARRAY[
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80'])[(r.rn - 1) % 3 + 1]
    WHEN 'Periféricos' THEN (ARRAY[
        'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=600&auto=format&fit=crop&q=80'])[(r.rn - 1) % 3 + 1]
    WHEN 'Monitores' THEN (ARRAY[
        'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=600&auto=format&fit=crop&q=80'])[(r.rn - 1) % 3 + 1]
    WHEN 'Tablets' THEN (ARRAY[
        'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?w=600&auto=format&fit=crop&q=80'])[(r.rn - 1) % 3 + 1]
    WHEN 'Gaming y Consolas' THEN (ARRAY[
        'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600&auto=format&fit=crop&q=80'])[(r.rn - 1) % 3 + 1]
    WHEN 'Componentes PC' THEN (ARRAY[
        'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1555617981-dac3880eac6e?w=600&auto=format&fit=crop&q=80'])[(r.rn - 1) % 3 + 1]
    WHEN 'Almacenamiento' THEN (ARRAY[
        'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1597852074816-d933c7d2b988?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1618410320928-25228d811631?w=600&auto=format&fit=crop&q=80'])[(r.rn - 1) % 3 + 1]
    WHEN 'Redes y Conectividad' THEN (ARRAY[
        'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1600267175161-cfaa711b4a81?w=600&auto=format&fit=crop&q=80'])[(r.rn - 1) % 3 + 1]
    WHEN 'Cámaras y Drones' THEN (ARRAY[
        'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=600&auto=format&fit=crop&q=80'])[(r.rn - 1) % 3 + 1]
    WHEN 'Hogar Inteligente' THEN (ARRAY[
        'https://images.unsplash.com/photo-1543512214-318c7553f230?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1512446816042-444d641267d4?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1558089687-f282ffcbc126?w=600&auto=format&fit=crop&q=80'])[(r.rn - 1) % 3 + 1]
    WHEN 'Accesorios Móviles' THEN (ARRAY[
        'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1616348436168-de43ad0db179?w=600&auto=format&fit=crop&q=80'])[(r.rn - 1) % 3 + 1]
    WHEN 'Impresoras' THEN (ARRAY[
        'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1611244419377-b0a760c19719?w=600&auto=format&fit=crop&q=80'])[(r.rn - 1) % 3 + 1]
    WHEN 'Software' THEN (ARRAY[
        'https://images.unsplash.com/photo-1550439062-609e1531270e?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600&auto=format&fit=crop&q=80'])[(r.rn - 1) % 3 + 1]
    ELSE pi.url
END
FROM ranked r
WHERE pi.id = r.img_id;

-- Sincroniza la portada con la imagen de orden = 0
UPDATE productos p
SET imagen_url = x.url
FROM (
    SELECT DISTINCT ON (producto_id) producto_id, url
    FROM producto_imagenes
    ORDER BY producto_id, orden, id
) x
WHERE x.producto_id = p.id;
