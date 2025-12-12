import { getExpedientesData } from './importExcel.js';
import { formatCellValue, getCustomColumns } from './columnManager.js';
import { getBaseColumnsConfig } from './baseColumnsModal.js';

const modal = document.getElementById('transpose-modal');
const transposeBtn = document.getElementById('transpose-btn');
const closeBtn = document.getElementById('close-transpose-modal');
const exportBtn = document.getElementById('export-transposed-excel');
const tableContainer = document.getElementById('transposed-table-container');

// Modal de selección de campos
const selectFieldsModal = document.getElementById('select-fields-modal');
const selectFieldsForm = document.getElementById('select-fields-form');
const closeSelectFieldsBtn = document.getElementById('close-select-fields-modal');
const cancelSelectFieldsBtn = document.getElementById('cancel-select-fields');
const baseFieldsCheckboxes = document.getElementById('base-fields-checkboxes');
const customFieldsCheckboxes = document.getElementById('custom-fields-checkboxes');

// Datos transpuestos
let transposedData = null;
let currentPoints = null;
let currentCustomColumnsData = null;
let selectedFields = null;

const defaultBaseColumnsConfig = {
  street: { name: 'Dirección', reference: 'direccion' },
  lat: { name: 'Latitud', reference: 'latitud' },
  lng: { name: 'Longitud', reference: 'longitud' }
};

export function initTranspose(getCurrentPoints, getCustomColumnsData) {
  // Mostrar/ocultar botón según haya expedientes
  transposeBtn.addEventListener('click', () => {
    const points = getCurrentPoints();
    const customColumnsData = getCustomColumnsData();
    currentPoints = points;
    currentCustomColumnsData = customColumnsData;
    showFieldSelectionModal();
  });

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  closeSelectFieldsBtn.addEventListener('click', closeSelectFieldsModal);
  cancelSelectFieldsBtn.addEventListener('click', closeSelectFieldsModal);
  selectFieldsModal.addEventListener('click', (e) => {
    if (e.target === selectFieldsModal) closeSelectFieldsModal();
  });

  selectFieldsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleFieldSelection();
  });

  exportBtn.addEventListener('click', exportToCSV);
}

export function showTransposeButton() {
  transposeBtn.style.display = 'block';
}

export function hideTransposeButton() {
  transposeBtn.style.display = 'none';
}

function showFieldSelectionModal() {
  if (!currentPoints || currentPoints.length === 0) {
    alert('No hay datos para transponer');
    return;
  }

  const expedientes = getExpedientesData();
  if (!expedientes) {
    alert('Solo se puede transponer cuando hay expedientes importados');
    return;
  }

  // Limpiar checkboxes
  baseFieldsCheckboxes.innerHTML = '';
  customFieldsCheckboxes.innerHTML = '';

  // Añadir checkboxes para columnas base
  const baseConfig = getEffectiveBaseConfig();
  ['street', 'lat', 'lng'].forEach((field) => {
    const checkboxItem = document.createElement('div');
    checkboxItem.className = 'checkbox-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `field-base-${field}`;
    checkbox.value = field;
    checkbox.name = 'base-field';
    checkbox.checked = true; // Por defecto activado

    const label = document.createElement('label');
    label.htmlFor = `field-base-${field}`;
    label.textContent = baseConfig[field].name;

    checkboxItem.appendChild(checkbox);
    checkboxItem.appendChild(label);
    baseFieldsCheckboxes.appendChild(checkboxItem);
  });

  // Añadir checkboxes para columnas personalizadas
  const customColumns = getCustomColumns();
  customColumns.forEach((column) => {
    const checkboxItem = document.createElement('div');
    checkboxItem.className = 'checkbox-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `field-custom-${column.id}`;
    checkbox.value = column.id;
    checkbox.name = 'custom-field';
    checkbox.checked = true; // Por defecto activado

    const label = document.createElement('label');
    label.htmlFor = `field-custom-${column.id}`;
    label.textContent = column.name;

    checkboxItem.appendChild(checkbox);
    checkboxItem.appendChild(label);
    customFieldsCheckboxes.appendChild(checkboxItem);
  });

  // Mostrar modal
  selectFieldsModal.classList.add('active');
}

function closeSelectFieldsModal() {
  selectFieldsModal.classList.remove('active');
}

function getEffectiveBaseConfig() {
  const baseConfig = getBaseColumnsConfig();
  return baseConfig ?? defaultBaseColumnsConfig;
}

function handleFieldSelection() {
  // Recoger campos seleccionados
  const baseFields = [];
  const customFields = [];

  baseFieldsCheckboxes.querySelectorAll('input[type="checkbox"]:checked').forEach((checkbox) => {
    baseFields.push(checkbox.value);
  });

  customFieldsCheckboxes.querySelectorAll('input[type="checkbox"]:checked').forEach((checkbox) => {
    customFields.push(checkbox.value);
  });

  if (baseFields.length === 0 && customFields.length === 0) {
    alert('Debes seleccionar al menos un campo para transponer');
    return;
  }

  selectedFields = { baseFields, customFields };

  // Cerrar modal de selección
  closeSelectFieldsModal();

  // Generar y mostrar datos transpuestos
  transposeAndShow();
}

function transposeAndShow() {
  const expedientes = getExpedientesData();

  // Generar datos transpuestos
  transposedData = generateTransposedData(currentPoints, currentCustomColumnsData, expedientes, selectedFields);

  // Renderizar tabla
  renderTransposedTable(transposedData);

  // Abrir modal
  modal.classList.add('active');
}

function generateTransposedData(points, customColumnsData, expedientes, selectedFields) {
  const baseConfig = getEffectiveBaseConfig();
  const customColumns = getCustomColumns();
  const expedientesValues = expedientes?.values || [];

  // Headers para la vista previa: Código expedi | Nombre tarea | Crear tarea | Nombre campo | Tipo campo te | Valor campo | Valor campo a
  // (Nombre entid se añadirá al exportar)
  const headers = [
    'Código expedi',
    'Nombre tarea',
    'Crear tarea',
    'Nombre campo',
    'Tipo campo te',
    'Valor campo',
    'Valor campo a'
  ];

  const rows = [];

  points.forEach((point, index) => {
    const expedienteValue = expedientesValues[index] ?? point.expedienteValue ?? '';
    const hasBaseFields = selectedFields.baseFields.length > 0;
    const hasCustomFields = selectedFields.customFields.length > 0;

    if (!hasBaseFields && !hasCustomFields) return;

    // Para cada columna base seleccionada, crear una fila
    if (hasBaseFields) {
      if (selectedFields.baseFields.includes('street')) {
        rows.push([
          expedienteValue,
          '', // Nombre tarea (se rellenará al exportar)
          'Sí', // Crear tarea
          baseConfig.street.name,
          'Texto',
          point.street || '',
          '' // Valor campo adicional
        ]);
      }

      if (selectedFields.baseFields.includes('lat')) {
        rows.push([
          expedienteValue,
          '', // Nombre tarea
          'Sí',
          baseConfig.lat.name,
          'Texto',
          formatCoordinate(point.lat),
          ''
        ]);
      }

      if (selectedFields.baseFields.includes('lng')) {
        rows.push([
          expedienteValue,
          '', // Nombre tarea
          'Sí',
          baseConfig.lng.name,
          'Texto',
          formatCoordinate(point.lng),
          ''
        ]);
      }
    }

    // Para cada columna personalizada seleccionada, crear una fila
    const pointData = customColumnsData.get(point.id);
    if (pointData && hasCustomFields) {
      customColumns.forEach((column) => {
        if (selectedFields.customFields.includes(column.id)) {
          const value = pointData.get(column.id);
          const formattedValue = formatCellValueForTable(column, value);

          rows.push([
            expedienteValue,
            '', // Nombre tarea
            'Sí',
            column.name,
            'Texto',
            formattedValue,
            ''
          ]);
        }
      });
    }
  });

  return { headers, rows };
}

function formatCellValueForTable(column, value) {
  const formatted = formatCellValue(column, value);
  return formatted ?? '';
}

function formatCoordinate(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toString();
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  return '';
}

function renderTransposedTable(data) {
  const { headers, rows } = data;

  const table = document.createElement('table');
  table.className = 'results-table';

  // Headers
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headers.forEach((header) => {
    const th = document.createElement('th');
    th.textContent = header;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  // Body
  const tbody = document.createElement('tbody');
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    row.forEach((cell, index) => {
      const td = document.createElement('td');
      td.textContent = cell;
      // Destacar columna de expediente
      if (index === 0 && cell) {
        td.style.fontWeight = '600';
        td.style.background = 'rgba(16, 185, 129, 0.08)';
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.appendChild(thead);
  table.appendChild(tbody);

  tableContainer.innerHTML = '';
  tableContainer.appendChild(table);
}

function closeModal() {
  modal.classList.remove('active');
}

function exportToCSV() {
  if (!transposedData) {
    alert('No hay datos transpuestos para exportar');
    return;
  }

  // Preguntar Nombre de la Entidad
  const nombreEntidad = prompt('Nombre de la Entidad:');
  if (!nombreEntidad) {
    alert('Debes introducir el Nombre de la Entidad');
    return;
  }

  // Preguntar Nombre de la tarea
  const nombreTarea = prompt('Nombre de la tarea:');
  if (!nombreTarea) {
    alert('Debes introducir el Nombre de la tarea');
    return;
  }

  const { headers, rows } = transposedData;

  // Crear headers para exportación: Nombre entid | Código expedi | Nombre tarea | Crear tarea | Nombre campo | Tipo campo te | Valor campo | Valor campo a
  const exportHeaders = [
    'Nombre entid',
    'Código expedi',
    'Nombre tarea',
    'Crear tarea',
    'Nombre campo',
    'Tipo campo te',
    'Valor campo',
    'Valor campo a'
  ];

  // Crear filas para exportación añadiendo Nombre entidad al inicio y rellenando Nombre tarea
  const exportRows = rows.map((row) => {
    return [
      nombreEntidad,      // Nombre entid
      row[0],             // Código expedi
      nombreTarea,        // Nombre tarea
      row[2],             // Crear tarea
      row[3],             // Nombre campo
      row[4],             // Tipo campo te
      row[5],             // Valor campo
      row[6]              // Valor campo a
    ];
  });

  const csvRows = [exportHeaders, ...exportRows];
  const csvContent = csvRows.map((row) => row.map(escapeCsvValue).join(';')).join('\r\n');
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'datos_transpuestos.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvValue(value) {
  const str = String(value ?? '');
  if (str.includes('"') || str.includes(';') || str.includes(',') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}
