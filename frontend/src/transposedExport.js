export const TRANSPOSED_EXPORT_HEADERS = [
  'Nombre entidad',
  'Código expediente',
  'Nombre tarea',
  'Crear tarea',
  'Nombre campo castellano',
  'Tipo campo tesauro',
  'Valor campo',
  'Valor campo adicional'
];

export function buildExportRows(rows, nombreEntidad, nombreTarea) {
  return rows.map((row) => [
    nombreEntidad ?? '',
    row?.[0] ?? '',
    nombreTarea ?? '',
    row?.[2] ?? '',
    row?.[3] ?? '',
    row?.[4] ?? '',
    formatValueForCsv(row?.[3], row?.[5]),
    row?.[6] ?? ''
  ]);
}

function formatValueForCsv(fieldName, value) {
  const rawValue = value ?? '';
  const stringValue = typeof rawValue === 'string' ? rawValue.trim() : String(rawValue);

  if (!stringValue) return '';

  if (isCoordinateField(fieldName)) {
    return formatDecimalWithComma(stringValue);
  }

  if (isNumericWithDot(stringValue)) {
    return formatDecimalWithComma(stringValue);
  }

  return stringValue;
}

function isCoordinateField(fieldName) {
  if (!fieldName) return false;
  const normalized = String(fieldName).toLowerCase();
  return normalized.includes('latitud') || normalized.includes('longitud');
}

function isNumericWithDot(value) {
  if (value.includes(',')) return false;
  return /^-?\d+(?:\.\d+)?$/.test(value);
}

function formatDecimalWithComma(value) {
  return value.replace('.', ',');
}

export function escapeCsvValue(value) {
  const str = String(value ?? '');
  if (str.includes('"') || str.includes(';') || str.includes(',') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function buildTransposedCsvContent(transposedData, nombreEntidad, nombreTarea) {
  const exportRows = buildExportRows(transposedData.rows, nombreEntidad, nombreTarea);
  const csvRows = [TRANSPOSED_EXPORT_HEADERS, ...exportRows];
  return csvRows.map((row) => row.map(escapeCsvValue).join(';')).join('\r\n');
}
