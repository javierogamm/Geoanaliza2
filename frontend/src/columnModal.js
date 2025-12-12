import { addCustomColumn, updateCustomColumn } from './columnManager.js';

const modal = document.getElementById('column-modal');
const openBtn = document.getElementById('add-column-btn');
const closeBtn = document.getElementById('close-modal');
const cancelBtn = document.getElementById('cancel-modal');
const form = document.getElementById('column-form');
const modalTitle = modal.querySelector('.modal-header h3');
const submitBtn = form.querySelector('.modal-actions button[type="submit"]');
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

// Callback que se ejecuta cuando se añade o edita una columna
let onColumnSavedCallback = null;
// Función para verificar si hay datos cargados
let hasDataCallback = null;
let pendingPrefill = null;
let detectedExtraProvider = null;
let editingColumnId = null;

export function initColumnModal({ onSaved, hasData }) {
  onColumnSavedCallback = onSaved;
  hasDataCallback = hasData;

  // Abrir modal
  openBtn.addEventListener('click', handleOpenRequest);

  // Cerrar modal
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  // Evitar cierres accidentales por clic fuera del contenido
  modal.addEventListener('click', (e) => {
    if (e.target === modal) return;
  });

  // Cambio de tipo de columna
  typeSelect.addEventListener('change', handleTypeChange);

  // Añadir opción al selector
  document.getElementById('add-option-btn').addEventListener('click', addSelectorOption);

  // Añadir tramos porcentuales
  addNumberRangeBtn.addEventListener('click', () =>
    handleAddRange(numberRangesContainer, 'number-min', 'number-max')
  );
  addCurrencyRangeBtn.addEventListener('click', () =>
    handleAddRange(currencyRangesContainer, 'currency-min', 'currency-max')
  );

  // Submit del formulario
  form.addEventListener('submit', handleFormSubmit);

  // Inicializar fechas por defecto
  const today = new Date().toISOString().split('T')[0];
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  document.getElementById('date-min').value = oneYearAgo;
  document.getElementById('date-max').value = today;
}

function openModal() {
  resetForm();

  const isEditing = Boolean(editingColumnId || pendingPrefill?.id);
  editingColumnId = pendingPrefill?.id ?? null;
  modalTitle.textContent = isEditing ? 'Editar tesauro' : 'Añadir columna personalizada';
  submitBtn.textContent = isEditing ? 'Guardar cambios' : 'Añadir columna';

  if (pendingPrefill) {
    applyPrefill(pendingPrefill);
    pendingPrefill = null;
  }

  modal.classList.add('active');

  // Mostrar campo de número de filas solo si no hay datos
  if (!editingColumnId && hasDataCallback && !hasDataCallback()) {
    rowsField.style.display = 'block';
    numRowsInput.required = true;
  } else {
    rowsField.style.display = 'none';
    numRowsInput.required = false;
  }
}

function closeModal({ reason = 'cancel' } = {}) {
  modal.classList.remove('active');
  resetForm();
  editingColumnId = null;
  document.dispatchEvent(
    new CustomEvent('column-modal-closed', {
      detail: { reason }
    })
  );
}

export function openColumnModalWithPrefill(prefill) {
  pendingPrefill = prefill;
  openModal();
}

export function openColumnModalForEdit(prefill) {
  pendingPrefill = prefill;
  editingColumnId = prefill?.id ?? null;
  openModal();
}

function handleOpenRequest() {
  pendingPrefill = null;
  editingColumnId = null;

  if (detectedExtraProvider) {
    const candidate = detectedExtraProvider();
    if (candidate) {
      const shouldUse = confirm(`¿Quieres configurar la columna detectada "${candidate.name}"?`);
      if (shouldUse) {
        const reference = buildCamelCaseReference(candidate.name);
        pendingPrefill = { name: candidate.name, reference };
        document.dispatchEvent(
          new CustomEvent('thesaurus-prefill-accepted', {
            detail: { name: candidate.name }
          })
        );
      }
    }
  }

  openModal();
}

function buildCamelCaseReference(text) {
  const cleaned = text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim();

  if (!cleaned) return '';

  const parts = cleaned.split(/\s+/);
  return parts
    .map((part, index) => {
      const lower = part.toLowerCase();
      if (index === 0) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

export function registerDetectedExtraProvider(provider) {
  detectedExtraProvider = provider;
}

function resetForm() {
  form.reset();
  hideAllConfigSections();
  document.getElementById('selector-options').innerHTML = '';
  numberRangesContainer.innerHTML = '';
  currencyRangesContainer.innerHTML = '';
  delete numberRangesContainer.dataset.rangeMode;
  delete currencyRangesContainer.dataset.rangeMode;
  document.getElementById('number-decimals').value = '2';
  document.getElementById('currency-decimals').value = '2';
}

function hideAllConfigSections() {
  Object.values(configSections).forEach(section => {
    section.style.display = 'none';
  });
}

function applyPrefill(prefill) {
  document.getElementById('column-name').value = prefill.name ?? '';
  document.getElementById('column-reference').value = prefill.reference ?? '';

  if (prefill.type) {
    document.getElementById('column-type').value = prefill.type;
    handleTypeChange({ target: { value: prefill.type } });
    populateConfig(prefill.type, prefill.config);
  }
}

function handleTypeChange(e) {
  hideAllConfigSections();
  const type = e.target.value;

  if (type && configSections[type]) {
    configSections[type].style.display = 'block';

    if (type === 'number') {
      ensureInitialRangeRow(numberRangesContainer, 'number-min', 'number-max');
    }

    if (type === 'currency') {
      ensureInitialRangeRow(currencyRangesContainer, 'currency-min', 'currency-max');
    }

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

function populateConfig(type, config) {
  if (!config) return;

  switch (type) {
    case 'selector':
      populateSelectorConfig(config);
      break;
    case 'number':
      populateNumericConfig(config, 'number');
      break;
    case 'currency':
      populateNumericConfig(config, 'currency');
      break;
    case 'date':
      populateDateConfig(config);
      break;
    default:
      break;
  }
}

function addSelectorOption(defaults = {}) {
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
  optionDiv.querySelector('.option-reference').value = defaults.reference ?? '';
  optionDiv.querySelector('.option-value').value = defaults.value ?? '';
  optionDiv.querySelector('.option-percentage').value =
    defaults.percentage !== undefined && defaults.percentage !== null ? defaults.percentage : '';
}

function populateSelectorConfig(config) {
  const container = document.getElementById('selector-options');
  container.innerHTML = '';

  if (Array.isArray(config.options) && config.options.length > 0) {
    config.options.forEach((option) => addSelectorOption(option));
    return;
  }

  addSelectorOption();
  addSelectorOption();
}

function populateNumericConfig(config, prefix) {
  document.getElementById(`${prefix}-min`).value = config.min ?? '';
  document.getElementById(`${prefix}-max`).value = config.max ?? '';
  document.getElementById(`${prefix}-decimals`).value = config.decimals ?? '2';

  const container = prefix === 'number' ? numberRangesContainer : currencyRangesContainer;
  populateRanges(container, config.ranges, {
    minFieldId: `${prefix}-min`,
    maxFieldId: `${prefix}-max`
  });
  if (!config.ranges || config.ranges.length === 0) {
    ensureInitialRangeRow(container, `${prefix}-min`, `${prefix}-max`);
  }
}

function populateDateConfig(config) {
  if (config.min) document.getElementById('date-min').value = config.min;
  if (config.max) document.getElementById('date-max').value = config.max;
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

  // Obtener número de filas si no hay datos y se está creando
  let numRows = null;
  if (!editingColumnId && hasDataCallback && !hasDataCallback()) {
    numRows = parseInt(numRowsInput.value, 10);
    if (isNaN(numRows) || numRows < 1) {
      alert('Por favor, especifica un número válido de filas (mínimo 1)');
      return;
    }
  }

  const columnPayload = {
    name: columnName,
    reference: columnReference,
    type: columnType,
    config: config
  };

  let savedColumn = null;
  let action = 'create';

  if (editingColumnId) {
    savedColumn = updateCustomColumn(editingColumnId, columnPayload);
    action = 'edit';
  } else {
    savedColumn = addCustomColumn(columnPayload);
  }

  if (!savedColumn) {
    alert('No se pudo guardar el tesauro. Inténtalo de nuevo.');
    return;
  }

  closeModal({ reason: 'submit' });

  if (onColumnSavedCallback) {
    onColumnSavedCallback({ numRows, action, columnId: savedColumn.id });
  }

  document.dispatchEvent(
    new CustomEvent(action === 'create' ? 'column-added' : 'column-updated', {
      detail: {
        id: savedColumn.id,
        name: columnName,
        reference: columnReference,
        type: columnType
      }
    })
  );
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

function addRangeRow(container, defaults = {}, { showPercentage = true, onRemove } = {}) {
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
    <div class="field range-percentage-field">
      <label>% del total</label>
      <input type="number" min="0" max="100" step="1" class="range-percentage" placeholder="50" />
    </div>
    <button type="button" class="btn-remove" aria-label="Eliminar tramo">✕</button>
  `;

  row.querySelector('.btn-remove').addEventListener('click', () => {
    row.remove();
    if (onRemove) {
      onRemove();
    }
  });
  row.querySelector('.range-min').value = defaults.min ?? '';
  row.querySelector('.range-max').value = defaults.max ?? '';
  row.querySelector('.range-percentage').value = defaults.percentage ?? '';
  toggleRangePercentage(row, showPercentage);
  container.appendChild(row);
}

function populateRanges(container, ranges = [], { minFieldId, maxFieldId } = {}) {
  container.innerHTML = '';

  if (ranges.length === 0) {
    container.dataset.rangeMode = 'single';
    return;
  }

  container.dataset.rangeMode = 'enabled';
  ranges.forEach((range) =>
    addRangeRow(container, range, { onRemove: () => syncRangeMode(container, minFieldId, maxFieldId) })
  );
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
  if (rows.length === 0 || container.dataset.rangeMode !== 'enabled') return [];

  const ranges = [];
  let totalPercentage = 0;
  let hasInvalidRows = false;

  rows.forEach((row) => {
    const minValue = parseFloat(row.querySelector('.range-min').value);
    const maxValue = parseFloat(row.querySelector('.range-max').value);
    const percentage = parseFloat(row.querySelector('.range-percentage').value);

    if ([minValue, maxValue, percentage].some((v) => Number.isNaN(v))) {
      hasInvalidRows = true;
      return;
    }

    if (minValue >= maxValue) {
      hasInvalidRows = true;
      return;
    }

    ranges.push({ min: minValue, max: maxValue, percentage });
    totalPercentage += percentage;
  });

  if (hasInvalidRows) {
    alert(`Debes completar todos los tramos ${label} con valores y porcentajes válidos o eliminarlos.`);
    return null;
  }

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

function ensureInitialRangeRow(container, minFieldId, maxFieldId) {
  if (container.children.length > 0) return;
  addRangeRow(container, getDefaultRangeValues(container, minFieldId, maxFieldId), {
    showPercentage: false,
    onRemove: () => syncRangeMode(container, minFieldId, maxFieldId)
  });
  disableRangeMode(container);
}

function handleAddRange(container, minFieldId, maxFieldId) {
  if (container.children.length === 0) {
    ensureInitialRangeRow(container, minFieldId, maxFieldId);
  }

  enableRangeMode(container);
  addRangeRow(container, getDefaultRangeValues(container, minFieldId, maxFieldId), {
    showPercentage: true,
    onRemove: () => syncRangeMode(container, minFieldId, maxFieldId)
  });
}

function enableRangeMode(container) {
  container.dataset.rangeMode = 'enabled';
  Array.from(container.querySelectorAll('.range-row')).forEach((row, index) => {
    toggleRangePercentage(row, true);
    if (index === 0) {
      const percentageInput = row.querySelector('.range-percentage');
      if (!percentageInput.value) {
        percentageInput.value = '100';
      }
    }
  });
}

function disableRangeMode(container) {
  container.dataset.rangeMode = 'single';
  const rows = Array.from(container.querySelectorAll('.range-row'));
  rows.forEach((row, index) => {
    toggleRangePercentage(row, false);
    row.querySelector('.range-percentage').value = '';
    if (index > 0) {
      row.remove();
    }
  });
}

function toggleRangePercentage(row, visible) {
  const percentageField = row.querySelector('.range-percentage-field');
  if (!percentageField) return;
  percentageField.style.display = visible ? '' : 'none';
}

function syncRangeMode(container, minFieldId, maxFieldId) {
  if (container.children.length === 0) {
    ensureInitialRangeRow(container, minFieldId, maxFieldId);
    return;
  }

  if (container.dataset.rangeMode !== 'enabled') return;

  if (container.children.length <= 1) {
    disableRangeMode(container);
  }
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
