// ==================== FUNCIONES AUXILIARES ====================

// Checklist
function emptyChecklist() {
  let obj = {};
  window.CHECKLIST_ITEMS.forEach(k => obj[k] = false);
  return obj;
}

// Formato de fecha y hora (para historial y tarjetas)
function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const anio = String(d.getFullYear()).slice(-2);
  const hora = String(d.getHours()).padStart(2, '0');
  const minuto = String(d.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${anio} ${hora}:${minuto}`;
}

// Formatea fecha a DD-MM-AA (ej: 14-10-26)
function formatearFechaCorta(fecha) {
  if (!fecha) return '-';
  // Si la fecha está en formato ISO (YYYY-MM-DD)
  if (typeof fecha === 'string' && fecha.match(/^\d{4}-\d{2}-\d{2}/)) {
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}-${mes}-${anio.slice(-2)}`;
  }
  // Fallback: intentar convertir con Date (para otros formatos, pero no recomendado)
  let d = new Date(fecha);
  if (isNaN(d.getTime())) return fecha;
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const anio = String(d.getFullYear()).slice(-2);
  return `${dia}-${mes}-${anio}`;
}

// Devuelve número de días hasta vencimiento (puede ser negativo)
function diasHastaVencimiento(fechaISO) {
  if (!fechaISO) return null;
  // Si está en formato ISO (YYYY-MM-DD), construimos fecha en UTC
  let fechaObj;
  if (typeof fechaISO === 'string' && fechaISO.match(/^\d{4}-\d{2}-\d{2}/)) {
    const [anio, mes, dia] = fechaISO.split('-');
    fechaObj = new Date(Date.UTC(anio, mes - 1, dia));
  } else {
    fechaObj = new Date(fechaISO);
    if (isNaN(fechaObj.getTime())) return null;
  }
  const hoy = new Date();
  const hoyUTC = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()));
  const diff = Math.ceil((fechaObj - hoyUTC) / (1000 * 60 * 60 * 24));
  return diff;
}

// Devuelve clase CSS para la celda según vencimiento
function clasePorDias(fechaISO) {
  const dias = diasHastaVencimiento(fechaISO);
  if (dias === null) return '';
  if (dias < 0) return 'bg-red-100 text-red-700 font-semibold';
  if (dias < 30) return 'bg-yellow-100 text-yellow-700';
  return '';
}

// Devuelve texto de alerta (para mostrarInfoVehiculo)
function textoAlertaVencimiento(fechaISO) {
  const dias = diasHastaVencimiento(fechaISO);
  if (dias === null) return '';
  if (dias < 0) return ' (VENCIDO)';
  if (dias < 30) return ` (vence en ${dias} días)`;
  return '';
}

// Duración entre dos fechas
function durationBetween(start, end) {
  if (!start || !end) return "";
  const ms = new Date(end) - new Date(start);
  const m = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h > 0 ? `${h}h ${mm}m` : `${mm}m`;
}

// Escapar HTML
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>]/g, function(m) {
    if (m === "&") return "&amp;";
    if (m === "<") return "&lt;";
    if (m === ">") return "&gt;";
    return m;
  });
}

// Formatear kilómetros con puntos de miles y coma decimal
function formatearKm(num) {
  if (num === undefined || num === null || isNaN(num)) return '';
  return num.toLocaleString('es-ES', { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  });
}

// Parsear kilómetros desde string con formato español
function parsearKm(texto) {
  if (!texto) return NaN;
  let limpio = texto.replace(/\./g, '').replace(/,/g, '.');
  let num = parseFloat(limpio);
  return isNaN(num) ? NaN : num;
}

// Exponer funciones globalmente
window.emptyChecklist = emptyChecklist;
window.formatDateTime = formatDateTime;
window.formatearFechaCorta = formatearFechaCorta;
window.diasHastaVencimiento = diasHastaVencimiento;
window.clasePorDias = clasePorDias;
window.textoAlertaVencimiento = textoAlertaVencimiento;
window.durationBetween = durationBetween;
window.escapeHtml = escapeHtml;
window.formatearKm = formatearKm;
window.parsearKm = parsearKm;