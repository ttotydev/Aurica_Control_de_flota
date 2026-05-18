// ========== FUNCIONES DE RENDERIZADO DE UI (CHECKLIST, VEHÍCULOS, ETC.) ==========
function renderChecklistBadges(check) {
  if (!check) return "";
  const active = window.CHECKLIST_ITEMS.filter(k => check[k]);
  if (active.length === 0) return '<span class="text-xs text-gray-400">Sin ítems</span>';
  return active.map(k => `<span class="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">${window.CHECKLIST_LABELS[k]}</span>`).join("");
}

function renderChecklistGrid(type, currentValues) {
  const container = type === "salida" ? document.getElementById("checklistSalidaGrid") : document.getElementById("checklistLlegadaGrid");
  if (!container) return;
  container.innerHTML = window.CHECKLIST_ITEMS.map(k => `
    <label class="flex items-center gap-2 p-2 rounded bg-gray-50 cursor-pointer hover:bg-gray-100">
      <input type="checkbox" data-key="${k}" ${currentValues[k] ? "checked" : ""}> <span>${window.CHECKLIST_LABELS[k]}</span>
    </label>
  `).join("");
  const counter = type === "salida" ? document.getElementById("checkSalidaCount") : document.getElementById("checkLlegadaCount");
  const updateCount = () => {
    let c = 0;
    container.querySelectorAll("input[type=checkbox]").forEach(cb => { if (cb.checked) c++; });
    counter.innerText = `${c}/${window.CHECKLIST_ITEMS.length}`;
  };
  container.querySelectorAll("input[type=checkbox]").forEach(cb => {
    cb.addEventListener("change", updateCount);
  });
  updateCount();
}

function mostrarInfoVehiculo(placa) {
  const veh = window.vehicles.find(v => v.placa === placa);
  const infoDiv = document.getElementById("vehiculoInfo");
  if (!veh) { 
    if (infoDiv) infoDiv.classList.add("hidden"); 
    return; 
  }
  if (infoDiv) infoDiv.classList.remove("hidden");
  
  document.getElementById("vehMarcaModelo").innerText = `${veh.marca || ''} ${veh.modelo || ''}`.trim() || '-';
  document.getElementById("vehAnio").innerText = veh.año || '-';
  document.getElementById("vehKmActual").innerText = (veh.km_actual || 0).toLocaleString('es-ES');
  
  const formatFecha = (f) => f ? new Date(f).toLocaleDateString('es-ES') : '-';
  const alerta = (f) => {
    if (!f) return '';
    const dias = Math.ceil((new Date(f) - new Date()) / (1000*60*60*24));
    if (dias < 0) return ' (VENCIDO)';
    if (dias < 30) return ` (vence en ${dias} días)`;
    return '';
  };
  
  document.getElementById("vehSoat").innerText = formatFecha(veh.vencimiento_soat);
  document.getElementById("alertSoat").innerText = alerta(veh.vencimiento_soat);
  document.getElementById("vehRevision").innerText = formatFecha(veh.vencimiento_revision);
  document.getElementById("alertRevision").innerText = alerta(veh.vencimiento_revision);
  document.getElementById("vehSeguro").innerText = formatFecha(veh.vencimiento_seguro);
  document.getElementById("alertSeguro").innerText = alerta(veh.vencimiento_seguro);
  document.getElementById("vehGps").innerText = formatFecha(veh.vencimiento_gps);
  document.getElementById("alertGps").innerText = alerta(veh.vencimiento_gps);
  document.getElementById("vehLunas").innerText = veh.vencimiento_lunas || 'No definido';
  document.getElementById("alertLunas").innerText = '';
  document.getElementById("vehFrecMant").innerText = veh.frecuencia_mantenimiento || 'No definida';

  // Autocompletar km salida
  const kmInput = document.getElementById("sKm");
  if (kmInput && typeof veh.km_actual === 'number' && !isNaN(veh.km_actual)) {
    kmInput.value = formatearKm(veh.km_actual);
  }
}

async function updateUI() {
  const enRuta = window.trips.filter(t => t.status === "en_ruta");
  const completados = window.trips.filter(t => t.status === "completado").sort((a,b) => (b.llegada||"").localeCompare(a.llegada||""));
  document.getElementById("statEnRuta").innerText = enRuta.length;
  document.getElementById("enRutaCount").innerText = enRuta.length;
  document.getElementById("historialCount").innerText = completados.length;
  const hoy = new Date().toDateString();
  const llegadasHoy = completados.filter(t => t.llegada && new Date(t.llegada).toDateString() === hoy).length;
  document.getElementById("statHoy").innerText = llegadasHoy;
  
  // Reemplazar "Km recorridos" por "Saldo total peaje"
  const { data: saldos } = await supabaseClient
    .from('vehiculo_saldo_peaje')
    .select('saldo');
  const saldoTotal = saldos?.reduce((sum, s) => sum + (s.saldo || 0), 0) || 0;
  document.getElementById("statKm").innerText = `S/ ${saldoTotal.toFixed(2)}`;
  
  document.getElementById("statTotal").innerText = window.trips.length;

  const panelEnRuta = document.getElementById("panelEnRuta");
  if (enRuta.length === 0) {
    panelEnRuta.innerHTML = `<div class="col-span-full text-center py-12 border border-dashed rounded-xl text-gray-500"><i class="fas fa-truck text-4xl mb-2"></i><p>Ningún vehículo en ruta</p></div>`;
  } else {
    panelEnRuta.innerHTML = enRuta.map(t => `
      <div class="bg-white rounded-xl shadow-card overflow-hidden border">
        <div class="p-4">
          <div class="flex justify-between items-start">
            <div><h3 class="font-mono font-bold">${escapeHtml(t.patente)}</h3><p class="text-gray-500 text-sm">${escapeHtml(t.motivo)}</p></div>
            <span class="badge-warning text-xs px-2 py-1 rounded-full">En ruta</span>
          </div>
          <div class="mt-3 space-y-1 text-sm">
            <div><i class="fas fa-user"></i> Conductor: ${escapeHtml(t.conductor)}</div>
            <div><i class="fas fa-shield-alt"></i> Agente: ${escapeHtml(t.agente_salida)}</div>
            <div><i class="far fa-clock"></i> Salida: ${formatDateTime(t.salida)}</div>
            <div><i class="fas fa-tachometer-alt"></i> Km salida: ${(t.km_salida || 0).toLocaleString('es-ES')}</div>
          </div>
          <div class="mt-2 flex flex-wrap gap-1">${renderChecklistBadges(t.checklist_salida)}</div>
          ${t.obs_salida ? `<p class="text-xs text-gray-500 bg-gray-50 p-2 rounded mt-2">${escapeHtml(t.obs_salida)}</p>` : ''}
          <button class="btn-finalizar mt-3 w-full bg-blue-50 text-blue-700 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition"
            data-id="${t.id}" data-patente="${escapeHtml(t.patente)}" data-conductor="${escapeHtml(t.conductor)}" data-km="${t.km_salida}">
            <i class="fas fa-check-circle"></i> Finalizar y registrar llegada
          </button>
        </div>
      </div>
    `).join('');
  }

  const panelHistorial = document.getElementById("panelHistorial");
  if (completados.length === 0) {
    panelHistorial.innerHTML = `<div class="text-center py-12 border border-dashed rounded-xl text-gray-500"><i class="fas fa-history text-4xl mb-2"></i><p>Sin viajes completados</p></div>`;
  } else {
    panelHistorial.innerHTML = `<div class="bg-white rounded-xl shadow-card overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead class="bg-gray-50 border-b">
          <tr>
            <th class="px-4 py-2 text-left">Placa</th>
            <th class="px-4 py-2 text-left">Conductor</th>
            <th class="px-4 py-2 text-left">Motivo</th>
            <th class="px-4 py-2 text-left">Salida</th>
            <th class="px-4 py-2 text-left">Llegada</th>
            <th class="px-4 py-2 text-right">Km</th>
            <th class="px-4 py-2 text-right">Duración</th>
          </tr>
        </thead>
        <tbody>
          ${completados.map(t => `
            <tr class="border-b hover:bg-gray-50">
              <td class="px-4 py-2 font-mono">${escapeHtml(t.patente)}</td>
              <td class="px-4 py-2">${escapeHtml(t.conductor)}</td>
              <td class="px-4 py-2">${escapeHtml(t.motivo)}</td>
              <td class="px-4 py-2 text-xs">${formatDateTime(t.salida)}</td>
              <td class="px-4 py-2 text-xs">${formatDateTime(t.llegada)}</td>
              <td class="px-4 py-2 text-right">${((t.km_llegada||0)-t.km_salida).toLocaleString('es-ES')} km</td>
              <td class="px-4 py-2 text-right text-gray-500">${durationBetween(t.salida, t.llegada)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
  }
}

// ========== FUNCIONES PARA TABLA DE VEHÍCULOS ==========
function renderTablaVehiculos(filtro = '') {
  const tbody = document.getElementById("tablaVehiculos");
  if (!tbody) return;
  let vehiculosFiltrados = window.vehicles;
  if (filtro) {
    const f = filtro.toLowerCase();
    vehiculosFiltrados = window.vehicles.filter(v => 
      v.placa.toLowerCase().includes(f) || 
      (v.marca && v.marca.toLowerCase().includes(f)) || 
      (v.modelo && v.modelo.toLowerCase().includes(f))
    );
  }
  document.getElementById("vehiculosCount").innerText = vehiculosFiltrados.length;
  
  if (vehiculosFiltrados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4">No hay vehículos registrados</td></tr>';
    return;
  }
  
  const formatFecha = (f) => f ? new Date(f).toLocaleDateString('es-ES') : '-';
  const alertaClase = (f) => {
    if (!f) return '';
    const d = new Date(f);
    if (isNaN(d.getTime())) return '';
    const dias = Math.ceil((d - new Date()) / (1000*60*60*24));
    if (dias < 0) return 'bg-red-100 text-red-700 font-semibold';
    if (dias < 30) return 'bg-yellow-100 text-yellow-700';
    return '';
  };
  
  tbody.innerHTML = vehiculosFiltrados.map(v => `
    <tr class="border-b hover:bg-gray-50">
      <td class="px-4 py-2 font-mono">${escapeHtml(v.placa)}</td>
      <td class="px-4 py-2">${escapeHtml(v.marca || '')} ${escapeHtml(v.modelo || '')}</td>
      <td class="px-4 py-2 text-right">${formatearKm(v.km_actual)}</td>
      <td class="px-4 py-2 ${alertaClase(v.vencimiento_soat)}">${formatFecha(v.vencimiento_soat)}</td>
      <td class="px-4 py-2 ${alertaClase(v.vencimiento_revision)}">${formatFecha(v.vencimiento_revision)}</td>
      <td class="px-4 py-2 ${alertaClase(v.vencimiento_seguro)}">${formatFecha(v.vencimiento_seguro)}</td>
      <td class="px-4 py-2 ${alertaClase(v.vencimiento_gps)}">${formatFecha(v.vencimiento_gps)}</td>
      <td class="px-4 py-2">${v.vencimiento_lunas || '-'}</td>
      <td class="px-4 py-2 text-center">
        <button class="editar-vencimientos bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs" data-placa="${v.placa}">📅 Actualizar vencimientos</button>
      </td>
    </tr>
  `).join('');
  
  document.querySelectorAll('.editar-vencimientos').forEach(btn => {
    btn.addEventListener('click', () => {
      const placa = btn.dataset.placa;
      const vehiculo = window.vehicles.find(v => v.placa === placa);
      if (vehiculo) abrirModalVencimientos(vehiculo);
    });
  });
}

function abrirModalVencimientos(vehiculo) {
  document.getElementById("editPlacaOriginal").value = vehiculo.placa;
  document.getElementById("editPlacaDisplay").innerText = vehiculo.placa;
  document.getElementById("editSoat").value = vehiculo.vencimiento_soat ? vehiculo.vencimiento_soat.split('T')[0] : '';
  document.getElementById("editGps").value = vehiculo.vencimiento_gps ? vehiculo.vencimiento_gps.split('T')[0] : '';
  document.getElementById("editSeguro").value = vehiculo.vencimiento_seguro ? vehiculo.vencimiento_seguro.split('T')[0] : '';
  document.getElementById("editRevision").value = vehiculo.vencimiento_revision ? vehiculo.vencimiento_revision.split('T')[0] : '';
  document.getElementById("editLunas").value = vehiculo.vencimiento_lunas || '';
  document.getElementById("modalEditarVencimientos").classList.remove("hidden");
}

// ========== FUNCIONES PARA TESORERÍA (GASTOS DE PEAJE Y SALDOS POR VEHÍCULO) ==========
async function cargarGastosPeaje() {
  const { data, error } = await supabaseClient
    .from('trip_expenses')
    .select(`
      id,
      monto,
      factura_url,
      proveedor,
      created_at,
      trips (patente)
    `)
    .eq('tipo', 'peaje')
    .order('created_at', { ascending: false });
  if (error) {
    console.error(error);
    return [];
  }
  return data;
}

function renderTablaPeajes(gastos) {
  const tbody = document.getElementById("tablaPeajes");
  if (!tbody) return;
  if (gastos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">No hay gastos de peaje</td></tr>';
    return;
  }
  tbody.innerHTML = gastos.map(g => `
    <tr class="border-b hover:bg-gray-50">
      <td class="px-4 py-2">${formatDateTime(g.created_at)}</td>
      <td class="px-4 py-2 font-mono">${g.trips?.patente || '—'}</td>
      <td class="px-4 py-2">${g.proveedor || '—'}</td>
      <td class="px-4 py-2 text-right">S/ ${g.monto.toFixed(2)}</td>
      <td class="px-4 py-2">${g.factura_url ? `<a href="${g.factura_url}" target="_blank" class="text-blue-500 underline">Ver PDF</a>` : '—'}</td>
      <td class="px-4 py-2"><span class="px-2 py-1 rounded-full text-xs bg-gray-100">Registrado</span></td>
    </tr>
  `).join('');
}

async function cargarSaldosPeaje() {
  const { data, error } = await supabaseClient
    .from('vehiculo_saldo_peaje')
    .select(`
      placa,
      saldo,
      vehicles (marca, modelo)
    `)
    .order('placa');
  if (error) return [];
  return data;
}

function renderTablaSaldosPeaje(saldos) {
  const tbody = document.getElementById("tablaSaldosPeaje");
  if (!tbody) return;
  if (!saldos || saldos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4">No hay datos de saldo</td></tr>';
    return;
  }
  tbody.innerHTML = saldos.map(s => `
    <tr class="border-b hover:bg-gray-50">
      <td class="px-4 py-2 font-mono">${escapeHtml(s.placa)}</td>
      <td class="px-4 py-2">${escapeHtml(s.vehicles?.marca || '')} ${escapeHtml(s.vehicles?.modelo || '')}</td>
      <td class="px-4 py-2 text-right font-bold ${(s.saldo || 0) < 30 ? 'text-red-600' : 'text-green-600'}">S/ ${(s.saldo || 0).toFixed(2)}</td>
      <td class="px-4 py-2 text-center">
        <button class="recargar-vehiculo bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs" data-placa="${s.placa}">➕ Recargar</button>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('.recargar-vehiculo').forEach(btn => {
    btn.addEventListener('click', () => {
      const placa = btn.dataset.placa;
      mostrarModalRecarga(placa);
    });
  });
}

function mostrarModalRecarga(placa) {
  document.getElementById("recargaPlaca").value = placa;
  document.getElementById("recargaPlacaDisplay").value = placa;
  document.getElementById("modalRecarga").classList.remove("hidden");
}

// ========== FUNCIONES DE TESORERÍA (OPERACIONES CON LA BD) – SE USAN EN handlers.js ==========
if (typeof window.obtenerSaldoPeaje === 'undefined') {
  async function obtenerSaldoPeaje(placa) {
    const { data, error } = await supabaseClient
      .from('vehiculo_saldo_peaje')
      .select('saldo')
      .eq('placa', placa)
      .single();
    if (error) return 0;
    return data?.saldo || 0;
  }
  window.obtenerSaldoPeaje = obtenerSaldoPeaje;
}

if (typeof window.recargarSaldoPeaje === 'undefined') {
  async function recargarSaldoPeaje(placa, monto) {
    const { data: current } = await supabaseClient
      .from('vehiculo_saldo_peaje')
      .select('saldo')
      .eq('placa', placa)
      .single();
    const nuevoSaldo = (current?.saldo || 0) + monto;
    const { error } = await supabaseClient
      .from('vehiculo_saldo_peaje')
      .update({ saldo: nuevoSaldo, ultima_actualizacion: new Date().toISOString() })
      .eq('placa', placa);
    return !error;
  }
  window.recargarSaldoPeaje = recargarSaldoPeaje;
}

if (typeof window.descontarSaldoPeaje === 'undefined') {
  async function descontarSaldoPeaje(placa, monto) {
    const { data: current } = await supabaseClient
      .from('vehiculo_saldo_peaje')
      .select('saldo')
      .eq('placa', placa)
      .single();
    const nuevoSaldo = (current?.saldo || 0) - monto;
    const { error } = await supabaseClient
      .from('vehiculo_saldo_peaje')
      .update({ saldo: nuevoSaldo, ultima_actualizacion: new Date().toISOString() })
      .eq('placa', placa);
    return !error;
  }
  window.descontarSaldoPeaje = descontarSaldoPeaje;
}

if (typeof window.obtenerTodosLosSaldosPeaje === 'undefined') {
  async function obtenerTodosLosSaldosPeaje() {
    const { data, error } = await supabaseClient
      .from('vehiculo_saldo_peaje')
      .select(`
        placa,
        saldo,
        vehicles (marca, modelo)
      `)
      .order('placa');
    if (error) return [];
    return data;
  }
  window.obtenerTodosLosSaldosPeaje = obtenerTodosLosSaldosPeaje;
}

// ========== EXPOSICIÓN GLOBAL DE FUNCIONES NECESARIAS ==========
window.renderChecklistGrid = renderChecklistGrid;
window.mostrarInfoVehiculo = mostrarInfoVehiculo;
window.updateUI = updateUI;
window.renderTablaVehiculos = renderTablaVehiculos;
window.cargarGastosPeaje = cargarGastosPeaje;
window.renderTablaPeajes = renderTablaPeajes;
window.cargarSaldosPeaje = cargarSaldosPeaje;
window.renderTablaSaldosPeaje = renderTablaSaldosPeaje;
window.mostrarModalRecarga = mostrarModalRecarga;