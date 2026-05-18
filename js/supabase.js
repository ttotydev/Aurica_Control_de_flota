// Cliente Supabase
const supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

// Variables globales de datos
window.trips = [];
window.vehicles = [];

// ========== FUNCIONES DE CARGA ==========
async function loadTrips() {
  console.log("📡 Cargando viajes...");
  const { data, error } = await supabaseClient.from('trips').select('*').order('salida', { ascending: false });
  if (error) {
    console.error("Error loading trips:", error);
    return;
  }
  window.trips = data || [];
  console.log(`✅ ${window.trips.length} viajes cargados`);
  // Actualizar UI después de cargar viajes
  if (typeof window.updateUI === 'function') {
    await window.updateUI();
  } else {
    console.warn("updateUI no está definida aún");
  }
}

async function loadVehicles() {
  console.log("📡 Cargando vehículos...");
  const { data, error } = await supabaseClient.from('vehicles').select('*').order('placa');
  if (error) {
    console.error("Error loading vehicles:", error);
    return;
  }
  window.vehicles = data || [];
  console.log(`✅ ${window.vehicles.length} vehículos cargados`);
  
  // Llenar datalist de placas
  const datalist = document.getElementById('placasList');
  if (datalist) {
    datalist.innerHTML = '';
    window.vehicles.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.placa;
      datalist.appendChild(opt);
    });
  }
  
  // Actualizar UI después de cargar vehículos
  if (typeof window.updateUI === 'function') {
    await window.updateUI();
  }
}

// ========== OPERACIONES ==========
async function createTrip(tripData) {
  const { error } = await supabaseClient.from('trips').insert([tripData]);
  if (error) throw error;
  await loadTrips(); // esto ya llama a updateUI
}

async function updateTrip(tripId, updateData) {
  const { error } = await supabaseClient.from('trips').update(updateData).eq('id', tripId);
  if (error) throw error;
  await loadTrips(); // esto ya llama a updateUI
}

async function updateVehicleKm(placa, nuevoKm) {
  const { error } = await supabaseClient.from('vehicles').update({ km_actual: nuevoKm }).eq('placa', placa);
  if (error) throw error;
  // Actualizar también el array local
  const vehicle = window.vehicles.find(v => v.placa === placa);
  if (vehicle) vehicle.km_actual = nuevoKm;
  // Refrescar UI (por si se muestra el km en algún lado)
  if (typeof window.updateUI === 'function') {
    await window.updateUI();
  }
}

// ========== FUNCIONES DE TESORERÍA ==========
async function obtenerSaldoPeajes() {
  const { data, error } = await supabaseClient
    .from('tesoreria_saldo')
    .select('saldo')
    .eq('id', 1)
    .single();
  if (error) return 0;
  return data?.saldo || 0;
}

async function recargarSaldoPeajes(monto) {
  const { data: current } = await supabaseClient
    .from('tesoreria_saldo')
    .select('saldo')
    .eq('id', 1)
    .single();
  const nuevoSaldo = (current?.saldo || 0) + monto;
  const { error } = await supabaseClient
    .from('tesoreria_saldo')
    .update({ saldo: nuevoSaldo, ultima_actualizacion: new Date().toISOString() })
    .eq('id', 1);
  if (!error && typeof window.updateUI === 'function') {
    await window.updateUI(); // para actualizar el saldo mostrado
  }
  return !error;
}

async function descontarSaldoPeaje(monto) {
  const { data: current } = await supabaseClient
    .from('tesoreria_saldo')
    .select('saldo')
    .eq('id', 1)
    .single();
  const nuevoSaldo = (current?.saldo || 0) - monto;
  const { error } = await supabaseClient
    .from('tesoreria_saldo')
    .update({ saldo: nuevoSaldo, ultima_actualizacion: new Date().toISOString() })
    .eq('id', 1);
  if (!error && typeof window.updateUI === 'function') {
    await window.updateUI();
  }
  return !error;
}

// ========== EXPOSICIÓN GLOBAL ==========
window.loadTrips = loadTrips;
window.loadVehicles = loadVehicles;
window.createTrip = createTrip;
window.updateTrip = updateTrip;
window.updateVehicleKm = updateVehicleKm;
window.obtenerSaldoPeajes = obtenerSaldoPeajes;
window.recargarSaldoPeajes = recargarSaldoPeajes;
window.descontarSaldoPeaje = descontarSaldoPeaje;