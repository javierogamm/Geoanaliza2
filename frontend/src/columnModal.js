import { addCustomColumn } from './columnManager.js';

const modal = document.getElementById('column-modal');
const openBtn = document.getElementById('add-column-btn');
const closeBtn = document.getElementById('close-modal');
const cancelBtn = document.getElementById('cancel-modal');
const form = document.getElementById('column-form');
const typeSelect = document.getElementById('column-type');
const rowsField = document.getElementById('rows-field');
const numRowsInput = document.getElementById('num-rows');
const numberRangesContainer = document.getElementById('number-ranges');
const currencyRangesContainer = document.getElementById('currency-ranges');
const addNumberRangeBtn = document.getElementById('add-number-range');
const addCurrencyRangeBtn = document.getElementById('add-currency-range');

// Secciones de configuración
const configSections = {
  selector: document.getElementById('config-selector'),
  number: document.getElementById('config-number'),
  currency: document.getElementById('config-currency'),
  date: document.getElementById('config-date')
};

// Callback que se ejecuta cuando se añade una columna
let onColumnAddedCallback = null;
// Función para verificar si hay datos cargados
let hasDataCallback = null;

export function initColumnModal(onColumnAdded, hasData) {
  onColumnAddedCallback = onColumnAdded;
  hasDataCallback = hasData;

  // Abrir modal
  openBtn.addEventListener('click', openModal);

  // Cerrar modal
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Cambio de tipo de columna
  typeSelect.addEventListener('change', handleTypeChange);

  // Añadir opción al selector
  document.getElementById('add-option-btn').addEventListener('click', addSelectorOption);

  // Añadir tramos porcentuales
  addNumberRangeBtn.addEventListener('click', () => addRangeRow(numberRangesContainer));
  addCurrencyRangeBtn.addEventListener('click', () => addRangeRow(currencyRangesContainer));

  // Submit del formulario
  form.addEventListener('submit', handleFormSubmit);

  // Inicializar fechas por defecto
  const today = new Date().toISOString().split('T')[0];
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  document.getElementById('date-min').value = oneYearAgo;
  document.getElementById('date-max').value = today;
}

function openModal() {
  modal.classList.add('active');
  resetForm();

  // Mostrar campo de número de filas solo si no hay datos
  if (hasDataCallback && !hasDataCallback()) {
    rowsField.style.display = 'block';
    numRowsInput.required = true;
  } else {
    rowsField.style.display = 'none';
    numRowsInput.required = false;
  }
}

function closeModal() {
  modal.classList.remove('active');
  resetForm();
}

function resetForm() {
  form.reset();
  hideAllConfigSections();
  document.getElementById('selector-options').innerHTML = '';
  numberRangesContainer.innerHTML = '';
  currencyRangesContainer.innerHTML = '';
  document.getElementById('number-decimals').value = '2';
  document.getElementById('currency-decimals').value = '2';
}

function hideAllConfigSections() {
  Object.values(configSections).forEach(section => {
    section.style.display = 'none';
  });
}

function handleTypeChange(e) {
  hideAllConfigSections();
  const type = e.target.value;

  if (type && configSections[type]) {
    configSections[type].style.display = 'block';

    // Si es selector, añadimos 2 opciones por defecto
    if (type === 'selector') {
      const container = document.getElementById('selector-options');
      if (container.children.length === 0) {
        addSelectorOption();
        addSelectorOption();
      }
    }
  }
}

function addSelectorOption() {
  const container = document.getElementById('selector-options');
  const optionIndex = container.children.length;

  const optionDiv = document.createElement('div');
  optionDiv.className = 'selector-option';
  optionDiv.innerHTML = `
    <input type="text" class="option-reference" placeholder="Referencia" required />
    <input type="text" class="option-value" placeholder="Valor" required />
    <input type="number" class="option-percentage" min="0" max="100" step="1" placeholder="%" required />
    <button type="button" class="btn-remove" onclick="this.parentElement.remove()">✕</button>
  `;

  container.appendChild(optionDiv);
}

function handleFormSubmit(e) {
  e.preventDefault();

  const columnName = document.getElementById('column-name').value.trim();
  const columnReference = document.getElementById('column-reference').value.trim();
  const columnType = document.getElementById('column-type').value;

  if (!columnName || !columnReference || !columnType) {
    alert('Por favor, completa todos los campos obligatorios');
    return;
  }

  const config = extractConfig(columnType);

  if (!config) {
    return;
  }

  // Obtener número de filas si no hay datos
  let numRows = null;
  if (hasDataCallback && !hasDataCallback()) {
    numRows = parseInt(numRowsInput.value, 10);
    if (isNaN(numRows) || numRows < 1) {
      alert('Por favor, especifica un número válido de filas (mínimo 1)');
      return;
    }
  }

  // Añadir la columna
  addCustomColumn({
    name: columnName,
    reference: columnReference,
    type: columnType,
    config: config
  });

  closeModal();

  // Ejecutar callback con el número de filas
  if (onColumnAddedCallback) {
    onColumnAddedCallback(numRows);
  }
}

function extractConfig(type) {
  switch (type) {
    case 'selector':
      return extractSelectorConfig();

    case 'number':
      return extractNumberConfig();

    case 'currency':
      return extractCurrencyConfig();

    case 'date':
      return extractDateConfig();

    default:
      return null;
  }
}

function extractSelectorConfig() {
  const optionsContainer = document.getElementById('selector-options');
  const optionDivs = optionsContainer.querySelectorAll('.selector-option');

  if (optionDivs.length === 0) {
    alert('Debes añadir al menos una opción');
    return null;
  }

  const options = [];
  let totalPercentage = 0;

  optionDivs.forEach((div) => {
    const referenceInput = div.querySelector('.option-reference');
    const valueInput = div.querySelector('.option-value');
    const percentageInput = div.querySelector('.option-percentage');

    const reference = referenceInput.value.trim();
    const value = valueInput.value.trim();
    const percentage = parseFloat(percentageInput.value);

    if (!reference || !value || isNaN(percentage)) {
      return;
    }

    options.push({ reference, value, percentage });
    totalPercentage += percentage;
  });

  if (options.length === 0) {
    alert('Debes añadir al menos una opción válida');
    return null;
  }

  if (Math.abs(totalPercentage - 100) > 0.01) {
    alert(`La suma de porcentajes debe ser 100% (actual: ${totalPercentage}%)`);
    return null;
  }

  return { options };
}

function extractNumberConfig() {
  const min = document.getElementById('number-min').value;
  const max = document.getElementById('number-max').value;
  const decimals = parseDecimals('number-decimals', 2);

  if (decimals === null) {
    return null;
  }

  if (min === '' || max === '') {
    alert('Debes especificar un valor mínimo y máximo');
    return null;
  }

  const minValue = parseFloat(min);
  const maxValue = parseFloat(max);

  if (minValue >= maxValue) {
    alert('El valor mínimo debe ser menor que el máximo');
    return null;
  }

  const ranges = extractRanges(numberRangesContainer, 'numéricos');
  if (ranges === null) {
    return null;
  }

  return { min: minValue, max: maxValue, decimals, ranges };
}

function extractCurrencyConfig() {
  const min = document.getElementById('currency-min').value;
  const max = document.getElementById('currency-max').value;
  const decimals = parseDecimals('currency-decimals', 2);

  if (decimals === null) {
    return null;
  }

  if (min === '' || max === '') {
    alert('Debes especificar un valor mínimo y máximo');
    return null;
  }

  const minValue = parseFloat(min);
  const maxValue = parseFloat(max);

  if (minValue >= maxValue) {
    alert('El valor mínimo debe ser menor que el máximo');
    return null;
  }

  const ranges = extractRanges(currencyRangesContainer, 'de moneda');
  if (ranges === null) {
    return null;
  }

  return { min: minValue, max: maxValue, decimals, ranges };
}

function parseDecimals(inputId, fallback) {
  const value = document.getElementById(inputId).value;
  if (value === '') return fallback;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    alert('El número de decimales debe ser un entero mayor o igual que 0');
    return null;
  }
  return Math.min(parsed, 10);
}

function addRangeRow(container) {
  const row = document.createElement('div');
  row.className = 'range-row field-group';
  row.innerHTML = `
    <div class="field">
      <label>Tramo mínimo</label>
      <input type="number" step="any" class="range-min" placeholder="0" />
    </div>
    <div class="field">
      <label>Tramo máximo</label>
      <input type="number" step="any" class="range-max" placeholder="10" />
    </div>
    <div class="field">
      <label>% del total</label>
      <input type="number" min="0" max="100" step="1" class="range-percentage" placeholder="50" />
    </div>
    <button type="button" class="btn-remove" aria-label="Eliminar tramo">✕</button>
  `;

  row.querySelector('.btn-remove').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

function extractRanges(container, label) {
  const rows = container.querySelectorAll('.range-row');
  if (rows.length === 0) return [];

  const ranges = [];
  let totalPercentage = 0;

  rows.forEach((row) => {
    const minValue = parseFloat(row.querySelector('.range-min').value);
    const maxValue = parseFloat(row.querySelector('.range-max').value);
    const percentage = parseFloat(row.querySelector('.range-percentage').value);

    if ([minValue, maxValue, percentage].some((v) => Number.isNaN(v))) {
      return;
    }

    if (minValue >= maxValue) {
      return;
    }

    ranges.push({ min: minValue, max: maxValue, percentage });
    totalPercentage += percentage;
  });

  if (ranges.length === 0) {
    alert(`Debes añadir tramos de ${label} válidos o eliminar los existentes para continuar.`);
    return null;
  }

  if (Math.abs(totalPercentage - 100) > 0.01) {
    alert(`La suma de porcentajes de los tramos ${label} debe ser 100% (actual: ${totalPercentage}%).`);
    return null;
  }

  return ranges;
}

function extractDateConfig() {
  const min = document.getElementById('date-min').value;
  const max = document.getElementById('date-max').value;

  if (!min || !max) {
    alert('Debes especificar una fecha mínima y máxima');
    return null;
  }

  const minDate = new Date(min);
  const maxDate = new Date(max);

  if (minDate >= maxDate) {
    alert('La fecha mínima debe ser anterior a la fecha máxima');
    return null;
  }

  return { min, max };
}

export function enableAddColumnButton() {
  openBtn.disabled = false;
}

export function disableAddColumnButton() {
  openBtn.disabled = true;
}
