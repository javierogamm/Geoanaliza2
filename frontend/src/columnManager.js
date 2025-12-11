// Gestión de columnas personalizadas
let customColumns = [];

/**
 * Tipos de columnas soportados:
 * - selector: múltiples opciones con distribución de %
 * - number: valores numéricos entre min y max
 * - currency: valores monetarios entre min y max
 * - date: fechas entre min y max
 */

// Obtener todas las columnas personalizadas
export function getCustomColumns() {
  return customColumns;
}

// Añadir una nueva columna personalizada
export function addCustomColumn(columnConfig) {
  const column = {
    id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: columnConfig.name,
    reference: columnConfig.reference,
    type: columnConfig.type,
    config: columnConfig.config
  };

  customColumns.push(column);
  return column;
}

// Eliminar una columna personalizada
export function removeCustomColumn(columnId) {
  customColumns = customColumns.filter(col => col.id !== columnId);
}

// Limpiar todas las columnas personalizadas
export function clearCustomColumns() {
  customColumns = [];
}

// Genera un valor aleatorio para una celda según el tipo de columna
export function generateCellValue(column, rowIndex, totalRows) {
  switch (column.type) {
    case 'csv':
      // Para columnas CSV, devolver el valor pre-definido según el índice
      return getCsvValue(column.config, rowIndex);

    case 'selector':
      return generateSelectorValue(column.config, rowIndex, totalRows);

    case 'number':
      return generateNumberValue(column.config);

    case 'currency':
      return generateCurrencyValue(column.config);

    case 'date':
      return generateDateValue(column.config);

    default:
      return '';
  }
}

// Obtiene el valor de una columna CSV según el índice de fila
function getCsvValue(config, rowIndex) {
  if (!config.values || !Array.isArray(config.values)) {
    return '';
  }
  // Si el índice está fuera de rango, devolver vacío
  if (rowIndex >= config.values.length) {
    return '';
  }
  return config.values[rowIndex] || '';
}

// Genera valor para columna tipo selector (con distribución de %)
function generateSelectorValue(config, rowIndex, totalRows) {
  // config.options: [{ reference: 'opt1', value: 'Opción 1', percentage: 30 }, ...]
  // Distribuimos según los porcentajes de forma ALEATORIA (no secuencial)

  if (!config.options || config.options.length === 0) {
    return '';
  }

  // Generamos un número aleatorio entre 0 y 100
  const randomPercentage = Math.random() * 100;
  let accumulated = 0;

  for (const option of config.options) {
    accumulated += option.percentage;
    if (randomPercentage < accumulated) {
      return option.value; // Devolvemos el valor, no la referencia
    }
  }

  // Si llegamos aquí, devolvemos el valor de la última opción
  return config.options[config.options.length - 1].value;
}

// Genera valor numérico aleatorio
function generateNumberValue(config) {
  const min = parseFloat(config.min) || 0;
  const max = parseFloat(config.max) || 100;
  const decimals = getDecimals(config, 2);
  const range = pickRange(config, min, max);
  const value = range.min + Math.random() * (range.max - range.min);
  return parseFloat(value.toFixed(decimals));
}

// Genera valor monetario aleatorio
function generateCurrencyValue(config) {
  const min = parseFloat(config.min) || 0;
  const max = parseFloat(config.max) || 10000;
  const decimals = getDecimals(config, 2);
  const range = pickRange(config, min, max);
  const value = range.min + Math.random() * (range.max - range.min);
  return parseFloat(value.toFixed(decimals));
}

// Genera fecha aleatoria entre min y max
function generateDateValue(config) {
  const minDate = config.min ? new Date(config.min) : new Date(2020, 0, 1);
  const maxDate = config.max ? new Date(config.max) : new Date();

  const timestamp = minDate.getTime() + Math.random() * (maxDate.getTime() - minDate.getTime());
  return new Date(timestamp);
}

// Formatea un valor para mostrar en la tabla
export function formatCellValue(column, value) {
  switch (column.type) {
    case 'csv':
    case 'selector':
    case 'number':
      return formatNumber(value, column.config);

    case 'currency':
      return formatCurrency(value, column.config);

    case 'date':
      return formatDate(value);

    default:
      return value === undefined || value === null ? '' : String(value);
  }
}

function getDecimals(config, fallback) {
  if (!config || config.decimals === undefined || config.decimals === null) {
    return fallback;
  }

  const parsed = parseInt(config.decimals, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}

function pickRange(config, defaultMin, defaultMax) {
  const ranges = Array.isArray(config?.ranges)
    ? config.ranges.filter((range) =>
        Number.isFinite(range?.min) &&
        Number.isFinite(range?.max) &&
        range.min < range.max &&
        Number.isFinite(range?.percentage) &&
        range.percentage > 0
      )
    : [];

  if (ranges.length === 0) {
    return { min: defaultMin, max: defaultMax };
  }

  const totalPercentage = ranges.reduce((acc, range) => acc + range.percentage, 0);
  if (totalPercentage <= 0) {
    return { min: defaultMin, max: defaultMax };
  }

  const random = Math.random() * totalPercentage;
  let accumulated = 0;

  for (const range of ranges) {
    accumulated += range.percentage;
    if (random <= accumulated) {
      return { min: range.min, max: range.max };
    }
  }

  return { min: defaultMin, max: defaultMax };
}

function formatNumber(value, config) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '';
  }

  const decimals = getDecimals(config, 2);
  return Number(value).toFixed(decimals);
}

// Formatea un valor como moneda (euros)
function formatCurrency(value, config) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '';
  }

  const decimals = getDecimals(config, 2);

  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

// Formatea una fecha
function formatDate(date) {
  if (!(date instanceof Date)) return '';

  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

// Formatea un valor para exportar a CSV
export function formatCellValueForCSV(column, value) {
  switch (column.type) {
    case 'csv':
    case 'selector':
      return String(value);

    case 'number':
      return formatNumber(value, column.config).replace('.', ',');

    case 'currency':
      return formatNumber(value, column.config).replace('.', ',');

    case 'date':
      // Formato DD/MM/YYYY
      if (!(value instanceof Date)) return '';
      const day = String(value.getDate()).padStart(2, '0');
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const year = value.getFullYear();
      return `${day}/${month}/${year}`;

    default:
      return String(value);
  }
}
