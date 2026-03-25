import { addCustomColumn, getCustomColumns } from './columnManager.js';

const wrapper = document.getElementById('simple-transpose-view');
const status = document.getElementById('simple-flow-status');
const hasDatasetRadios = document.querySelectorAll('input[name="simple-has-dataset"]');
const uploadDatasetBtn = document.getElementById('simple-upload-dataset-btn');
const addColumnBtn = document.getElementById('simple-add-column-btn');
const transposeBtn = document.getElementById('simple-open-transpose-btn');

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
  let importedCount = 0;

  dataset.headers.forEach((header, index) => {
    const values = dataset.valuesByColumn[index] || [];
    if (!values.some((value) => String(value).trim() !== '')) return;

    let baseReference = slugify(header);
    let reference = baseReference;
    let suffix = 2;
    while (existingReferences.has(reference)) {
      reference = `${baseReference}_${suffix}`;
      suffix += 1;
    }

    existingReferences.add(reference);

    addCustomColumn({
      name: header,
      reference,
      type: 'csv',
      config: {
        values: values.map((value) => String(value ?? ''))
      }
    });

    importedCount += 1;
  });

  return importedCount;
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
    const imported = importColumns(dataset);
    onColumnsImported?.();
    return imported;
  }

  if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
    const buffer = await file.arrayBuffer();
    const dataset = parseExcel(buffer);
    const imported = importColumns(dataset);
    onColumnsImported?.();
    return imported;
  }

  throw new Error('Formato no soportado. Usa CSV, XLSX o XLS.');
}

export function initSimplifiedTransposeView({
  onOpenImportExpedientes,
  onOpenAddColumn,
  onOpenTranspose,
  onColumnsImported,
  onRefreshData
}) {
  if (!wrapper) return;

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
      const enabled = hasDatasetFile();
      if (uploadDatasetBtn) uploadDatasetBtn.disabled = !enabled;
      if (!enabled) {
        setStatus('Paso 3 omitido: continúa en el paso 4 para crear datos manuales.', 'neutral');
      }
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
        const importedCount = await handleDatasetFile(file, onColumnsImported);
        onRefreshData?.();
        setStatus(`Paso 3 completado: ${importedCount} columnas importadas desde ${file.name}.`, 'ok');
      } catch (error) {
        setStatus(error.message || 'No se pudo importar el fichero.', 'error');
      } finally {
        event.target.value = '';
      }
    });
  }

  if (addColumnBtn) addColumnBtn.disabled = false;
  if (transposeBtn) transposeBtn.disabled = false;
  if (uploadDatasetBtn) uploadDatasetBtn.disabled = !hasDatasetFile();
}
