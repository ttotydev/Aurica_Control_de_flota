// Variables globales para gastos temporales
let gastosTemp = [];
let tipoGastoActual = null;

// ========== FUNCIONES PARA GASTOS CON PDF ==========
function mostrarModalGasto(tipo) {
  tipoGastoActual = tipo;
  const titulo = document.getElementById("gastoTitulo");
  const icono = document.getElementById("gastoIcono");
  const contenedor = document.getElementById("camposGasto");
  if (!titulo || !contenedor) return;

  let tituloTexto = '', iconoClase = '';
  if (tipo === 'gasolina') {
    tituloTexto = 'Gasolina';
    iconoClase = 'fas fa-gas-pump text-green-600';
  } else if (tipo === 'peaje') {
    tituloTexto = 'Peaje';
    iconoClase = 'fas fa-toll text-yellow-600';
  } else {
    tituloTexto = 'Mantenimiento';
    iconoClase = 'fas fa-wrench text-purple-600';
  }
  titulo.querySelector('span').innerText = `Registrar ${tituloTexto}`;
  if (icono) icono.className = iconoClase;

  contenedor.innerHTML = `
    <div><label class="block text-sm font-medium mb-1">Proveedor *</label><input id="proveedor" type="text" class="w-full border rounded-lg p-2" placeholder="Ej: ${tipo === 'gasolina' ? 'Primax' : tipo === 'peaje' ? 'Ruta 28' : 'Taller Central'}"></div>
    <div><label class="block text-sm font-medium mb-1">Monto total (S/) *</label><input id="monto" type="number" step="0.01" class="w-full border rounded-lg p-2" placeholder="0.00"></div>
    <div><label class="block text-sm font-medium mb-1">Adjuntar factura (PDF)</label>
      <input type="file" id="factura_pdf" accept="application/pdf" class="w-full border rounded-lg p-2">
      <p class="text-xs text-gray-400 mt-1">Máximo 5 MB, solo PDF</p>
    </div>
  `;
  document.getElementById("modalGasto").classList.remove("hidden");
}

async function guardarGasto() {
  const proveedor = document.getElementById("proveedor")?.value.trim();
  const monto = parseFloat(document.getElementById("monto")?.value);
  const fileInput = document.getElementById("factura_pdf");
  const archivo = fileInput?.files[0];

  if (!proveedor || isNaN(monto) || monto <= 0) {
    alert("Complete proveedor y monto válido");
    return;
  }

  let facturaUrl = null;
  if (archivo) {
    if (archivo.type !== 'application/pdf') {
      alert("Solo se permiten archivos PDF");
      return;
    }
    if (archivo.size > 5 * 1024 * 1024) {
      alert("El archivo no debe superar los 5 MB");
      return;
    }
    const fileName = `gasto_${Date.now()}_${archivo.name}`;
    const { error } = await supabaseClient.storage
      .from('facturas')
      .upload(fileName, archivo);
    if (error) {
      alert("Error al subir el archivo: " + error.message);
      return;
    }
    const { data: urlData } = supabaseClient.storage
      .from('facturas')
      .getPublicUrl(fileName);
    facturaUrl = urlData.publicUrl;
  }

  gastosTemp.push({
    tipo: tipoGastoActual,
    id: Date.now(),
    proveedor,
    monto,
    factura_url: facturaUrl
  });
  actualizarListaGastos();
  document.getElementById("modalGasto").classList.add("hidden");
}

function actualizarListaGastos() {
  const listaDiv = document.getElementById("listaGastos");
  if (!listaDiv) return;

  if (gastosTemp.length === 0) {
    listaDiv.innerHTML = '<div class="text-center text-gray-400 text-xs py-2">No hay gastos registrados</div>';
    actualizarTotalGastos();
    return;
  }

  listaDiv.innerHTML = '';
  gastosTemp.forEach((g, idx) => {
    let color = '', icono = '';
    if (g.tipo === 'gasolina') { color = 'border-l-4 border-green-500'; icono = '⛽'; }
    else if (g.tipo === 'peaje') { color = 'border-l-4 border-yellow-500'; icono = '🛣️'; }
    else { color = 'border-l-4 border-purple-500'; icono = '🔧'; }

    const div = document.createElement('div');
    div.className = `bg-white rounded-lg shadow-sm p-3 ${color}`;
    div.innerHTML = `
      <div class="flex justify-between items-start">
        <div class="flex items-center gap-2">
          <span class="text-xl">${icono}</span>
          <div>
            <p class="font-semibold text-sm capitalize">${g.tipo}</p>
            <p class="text-xs text-gray-600">${g.proveedor}</p>
            ${g.factura_url ? `<a href="${g.factura_url}" target="_blank" class="text-blue-500 text-xs underline">📄 Ver factura</a>` : '<span class="text-xs text-gray-400">Sin factura</span>'}
          </div>
        </div>
        <div class="text-right">
          <p class="font-bold text-gray-800">S/ ${g.monto.toFixed(2)}</p>
          <button class="text-red-500 text-xs eliminar-gasto mt-1" data-idx="${idx}">🗑️ Eliminar</button>
        </div>
      </div>
    `;
    listaDiv.appendChild(div);
  });

  document.querySelectorAll('.eliminar-gasto').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(btn.dataset.idx);
      if (confirm('¿Eliminar este gasto?')) {
        gastosTemp.splice(idx, 1);
        actualizarListaGastos();
      }
    });
  });
  actualizarTotalGastos();
}

function actualizarTotalGastos() {
  const total = gastosTemp.reduce((sum, g) => sum + (g.monto || 0), 0);
  const totalLabel = document.getElementById("totalGastosLabel");
  if (totalLabel) totalLabel.innerText = `Total: S/ ${total.toFixed(2)}`;
}

// ========== HANDLERS PRINCIPALES ==========
async function handleSalida(e) {
  e.preventDefault();
  const patente = document.getElementById("sPatente").value.trim().toUpperCase();
  const agente = document.getElementById("sAgente").value.trim();
  const conductor = document.getElementById("sConductor").value.trim();
  const motivo = document.getElementById("sMotivo").value.trim();

  let kmSalida = parsearKm(document.getElementById("sKm").value);
  if (isNaN(kmSalida)) {
    alert("Kilometraje inválido");
    return;
  }
  if (!patente || !agente || !conductor || !motivo) {
    alert("Completa todos los campos");
    return;
  }

  const vehiculo = window.vehicles.find(v => v.placa === patente);
  if (vehiculo && kmSalida < vehiculo.km_actual) {
    alert(`El km de salida (${kmSalida.toLocaleString('es-ES')}) no puede ser menor al km actual del vehículo (${vehiculo.km_actual.toLocaleString('es-ES')}).`);
    return;
  }

  const obsSalida = document.getElementById("sObs").value.trim() || undefined;
  const checklistSalida = { ...window.checkSalidaValues };

  const newTrip = {
    patente, agente_salida: agente, conductor, motivo, km_salida: kmSalida, obs_salida: obsSalida,
    checklist_salida: checklistSalida, salida: new Date().toISOString(), status: "en_ruta"
  };

  try {
    await window.createTrip(newTrip);
    document.getElementById("modalSalida").classList.add("hidden");
    document.getElementById("formSalida").reset();
    window.checkSalidaValues = emptyChecklist();
    window.renderChecklistGrid("salida", window.checkSalidaValues);
  } catch (err) {
    alert("Error al registrar: " + err.message);
  }
}

async function handleLlegada(e) {
  e.preventDefault();
  const tripId = document.getElementById("lTripId").value;
  if (!tripId) { alert("No se ha seleccionado ningún viaje"); return; }
  const agenteLlegada = document.getElementById("lAgente").value.trim();
  let kmLlegada = parsearKm(document.getElementById("lKm").value);
  if (isNaN(kmLlegada)) {
    alert("Kilometraje inválido");
    return;
  }
  const obsLlegada = document.getElementById("lObs").value.trim() || undefined;
  if (!agenteLlegada || isNaN(kmLlegada)) { alert("Complete agente y km válido"); return; }
  const tripOriginal = window.trips.find(t => t.id === tripId);
  if (!tripOriginal) { alert("Viaje no encontrado"); return; }
  if (kmLlegada < tripOriginal.km_salida) { alert(`El km de llegada debe ser mayor o igual a ${tripOriginal.km_salida}`); return; }
  const checklistLlegada = { ...window.checkLlegadaValues };
  const updateData = {
    agente_llegada: agenteLlegada,
    km_llegada: kmLlegada,
    km_usados: kmLlegada - tripOriginal.km_salida,
    obs_llegada: obsLlegada,
    checklist_llegada: checklistLlegada,
    llegada: new Date().toISOString(),
    status: "completado"
  };
  try {
    await window.updateTrip(tripId, updateData);

    // Guardar gastos y descontar saldo si es peaje
    if (gastosTemp.length > 0) {
      for (const gasto of gastosTemp) {
        const insertData = {
          trip_id: tripId,
          tipo: gasto.tipo,
          monto: gasto.monto,
          factura_url: gasto.factura_url || null,
          proveedor: gasto.proveedor || null,
          revisado: false
        };
        const { error } = await supabaseClient.from('trip_expenses').insert([insertData]);
        if (error) console.error("Error al insertar gasto:", error);

        // Si el gasto es de peaje, descontar del saldo de tesorería
        if (gasto.tipo === 'peaje') {
          await window.descontarSaldoPeaje(gasto.monto);
        }
      }
      gastosTemp = [];
    }

    // Actualizar km del vehículo
    const vehicleIndex = window.vehicles.findIndex(v => v.placa === tripOriginal.patente);
    if (vehicleIndex !== -1) {
      window.vehicles[vehicleIndex].km_actual = kmLlegada;
    }
    await window.updateVehicleKm(tripOriginal.patente, kmLlegada);

    document.getElementById("modalLlegada").classList.add("hidden");
    document.getElementById("formLlegada").reset();
    window.checkLlegadaValues = emptyChecklist();
    window.renderChecklistGrid("llegada", window.checkLlegadaValues);
  } catch (err) {
    alert("Error al registrar llegada: " + err.message);
  }
}

// ========== INICIALIZACIÓN DE MODALES, TABS, BOTONES ==========
function initModals() {
  const modalSalida = document.getElementById("modalSalida");
  const modalLlegada = document.getElementById("modalLlegada");
  const btnSalida = document.getElementById("btnSalida");
  if (!btnSalida) return;

  btnSalida.onclick = () => {
    window.checkSalidaValues = emptyChecklist();
    window.renderChecklistGrid("salida", window.checkSalidaValues);
    modalSalida.classList.remove("hidden");
    document.getElementById("sPatente").value = "";
    document.getElementById("vehiculoInfo").classList.add("hidden");
  };

  document.getElementById("closeSalidaBtn").onclick = () => modalSalida.classList.add("hidden");
  document.getElementById("closeLlegadaBtn").onclick = () => modalLlegada.classList.add("hidden");
  window.onclick = (e) => {
    if (e.target === modalSalida) modalSalida.classList.add("hidden");
    if (e.target === modalLlegada) modalLlegada.classList.add("hidden");
  };
  document.getElementById("formSalida").addEventListener("submit", handleSalida);
  document.getElementById("formLlegada").addEventListener("submit", handleLlegada);

  const placaInput = document.getElementById("sPatente");
  if (placaInput) {
    placaInput.addEventListener("input", () => window.mostrarInfoVehiculo(placaInput.value));
  }

  // Botones de gastos
  const btnGas = document.getElementById("btnAddGasolina");
  const btnPeaje = document.getElementById("btnAddPeaje");
  const btnMant = document.getElementById("btnAddMantenimiento");
  if (btnGas) btnGas.onclick = () => mostrarModalGasto('gasolina');
  if (btnPeaje) btnPeaje.onclick = () => mostrarModalGasto('peaje');
  if (btnMant) btnMant.onclick = () => mostrarModalGasto('mantenimiento');

  const guardarBtn = document.getElementById("guardarGastoBtn");
  const cancelarBtn = document.getElementById("cancelarGastoBtn");
  if (guardarBtn) guardarBtn.onclick = guardarGasto;
  if (cancelarBtn) cancelarBtn.onclick = () => document.getElementById("modalGasto")?.classList.add("hidden");

  // Modal recarga
  const btnRecargar = document.getElementById("btnRecargar");
  if (btnRecargar) {
    btnRecargar.onclick = () => document.getElementById("modalRecarga").classList.remove("hidden");
  }
  document.getElementById("cancelarRecargaBtn")?.addEventListener("click", () => {
    document.getElementById("modalRecarga").classList.add("hidden");
  });
  document.getElementById("formRecarga")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const monto = parseFloat(document.getElementById("montoRecarga").value);
    if (isNaN(monto) || monto <= 0) {
      alert("Monto inválido");
      return;
    }
    const ok = await window.recargarSaldoPeajes(monto);
    if (ok) {
      alert("Saldo recargado exitosamente");
      document.getElementById("modalRecarga").classList.add("hidden");
      // Refrescar pestaña de tesorería si está activa
      if (document.getElementById("panelTesoreria") && !document.getElementById("panelTesoreria").classList.contains("hidden")) {
        const saldo = await window.obtenerSaldoPeajes();
        document.getElementById("saldoPeaje").innerText = `S/ ${saldo.toFixed(2)}`;
        const alerta = document.getElementById("alertaSaldo");
        if (saldo < 30) alerta.classList.remove("hidden");
        else alerta.classList.add("hidden");
        // Recargar lista de peajes (si existe la función global)
        if (window.cargarGastosPeaje && window.renderTablaPeajes) {
          const gastos = await window.cargarGastosPeaje();
          window.renderTablaPeajes(gastos);
        }
      }
    } else {
      alert("Error al recargar");
    }
  });
}

function initTabs() {
  const tabEnRuta = document.getElementById("tabEnRutaBtn");
  const tabHistorial = document.getElementById("tabHistorialBtn");
  const tabVehiculos = document.getElementById("tabVehiculosBtn");
  const tabTesoreria = document.getElementById("tabTesoreriaBtn");
  const panelEnRuta = document.getElementById("panelEnRuta");
  const panelHistorial = document.getElementById("panelHistorial");
  const panelVehiculos = document.getElementById("panelVehiculos");
  const panelTesoreria = document.getElementById("panelTesoreria");

  function setActiveTab(active, ...others) {
    active.className = "py-2 px-1 font-medium text-blue-600 border-b-2 border-blue-600";
    others.forEach(tab => {
      if (tab) tab.className = "py-2 px-1 font-medium text-gray-500 border-b-2 border-transparent";
    });
  }

  if (tabEnRuta) {
    tabEnRuta.onclick = () => {
      setActiveTab(tabEnRuta, tabHistorial, tabVehiculos, tabTesoreria);
      panelEnRuta.classList.remove("hidden");
      panelHistorial.classList.add("hidden");
      if (panelVehiculos) panelVehiculos.classList.add("hidden");
      if (panelTesoreria) panelTesoreria.classList.add("hidden");
    };
  }
  if (tabHistorial) {
    tabHistorial.onclick = () => {
      setActiveTab(tabHistorial, tabEnRuta, tabVehiculos, tabTesoreria);
      panelHistorial.classList.remove("hidden");
      panelEnRuta.classList.add("hidden");
      if (panelVehiculos) panelVehiculos.classList.add("hidden");
      if (panelTesoreria) panelTesoreria.classList.add("hidden");
    };
  }
  if (tabVehiculos && panelVehiculos) {
    tabVehiculos.onclick = () => {
      setActiveTab(tabVehiculos, tabEnRuta, tabHistorial, tabTesoreria);
      panelVehiculos.classList.remove("hidden");
      panelEnRuta.classList.add("hidden");
      panelHistorial.classList.add("hidden");
      if (panelTesoreria) panelTesoreria.classList.add("hidden");
      if (window.renderTablaVehiculos) {
        window.renderTablaVehiculos(document.getElementById("buscadorVehiculos")?.value || '');
      }
    };
  }
  if (tabTesoreria && panelTesoreria) {
    tabTesoreria.onclick = async () => {
      setActiveTab(tabTesoreria, tabEnRuta, tabHistorial, tabVehiculos);
      panelTesoreria.classList.remove("hidden");
      panelEnRuta.classList.add("hidden");
      panelHistorial.classList.add("hidden");
      if (panelVehiculos) panelVehiculos.classList.add("hidden");
      // Cargar datos de tesorería
      const saldo = await window.obtenerSaldoPeajes();
      document.getElementById("saldoPeaje").innerText = `S/ ${saldo.toFixed(2)}`;
      const alerta = document.getElementById("alertaSaldo");
      if (saldo < 30) alerta.classList.remove("hidden");
      else alerta.classList.add("hidden");
      if (window.cargarGastosPeaje && window.renderTablaPeajes) {
        const gastos = await window.cargarGastosPeaje();
        window.renderTablaPeajes(gastos);
      }
    };
  }
}

function initFinalizarButtons() {
  const panel = document.getElementById("panelEnRuta");
  if (!panel) return;
  panel.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-finalizar");
    if (!btn) return;
    const id = btn.dataset.id;
    const patente = btn.dataset.patente;
    const conductor = btn.dataset.conductor;
    const kmSalida = btn.dataset.km;
    const vehiculo = window.vehicles.find(v => v.placa === patente);
    const kmActualVehiculo = vehiculo ? vehiculo.km_actual : Number(kmSalida);

    document.getElementById("lTripId").value = id;
    document.getElementById("lPatente").value = patente;
    document.getElementById("lConductor").value = conductor;
    document.getElementById("lKm").value = formatearKm(kmActualVehiculo);
    document.getElementById("lAgente").value = "";
    document.getElementById("lObs").value = "";
    window.checkLlegadaValues = emptyChecklist();
    window.renderChecklistGrid("llegada", window.checkLlegadaValues);
    gastosTemp = [];
    actualizarListaGastos();
    document.getElementById("modalLlegada").classList.remove("hidden");
  });
}

// ========== MANEJADOR DE VENCIMIENTOS ==========
async function guardarVencimientos(e) {
  e.preventDefault();
  const placa = document.getElementById("editPlacaOriginal").value;
  const updateData = {
    vencimiento_soat: document.getElementById("editSoat").value || null,
    vencimiento_gps: document.getElementById("editGps").value || null,
    vencimiento_seguro: document.getElementById("editSeguro").value || null,
    vencimiento_revision: document.getElementById("editRevision").value || null,
    vencimiento_lunas: document.getElementById("editLunas").value || null
  };
  try {
    const { error } = await supabaseClient.from('vehicles').update(updateData).eq('placa', placa);
    if (error) throw error;
    const idx = window.vehicles.findIndex(v => v.placa === placa);
    if (idx !== -1) window.vehicles[idx] = { ...window.vehicles[idx], ...updateData };
    if (window.renderTablaVehiculos) {
      const filtro = document.getElementById("buscadorVehiculos")?.value || '';
      window.renderTablaVehiculos(filtro);
    }
    document.getElementById("modalEditarVencimientos").classList.add("hidden");
    alert("Vencimientos actualizados");
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// ========== EVENTOS GLOBALES ==========
document.addEventListener("DOMContentLoaded", () => {
  const formEditar = document.getElementById("formEditarVencimientos");
  if (formEditar) formEditar.addEventListener("submit", guardarVencimientos);
  const cancelarEditar = document.getElementById("cancelarEditarBtn");
  if (cancelarEditar) cancelarEditar.onclick = () => document.getElementById("modalEditarVencimientos")?.classList.add("hidden");

  const buscador = document.getElementById("buscadorVehiculos");
  if (buscador) {
    buscador.addEventListener("input", (e) => {
      if (window.renderTablaVehiculos) window.renderTablaVehiculos(e.target.value);
    });
  }
  const actualizarBtn = document.getElementById("btnActualizarVehiculos");
  if (actualizarBtn) {
    actualizarBtn.addEventListener("click", async () => {
      await window.loadVehicles();
      if (window.renderTablaVehiculos) {
        window.renderTablaVehiculos(document.getElementById("buscadorVehiculos")?.value || '');
      }
    });
  }
});

// Exponer funciones globales necesarias
window.handleSalida = handleSalida;
window.handleLlegada = handleLlegada;
window.initModals = initModals;
window.initTabs = initTabs;
window.initFinalizarButtons = initFinalizarButtons;