import { addCustomColumn, getCustomColumns } from './columnManager.js';

const wrapper = document.getElementById('simple-transpose-view');
const status = document.getElementById('simple-flow-status');
const hasDatasetRadios = document.querySelectorAll('input[name="simple-has-dataset"]');
const uploadDatasetBtn = document.getElementById('simple-upload-dataset-btn');
const addColumnBtn = document.getElementById('simple-add-column-btn');
const transposeBtn = document.getElementById('simple-open-transpose-btn');
const step3Item = document.getElementById('simple-step-3');
const step4Item = document.getElementById('simple-step-4');
const progressBody = document.getElementById('simple-progress-body');

const fileInput = document.getElementById('simple-dataset-file');

function setStatus(message, tone = 'neutral') {
  if (!status) return;
  status.textContent = message;
  status.dataset.tone = tone;
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'columna';
}

function getDelimiter(sampleLine) {
  return sampleLine.includes(';') ? ';' : ',';
}

function parseCsvLine(line, delimiter) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    throw new Error('El fichero CSV está vacío.');
  }

  const delimiter = getDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map((header, index) => header || `Columna ${index + 1}`);
  const valuesByColumn = headers.map(() => []);

  lines.slice(1).forEach((line) => {
    const values = parseCsvLine(line, delimiter);
    headers.forEach((_, index) => {
      valuesByColumn[index].push(values[index] || '');
    });
  });

  return { headers, valuesByColumn };
}

function parseExcel(arrayBuffer) {
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (!rows.length) {
    throw new Error('El fichero Excel está vacío.');
  }

  const headers = (rows[0] || []).map((header, index) => String(header || `Columna ${index + 1}`).trim());
  const valuesByColumn = headers.map(() => []);

  rows.slice(1).forEach((row) => {
    headers.forEach((_, index) => {
      valuesByColumn[index].push(row?.[index] ?? '');
    });
  });

  return { headers, valuesByColumn };
}

function importColumns(dataset) {
  const existingReferences = new Set(getCustomColumns().map((column) => column.reference));
  const importedColumns = [];

  dataset.headers.forEach((header, index) => {
    const values = dataset.valuesByColumn[index] || [];
    if (!values.some((value) => String(value).trim() !== '')) return;

    const baseReference = slugify(header);
    let reference = baseReference;
    let suffix = 2;
    while (existingReferences.has(reference)) {
      reference = `${baseReference}_${suffix}`;
      suffix += 1;
    }

    existingReferences.add(reference);

    const createdColumn = addCustomColumn({
      name: header,
      reference,
      type: 'csv',
      config: {
        values: values.map((value) => String(value ?? ''))
      }
    });

    importedColumns.push(createdColumn);
  });

  return importedColumns;
}

function hasDatasetFile() {
  return Array.from(hasDatasetRadios || []).find((radio) => radio.checked)?.value === 'yes';
}

async function handleDatasetFile(file, onColumnsImported) {
  const lowerName = (file?.name || '').toLowerCase();
  if (!file) {
    throw new Error('Selecciona un fichero CSV o Excel para importar datos.');
  }

  if (lowerName.endsWith('.csv')) {
    const text = await file.text();
    const dataset = parseCsv(text);
    const importedColumns = importColumns(dataset);
    onColumnsImported?.(importedColumns);
    return importedColumns;
  }

  if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
    const buffer = await file.arrayBuffer();
    const dataset = parseExcel(buffer);
    const importedColumns = importColumns(dataset);
    onColumnsImported?.(importedColumns);
    return importedColumns;
  }

  throw new Error('Formato no soportado. Usa CSV, XLSX o XLS.');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderProgressTable(getProgressData) {
  if (!progressBody) return;

  const data = getProgressData?.() || {};
  const expedientes = data.expedientes;
  const customColumns = data.customColumns || [];
  const baseColumns = data.baseColumns;

  const rows = [];

  rows.push({
    element: 'Expediente',
    detail: expedientes
      ? `${escapeHtml(expedientes.name)} <small>(${expedientes.values?.length || 0} filas)</small>`
      : 'Sin importar todavía.',
    status: expedientes ? { label: 'Importado', cls: 'simple-progress-status-ok' } : { label: 'Pendiente', cls: 'simple-progress-status-pending' }
  });

  const csvColumns = customColumns.filter((column) => column.type === 'csv');
  rows.push({
    element: 'Nuevas columnas',
    detail: csvColumns.length
      ? csvColumns.map((column) => `<div>${escapeHtml(column.name)} <small>(${escapeHtml(column.reference)})</small></div>`).join('')
      : 'Sin columnas importadas desde Excel/CSV.',
    status: csvColumns.length
      ? { label: `${csvColumns.length} creadas`, cls: 'simple-progress-status-ok' }
      : { label: 'Pendiente', cls: 'simple-progress-status-pending' }
  });

  const nonCsvColumns = customColumns.filter((column) => column.type !== 'csv');
  rows.push({
    element: 'Nuevos tesauros creados',
    detail: nonCsvColumns.length
      ? nonCsvColumns.map((column) => `<div>${escapeHtml(column.name)} <small>(${escapeHtml(column.reference)} · ${escapeHtml(column.type)})</small></div>`).join('')
      : 'Sin tesauros manuales todavía.',
    status: nonCsvColumns.length
      ? { label: `${nonCsvColumns.length} activos`, cls: 'simple-progress-status-ok' }
      : { label: 'Pendiente', cls: 'simple-progress-status-pending' }
  });

  rows.push({
    element: 'Tesauros base asignados',
    detail: baseColumns
      ? `<div>Dirección: <small>${escapeHtml(baseColumns.street?.name)} (${escapeHtml(baseColumns.street?.reference)})</small></div>
         <div>Latitud: <small>${escapeHtml(baseColumns.lat?.name)} (${escapeHtml(baseColumns.lat?.reference)})</small></div>
         <div>Longitud: <small>${escapeHtml(baseColumns.lng?.name)} (${escapeHtml(baseColumns.lng?.reference)})</small></div>`
      : 'Sin configuración explícita (se usarán valores por defecto).',
    status: baseColumns ? { label: 'Asignados', cls: 'simple-progress-status-ok' } : { label: 'Por defecto', cls: 'simple-progress-status-pending' }
  });

  progressBody.innerHTML = rows
    .map(
      (row) => `<tr>
        <td>${row.element}</td>
        <td>${row.detail}</td>
        <td><span class="${row.status.cls}">${row.status.label}</span></td>
      </tr>`
    )
    .join('');
}

function syncSimpleStepsVisibility() {
  const datasetEnabled = hasDatasetFile();

  if (uploadDatasetBtn) uploadDatasetBtn.disabled = !datasetEnabled;
  if (step3Item) step3Item.classList.toggle('is-hidden', !datasetEnabled);
  if (step4Item) step4Item.classList.toggle('is-hidden', datasetEnabled);

  if (!datasetEnabled) {
    setStatus('Paso 3 omitido: se muestra el paso 4 para crear datos manuales.', 'neutral');
  }
}

export function initSimplifiedTransposeView({
  onOpenImportExpedientes,
  onOpenAddColumn,
  onOpenTranspose,
  onColumnsImported,
  onRefreshData,
  getProgressData
}) {
  if (!wrapper) return;

  renderProgressTable(getProgressData);

  wrapper.addEventListener('click', (event) => {
    const action = event.target?.dataset?.simpleAction;
    if (!action) return;

    if (action === 'import-expedientes') {
      onOpenImportExpedientes?.();
      setStatus('Paso 1 abierto: importa el Excel de expedientes.', 'ok');
      return;
    }

    if (action === 'add-column') {
      onOpenAddColumn?.();
      setStatus('Paso 4 abierto: crea los datos adicionales que necesites.', 'ok');
      return;
    }

    if (action === 'transpose') {
      onOpenTranspose?.();
      setStatus('Paso 5 abierto: revisa y exporta el CSV transpuesto.', 'ok');
    }
  });

  hasDatasetRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
      syncSimpleStepsVisibility();
      renderProgressTable(getProgressData);
    });
  });

  if (uploadDatasetBtn) {
    uploadDatasetBtn.addEventListener('click', () => {
      if (!hasDatasetFile()) {
        setStatus('Marca “Sí” en el paso 2 para cargar el fichero de datos.', 'warn');
        return;
      }
      fileInput?.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      try {
        const importedColumns = await handleDatasetFile(file, onColumnsImported);
        onRefreshData?.();
        renderProgressTable(getProgressData);
        setStatus(`Paso 3 completado: ${importedColumns.length} columnas importadas desde ${file.name}.`, 'ok');
      } catch (error) {
        setStatus(error.message || 'No se pudo importar el fichero.', 'error');
      } finally {
        event.target.value = '';
      }
    });
  }

  if (addColumnBtn) addColumnBtn.disabled = false;
  if (transposeBtn) transposeBtn.disabled = false;

  const refreshProgress = () => renderProgressTable(getProgressData);
  document.addEventListener('expedientes-imported', refreshProgress);
  document.addEventListener('column-added', refreshProgress);
  document.addEventListener('column-updated', refreshProgress);
  document.addEventListener('thesaurus-validated', refreshProgress);

  syncSimpleStepsVisibility();
}
