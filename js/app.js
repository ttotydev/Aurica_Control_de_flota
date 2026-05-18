// Punto de entrada de la aplicación
window.checkSalidaValues = emptyChecklist();
window.checkLlegadaValues = emptyChecklist();

// Mostrar un loading mientras carga
function mostrarLoading(mostrar) {
  const loadingDiv = document.getElementById('loadingOverlay');
  if (loadingDiv) {
    loadingDiv.style.display = mostrar ? 'flex' : 'none';
  }
}

async function start() {
  console.log("🚀 Iniciando aplicación...");
  
  // Mostrar loading (opcional, añadir un div en el HTML)
  mostrarLoading(true);
  
  // Deshabilitar botón de salida temporalmente
  const btnSalida = document.getElementById("btnSalida");
  if (btnSalida) {
    btnSalida.disabled = true;
    btnSalida.classList.add('opacity-50', 'cursor-not-allowed');
  }
  
  await window.loadVehicles();
  await window.loadTrips();
  
  // Una vez cargado, habilitar
  if (btnSalida) {
    btnSalida.disabled = false;
    btnSalida.classList.remove('opacity-50', 'cursor-not-allowed');
  }
  
  // Inicializar modales y otros (esto asigna eventos)
  if (typeof window.initModals === 'function') {
    window.initModals();
    console.log("✅ initModals ejecutada");
  } else {
    console.error("❌ initModals NO está definida");
  }
  
  if (typeof window.initTabs === 'function') {
    window.initTabs();
  } else {
    console.error("❌ initTabs NO está definida");
  }
  
  if (typeof window.initFinalizarButtons === 'function') {
    window.initFinalizarButtons();
  } else {
    console.error("❌ initFinalizarButtons NO está definida");
  }
  
  window.renderChecklistGrid("salida", window.checkSalidaValues);
  window.renderChecklistGrid("llegada", window.checkLlegadaValues);
  
  mostrarLoading(false);
  
  // Suscripción en tiempo real
  if (typeof supabaseClient !== 'undefined') {
    supabaseClient
      .channel('trips-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
        window.loadTrips();
      })
      .subscribe();
  }
}

start();