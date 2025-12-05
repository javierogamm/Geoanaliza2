const modal = document.getElementById('import-csv-modal');
const csvBtn = document.getElementById('import-csv-btn');
const closeBtn = document.getElementById('close-csv-modal');
const cancelBtn = document.getElementById('cancel-csv-modal');
const csvForm = document.getElementById('csv-form');
const csvFileInput = document.getElementById('csv-file');
const csvColumnSelect = document.getElementById('csv-column-select');
const csvColumnName = document.getElementById('csv-column-name');
const csvColumnReference = document.getElementById('csv-column-reference');

let csvData = null;
let csvHeaders = null;

export function initImportCsv(onImportCallback) {
  csvBtn.addEventListener('click', () => {
    openModal();
  });

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  csvFileInput.addEventListener('change', handleFileSelect);

  csvForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleImport(onImportCallback);
  });
}

function openModal() {
  // Reset form
  csvForm.reset();
  csvColumnSelect.disabled = true;
  csvColumnSelect.innerHTML = '<option value="">Primero carga un archivo...</option>';
  csvData = null;
  csvHeaders = null;

  modal.classList.add('active');
}

function closeModal() {
  modal.classList.remove('active');
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target.result;
      parseCSV(text);
    } catch (error) {
      alert('Error al leer el archivo CSV: ' + error.message);
    }
  };

  reader.readAsText(file, 'UTF-8');
}

function parseCSV(text) {
  // Detectar el delimitador (coma o punto y coma)
  const firstLine = text.split('\n')[0];
  const delimiter = firstLine.includes(';') ? ';' : ',';

  // Parsear CSV
  const lines = text.split('\n').filter(line => line.trim() !== '');
  if (lines.length === 0) {
    alert('El archivo CSV está vacío');
    return;
  }

  // Extraer headers
  csvHeaders = parseCSVLine(lines[0], delimiter);

  // Parsear datos
  csvData = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter);
    const row = {};
    csvHeaders.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    csvData.push(row);
  }

  // Actualizar selector de columnas
  updateColumnSelect();
}

function parseCSVLine(line, delimiter) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Comillas escapadas
        current += '"';
        i++;
      } else {
        // Alternar estado de comillas
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      // Delimitador fuera de comillas
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Añadir último valor
  result.push(current.trim());

  return result;
}

function updateColumnSelect() {
  csvColumnSelect.innerHTML = '<option value="">Selecciona una columna...</option>';

  csvHeaders.forEach((header, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = `${header} (${csvData.length} valores)`;
    csvColumnSelect.appendChild(option);
  });

  csvColumnSelect.disabled = false;
}

function handleImport(onImportCallback) {
  const selectedColumnIndex = parseInt(csvColumnSelect.value);
  if (isNaN(selectedColumnIndex)) {
    alert('Selecciona una columna');
    return;
  }

  const columnName = csvColumnName.value.trim();
  const columnReference = csvColumnReference.value.trim();

  if (!columnName || !columnReference) {
    alert('Completa todos los campos');
    return;
  }

  const selectedHeader = csvHeaders[selectedColumnIndex];
  const columnValues = csvData.map(row => row[selectedHeader]);

  // Crear objeto con los datos de la columna
  const columnData = {
    name: columnName,
    reference: columnReference,
    values: columnValues,
    source: 'csv'
  };

  closeModal();

  if (onImportCallback) {
    onImportCallback(columnData);
  }
}
