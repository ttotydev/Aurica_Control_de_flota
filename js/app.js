// Punto de entrada de la aplicación
window.checkSalidaValues = emptyChecklist();
window.checkLlegadaValues = emptyChecklist();

function mostrarLoading(mostrar) {
  const loadingDiv = document.getElementById('loadingOverlay');
  if (loadingDiv) loadingDiv.style.display = mostrar ? 'flex' : 'none';
}

async function start() {
  console.log("🚀 Iniciando aplicación...");
  mostrarLoading(true);

  const btnSalida = document.getElementById("btnSalida");
  if (btnSalida) {
    btnSalida.disabled = true;
    btnSalida.classList.add('opacity-50', 'cursor-not-allowed');
  }

  try {
    // Cargar vehículos y viajes (cada uno ya llamará a updateUI internamente)
    await window.loadVehicles();
    await window.loadTrips();
    console.log("✅ Datos iniciales cargados");
  } catch (error) {
    console.error("Error cargando datos:", error);
  }

  if (btnSalida) {
    btnSalida.disabled = false;
    btnSalida.classList.remove('opacity-50', 'cursor-not-allowed');
  }

  // Inicializar modales, tabs, etc.
  if (typeof window.initModals === 'function') window.initModals();
  if (typeof window.initTabs === 'function') window.initTabs();
  if (typeof window.initFinalizarButtons === 'function') window.initFinalizarButtons();

  // Renderizar checklists (solo si existen los contenedores)
  if (typeof window.renderChecklistGrid === 'function') {
    window.renderChecklistGrid("salida", window.checkSalidaValues);
    window.renderChecklistGrid("llegada", window.checkLlegadaValues);
  }

  mostrarLoading(false);

  // Suscripción en tiempo real
  if (typeof supabaseClient !== 'undefined') {
    supabaseClient
      .channel('trips-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
        window.loadTrips(); // ya llama a updateUI
      })
      .subscribe();
  }
}

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}