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
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    mostrarApp(session.user.email);
  }
  // Si no hay sesión el overlay ya está visible por defecto
}

function mostrarApp(email) {
  document.getElementById('login-overlay').classList.add('oculto');
  document.getElementById('app').style.display = 'block';
  document.getElementById('usuario-email').textContent = email;

  // Inicializar mapa una vez que el contenedor es visible
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

  const { data, error } = await supabase.auth.signInWithPassword({
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
  await supabase.auth.signOut();
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
    // Limpiar campos del panel oculto
    if (esSerie) {
      document.getElementById('nombre-unico').value = '';
    } else {
      document.getElementById('serie_id').value = '';
      document.getElementById('nombre-sesion').value = '';
    }
  });
});


// ── Alcaldías ─────────────────────────────────────────────────
function poblarAlcaldias() {
  const select = document.getElementById('municipio');
  ALCALDIAS.forEach(a => select.appendChild(new Option(a, a)));
}


// ── Series de eventos ─────────────────────────────────────────
async function cargarSeries() {
  const { data, error } = await supabase
    .from('series_eventos')
    .select('id, nombre')
    .order('nombre');

  if (error || !data) return;
  const select = document.getElementById('serie_id');
  data.forEach(s => select.appendChild(new Option(s.nombre, s.id)));
}


// ── Mapa picker de coordenadas ────────────────────────────────
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

    document.getElementById('latitud').value  = lat.toFixed(6);
    document.getElementById('longitud').value = lng.toFixed(6);

    if (marcador) {
      marcador.setLngLat([lng, lat]);
    } else {
      marcador = new maplibregl.Marker({ color: '#2d7dd2', draggable: true })
        .setLngLat([lng, lat])
        .addTo(mapaPicker);

      // También actualizar coords al arrastrar el marcador
      marcador.on('dragend', () => {
        const pos = marcador.getLngLat();
        document.getElementById('latitud').value  = pos.lat.toFixed(6);
        document.getElementById('longitud').value = pos.lng.toFixed(6);
      });
    }
  });
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

  // Determinar nombre y serie según tipo elegido
  const esSerie = document.querySelector('input[name="tipo_evento"]:checked').value === 'serie';
  const nombre  = esSerie
    ? document.getElementById('nombre-sesion').value.trim()
    : document.getElementById('nombre-unico').value.trim();
  const serieId = esSerie ? (document.getElementById('serie_id').value || null) : null;

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
    serie_id:     serieId,
    nombre,
    fecha:        document.getElementById('fecha').value,
    nombre_lugar: document.getElementById('nombre_lugar').value.trim() || null,
    latitud:      parseFloat(document.getElementById('latitud').value)  || null,
    longitud:     parseFloat(document.getElementById('longitud').value) || null,
    municipio:    document.getElementById('municipio').value || null,
    tematica:     document.getElementById('tematica').value.trim() || null,
    ponentes,
    notas:        document.getElementById('notas').value.trim() || null,
  };

  try {
    const { data: eventoCreado, error: errEvento } =
      await supabase.from('eventos').insert(evento).select('id').single();

    if (errEvento) throw errEvento;

    const filas = recogerAsistencia(eventoCreado.id);
    if (filas.length > 0) {
      const { error: errAsistencia } = await supabase.from('asistencia').insert(filas);
      if (errAsistencia) throw errAsistencia;
    }

    estado.textContent   = '¡Evento registrado exitosamente!';
    estado.className     = 'estado-envio exito';
    estado.style.display = 'block';
    e.target.reset();
    // Restaurar grilla
    document.querySelectorAll('#tabla-asistencia input[type="number"]')
      .forEach(i => { i.value = '0'; });
    // Restaurar marcador y coords
    if (marcador) { marcador.remove(); marcador = null; }
    document.getElementById('latitud').value  = '';
    document.getElementById('longitud').value = '';
    // Restaurar panel de tipo
    document.getElementById('panel-serie').classList.add('visible');
    document.getElementById('panel-unico').classList.remove('visible');

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
cargarSeries();
verificarSesion();
