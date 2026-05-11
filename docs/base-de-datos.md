# Base de datos – eventosSECTEI

Base de datos PostgreSQL gestionada con [Supabase](https://supabase.com).

---

## Tablas

### `eventos`

Registro principal. Contiene **todos** los eventos, independientemente de si son únicos o parte de un programa recurrente.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | `uuid` PK | Generado automáticamente |
| `nombre_serie` | `text` | `null` = evento único; texto = nombre del programa recurrente |
| `nombre` | `text` NOT NULL | Nombre específico del evento o sesión |
| `fecha` | `date` NOT NULL | Fecha de realización |
| `nombre_lugar` | `text` | Nombre del recinto o lugar |
| `calle` | `text` | Calle o avenida del lugar |
| `numero` | `text` | Número exterior |
| `colonia` | `text` | Colonia del lugar |
| `latitud` | `float8` | Coordenada geográfica |
| `longitud` | `float8` | Coordenada geográfica |
| `municipio` | `text` | Alcaldía de la Ciudad de México |
| `tematica` | `text` | Temática o área del evento |
| `ponentes` | `text[]` | Lista de ponentes o invitados |
| `notas` | `text` | Observaciones adicionales |
| `creado_en` | `timestamptz` | Fecha de registro, default `now()` |

**Tipos de evento según `nombre_serie`:**

| Caso | `nombre_serie` | Ejemplo |
|------|---------------|---------|
| Evento único | `null` | Conferencia colaborativa específica |
| Sesión de programa | `'Zócalo de las Ciencias'` | Zócalo de las Ciencias – Edición Mayo 2025 |

> Contar el **total de eventos** siempre es `SELECT COUNT(*) FROM eventos`, sin importar si son únicos o de programa. La columna `nombre_serie` solo sirve para agrupar y filtrar.

---

### `asistencia`

Desglosa los asistentes de cada evento por género, discapacidad y rango de edad. Cada fila representa una combinación única.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | `uuid` PK | Generado automáticamente |
| `evento_id` | `uuid` FK NOT NULL | Referencia a `eventos.id` (CASCADE DELETE) |
| `genero` | `text` CHECK | `'mujer'`, `'hombre'` o `'otro'` |
| `tiene_discapacidad` | `boolean` NOT NULL | `true` / `false` |
| `rango_edad` | `text` CHECK | `'3-5'`, `'6-11'`, `'12-14'`, `'15-17'`, `'18-23'`, `'24-29'`, `'30-64'`, `'65+'` |
| `conteo` | `integer` NOT NULL | Número de asistentes ≥ 0 |
| `creado_en` | `timestamptz` | Fecha de registro, default `now()` |

**Restricción UNIQUE:** `(evento_id, genero, tiene_discapacidad, rango_edad)` — no puede haber dos filas para la misma combinación en el mismo evento.

Solo se insertan filas con `conteo > 0`; los campos vacíos del formulario se omiten.

---

## Diagrama de relaciones

```
eventos                            asistencia
───────────────────────────────    ──────────────────────────
id         ◄─────────────────── evento_id (FK, NOT NULL)
nombre_serie (text, nullable)      genero
nombre                             tiene_discapacidad
fecha                              rango_edad
nombre_lugar                       conteo
calle / numero / colonia           creado_en
latitud / longitud
municipio
tematica
ponentes
notas
creado_en
```

---

## Seguridad (Row Level Security)

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `eventos` | Público (anon) | Autenticado | — | — |
| `asistencia` | Público (anon) | Autenticado | — | — |

- **Lectura pública**: el geovisor y el dashboard consultan datos sin login.
- **Escritura autenticada**: solo usuarios con sesión activa (Supabase Auth) pueden insertar. Las cuentas las gestiona el administrador desde **Authentication → Users** en el Dashboard de Supabase.
- **UPDATE / DELETE**: no habilitados desde la aplicación web. Modificaciones se hacen directamente desde el Dashboard de Supabase.

---

## Consultas útiles

### Total de eventos

```sql
SELECT COUNT(*) AS total_eventos
FROM eventos;
```

### Total de asistentes

```sql
SELECT SUM(conteo) AS total_asistentes
FROM asistencia;
```

### Eventos por alcaldía

```sql
SELECT municipio,
       COUNT(*)       AS num_eventos,
       SUM(a.conteo)  AS total_asistentes
FROM eventos e
LEFT JOIN asistencia a ON a.evento_id = e.id
GROUP BY municipio
ORDER BY total_asistentes DESC NULLS LAST;
```

### Asistentes por género (global)

```sql
SELECT genero,
       SUM(conteo) AS total
FROM asistencia
GROUP BY genero
ORDER BY total DESC;
```

### Asistentes por rango de edad (global)

```sql
SELECT rango_edad,
       SUM(conteo) AS total
FROM asistencia
GROUP BY rango_edad
ORDER BY ARRAY_POSITION(
    ARRAY['3-5','6-11','12-14','15-17','18-23','24-29','30-64','65+'],
    rango_edad
);
```

### Porcentaje de asistentes con discapacidad

```sql
SELECT
    ROUND(100.0 * SUM(conteo) FILTER (WHERE tiene_discapacidad)
          / NULLIF(SUM(conteo), 0), 1) AS pct_con_discapacidad
FROM asistencia;
```

### Eventos de un programa específico

```sql
SELECT e.nombre, e.fecha, e.municipio, SUM(a.conteo) AS asistentes
FROM eventos e
LEFT JOIN asistencia a ON a.evento_id = e.id
WHERE e.nombre_serie = 'Zócalo de las Ciencias'
GROUP BY e.id, e.nombre, e.fecha, e.municipio
ORDER BY e.fecha;
```

### Programas registrados (nombres únicos)

```sql
SELECT nombre_serie, COUNT(*) AS num_sesiones
FROM eventos
WHERE nombre_serie IS NOT NULL
GROUP BY nombre_serie
ORDER BY nombre_serie;
```

### Eventos sin coordenadas (no aparecen en el geovisor)

```sql
SELECT id, nombre, fecha, municipio
FROM eventos
WHERE latitud IS NULL OR longitud IS NULL
ORDER BY fecha DESC;
```

### Resumen por evento (útil para exportar)

```sql
SELECT
    e.fecha,
    e.nombre_serie                                                  AS programa,
    e.nombre,
    e.municipio,
    e.nombre_lugar,
    SUM(a.conteo)                                                   AS total_asistentes,
    SUM(a.conteo) FILTER (WHERE a.genero = 'mujer')                 AS mujeres,
    SUM(a.conteo) FILTER (WHERE a.genero = 'hombre')                AS hombres,
    SUM(a.conteo) FILTER (WHERE a.genero = 'otro')                  AS otro_genero,
    SUM(a.conteo) FILTER (WHERE a.tiene_discapacidad)               AS con_discapacidad,
    SUM(a.conteo) FILTER (WHERE NOT a.tiene_discapacidad)           AS sin_discapacidad
FROM eventos e
LEFT JOIN asistencia a ON a.evento_id = e.id
GROUP BY e.id, e.fecha, e.nombre_serie, e.nombre, e.municipio, e.nombre_lugar
ORDER BY e.fecha DESC;
```
