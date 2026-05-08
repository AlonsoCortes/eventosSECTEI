# eventosSECTEI

Herramienta web de registro, análisis y visualización de eventos desarrollados por la Secretaría de Ciencia, Tecnología e Innovación (SECTEI). Publicada en GitHub Pages.

## Funcionalidades

| Módulo | Descripción |
|--------|-------------|
| **Inicio** (`index.html`) | KPIs globales y navegación principal |
| **Geovisor** (`geovisor.html`) | Mapa interactivo de eventos con filtros por municipio y fecha |
| **Dashboard** (`dashboard.html`) | Gráficas de asistencia por género, edad y discapacidad |
| **Formulario** (`form/index.html`) | Captura interna de eventos y datos de asistencia |

## Stack tecnológico

- **Base de datos**: [Supabase](https://supabase.com) (PostgreSQL)
- **Mapa**: [MapLibre GL JS](https://maplibre.org)
- **Gráficas**: [Observable Plot](https://observablehq.com/plot/)
- **Frontend**: HTML5 / CSS3 / JavaScript vanilla
- **Hosting**: GitHub Pages

## Estructura del proyecto

```
eventosSECTEI/
├── index.html
├── geovisor.html
├── dashboard.html
├── form/
│   └── index.html
├── css/
│   ├── main.css
│   ├── geovisor.css
│   ├── dashboard.css
│   └── form.css
├── js/
│   ├── config.js          ← Credenciales Supabase (editar antes de usar)
│   ├── geovisor.js
│   ├── dashboard.js
│   └── form.js
└── sql/
    └── schema.sql         ← DDL para ejecutar en Supabase
```

## Configuración inicial

### 1. Base de datos en Supabase

1. Crear un proyecto en [supabase.com](https://supabase.com)
2. En **SQL Editor**, ejecutar el contenido de `sql/schema.sql`
3. Verificar que se crearon las tablas: `series_eventos`, `eventos`, `asistencia`

### 2. Credenciales

Editar `js/config.js` con los valores de tu proyecto Supabase (Settings → API):

```js
const SUPABASE_URL  = 'https://TU-PROYECTO.supabase.co';
const SUPABASE_ANON = 'TU-ANON-KEY';
```

### 3. GitHub Pages

En **Settings → Pages** del repositorio, seleccionar rama `main` y carpeta raíz `/`.

## Modelo de datos

### `series_eventos`
Series o programas de eventos recurrentes (ej. "Feria de Ciencia").

### `eventos`
Instancias concretas de evento con fecha, ubicación geográfica (latitud/longitud), municipio, temática y ponentes.

### `asistencia`
Conteo de asistentes desagregado por:
- **Género**: mujer / hombre / otro
- **Discapacidad**: con / sin
- **Rango de edad**: 3-5 / 6-11 / 12-14 / 15-17 / 18-23 / 24-29 / 30-64 / 65+

Cada fila representa una combinación única (evento + género + discapacidad + rango de edad).
