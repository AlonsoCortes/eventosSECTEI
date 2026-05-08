// Lógica del formulario de captura de eventos

const RANGOS_EDAD = ['3-5', '6-11', '12-14', '15-17', '18-23', '24-29', '30-64', '65+'];
const GENEROS     = ['mujer', 'hombre', 'otro'];

// Construye la grilla de asistencia dinámicamente
function construirGrilla() {
  const tabla = document.getElementById('tabla-asistencia');

  // Encabezado
  const thead = tabla.createTHead();
  const filaTop = thead.insertRow();

  filaTop.insertCell().outerHTML = '<th rowspan="2">Rango de edad</th>';

  const encabezados = [
    { texto: 'Sin discapacidad', clase: 'grupo-sin', cols: GENEROS.length },
    { texto: 'Con discapacidad',  clase: 'grupo-con', cols: GENEROS.length },
  ];

  encabezados.forEach(({ texto, clase, cols }) => {
    const th = document.createElement('th');
    th.textContent = texto;
    th.colSpan = cols;
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

  // Cuerpo
  const tbody = tabla.createTBody();
  RANGOS_EDAD.forEach(rango => {
    const fila = tbody.insertRow();
    const celda = fila.insertCell();
    celda.textContent = rango;

    [false, true].forEach(discapacidad => {
      GENEROS.forEach(genero => {
        const td = fila.insertCell();
        const input = document.createElement('input');
        input.type = 'number';
        input.min  = '0';
        input.value = '0';
        input.dataset.rango       = rango;
        input.dataset.genero      = genero;
        input.dataset.discapacidad = discapacidad ? '1' : '0';
        td.appendChild(input);
      });
    });
  });
}

// Carga series de eventos en el select
async function cargarSeries() {
  const { data, error } = await supabase
    .from('series_eventos')
    .select('id, nombre')
    .order('nombre');

  if (error) return;
  const select = document.getElementById('serie_id');
  data.forEach(s => {
    const opt = new Option(s.nombre, s.id);
    select.appendChild(opt);
  });
}

// Recoge los valores de la grilla de asistencia
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

// Envío del formulario
document.getElementById('form-evento').addEventListener('submit', async (e) => {
  e.preventDefault();

  const btnGuardar = document.getElementById('btn-guardar');
  const estado     = document.getElementById('estado-envio');
  btnGuardar.disabled = true;
  estado.style.display = 'none';

  // Construir objeto evento
  const ponentesRaw = document.getElementById('ponentes').value;
  const ponentes    = ponentesRaw
    ? ponentesRaw.split(',').map(p => p.trim()).filter(Boolean)
    : null;

  const evento = {
    serie_id:     document.getElementById('serie_id').value || null,
    nombre:       document.getElementById('nombre').value.trim(),
    fecha:        document.getElementById('fecha').value,
    nombre_lugar: document.getElementById('nombre_lugar').value.trim() || null,
    latitud:      parseFloat(document.getElementById('latitud').value) || null,
    longitud:     parseFloat(document.getElementById('longitud').value) || null,
    municipio:    document.getElementById('municipio').value.trim() || null,
    tematica:     document.getElementById('tematica').value.trim() || null,
    ponentes:     ponentes,
    notas:        document.getElementById('notas').value.trim() || null,
  };

  try {
    // Insertar evento
    const { data: eventoCreado, error: errEvento } =
      await supabase.from('eventos').insert(evento).select('id').single();

    if (errEvento) throw errEvento;

    // Insertar registros de asistencia
    const filas = recogerAsistencia(eventoCreado.id);
    if (filas.length > 0) {
      const { error: errAsistencia } = await supabase.from('asistencia').insert(filas);
      if (errAsistencia) throw errAsistencia;
    }

    estado.textContent = '¡Evento registrado exitosamente!';
    estado.className   = 'estado-envio exito';
    estado.style.display = 'block';
    e.target.reset();
    // Limpiar grilla
    document.querySelectorAll('#tabla-asistencia input[type="number"]')
      .forEach(i => { i.value = '0'; });

  } catch (err) {
    estado.textContent = `Error al guardar: ${err.message}`;
    estado.className   = 'estado-envio error';
    estado.style.display = 'block';
    console.error(err);
  } finally {
    btnGuardar.disabled = false;
  }
});

// Inicializar
construirGrilla();
cargarSeries();
