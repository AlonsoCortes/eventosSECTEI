-- =============================================================
-- Schema: eventosSECTEI
-- Ejecutar en el SQL Editor de Supabase
-- =============================================================

-- Extensión necesaria para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- -------------------------------------------------------------
-- Tabla: eventos
-- Cada instancia concreta de evento (único o parte de un programa)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS eventos (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_serie TEXT,                  -- NULL = evento único; texto = programa recurrente
    nombre       TEXT NOT NULL,         -- Nombre específico de esta edición / sesión
    fecha        DATE NOT NULL,
    nombre_lugar TEXT,
    calle        TEXT,
    numero       TEXT,
    colonia      TEXT,
    latitud      FLOAT8,
    longitud     FLOAT8,
    municipio    TEXT,
    tematica     TEXT,
    ponentes     TEXT[],
    notas        TEXT,
    creado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eventos_fecha        ON eventos(fecha);
CREATE INDEX IF NOT EXISTS idx_eventos_nombre_serie ON eventos(nombre_serie);


-- -------------------------------------------------------------
-- Tabla: asistencia
-- Conteo de asistentes por género, discapacidad y rango etario
-- Cada fila representa una combinación única para un evento
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS asistencia (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_id          UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    genero             TEXT NOT NULL CHECK (genero IN ('mujer', 'hombre', 'otro')),
    tiene_discapacidad BOOLEAN NOT NULL,
    rango_edad         TEXT NOT NULL CHECK (rango_edad IN (
                           '3-5', '6-11', '12-14', '15-17',
                           '18-23', '24-29', '30-64', '65+'
                       )),
    conteo             INTEGER NOT NULL CHECK (conteo >= 0),
    creado_en          TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Evitar duplicados: una fila por combinación de evento + género + discapacidad + edad
    UNIQUE (evento_id, genero, tiene_discapacidad, rango_edad)
);

CREATE INDEX IF NOT EXISTS idx_asistencia_evento_id ON asistencia(evento_id);


-- =============================================================
-- Row Level Security (RLS)
-- =============================================================

ALTER TABLE eventos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencia ENABLE ROW LEVEL SECURITY;

-- Lectura pública (anon key puede leer)
CREATE POLICY "Lectura pública eventos"
    ON eventos FOR SELECT
    USING (true);

CREATE POLICY "Lectura pública asistencia"
    ON asistencia FOR SELECT
    USING (true);

-- Escritura para usuarios autenticados con Supabase Auth
-- Los correos/contraseñas se gestionan desde Supabase Dashboard → Authentication → Users

CREATE POLICY "Inserción autenticada eventos"
    ON eventos FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Inserción autenticada asistencia"
    ON asistencia FOR INSERT
    TO authenticated
    WITH CHECK (true);


-- =============================================================
-- Script de migración (solo si ya existen datos en la BD)
-- Ejecutar por separado en el SQL Editor si es necesario
-- =============================================================
--
-- ALTER TABLE eventos ADD COLUMN nombre_serie TEXT;
-- ALTER TABLE eventos ADD COLUMN calle   TEXT;
-- ALTER TABLE eventos ADD COLUMN numero  TEXT;
-- ALTER TABLE eventos ADD COLUMN colonia TEXT;
--
-- UPDATE eventos e
-- SET nombre_serie = s.nombre
-- FROM series_eventos s
-- WHERE e.serie_id = s.id;
--
-- ALTER TABLE eventos DROP COLUMN serie_id;
--
-- DROP POLICY IF EXISTS "Lectura pública series_eventos"       ON series_eventos;
-- DROP POLICY IF EXISTS "Inserción autenticada series_eventos" ON series_eventos;
-- DROP TABLE IF EXISTS series_eventos;
