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

// Gestión de la cola de tesauros detectados
let detectedThesaurusQueue = [];
let onDetectedQueueComplete = null;
let isProcessingDetectedQueue = false;
let currentPrefill = null;

export function initColumnModal(onColumnAdded, hasData) {
  onColumnAddedCallback = onColumnAdded;
  hasDataCallback = hasData;

  // Abrir modal
  openBtn.addEventListener('click', () => showModal());

  // Cerrar modal
  closeBtn.addEventListener('click', () => closeModal());
  cancelBtn.addEventListener('click', () => closeModal());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Cambio de tipo de columna
  typeSelect.addEventListener('change', (event) => handleTypeChange(event.target.value));

  // Añadir opción al selector
  document.getElementById('add-option-btn').addEventListener('click', () => addSelectorOption());

  // Añadir tramos porcentuales
  addNumberRangeBtn.addEventListener('click', () =>
    addRangeRow(numberRangesContainer, getDefaultRangeValues(numberRangesContainer, 'number-min', 'number-max'))
  );
  addCurrencyRangeBtn.addEventListener('click', () =>
    addRangeRow(currencyRangesContainer, getDefaultRangeValues(currencyRangesContainer, 'currency-min', 'currency-max'))
  );

  // Submit del formulario
  form.addEventListener('submit', handleFormSubmit);

  // Inicializar fechas por defecto
  setDefaultDates();
}

function showModal(prefillData = null) {
  currentPrefill = prefillData;
  modal.classList.add('active');
  resetForm();
  toggleRowsField();
  applyPrefill(prefillData);
}

function closeModal({ abortQueue = true } = {}) {
  modal.classList.remove('active');
  resetForm();

  if (abortQueue) {
    resetDetectedQueue();
  }
}

function resetForm() {
  form.reset();
  hideAllConfigSections();
  clearSelectorOptions();
  clearRangeContainers();
  document.getElementById('number-decimals').value = '2';
  document.getElementById('currency-decimals').value = '2';
  setDefaultDates();
}

function hideAllConfigSections() {
  Object.values(configSections).forEach(section => {
    section.style.display = 'none';
  });
}

function toggleRowsField() {
  const shouldShowRowsField = hasDataCallback && !hasDataCallback();
  rowsField.style.display = shouldShowRowsField ? 'block' : 'none';
  numRowsInput.required = shouldShowRowsField;
}

function clearSelectorOptions() {
  document.getElementById('selector-options').innerHTML = '';
}

function clearRangeContainers() {
  numberRangesContainer.innerHTML = '';
  currencyRangesContainer.innerHTML = '';
}

function populateSelectorOptions(options) {
  if (Array.isArray(options) && options.length > 0) {
    options.forEach(option => addSelectorOption(option));
    return;
  }

  addSelectorOption();
  addSelectorOption();
}

function handleTypeChange(type, config = null) {
  hideAllConfigSections();
  clearSelectorOptions();
  clearRangeContainers();

  if (type && configSections[type]) {
    configSections[type].style.display = 'block';

    if (type === 'selector') {
      populateSelectorOptions(config?.options);
    }

    if (type === 'number') {
      applyNumberConfig(config);
    }

    if (type === 'currency') {
      applyCurrencyConfig(config);
    }

    if (type === 'date') {
      applyDateConfig(config);
    }
  }
}

function addSelectorOption(defaults = {}) {
  const container = document.getElementById('selector-options');

  const optionDiv = document.createElement('div');
  optionDiv.className = 'selector-option';
  optionDiv.innerHTML = `
    <input type="text" class="option-reference" placeholder="Referencia" required />
    <input type="text" class="option-value" placeholder="Valor" required />
    <input type="number" class="option-percentage" min="0" max="100" step="1" placeholder="%" required />
    <button type="button" class="btn-remove" onclick="this.parentElement.remove()">✕</button>
  `;

  optionDiv.querySelector('.option-reference').value = defaults.reference ?? '';
  optionDiv.querySelector('.option-value').value = defaults.value ?? '';
  optionDiv.querySelector('.option-percentage').value = defaults.percentage ?? '';

  container.appendChild(optionDiv);
}

function applyNumberConfig(config) {
  document.getElementById('number-min').value = config?.min ?? '';
  document.getElementById('number-max').value = config?.max ?? '';

  if (config?.decimals !== undefined) {
    document.getElementById('number-decimals').value = config.decimals;
  }

  renderRangeList(numberRangesContainer, 'number-min', 'number-max', config?.ranges);
}

function applyCurrencyConfig(config) {
  document.getElementById('currency-min').value = config?.min ?? '';
  document.getElementById('currency-max').value = config?.max ?? '';

  if (config?.decimals !== undefined) {
    document.getElementById('currency-decimals').value = config.decimals;
  }

  renderRangeList(currencyRangesContainer, 'currency-min', 'currency-max', config?.ranges);
}

function applyDateConfig(config) {
  if (config?.min) {
    document.getElementById('date-min').value = config.min;
  }

  if (config?.max) {
    document.getElementById('date-max').value = config.max;
  }
}

function setDefaultDates() {
  const today = new Date().toISOString().split('T')[0];
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  document.getElementById('date-min').value = oneYearAgo;
  document.getElementById('date-max').value = today;
}

function applyPrefill(prefillData) {
  if (!prefillData) return;

  document.getElementById('column-name').value = prefillData.name ?? '';
  document.getElementById('column-reference').value = prefillData.reference ?? '';

  if (prefillData.type) {
    typeSelect.value = prefillData.type;
    handleTypeChange(prefillData.type, prefillData.config ?? null);
  }
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

  closeModal({ abortQueue: false });

  // Ejecutar callback con el número de filas
  if (onColumnAddedCallback) {
    onColumnAddedCallback(numRows);
  }

  processNextDetectedThesaurus();
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

function renderRangeList(container, minFieldId, maxFieldId, ranges = []) {
  container.innerHTML = '';

  if (Array.isArray(ranges) && ranges.length > 0) {
    ranges.forEach(range => {
      addRangeRow(container, {
        min: range?.min ?? '',
        max: range?.max ?? '',
        percentage: range?.percentage ?? ''
      });
    });
    return;
  }

  addRangeRow(container, getDefaultRangeValues(container, minFieldId, maxFieldId));
}

function addRangeRow(container, defaults = {}) {
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
  row.querySelector('.range-min').value = defaults.min ?? '';
  row.querySelector('.range-max').value = defaults.max ?? '';
  row.querySelector('.range-percentage').value = defaults.percentage ?? '';
  container.appendChild(row);
}

function getDefaultRangeValues(container, minFieldId, maxFieldId) {
  const minField = document.getElementById(minFieldId);
  const maxField = document.getElementById(maxFieldId);

  const min = parseFloat(minField.value);
  const max = parseFloat(maxField.value);
  const hasValidLimits = Number.isFinite(min) && Number.isFinite(max) && min < max;
  const isFirstRange = container.children.length === 0;

  return {
    min: hasValidLimits ? minField.value : '',
    max: hasValidLimits ? maxField.value : '',
    percentage: isFirstRange && hasValidLimits ? '100' : ''
  };
}

function extractRanges(container, label) {
  const rows = container.querySelectorAll('.range-row');
  if (rows.length === 0) return [];

  const ranges = [];
  let totalPercentage = 0;
  let hasAnyValue = false;

  rows.forEach((row) => {
    const minField = row.querySelector('.range-min').value;
    const maxField = row.querySelector('.range-max').value;
    const percentageField = row.querySelector('.range-percentage').value;

    hasAnyValue ||= Boolean(minField || maxField || percentageField);

    const minValue = parseFloat(minField);
    const maxValue = parseFloat(maxField);
    const percentage = parseFloat(percentageField);

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
    if (!hasAnyValue) {
      return [];
    }

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

function processNextDetectedThesaurus() {
  if (!isProcessingDetectedQueue) {
    resetDetectedQueue();
    return;
  }

  if (detectedThesaurusQueue.length === 0) {
    const completionCallback = onDetectedQueueComplete;
    resetDetectedQueue();

    if (completionCallback) {
      completionCallback();
    }
    return;
  }

  const nextThesaurus = detectedThesaurusQueue.shift();
  showModal(nextThesaurus);
}

function resetDetectedQueue() {
  detectedThesaurusQueue = [];
  onDetectedQueueComplete = null;
  isProcessingDetectedQueue = false;
  currentPrefill = null;
}

export function startDetectedThesaurusValidation(detectedTesauros, onComplete) {
  if (!Array.isArray(detectedTesauros) || detectedTesauros.length === 0) {
    return;
  }

  detectedThesaurusQueue = [...detectedTesauros];
  onDetectedQueueComplete = onComplete || null;
  isProcessingDetectedQueue = true;

  const firstThesaurus = detectedThesaurusQueue.shift();
  showModal(firstThesaurus);
}

export function enableAddColumnButton() {
  openBtn.disabled = false;
}

export function disableAddColumnButton() {
  openBtn.disabled = true;
}
