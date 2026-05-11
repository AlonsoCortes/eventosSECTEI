# eventosSECTEI

Herramienta web de registro, análisis y visualización de eventos desarrollados por la Secretaría de Ciencia, Tecnología e Innovación (SECTEI). Publicada en GitHub Pages.

## Módulos

| Módulo | Archivo | Descripción |
|--------|---------|-------------|
| **Inicio** | `index.html` | KPIs globales y navegación principal |
| **Geovisor** | `geovisor.html` | Mapa interactivo con filtros por municipio y fecha |
| **Dashboard** | `dashboard.html` | Gráficas de asistencia por género, edad y discapacidad |
| **Formulario** | `form/index.html` | Captura interna de eventos (requiere autenticación) |

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Base de datos | [Supabase](https://supabase.com) (PostgreSQL + Auth + RLS) |
| Mapa | [MapLibre GL JS](https://maplibre.org) vía CDN |
| Gráficas | [Observable Plot](https://observablehq.com/plot/) vía CDN |
| Frontend | HTML5 / CSS3 / JavaScript vanilla |
| Hosting | GitHub Pages (rama `main`, carpeta raíz) |

## Estructura del proyecto

```
eventosSECTEI/
├── index.html              ← Página de inicio / KPIs
├── geovisor.html           ← Mapa interactivo
├── dashboard.html          ← Dashboard de indicadores
├── form/
│   └── index.html          ← Formulario de captura (acceso restringido)
├── css/
│   ├── main.css            ← Estilos globales
│   ├── geovisor.css
│   ├── dashboard.css
│   └── form.css
├── js/
│   ├── config.js           ← Credenciales Supabase (NO subir al repo)
│   ├── geovisor.js
│   ├── dashboard.js
│   └── form.js
├── sql/
│   └── schema.sql          ← DDL completo para ejecutar en Supabase
└── .github/
    └── workflows/
        └── deploy.yml      ← CI/CD: inyecta credenciales y despliega a GitHub Pages
```

> `js/config.js` está en `.gitignore`. Las credenciales reales se inyectan en producción
> vía GitHub Secrets (`SUPABASE_URL` y `SUPABASE_ANON`) durante el deploy.

## Configuración inicial

### 1. Base de datos

1. Crear un proyecto en [supabase.com](https://supabase.com)
2. En **SQL Editor**, ejecutar el contenido de `sql/schema.sql`
3. Verificar que se crearon las tablas: `eventos`, `asistencia`
4. En **Authentication → Users**, dar de alta los correos y contraseñas de los capturistas

### 2. Credenciales locales

Crear o editar `js/config.js` con los valores de tu proyecto Supabase (**Settings → API**):

```js
const SUPABASE_URL  = 'https://TU-PROYECTO.supabase.co';
const SUPABASE_ANON = 'TU-ANON-KEY';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
```

Este archivo **no se sube al repositorio** (está en `.gitignore`).

### 3. GitHub Secrets (para producción)

En **Settings → Secrets and variables → Actions** del repositorio, crear:

| Secret | Valor |
|--------|-------|
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_ANON` | Anon public key |

### 4. GitHub Pages

En **Settings → Pages**, seleccionar rama `main` y carpeta raíz `/`.
El workflow `.github/workflows/deploy.yml` se encarga del resto automáticamente.

## Modelo de datos

Ver documentación completa en [`docs/base-de-datos.md`](docs/base-de-datos.md).

### Resumen de tablas

```
eventos                            asistencia
───────────────────────────────    ──────────────────────────
id (PK)                            id (PK)
nombre_serie (null = único)        evento_id → eventos (FK)
nombre                             genero
fecha                              tiene_discapacidad
nombre_lugar                       rango_edad
calle / numero / colonia           conteo
latitud / longitud                 creado_en
municipio
tematica
ponentes
notas
creado_en
```

### Relación entre tablas

- Todos los eventos (únicos y de programa) se almacenan en `eventos`.
- Si el evento pertenece a un programa recurrente, `nombre_serie` contiene el nombre del programa; si es único, `nombre_serie` es `null`.
- `asistencia` desglosa los asistentes de cada evento por género, discapacidad y rango de edad.

## Acceso al formulario

El formulario requiere autenticación con correo y contraseña gestionados desde el Dashboard de Supabase (**Authentication → Users**). Los capturistas no se pueden registrar solos — un administrador debe dar de alta sus cuentas.
