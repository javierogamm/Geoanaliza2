const modal = document.getElementById('import-modal');
const openBtn = document.getElementById('import-excel-btn');
const closeBtn = document.getElementById('close-import-modal');
const cancelBtn = document.getElementById('cancel-import-modal');
const form = document.getElementById('import-form');
const fileInput = document.getElementById('excel-file');
const columnSelect = document.getElementById('column-select');
const nameInput = document.getElementById('expediente-name');
const referenceInput = document.getElementById('expediente-reference');

// Datos del Excel cargado
let excelData = null;
let excelHeaders = [];

// Datos de expedientes importados
let expedientesData = null;

// Callback que se ejecuta cuando se importan expedientes
let onImportedCallback = null;

export function initImportExcel(onImported) {
  onImportedCallback = onImported;

  // Abrir modal
  openBtn.addEventListener('click', openModal);

  // Cerrar modal
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Cargar archivo
  fileInput.addEventListener('change', handleFileUpload);

  // Submit del formulario
  form.addEventListener('submit', handleFormSubmit);
}

function openModal() {
  modal.classList.add('active');
  resetForm();
}

function closeModal() {
  modal.classList.remove('active');
  resetForm();
}

function resetForm() {
  form.reset();
  excelData = null;
  excelHeaders = [];
  columnSelect.innerHTML = '<option value="">Primero carga un archivo...</option>';
  columnSelect.disabled = true;
}

async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const data = await readExcelFile(file);
    excelData = data;

    // Obtener headers (primera fila)
    if (data.length > 0) {
      excelHeaders = Object.keys(data[0]);

      // Poblar el select con las columnas
      columnSelect.innerHTML = '<option value="">Selecciona una columna...</option>';
      excelHeaders.forEach((header, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = header || `Columna ${index + 1}`;
        columnSelect.appendChild(option);
      });

      columnSelect.disabled = false;
    }
  } catch (error) {
    alert('Error al leer el archivo Excel: ' + error.message);
    console.error(error);
  }
}

function readExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Leer la primera hoja
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convertir a JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          reject(new Error('El archivo Excel está vacío'));
          return;
        }

        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });
}

function handleFormSubmit(e) {
  e.preventDefault();

  if (!excelData || excelData.length === 0) {
    alert('Por favor, carga un archivo Excel válido');
    return;
  }

  const columnIndex = parseInt(columnSelect.value, 10);
  if (isNaN(columnIndex)) {
    alert('Por favor, selecciona una columna del Excel');
    return;
  }

  const name = nameInput.value.trim();
  const reference = referenceInput.value.trim();

  if (!name || !reference) {
    alert('Por favor, completa todos los campos obligatorios');
    return;
  }

  // Extraer los valores de la columna seleccionada
  const columnName = excelHeaders[columnIndex];
  const values = excelData.map(row => row[columnName] || '');

  // Guardar datos de expedientes
  expedientesData = {
    name,
    reference,
    values
  };

  closeModal();

  // Ejecutar callback
  if (onImportedCallback) {
    onImportedCallback(expedientesData);
  }
}

export function getExpedientesData() {
  return expedientesData;
}

export function hasExpedientes() {
  return expedientesData !== null && expedientesData.values.length > 0;
}

export function clearExpedientes() {
  expedientesData = null;
}
