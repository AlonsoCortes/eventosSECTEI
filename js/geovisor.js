// Lógica del geovisor con MapLibre GL

const ESTILO_MAPA = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

// Centro inicial: Monterrey, Nuevo León
const CENTRO_INICIAL = [-100.316, 25.6866];
const ZOOM_INICIAL   = 8;

let mapa;
let todosLosEventos = [];

// Inicializar mapa
function inicializarMapa() {
  mapa = new maplibregl.Map({
    container: 'mapa',
    style:     ESTILO_MAPA,
    center:    CENTRO_INICIAL,
    zoom:      ZOOM_INICIAL,
  });

  mapa.addControl(new maplibregl.NavigationControl(), 'top-right');
  mapa.addControl(new maplibregl.ScaleControl(), 'bottom-left');

  mapa.on('load', () => {
    agregarFuenteYCapas();
    cargarEventos();
  });
}

// Agrega la fuente GeoJSON y las capas de puntos
function agregarFuenteYCapas() {
  mapa.addSource('eventos', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });

  // Círculo de fondo
  mapa.addLayer({
    id:     'eventos-circulo',
    type:   'circle',
    source: 'eventos',
    paint:  {
      'circle-radius':       8,
      'circle-color':        '#2d7dd2',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff',
      'circle-opacity':      0.85,
    },
  });

  // Etiqueta con conteo de asistentes
  mapa.addLayer({
    id:     'eventos-etiqueta',
    type:   'symbol',
    source: 'eventos',
    layout: {
      'text-field':  ['get', 'total_asistentes'],
      'text-size':   10,
      'text-offset': [0, 2],
    },
    paint: { 'text-color': '#1e2432' },
  });

  // Popup al hacer click en un punto
  mapa.on('click', 'eventos-circulo', (e) => {
    const props = e.features[0].properties;
    const coords = e.features[0].geometry.coordinates.slice();

    new maplibregl.Popup()
      .setLngLat(coords)
      .setHTML(`
        <div class="popup-evento">
          <h3>${props.nombre}</h3>
          <p><span class="etiqueta">Fecha:</span> ${props.fecha}</p>
          <p><span class="etiqueta">Lugar:</span> ${props.nombre_lugar || '—'}</p>
          <p><span class="etiqueta">Municipio:</span> ${props.municipio || '—'}</p>
          <p><span class="etiqueta">Asistentes:</span> ${props.total_asistentes}</p>
          ${props.tematica ? `<p><span class="etiqueta">Temática:</span> ${props.tematica}</p>` : ''}
        </div>
      `)
      .addTo(mapa);
  });

  mapa.on('mouseenter', 'eventos-circulo', () => {
    mapa.getCanvas().style.cursor = 'pointer';
  });
  mapa.on('mouseleave', 'eventos-circulo', () => {
    mapa.getCanvas().style.cursor = '';
  });
}

// Carga eventos desde Supabase con totales de asistencia
async function cargarEventos() {
  try {
    const { data: eventos, error } = await supabase
      .from('eventos')
      .select(`
        id, nombre, fecha, nombre_lugar, latitud, longitud, municipio, tematica,
        asistencia ( conteo )
      `)
      .order('fecha', { ascending: false });

    if (error) throw error;

    todosLosEventos = eventos.map(ev => ({
      ...ev,
      total_asistentes: (ev.asistencia || []).reduce((s, r) => s + r.conteo, 0),
    }));

    actualizarMapa(todosLosEventos);
    poblarFiltroSeries();
    renderizarLista(todosLosEventos);
  } catch (err) {
    console.error('Error cargando eventos:', err);
  }
}

// Convierte eventos a GeoJSON y actualiza la capa
function actualizarMapa(eventos) {
  const features = eventos
    .filter(ev => ev.latitud && ev.longitud)
    .map(ev => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [ev.longitud, ev.latitud] },
      properties: {
        id:               ev.id,
        nombre:           ev.nombre,
        fecha:            ev.fecha,
        nombre_lugar:     ev.nombre_lugar,
        municipio:        ev.municipio,
        tematica:         ev.tematica,
        total_asistentes: ev.total_asistentes,
      },
    }));

  mapa.getSource('eventos').setData({ type: 'FeatureCollection', features });
}

// Rellena el selector de municipio para filtrar
function poblarFiltroSeries() {
  const municipios = [...new Set(todosLosEventos.map(e => e.municipio).filter(Boolean))].sort();
  const select = document.getElementById('filtro-municipio');
  municipios.forEach(m => {
    select.appendChild(new Option(m, m));
  });
}

// Renderiza la lista lateral de eventos
function renderizarLista(eventos) {
  const lista = document.getElementById('lista-eventos');
  lista.innerHTML = '';

  if (eventos.length === 0) {
    lista.innerHTML = '<li style="padding:.75rem;color:var(--color-texto-suave)">Sin resultados</li>';
    return;
  }

  eventos.forEach(ev => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="ev-nombre">${ev.nombre}</div>
      <div class="ev-meta">${ev.fecha}${ev.municipio ? ' · ' + ev.municipio : ''} · ${ev.total_asistentes} asistentes</div>
    `;
    li.addEventListener('click', () => {
      if (ev.latitud && ev.longitud) {
        mapa.flyTo({ center: [ev.longitud, ev.latitud], zoom: 13 });
      }
    });
    lista.appendChild(li);
  });
}

// Filtrado
function aplicarFiltros() {
  const municipio = document.getElementById('filtro-municipio').value;
  const fechaDesde = document.getElementById('filtro-fecha-desde').value;
  const fechaHasta = document.getElementById('filtro-fecha-hasta').value;

  const filtrados = todosLosEventos.filter(ev => {
    if (municipio && ev.municipio !== municipio) return false;
    if (fechaDesde && ev.fecha < fechaDesde) return false;
    if (fechaHasta && ev.fecha > fechaHasta) return false;
    return true;
  });

  actualizarMapa(filtrados);
  renderizarLista(filtrados);
}

document.getElementById('filtro-municipio').addEventListener('change', aplicarFiltros);
document.getElementById('filtro-fecha-desde').addEventListener('change', aplicarFiltros);
document.getElementById('filtro-fecha-hasta').addEventListener('change', aplicarFiltros);
document.getElementById('btn-limpiar-filtros').addEventListener('click', () => {
  document.getElementById('filtro-municipio').value   = '';
  document.getElementById('filtro-fecha-desde').value = '';
  document.getElementById('filtro-fecha-hasta').value = '';
  actualizarMapa(todosLosEventos);
  renderizarLista(todosLosEventos);
});

inicializarMapa();
