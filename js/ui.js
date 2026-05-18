// ========== ASEGURAR VARIABLES GLOBALES ==========
if (!window.CHECKLIST_ITEMS) {
  window.CHECKLIST_ITEMS = ['licencia', 'tanque', 'neumaticos', 'luces', 'frenos', 'documentos'];
  window.CHECKLIST_LABELS = {
    licencia: 'Licencia de conducir',
    tanque: 'Tanque lleno',
    neumaticos: 'Neumáticos',
    luces: 'Luces',
    frenos: 'Frenos',
    documentos: 'Documentos'
  };
}

// ========== FUNCIONES DE RENDERIZADO ==========
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
    if (counter) counter.innerText = `${c}/${window.CHECKLIST_ITEMS.length}`;
  };
  container.querySelectorAll("input[type=checkbox]").forEach(cb => cb.addEventListener("change", updateCount));
  updateCount();
}

function mostrarInfoVehiculo(placa) {
  const veh = window.vehicles.find(v => v.placa === placa);
  const infoDiv = document.getElementById("vehiculoInfo");
  if (!veh) { if (infoDiv) infoDiv.classList.add("hidden"); return; }
  if (infoDiv) infoDiv.classList.remove("hidden");
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
  setText("vehMarcaModelo", `${veh.marca || ''} ${veh.modelo || ''}`.trim() || '-');
  setText("vehAnio", veh.año || '-');
  setText("vehKmActual", (veh.km_actual || 0).toLocaleString('es-ES'));
  const formatFecha = f => f ? new Date(f).toLocaleDateString('es-ES') : '-';
  const alerta = f => {
    if (!f) return '';
    const dias = Math.ceil((new Date(f) - new Date()) / (86400000));
    if (dias < 0) return ' (VENCIDO)';
    if (dias < 30) return ` (vence en ${dias} días)`;
    return '';
  };
  setText("vehSoat", formatFecha(veh.vencimiento_soat));
  setText("alertSoat", alerta(veh.vencimiento_soat));
  setText("vehRevision", formatFecha(veh.vencimiento_revision));
  setText("alertRevision", alerta(veh.vencimiento_revision));
  setText("vehSeguro", formatFecha(veh.vencimiento_seguro));
  setText("alertSeguro", alerta(veh.vencimiento_seguro));
  setText("vehGps", formatFecha(veh.vencimiento_gps));
  setText("alertGps", alerta(veh.vencimiento_gps));
  setText("vehLunas", veh.vencimiento_lunas || 'No definido');
  setText("alertLunas", '');
  setText("vehFrecMant", veh.frecuencia_mantenimiento || 'No definida');
  const kmInput = document.getElementById("sKm");
  if (kmInput && typeof veh.km_actual === 'number') kmInput.value = formatearKm(veh.km_actual);
}

async function updateUI() {
  if (!window.trips) window.trips = [];
  const enRuta = window.trips.filter(t => t.status === "en_ruta");
  const completados = window.trips.filter(t => t.status === "completado").sort((a,b) => (b.llegada||"").localeCompare(a.llegada||""));
  
  const setStat = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
  setStat("statEnRuta", enRuta.length);
  setStat("enRutaCount", enRuta.length);
  setStat("historialCount", completados.length);
  const hoy = new Date().toDateString();
  const llegadasHoy = completados.filter(t => t.llegada && new Date(t.llegada).toDateString() === hoy).length;
  setStat("statHoy", llegadasHoy);
  
  // Saldo total (si existe tabla, si no, 0)
  let saldoTotal = 0;
  try {
    const { data: saldos } = await supabaseClient.from('vehiculo_saldo_peaje').select('saldo');
    saldoTotal = saldos?.reduce((sum, s) => sum + (s.saldo || 0), 0) || 0;
  } catch(e) { console.warn("No se pudo obtener saldo", e); }
  setStat("statKm", `S/ ${saldoTotal.toFixed(2)}`);
  setStat("statTotal", window.trips.length);
  
  // Panel en ruta
  const panelEnRuta = document.getElementById("panelEnRuta");
  if (panelEnRuta) {
    if (!enRuta.length) {
      panelEnRuta.innerHTML = `<div class="col-span-full text-center py-12 border border-dashed rounded-xl text-gray-500"><i class="fas fa-truck text-4xl mb-2"></i><p>Ningún vehículo en ruta</p></div>`;
    } else {
      try {
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
                <div><i class="fas fa-tachometer-alt"></i> Km salida: ${formatearKm(t.km_salida)}</div>
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
      } catch(e) {
        console.error("Error renderizando en ruta:", e);
        panelEnRuta.innerHTML = `<div class="text-red-500 p-4">Error al mostrar viajes: ${e.message}</div>`;
      }
    }
  }
  
  // Panel historial (igual pero simplificado)
  const panelHistorial = document.getElementById("panelHistorial");
  if (panelHistorial) {
    if (!completados.length) {
      panelHistorial.innerHTML = `<div class="text-center py-12 border border-dashed rounded-xl text-gray-500"><i class="fas fa-history text-4xl mb-2"></i><p>Sin viajes completados</p></div>`;
    } else {
      panelHistorial.innerHTML = `<div class="bg-white rounded-xl shadow-card overflow-x-auto">
        <table class="min-w-full text-sm"><thead class="bg-gray-50 border-b"><tr><th class="px-4 py-2 text-left">Placa</th><th class="px-4 py-2 text-left">Conductor</th><th class="px-4 py-2 text-left">Motivo</th><th class="px-4 py-2 text-left">Salida</th><th class="px-4 py-2 text-left">Llegada</th><th class="px-4 py-2 text-right">Km</th><th class="px-4 py-2 text-right">Duración</th></tr></thead><tbody>
        ${completados.map(t => `<tr class="border-b hover:bg-gray-50"><td class="px-4 py-2 font-mono">${escapeHtml(t.patente)}</td><td class="px-4 py-2">${escapeHtml(t.conductor)}</td><td class="px-4 py-2">${escapeHtml(t.motivo)}</td><td class="px-4 py-2 text-xs">${formatDateTime(t.salida)}</td><td class="px-4 py-2 text-xs">${formatDateTime(t.llegada)}</td><td class="px-4 py-2 text-right">${((t.km_llegada||0)-t.km_salida).toLocaleString('es-ES')} km</td><td class="px-4 py-2 text-right text-gray-500">${durationBetween(t.salida, t.llegada)}</td></tr>`).join('')}
        </tbody></table></div>`;
    }
  }
}

// ========== RESTO DE FUNCIONES (tabla vehículos, tesorería, etc.) ==========
// ... (el resto de tu código de ui.js sin cambios, desde renderTablaVehiculos hasta el final)
// Asegúrate de incluir también renderTablaVehiculos, cargarGastosPeaje, etc.