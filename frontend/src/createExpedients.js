// Elementos del DOM
const configModal = document.getElementById('create-expedients-modal');
const tableModal = document.getElementById('expedients-table-modal');
const openBtn = document.getElementById('create-expedients-btn');
const closeConfigBtn = document.getElementById('close-create-expedients-modal');
const closeTableBtn = document.getElementById('close-expedients-table-modal');
const cancelBtn = document.getElementById('cancel-create-expedients');
const form = document.getElementById('create-expedients-form');
const exportBtn = document.getElementById('export-expedients-csv');

const numExpedientsInput = document.getElementById('num-expedients');
const entityNameInput = document.getElementById('entity-name');
const procedureNameInput = document.getElementById('procedure-name');
const asuntoOptionsContainer = document.getElementById('asunto-options');
const unidadOptionsContainer = document.getElementById('unidad-options');
const addAsuntoBtn = document.getElementById('add-asunto-btn');
const addUnidadBtn = document.getElementById('add-unidad-btn');
const dateFromInput = document.getElementById('date-from');
const dateToInput = document.getElementById('date-to');
const tableContainer = document.getElementById('expedients-table-container');

// Datos de los expedientes generados
let generatedExpedients = [];

export function initCreateExpedients() {
  // Abrir modal de configuración
  openBtn.addEventListener('click', openConfigModal);

  // Cerrar modales
  closeConfigBtn.addEventListener('click', closeConfigModal);
  closeTableBtn.addEventListener('click', closeTableModal);
  cancelBtn.addEventListener('click', closeConfigModal);

  configModal.addEventListener('click', (e) => {
    if (e.target === configModal) closeConfigModal();
  });

  tableModal.addEventListener('click', (e) => {
    if (e.target === tableModal) closeTableModal();
  });

  // Añadir opciones dinámicamente
  addAsuntoBtn.addEventListener('click', () => addOptionRow('asunto'));
  addUnidadBtn.addEventListener('click', () => addOptionRow('unidad'));

  // Delegación de eventos para eliminar opciones
  asuntoOptionsContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-remove-option')) {
      removeOptionRow(e.target);
    }
  });

  unidadOptionsContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-remove-option')) {
      removeOptionRow(e.target);
    }
  });

  // Submit del formulario
  form.addEventListener('submit', handleFormSubmit);

  // Exportar CSV
  exportBtn.addEventListener('click', exportToCSV);

  // Inicializar fechas por defecto
  initDefaultDates();
}

function initDefaultDates() {
  const today = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(today.getFullYear() - 1);

  dateFromInput.value = formatDateForInput(oneYearAgo);
  dateToInput.value = formatDateForInput(today);
}

function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function openConfigModal() {
  configModal.classList.add('active');
  resetForm();
}

function closeConfigModal() {
  configModal.classList.remove('active');
}

function closeTableModal() {
  tableModal.classList.remove('active');
}

function resetForm() {
  form.reset();

  // Resetear opciones de asuntos (dejar solo una)
  asuntoOptionsContainer.innerHTML = `
    <div class="option-row">
      <input type="text" class="asunto-label" placeholder="Nombre del asunto" required />
      <input type="number" class="asunto-percent" min="0" max="100" placeholder="%" required />
      <button type="button" class="btn-remove-option">×</button>
    </div>
  `;

  // Resetear opciones de unidades (dejar solo una)
  unidadOptionsContainer.innerHTML = `
    <div class="option-row">
      <input type="text" class="unidad-label" placeholder="Nombre de la unidad" required />
      <input type="number" class="unidad-percent" min="0" max="100" placeholder="%" required />
      <button type="button" class="btn-remove-option">×</button>
    </div>
  `;

  initDefaultDates();
}

function addOptionRow(type) {
  const container = type === 'asunto' ? asuntoOptionsContainer : unidadOptionsContainer;
  const className = type === 'asunto' ? 'asunto' : 'unidad';

  const row = document.createElement('div');
  row.className = 'option-row';
  row.innerHTML = `
    <input type="text" class="${className}-label" placeholder="Nombre del ${type === 'asunto' ? 'asunto' : 'unidad'}" required />
    <input type="number" class="${className}-percent" min="0" max="100" placeholder="%" required />
    <button type="button" class="btn-remove-option">×</button>
  `;

  container.appendChild(row);
}

function removeOptionRow(btn) {
  const container = btn.closest('#asunto-options, #unidad-options');
  const rows = container.querySelectorAll('.option-row');

  // No permitir eliminar si solo hay una opción
  if (rows.length <= 1) {
    alert('Debe haber al menos una opción');
    return;
  }

  btn.closest('.option-row').remove();
}

function getOptionsData(type) {
  const container = type === 'asunto' ? asuntoOptionsContainer : unidadOptionsContainer;
  const rows = container.querySelectorAll('.option-row');
  const options = [];

  rows.forEach(row => {
    const labelInput = row.querySelector(`.${type}-label`);
    const percentInput = row.querySelector(`.${type}-percent`);

    const label = labelInput.value.trim();
    const percent = parseFloat(percentInput.value);

    // Solo añadir si tiene etiqueta y porcentaje válido
    if (label && !isNaN(percent) && percent > 0) {
      options.push({ label, percent });
    }
  });

  return options;
}

function validatePercentages(options, type) {
  // Si no hay opciones, no es necesario validar
  if (options.length === 0) {
    return true;
  }

  const total = options.reduce((sum, opt) => sum + opt.percent, 0);

  if (Math.abs(total - 100) > 0.01) {
    alert(`La suma de porcentajes de ${type === 'asunto' ? 'asuntos' : 'unidades gestoras'} debe ser 100% (actual: ${total.toFixed(2)}%)`);
    return false;
  }

  return true;
}

function handleFormSubmit(e) {
  e.preventDefault();

  const numExpedients = parseInt(numExpedientsInput.value, 10) || 10;
  const entityName = entityNameInput.value.trim();
  const procedureName = procedureNameInput.value.trim();
  const asuntos = getOptionsData('asunto');
  const unidades = getOptionsData('unidad');
  const dateFromValue = dateFromInput.value;
  const dateToValue = dateToInput.value;

  // Validaciones solo si hay datos
  if (asuntos.length > 0) {
    if (!validatePercentages(asuntos, 'asunto')) return;
  }

  if (unidades.length > 0) {
    if (!validatePercentages(unidades, 'unidad')) return;
  }

  // Validar fechas solo si ambas están definidas
  if (dateFromValue && dateToValue) {
    const dateFrom = new Date(dateFromValue);
    const dateTo = new Date(dateToValue);
    if (dateFrom >= dateTo) {
      alert('La fecha "desde" debe ser anterior a la fecha "hasta"');
      return;
    }
  }

  // Generar expedientes
  generatedExpedients = generateExpedients({
    numExpedients,
    entityName,
    procedureName,
    asuntos,
    unidades,
    dateFrom: dateFromValue ? new Date(dateFromValue) : null,
    dateTo: dateToValue ? new Date(dateToValue) : null
  });

  closeConfigModal();
  renderExpedientsTable();
  openTableModal();
}

function generateExpedients({ numExpedients, entityName, procedureName, asuntos, unidades, dateFrom, dateTo }) {
  const expedients = [];

  // Distribuir asuntos según porcentajes (solo si hay asuntos definidos)
  const asuntoDistribution = asuntos.length > 0 ? distributeByPercentage(asuntos, numExpedients) : [];

  // Distribuir unidades según porcentajes (solo si hay unidades definidas)
  const unidadDistribution = unidades.length > 0 ? distributeByPercentage(unidades, numExpedients) : [];

  for (let i = 0; i < numExpedients; i++) {
    const asunto = asuntoDistribution.length > 0 ? asuntoDistribution[i] : '';
    const unidad = unidadDistribution.length > 0 ? unidadDistribution[i] : '';

    // Generar fecha de apertura solo si hay rango de fechas definido
    let fechaApertura = '';
    if (dateFrom && dateTo) {
      fechaApertura = formatDate(randomDate(dateFrom, dateTo));
    }

    expedients.push({
      entidad: entityName,
      numeroExpediente: '', // Vacío
      nombreProcedimiento: procedureName,
      serieDocumental: '', // Vacío
      asuntoLibre: asunto,
      asuntoFijo: '',
      unidadGestora: unidad,
      asignacionTemporal1: '',
      asignacionTemporal2: '',
      eliminarAsignacion: '',
      confidencialidad: '', // Vacío
      fechaApertura: fechaApertura,
      fechaFinalizacion: '' // Vacío
    });
  }

  return expedients;
}

function distributeByPercentage(options, total) {
  const distribution = [];
  let remaining = total;

  // Calcular cuántos items corresponden a cada opción
  const counts = options.map((opt, index) => {
    if (index === options.length - 1) {
      // La última opción toma todo lo que queda para evitar errores de redondeo
      return remaining;
    }
    const count = Math.round((opt.percent / 100) * total);
    remaining -= count;
    return count;
  });

  // Crear el array de distribución
  options.forEach((opt, index) => {
    for (let i = 0; i < counts[index]; i++) {
      distribution.push(opt.label);
    }
  });

  // Mezclar aleatoriamente
  shuffleArray(distribution);

  return distribution;
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomDateAfter(start, maxEnd) {
  // 70% de probabilidad de tener fecha de finalización
  if (Math.random() < 0.3) return null;

  const maxDate = new Date(Math.min(maxEnd.getTime(), start.getTime() + 365 * 24 * 60 * 60 * 1000));
  return randomDate(start, maxDate);
}

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generarSerieDocumental(procedimiento) {
  // Generar un código de serie documental basado en el procedimiento
  const prefix = procedimiento.substring(0, 3).toUpperCase();
  const num = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `${prefix}-${num}`;
}

function formatDate(date) {
  if (!date) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function openTableModal() {
  tableModal.classList.add('active');
}

function renderExpedientsTable() {
  if (!generatedExpedients || generatedExpedients.length === 0) {
    tableContainer.innerHTML = '<p class="meta">No hay expedientes generados.</p>';
    return;
  }

  const table = document.createElement('table');
  table.className = 'results-table';

  // Headers
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  const headers = [
    'Entidad',
    'Número expediente',
    'Nombre procedimiento',
    'Serie documental',
    'Asunto libre expediente ',
    'Asunto fijo expediente',
    'Unidad gestora',
    'Asignación temporal - Usuario',
    'Asignación temporal - Grupo',
    'Eliminar asignaciones temporales primero',
    'Confidencial',
    'Fecha apertura',
    'Fecha finalización prevista'
  ];

  headers.forEach(header => {
    const th = document.createElement('th');
    th.textContent = header;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);

  // Body
  const tbody = document.createElement('tbody');

  generatedExpedients.forEach(exp => {
    const row = document.createElement('tr');

    const cells = [
      exp.entidad,
      exp.numeroExpediente,
      exp.nombreProcedimiento,
      exp.serieDocumental,
      exp.asuntoLibre,
      exp.asuntoFijo,
      exp.unidadGestora,
      exp.asignacionTemporal1,
      exp.asignacionTemporal2,
      exp.eliminarAsignacion,
      exp.confidencialidad,
      exp.fechaApertura,
      exp.fechaFinalizacion
    ];

    cells.forEach(cellValue => {
      const td = document.createElement('td');
      td.textContent = cellValue;
      row.appendChild(td);
    });

    tbody.appendChild(row);
  });

  table.appendChild(thead);
  table.appendChild(tbody);

  tableContainer.innerHTML = '';
  tableContainer.appendChild(table);
}

function exportToCSV() {
  if (!generatedExpedients || generatedExpedients.length === 0) {
    alert('No hay expedientes para exportar');
    return;
  }

  const headers = [
    'Entidad',
    'Número expediente',
    'Nombre procedimiento',
    'Serie documental',
    'Asunto libre expediente ',
    'Asunto fijo expediente',
    'Unidad gestora',
    'Asignación temporal - Usuario',
    'Asignación temporal - Grupo',
    'Eliminar asignaciones temporales primero',
    'Confidencial',
    'Fecha apertura',
    'Fecha finalización prevista'
  ];

  const rows = generatedExpedients.map(exp => [
    exp.entidad,
    exp.numeroExpediente,
    exp.nombreProcedimiento,
    exp.serieDocumental,
    exp.asuntoLibre,
    exp.asuntoFijo,
    exp.unidadGestora,
    exp.asignacionTemporal1,
    exp.asignacionTemporal2,
    exp.eliminarAsignacion,
    exp.confidencialidad,
    exp.fechaApertura,
    exp.fechaFinalizacion
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(escapeCSV).join(';'))
    .join('\r\n');

  // BOM para UTF-8
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'expedientes.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCSV(value) {
  const str = String(value ?? '');
  if (str.includes('"') || str.includes(';') || str.includes(',') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}
