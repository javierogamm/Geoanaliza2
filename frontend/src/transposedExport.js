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

export function buildExportRows(rows, nombreEntidad, nombreTarea, coordinateFieldAliases = new Set()) {
  return rows.map((row) =>
    [
      nombreEntidad ?? '',
      row?.[0] ?? '',
      nombreTarea ?? '',
      row?.[2] ?? '',
      row?.[3] ?? '',
      row?.[4] ?? '',
      preserveCoordinateValue(row?.[3], row?.[5], coordinateFieldAliases),
      row?.[6] ?? ''
    ].map(formatAsLiteralText)
  );
}

function preserveCoordinateValue(fieldName, value, coordinateFieldAliases = new Set()) {
  if (isCoordinateField(fieldName, coordinateFieldAliases)) {
    const rawValue = value ?? '';
    const stringValue = typeof rawValue === 'string' ? rawValue.trim() : String(rawValue);
    if (!stringValue) return '';
    return stringValue;
  }

  return value ?? '';
}

function formatAsLiteralText(value) {
  const str = typeof value === 'string' ? value : String(value ?? '');
  if (!str) return '';
  // Prefijo con apóstrofe para que Excel mantenga el valor literalmente sin convertirlo a número.
  return `'${str}`;
}

function isCoordinateField(fieldName, coordinateFieldAliases = new Set()) {
  if (!fieldName) return false;
  const normalized = String(fieldName).toLowerCase();

  if (normalized.includes('latitud') || normalized.includes('longitud')) {
    return true;
  }

  return coordinateFieldAliases.has(normalized);
}

export function escapeCsvValue(value) {
  const str = String(value ?? '');
  if (str.includes('"') || str.includes(';') || str.includes(',') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function buildTransposedCsvContent(transposedData, nombreEntidad, nombreTarea) {
  const exportRows = buildExportRows(
    transposedData.rows,
    nombreEntidad,
    nombreTarea,
    transposedData.coordinateFieldAliases || new Set()
  );
  const csvRows = [TRANSPOSED_EXPORT_HEADERS, ...exportRows];
  return csvRows.map((row) => row.map(escapeCsvValue).join(';')).join('\r\n');
}
