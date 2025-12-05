import { getCustomColumns, generateCellValue, formatCellValue, formatCellValueForCSV } from './columnManager.js';
import { getBaseColumnsConfig } from './baseColumnsModal.js';
import { getExpedientesData, hasExpedientes } from './importExcel.js';

const resultsList = document.getElementById('results-list');
const resultsMeta = document.getElementById('results-meta');
const statusMessage = document.getElementById('status-message');
const exportButton = document.getElementById('export-btn');

// Guardamos los últimos puntos obtenidos para poder exportarlos
let currentPoints = [];
// Guardamos los datos generados para las columnas personalizadas
let customColumnsData = new Map(); // Map<pointId, Map<columnId, value>>

export function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.style.color = isError ? '#f87171' : '';
}

export function renderMeta({ city, neighbourhood, totalAvailable, returned, areaLabel }) {
  const scope = areaLabel ? areaLabel : neighbourhood ? `${neighbourhood} · ${city}` : city;
  resultsMeta.textContent = `${returned} de ${totalAvailable || returned} puntos para ${scope}`;
}

export function renderPoints(points) {
  resultsList.innerHTML = '';
  currentPoints = points || [];

  const customColumns = getCustomColumns();

  // Si no hay puntos pero hay columnas personalizadas, mostramos solo los headers
  if ((!currentPoints || currentPoints.length === 0) && customColumns.length > 0) {
    renderEmptyTableWithColumns(customColumns);
    if (exportButton) exportButton.disabled = true;
    return;
  }

  // Si no hay puntos ni columnas personalizadas, mensaje por defecto
  if (!currentPoints || currentPoints.length === 0) {
    resultsList.innerHTML = '<p class="meta">Sin resultados para esta búsqueda.</p>';
    if (exportButton) exportButton.disabled = true;
    return;
  }

  // Generar datos para columnas personalizadas
  generateCustomColumnsData();

  const table = document.createElement('table');
  table.className = 'results-table';
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  // Columna de expedientes (si existe, va primero)
  const expedientes = getExpedientesData();
  if (expedientes) {
    const th = document.createElement('th');
    th.textContent = expedientes.name;
    th.style.background = 'rgba(16, 185, 129, 0.12)'; // Color verde para destacar
    headerRow.appendChild(th);
  }

  // Columnas base - usar nombres de tesauros configurados
  const baseConfig = getBaseColumnsConfig();
  const baseLabels = baseConfig
    ? ['Nombre', baseConfig.street.name, baseConfig.lat.name, baseConfig.lng.name]
    : ['Nombre', 'Calle', 'Latitud', 'Longitud'];

  baseLabels.forEach((label) => {
    const th = document.createElement('th');
    th.textContent = label;
    headerRow.appendChild(th);
  });

  // Columnas personalizadas
  customColumns.forEach((column) => {
    const th = document.createElement('th');
    th.textContent = column.name;
    th.style.background = 'rgba(59, 130, 246, 0.12)'; // Color diferente para destacar
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);

  const tbody = document.createElement('tbody');
  currentPoints.forEach((point, index) => {
    const row = document.createElement('tr');
    const isMockPoint = point.source === 'mock';
    const isExpedientePoint = point.source === 'expediente';

    // Celda de expediente (si existe, va primero)
    if (expedientes) {
      const expedienteCell = document.createElement('td');
      const expedienteValueFromImport = expedientes.values ? expedientes.values[index] : '';
      const expedienteValue = expedienteValueFromImport ?? (isExpedientePoint ? point.expedienteValue : '');
      expedienteCell.textContent = expedienteValue || '';
      expedienteCell.style.fontWeight = '600';
      row.appendChild(expedienteCell);
    }

    // Celdas base
    const nameCell = document.createElement('td');
    nameCell.textContent = point.name || 'Punto sin nombre';
    if (isMockPoint || isExpedientePoint) nameCell.style.color = 'var(--muted)';

    const streetCell = document.createElement('td');
    streetCell.textContent = point.street || 'Dirección no disponible';
    if (isMockPoint || isExpedientePoint) streetCell.style.color = 'var(--muted)';

    const latCell = document.createElement('td');
    latCell.textContent = (isMockPoint || isExpedientePoint) ? '-' : point.lat.toFixed(5);
    if (isMockPoint || isExpedientePoint) latCell.style.color = 'var(--muted)';

    const lngCell = document.createElement('td');
    lngCell.textContent = (isMockPoint || isExpedientePoint) ? '-' : point.lng.toFixed(5);
    if (isMockPoint || isExpedientePoint) lngCell.style.color = 'var(--muted)';

    [nameCell, streetCell, latCell, lngCell].forEach((cell) => row.appendChild(cell));

    // Celdas personalizadas
    customColumns.forEach((column) => {
      const cell = document.createElement('td');
      const value = getCustomColumnValue(point.id, column.id);
      cell.textContent = formatCellValue(column, value);
      row.appendChild(cell);
    });

    tbody.appendChild(row);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  resultsList.appendChild(table);

  if (exportButton) exportButton.disabled = false;
}

// Renderiza una tabla vacía mostrando solo las columnas personalizadas
function renderEmptyTableWithColumns(customColumns) {
  const table = document.createElement('table');
  table.className = 'results-table';
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  // Columna de expedientes (si existe, va primero)
  const expedientes = getExpedientesData();
  if (expedientes) {
    const th = document.createElement('th');
    th.textContent = expedientes.name;
    th.style.background = 'rgba(16, 185, 129, 0.12)';
    headerRow.appendChild(th);
  }

  // Columnas base - usar nombres de tesauros configurados
  const baseConfig = getBaseColumnsConfig();
  const baseLabels = baseConfig
    ? ['Nombre', baseConfig.street.name, baseConfig.lat.name, baseConfig.lng.name]
    : ['Nombre', 'Calle', 'Latitud', 'Longitud'];

  baseLabels.forEach((label) => {
    const th = document.createElement('th');
    th.textContent = label;
    headerRow.appendChild(th);
  });

  // Columnas personalizadas
  customColumns.forEach((column) => {
    const th = document.createElement('th');
    th.textContent = column.name;
    th.style.background = 'rgba(59, 130, 246, 0.12)';
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);

  // Fila informativa
  const tbody = document.createElement('tbody');
  const infoRow = document.createElement('tr');
  const infoCell = document.createElement('td');
  const totalColumns = 4 + customColumns.length + (expedientes ? 1 : 0);
  infoCell.colSpan = totalColumns;
  infoCell.textContent = 'Busca datos georeferenciados para ver los resultados con tus columnas personalizadas';
  infoCell.style.textAlign = 'center';
  infoCell.style.fontStyle = 'italic';
  infoCell.style.color = 'var(--muted)';
  infoCell.style.padding = '20px';
  infoRow.appendChild(infoCell);
  tbody.appendChild(infoRow);

  table.appendChild(thead);
  table.appendChild(tbody);
  resultsList.appendChild(table);
}

// Genera los datos para todas las columnas personalizadas
function generateCustomColumnsData() {
  const customColumns = getCustomColumns();
  const previousData = new Map(customColumnsData);
  customColumnsData = new Map();

  currentPoints.forEach((point, index) => {
    const pointData = new Map();
    const existingPointData = previousData.get(point.id);

    customColumns.forEach((column) => {
      const existingValue = existingPointData ? existingPointData.get(column.id) : undefined;
      const value = existingValue !== undefined
        ? existingValue
        : generateCellValue(column, index, currentPoints.length);
      pointData.set(column.id, value);
    });

    customColumnsData.set(point.id, pointData);
  });
}

// Obtiene el valor de una columna personalizada para un punto
function getCustomColumnValue(pointId, columnId) {
  const pointData = customColumnsData.get(pointId);
  if (!pointData) return '';
  return pointData.get(columnId) || '';
}

// Funciones para acceder a datos desde otros módulos
export function getCurrentPoints() {
  return currentPoints;
}

export function getCustomColumnsDataMap() {
  return customColumnsData;
}

export function clearResults() {
  resultsList.innerHTML = '';
  resultsMeta.textContent = '';
  currentPoints = [];
  if (exportButton) exportButton.disabled = true;
}

// 👉 Formateo numérico para CSV en locale es-ES: decimal con coma
function formatNumberForCsv(value) {
  if (typeof value !== 'number') return '';
  // 37.37398 -> "37,37398"
  return value.toFixed(5).replace('.', ',');
}

// Escapa valores para CSV (usamos ; como separador)
function escapeCSV(value) {
  const str = String(value ?? '');
  if (str.includes('"') || str.includes(';') || str.includes(',') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function exportCSV() {
  if (!currentPoints || !currentPoints.length) {
    return;
  }

  const customColumns = getCustomColumns();
  const expedientes = getExpedientesData();
  const baseConfig = getBaseColumnsConfig();

  const headers = [];

  // Columna de expedientes (si existe, va primero)
  if (expedientes) {
    headers.push(expedientes.name);
  }

  // Columnas base
  const baseLabels = baseConfig
    ? ['Nombre', baseConfig.street.name, baseConfig.lat.name, baseConfig.lng.name]
    : ['Nombre', 'Calle', 'Latitud', 'Longitud'];

  headers.push(...baseLabels);

  // Añadir headers de columnas personalizadas
  customColumns.forEach((column) => {
    headers.push(column.name);
  });

  const rows = currentPoints.map((point, index) => {
    const row = [];

    // Valor del expediente (si existe, va primero)
    if (expedientes) {
      const expedienteValueFromImport = expedientes.values ? expedientes.values[index] : '';
      const isExpedientePoint = point.source === 'expediente';
      const value = expedienteValueFromImport ?? (isExpedientePoint ? (point.expedienteValue || '') : '');
      row.push(value || '');
    }

    // Valores base
    row.push(
      point.name || 'Punto sin nombre',
      point.street || 'Dirección no disponible',
      formatNumberForCsv(point.lat),
      formatNumberForCsv(point.lng)
    );

    // Añadir valores de columnas personalizadas
    customColumns.forEach((column) => {
      const value = getCustomColumnValue(point.id, column.id);
      row.push(formatCellValueForCSV(column, value));
    });

    return row;
  });

  const csvContent = [headers, ...rows]
    .map((row) => row.map(escapeCSV).join(';')) // separador ;
    .join('\r\n');

  // 👉 Añadimos BOM para que Excel reconozca UTF-8 y no destroce los acentos
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'puntos.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
