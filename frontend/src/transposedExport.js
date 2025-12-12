export const TRANSPOSED_EXPORT_HEADERS = [
  'Nombre entid',
  'Código expedi',
  'Nombre tarea',
  'Crear tarea',
  'Nombre campo',
  'Tipo campo te',
  'Valor campo',
  'Valor campo a'
];

export function buildExportRows(rows, nombreEntidad, nombreTarea) {
  return rows.map((row) => [
    nombreEntidad ?? '',
    row?.[0] ?? '',
    nombreTarea ?? '',
    row?.[2] ?? '',
    row?.[3] ?? '',
    row?.[4] ?? '',
    preserveCoordinateValue(row?.[3], row?.[5]),
    row?.[6] ?? ''
  ]);
}

function preserveCoordinateValue(fieldName, value) {
  if (isCoordinateField(fieldName)) {
    const rawValue = value ?? '';
    const stringValue = typeof rawValue === 'string' ? rawValue.trim() : String(rawValue);
    if (!stringValue) return '';
    // Prefijar como texto para que Excel no elimine los puntos decimales al interpretar la celda.
    return `="${stringValue}"`;
  }

  return value ?? '';
}

function isCoordinateField(fieldName) {
  if (!fieldName) return false;
  const normalized = String(fieldName).toLowerCase();
  return normalized.includes('latitud') || normalized.includes('longitud');
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
