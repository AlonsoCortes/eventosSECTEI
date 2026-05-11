// Formulario de captura de eventos – eventosSECTEI

// ── Constantes ────────────────────────────────────────────────
const RANGOS_EDAD = ['3-5', '6-11', '12-14', '15-17', '18-23', '24-29', '30-64', '65+'];
const GENEROS     = ['mujer', 'hombre', 'otro'];

const ALCALDIAS = [
  'Álvaro Obregón',
  'Azcapotzalco',
  'Benito Juárez',
  'Coyoacán',
  'Cuajimalpa de Morelos',
  'Cuauhtémoc',
  'Gustavo A. Madero',
  'Iztacalco',
  'Iztapalapa',
  'La Magdalena Contreras',
  'Miguel Hidalgo',
  'Milpa Alta',
  'Tláhuac',
  'Tlalpan',
  'Venustiano Carranza',
  'Xochimilco',
];

// Centro de la CDMX para el mapa picker
const CDMX_CENTER = [-99.1332, 19.4326];
const CDMX_ZOOM   = 10;

let mapaPicker  = null;
let marcador    = null;


// ── Autenticación ─────────────────────────────────────────────
async function verificarSesion() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    mostrarApp(session.user.email);
  }
}

function mostrarApp(email) {
  document.getElementById('login-overlay').classList.add('oculto');
  document.getElementById('app').style.display = 'block';
  document.getElementById('usuario-email').textContent = email;

  if (!mapaPicker) inicializarMapaPicker();
}

// Formulario de login
document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btnLogin  = document.getElementById('btn-login');
  const errorEl   = document.getElementById('login-error');
  errorEl.style.display = 'none';
  btnLogin.disabled = true;
  btnLogin.textContent = 'Ingresando…';

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email:    document.getElementById('login-email').value.trim(),
    password: document.getElementById('login-password').value,
  });

  if (error) {
    errorEl.textContent = 'Correo o contraseña incorrectos.';
    errorEl.style.display = 'block';
    btnLogin.disabled = false;
    btnLogin.textContent = 'Ingresar';
    return;
  }

  mostrarApp(data.user.email);
});

// Cerrar sesión
document.getElementById('btn-cerrar-sesion').addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-overlay').classList.remove('oculto');
  document.getElementById('login-password').value = '';
});


// ── Toggle tipo de evento ─────────────────────────────────────
document.querySelectorAll('input[name="tipo_evento"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const esSerie = radio.value === 'serie' && radio.checked;
    document.getElementById('panel-serie').classList.toggle('visible', esSerie);
    document.getElementById('panel-unico').classList.toggle('visible', !esSerie);
    if (esSerie) {
      document.getElementById('nombre-unico').value = '';
    } else {
      document.getElementById('nombre-serie').value = '';
      document.getElementById('nombre-sesion').value = '';
    }
  });
});


// ── Alcaldías ─────────────────────────────────────────────────
function poblarAlcaldias() {
  const select = document.getElementById('municipio');
  ALCALDIAS.forEach(a => select.appendChild(new Option(a, a)));
}


// ── Nombres de programas / series ─────────────────────────────
async function cargarNombresSeries() {
  const { data } = await supabaseClient
    .from('eventos')
    .select('nombre_serie')
    .not('nombre_serie', 'is', null)
    .order('nombre_serie');

  if (!data) return;
  const datalist = document.getElementById('datalist-series');
  const vistos = new Set();
  data.forEach(({ nombre_serie }) => {
    if (nombre_serie && !vistos.has(nombre_serie)) {
      vistos.add(nombre_serie);
      datalist.appendChild(new Option(nombre_serie));
    }
  });
}


// ── Mapa picker de coordenadas ────────────────────────────────
function colocarMarcador(lat, lng) {
  document.getElementById('latitud').value  = lat.toFixed(6);
  document.getElementById('longitud').value = lng.toFixed(6);

  if (marcador) {
    marcador.setLngLat([lng, lat]);
  } else {
    marcador = new maplibregl.Marker({ color: '#2d7dd2', draggable: true })
      .setLngLat([lng, lat])
      .addTo(mapaPicker);

    marcador.on('dragend', () => {
      const pos = marcador.getLngLat();
      document.getElementById('latitud').value  = pos.lat.toFixed(6);
      document.getElementById('longitud').value = pos.lng.toFixed(6);
    });
  }
}

function inicializarMapaPicker() {
  mapaPicker = new maplibregl.Map({
    container: 'mapa-picker',
    style:     'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    center:    CDMX_CENTER,
    zoom:      CDMX_ZOOM,
  });

  mapaPicker.addControl(new maplibregl.NavigationControl(), 'top-right');

  mapaPicker.on('click', (e) => {
    const { lng, lat } = e.lngLat;
    colocarMarcador(lat, lng);
  });
}


// ── Geocodificación (Nominatim / OpenStreetMap) ───────────────
async function buscarDireccion() {
  const query = document.getElementById('geocoding-input').value.trim();
  if (!query) return;

  const btnBuscar   = document.getElementById('btn-geocoding');
  const resultadosEl = document.getElementById('geocoding-resultados');
  btnBuscar.disabled    = true;
  btnBuscar.textContent = 'Buscando…';
  resultadosEl.innerHTML    = '';
  resultadosEl.style.display = 'none';

  try {
    const params = new URLSearchParams({
      q:            `${query}, Ciudad de México, México`,
      format:       'json',
      countrycodes: 'mx',
      limit:        '5',
      addressdetails: '1',
    });
    const resp       = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
    const resultados = await resp.json();
    mostrarResultadosGeocodificacion(resultados);
  } catch {
    const li = document.createElement('li');
    li.className   = 'geocoding-sin-resultado';
    li.textContent = 'Error de conexión. Verifica tu internet e intenta de nuevo.';
    resultadosEl.appendChild(li);
    resultadosEl.style.display = 'block';
  } finally {
    btnBuscar.disabled    = false;
    btnBuscar.textContent = 'Buscar';
  }
}

function mostrarResultadosGeocodificacion(resultados) {
  const el = document.getElementById('geocoding-resultados');
  el.innerHTML = '';

  if (resultados.length === 0) {
    const li = document.createElement('li');
    li.className   = 'geocoding-sin-resultado';
    li.textContent = 'No se encontró la dirección. Intenta con otro texto o marca el punto directamente en el mapa.';
    el.appendChild(li);
    el.style.display = 'block';
    return;
  }

  resultados.forEach(r => {
    const li = document.createElement('li');
    li.textContent = r.display_name;
    li.addEventListener('click', () => {
      seleccionarResultado(parseFloat(r.lat), parseFloat(r.lon));
    });
    el.appendChild(li);
  });

  el.style.display = 'block';
}

function seleccionarResultado(lat, lng) {
  colocarMarcador(lat, lng);
  mapaPicker.flyTo({ center: [lng, lat], zoom: 17, essential: true });
  document.getElementById('geocoding-resultados').style.display = 'none';
}

function autorellenarBusqueda() {
  const calle     = document.getElementById('calle').value.trim();
  const numero    = document.getElementById('numero').value.trim();
  const colonia   = document.getElementById('colonia').value.trim();
  const municipio = document.getElementById('municipio').value;
  const partes = [
    calle && numero ? `${calle} ${numero}` : calle,
    colonia,
    municipio,
  ].filter(Boolean);
  if (partes.length > 0) {
    document.getElementById('geocoding-input').value = partes.join(', ');
  }
}


// ── Grilla de asistencia ──────────────────────────────────────
function construirGrilla() {
  const tabla = document.getElementById('tabla-asistencia');

  const thead   = tabla.createTHead();
  const filaTop = thead.insertRow();

  filaTop.insertCell().outerHTML = '<th rowspan="2">Rango de edad</th>';

  [{ texto: 'Sin discapacidad', clase: 'grupo-sin' },
   { texto: 'Con discapacidad',  clase: 'grupo-con' }].forEach(({ texto, clase }) => {
    const th = document.createElement('th');
    th.textContent = texto;
    th.colSpan = GENEROS.length;
    th.className = clase;
    filaTop.appendChild(th);
  });

  const filaGen = thead.insertRow();
  [false, true].forEach(() => {
    GENEROS.forEach(g => {
      const th = document.createElement('th');
      th.textContent = g.charAt(0).toUpperCase() + g.slice(1);
      filaGen.appendChild(th);
    });
  });

  const tbody = tabla.createTBody();
  RANGOS_EDAD.forEach(rango => {
    const fila = tbody.insertRow();
    fila.insertCell().textContent = rango;

    [false, true].forEach(discapacidad => {
      GENEROS.forEach(genero => {
        const td    = fila.insertCell();
        const input = document.createElement('input');
        input.type  = 'number';
        input.min   = '0';
        input.value = '0';
        input.dataset.rango        = rango;
        input.dataset.genero       = genero;
        input.dataset.discapacidad = discapacidad ? '1' : '0';
        td.appendChild(input);
      });
    });
  });
}

function recogerAsistencia(eventoId) {
  const filas = [];
  document.querySelectorAll('#tabla-asistencia input[type="number"]').forEach(input => {
    const conteo = parseInt(input.value, 10) || 0;
    if (conteo > 0) {
      filas.push({
        evento_id:          eventoId,
        genero:             input.dataset.genero,
        tiene_discapacidad: input.dataset.discapacidad === '1',
        rango_edad:         input.dataset.rango,
        conteo,
      });
    }
  });
  return filas;
}


// ── Envío del formulario ──────────────────────────────────────
document.getElementById('form-evento').addEventListener('submit', async (e) => {
  e.preventDefault();

  const btnGuardar = document.getElementById('btn-guardar');
  const estado     = document.getElementById('estado-envio');
  btnGuardar.disabled  = true;
  estado.style.display = 'none';

  const esSerie = document.querySelector('input[name="tipo_evento"]:checked').value === 'serie';
  const nombre  = esSerie
    ? document.getElementById('nombre-sesion').value.trim()
    : document.getElementById('nombre-unico').value.trim();
  const nombreSerie = esSerie
    ? document.getElementById('nombre-serie').value.trim() || null
    : null;

  if (!nombre) {
    estado.textContent   = 'El nombre del evento es obligatorio.';
    estado.className     = 'estado-envio error';
    estado.style.display = 'block';
    btnGuardar.disabled  = false;
    return;
  }

  const ponentesRaw = document.getElementById('ponentes').value;
  const ponentes    = ponentesRaw
    ? ponentesRaw.split(',').map(p => p.trim()).filter(Boolean)
    : null;

  const evento = {
    nombre_serie: nombreSerie,
    nombre,
    fecha:        document.getElementById('fecha').value,
    nombre_lugar: document.getElementById('nombre_lugar').value.trim() || null,
    calle:        document.getElementById('calle').value.trim()        || null,
    numero:       document.getElementById('numero').value.trim()       || null,
    colonia:      document.getElementById('colonia').value.trim()      || null,
    latitud:      parseFloat(document.getElementById('latitud').value)  || null,
    longitud:     parseFloat(document.getElementById('longitud').value) || null,
    municipio:    document.getElementById('municipio').value || null,
    tematica:     document.getElementById('tematica').value.trim() || null,
    ponentes,
    notas:        document.getElementById('notas').value.trim() || null,
  };

  try {
    const { data: eventoCreado, error: errEvento } =
      await supabaseClient.from('eventos').insert(evento).select('id').single();

    if (errEvento) throw errEvento;

    const filas = recogerAsistencia(eventoCreado.id);
    if (filas.length > 0) {
      const { error: errAsistencia } = await supabaseClient.from('asistencia').insert(filas);
      if (errAsistencia) throw errAsistencia;
    }

    // Agregar el nombre de serie al datalist si es nuevo
    if (nombreSerie) {
      const datalist = document.getElementById('datalist-series');
      const yaExiste = [...datalist.options].some(o => o.value === nombreSerie);
      if (!yaExiste) datalist.appendChild(new Option(nombreSerie));
    }

    estado.textContent   = '¡Evento registrado exitosamente!';
    estado.className     = 'estado-envio exito';
    estado.style.display = 'block';
    e.target.reset();
    document.querySelectorAll('#tabla-asistencia input[type="number"]')
      .forEach(i => { i.value = '0'; });
    if (marcador) { marcador.remove(); marcador = null; }
    document.getElementById('latitud').value  = '';
    document.getElementById('longitud').value = '';
    document.getElementById('geocoding-input').value = '';
    document.getElementById('geocoding-resultados').style.display = 'none';
    document.getElementById('panel-serie').classList.add('visible');
    document.getElementById('panel-unico').classList.remove('visible');
    document.getElementById('nombre-serie').value = '';

  } catch (err) {
    estado.textContent   = `Error al guardar: ${err.message}`;
    estado.className     = 'estado-envio error';
    estado.style.display = 'block';
    console.error(err);
  } finally {
    btnGuardar.disabled = false;
  }
});


// ── Inicialización ────────────────────────────────────────────
poblarAlcaldias();
construirGrilla();
cargarNombresSeries();
verificarSesion();

document.getElementById('btn-geocoding').addEventListener('click', buscarDireccion);
document.getElementById('btn-autorellenar').addEventListener('click', () => {
  autorellenarBusqueda();
  document.getElementById('geocoding-input').focus();
});
document.getElementById('geocoding-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); buscarDireccion(); }
});

// Cerrar resultados al hacer clic fuera del buscador
document.addEventListener('click', (e) => {
  if (!e.target.closest('.geocoding-wrapper')) {
    document.getElementById('geocoding-resultados').style.display = 'none';
  }
});
