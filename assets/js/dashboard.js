// Dashboard: KPIs + gráficas con Observable Plot

const ORDEN_RANGOS = ['3-5', '6-11', '12-14', '15-17', '18-23', '24-29', '30-64', '65+'];

let datosAsistencia = [];
let datosEventos    = [];

async function cargarDatos() {
  const [{ data: eventos }, { data: asistencia }] = await Promise.all([
    supabaseClient.from('eventos').select('id, nombre, fecha, municipio').order('fecha', { ascending: false }),
    supabaseClient.from('asistencia').select('evento_id, genero, tiene_discapacidad, rango_edad, conteo'),
  ]);

  datosEventos    = eventos    || [];
  datosAsistencia = asistencia || [];

  renderizarKPIs();
  renderizarGraficas();
  renderizarTabla();
}

// --- KPIs -------------------------------------------------------------------
function renderizarKPIs() {
  const total = datosAsistencia.reduce((s, r) => s + r.conteo, 0);
  const mujeres = datosAsistencia.filter(r => r.genero === 'mujer').reduce((s, r) => s + r.conteo, 0);
  const conDisc = datosAsistencia.filter(r => r.tiene_discapacidad).reduce((s, r) => s + r.conteo, 0);
  const pctMujeres = total ? ((mujeres / total) * 100).toFixed(1) : '—';
  const pctDisc    = total ? ((conDisc / total) * 100).toFixed(1) : '—';

  document.getElementById('kpi-eventos').textContent     = datosEventos.length.toLocaleString('es-MX');
  document.getElementById('kpi-asistentes').textContent  = total.toLocaleString('es-MX');
  document.getElementById('kpi-pct-mujeres').textContent = total ? `${pctMujeres}%` : '—';
  document.getElementById('kpi-num-mujeres').textContent = total ? `${mujeres.toLocaleString('es-MX')} personas` : '';
  document.getElementById('kpi-pct-disc').textContent    = total ? `${pctDisc}%` : '—';
  document.getElementById('kpi-num-disc').textContent    = total ? `${conDisc.toLocaleString('es-MX')} personas` : '';
}

// --- Gráficas ----------------------------------------------------------------
function renderizarGraficas() {
  if (!datosAsistencia.length) return;

  graficaEdad();
  graficaGenero();
}

function graficaEdad() {
  const agregado = {};
  ORDEN_RANGOS.forEach(r => { agregado[r] = 0; });
  datosAsistencia.forEach(({ rango_edad, conteo }) => {
    if (agregado[rango_edad] !== undefined) agregado[rango_edad] += conteo;
  });

  const datos = ORDEN_RANGOS.map(r => ({ rango: r, conteo: agregado[r] }));

  const contenedor = document.getElementById('grafica-edad');
  const grafica = Plot.plot({
    width:      contenedor.clientWidth || 800,
    height:     340,
    marginLeft: 50,
    x: { label: 'Asistentes' },
    y: { label: null, domain: ORDEN_RANGOS },
    marks: [
      Plot.barX(datos, { y: 'rango', x: 'conteo', fill: '#2d7dd2', tip: true }),
      Plot.ruleX([0]),
    ],
  });

  contenedor.innerHTML = '';
  contenedor.appendChild(grafica);
}

function graficaGenero() {
  const agregado = { mujer: 0, hombre: 0, otro: 0 };
  datosAsistencia.forEach(({ genero, conteo }) => {
    if (agregado[genero] !== undefined) agregado[genero] += conteo;
  });

  const datos = Object.entries(agregado).map(([genero, conteo]) => ({ genero, conteo }));
  const colores = { mujer: '#e056a0', hombre: '#2d7dd2', otro: '#f4a620' };

  const contenedor = document.getElementById('grafica-genero');
  const grafica = Plot.plot({
    width:      contenedor.clientWidth || 800,
    height:     220,
    marginLeft: 70,
    x: { label: 'Asistentes' },
    y: { label: null },
    color: { domain: ['mujer', 'hombre', 'otro'], range: Object.values(colores) },
    marks: [
      Plot.barX(datos, { y: 'genero', x: 'conteo', fill: 'genero', tip: true }),
      Plot.ruleX([0]),
    ],
  });

  contenedor.innerHTML = '';
  contenedor.appendChild(grafica);
}

// --- Tabla recientes --------------------------------------------------------
function renderizarTabla(n = 10) {
  const asistenciaPorEvento = {};
  datosAsistencia.forEach(({ evento_id, conteo }) => {
    asistenciaPorEvento[evento_id] = (asistenciaPorEvento[evento_id] || 0) + conteo;
  });

  const tbody = document.querySelector('#tabla-recientes tbody');
  tbody.innerHTML = '';

  datosEventos.slice(0, n).forEach(ev => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${ev.fecha}</td>
      <td>${ev.nombre}</td>
      <td>${ev.municipio || '—'}</td>
      <td>${(asistenciaPorEvento[ev.id] || 0).toLocaleString('es-MX')}</td>
    `;
    tbody.appendChild(tr);
  });
}

cargarDatos();
