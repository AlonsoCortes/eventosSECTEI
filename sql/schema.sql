-- =============================================================
-- Schema: eventosSECTEI
-- Ejecutar en el SQL Editor de Supabase
-- =============================================================

-- Extensión necesaria para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- -------------------------------------------------------------
-- Tabla: series_eventos
-- Series o programas de eventos recurrentes
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS series_eventos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      TEXT NOT NULL,
    descripcion TEXT,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- -------------------------------------------------------------
-- Tabla: eventos
-- Cada instancia concreta de evento
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS eventos (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serie_id     UUID REFERENCES series_eventos(id) ON DELETE SET NULL,
    nombre       TEXT NOT NULL,
    fecha        DATE NOT NULL,
    nombre_lugar TEXT,
    latitud      FLOAT8,
    longitud     FLOAT8,
    municipio    TEXT,
    tematica     TEXT,
    ponentes     TEXT[],
    notas        TEXT,
    creado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eventos_fecha    ON eventos(fecha);
CREATE INDEX IF NOT EXISTS idx_eventos_serie_id ON eventos(serie_id);


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

ALTER TABLE series_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencia      ENABLE ROW LEVEL SECURITY;

-- Lectura pública (anon key puede leer)
CREATE POLICY "Lectura pública series_eventos"
    ON series_eventos FOR SELECT
    USING (true);

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

-- Las series las gestionan los administradores desde el Dashboard de Supabase;
-- los capturistas solo pueden leerlas para seleccionarlas en el formulario.
