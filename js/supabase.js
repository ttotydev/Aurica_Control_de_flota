// Cliente Supabase
const supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

// Variables globales de datos
window.trips = [];
window.vehicles = [];

// Funciones de carga
async function loadTrips() {
  const { data, error } = await supabaseClient.from('trips').select('*').order('salida', { ascending: false });
  if (error) console.error(error);
  else window.trips = data || [];
  if (window.updateUI) window.updateUI();
}

async function loadVehicles() {
  const { data, error } = await supabaseClient.from('vehicles').select('*').order('placa');
  if (error) console.error(error);
  else window.vehicles = data || [];
  const datalist = document.getElementById('placasList');
  if (datalist) {
    datalist.innerHTML = '';
    window.vehicles.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.placa;
      datalist.appendChild(opt);
    });
  }
}

async function createTrip(tripData) {
  const { error } = await supabaseClient.from('trips').insert([tripData]);
  if (error) throw error;
  await loadTrips();
}

async function updateTrip(tripId, updateData) {
  const { error } = await supabaseClient.from('trips').update(updateData).eq('id', tripId);
  if (error) throw error;
  await loadTrips();
}

async function updateVehicleKm(placa, nuevoKm) {
  await supabaseClient.from('vehicles').update({ km_actual: nuevoKm }).eq('placa', placa);
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
  return !error;
}

// Exponer funciones globales
window.loadTrips = loadTrips;
window.loadVehicles = loadVehicles;
window.createTrip = createTrip;
window.updateTrip = updateTrip;
window.updateVehicleKm = updateVehicleKm;
window.obtenerSaldoPeajes = obtenerSaldoPeajes;
window.recargarSaldoPeajes = recargarSaldoPeajes;
window.descontarSaldoPeaje = descontarSaldoPeaje;