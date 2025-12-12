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
    row?.[5] ?? '',
    row?.[6] ?? ''
  ]);
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
