import { getBaseColumnsConfig, setBaseColumnsConfig } from './baseColumnsModal.js';
import { openColumnModalWithPrefill } from './columnModal.js';

const modal = document.getElementById('thesaurus-detector-modal');
const openBtn = document.getElementById('thesaurus-detector-btn');
const closeBtn = document.getElementById('close-thesaurus-modal');
const cancelBtn = document.getElementById('cancel-thesaurus-modal');
const analyzeBtn = document.getElementById('thesaurus-analyze-btn');
const continueBtn = document.getElementById('thesaurus-continue-btn');
const pasteInput = document.getElementById('thesaurus-paste');
const baseResults = document.getElementById('thesaurus-base-results');
const extrasResults = document.getElementById('thesaurus-extra-list');
const selectAllExtras = document.getElementById('thesaurus-select-all');
const feedback = document.getElementById('thesaurus-feedback');

let refreshTableCallback = null;
let pendingThesaurusExtras = [];
let isUsingDetectedPrefill = false;

export function initThesaurusDetector({ refreshTable }) {
  refreshTableCallback = refreshTable;

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal();
    });
  }

  if (analyzeBtn) analyzeBtn.addEventListener('click', handleAnalyze);
  if (continueBtn) continueBtn.addEventListener('click', handleContinue);
  if (selectAllExtras) {
    selectAllExtras.addEventListener('change', () => {
      const checkboxes = modal.querySelectorAll('.thesaurus-extra-check');
      checkboxes.forEach((checkbox) => {
        checkbox.checked = selectAllExtras.checked;
      });
    });
  }

  document.addEventListener('column-added', handleColumnAddedFromQueue);
  document.addEventListener('column-modal-closed', handleColumnModalClosed);
  document.addEventListener('thesaurus-prefill-accepted', handleThesaurusPrefillAccepted);
}

function openModal() {
  resetModal();
  modal.classList.add('active');
  pasteInput?.focus();
}

function closeModal() {
  modal.classList.remove('active');
  pendingThesaurusExtras = [];
  isUsingDetectedPrefill = false;
}

function resetModal() {
  pasteInput.value = '';
  baseResults.innerHTML = '';
  extrasResults.innerHTML = '';
  feedback.textContent = 'Pega el listado y pulsa "Detectar tesauros"';
  selectAllExtras.checked = true;
}

function handleAnalyze() {
  const text = pasteInput.value.trim();
  if (!text) {
    feedback.textContent = 'No se encontraron datos. Pega un listado con el formato Campo: Tesauro';
    return;
  }

  const entries = parseEntries(text);
  const baseCandidates = extractBaseCandidates(entries);
  const extraCandidates = entries.filter((entry) => !entry.baseType);

  renderBaseCandidates(baseCandidates);
  renderExtraCandidates(extraCandidates);

  if (entries.length === 0) {
    feedback.textContent = 'No se detectaron líneas con ":". Añade el contenido completo del copiapega.';
  } else {
    feedback.textContent = 'Revisa los tesauros detectados y decide cuáles configurar.';
  }
}

function handleContinue() {
  const baseSelections = collectBaseSelections();
  const currentConfig = getBaseColumnsConfig();
  const updatedConfig = {
    street: {
      name: baseSelections.street?.name || currentConfig?.street?.name || 'Dirección',
      reference: baseSelections.street?.reference || currentConfig?.street?.reference || 'direccion'
    },
    lat: {
      name: baseSelections.lat?.name || currentConfig?.lat?.name || 'Latitud',
      reference: baseSelections.lat?.reference || currentConfig?.lat?.reference || 'latitud'
    },
    lng: {
      name: baseSelections.lng?.name || currentConfig?.lng?.name || 'Longitud',
      reference: baseSelections.lng?.reference || currentConfig?.lng?.reference || 'longitud'
    }
  };

  setBaseColumnsConfig(updatedConfig, { runCallback: false });
  if (refreshTableCallback) {
    refreshTableCallback();
  }

  pendingThesaurusExtras = collectSelectedExtras();
  isUsingDetectedPrefill = false;
  closeModal();
  openNextCustomColumn();
}

function parseEntries(text) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawLabel, ...rest] = line.split(':');
      if (rest.length === 0) return null;
      const label = rawLabel.trim();
      const value = rest.join(':').trim();
      return { label, value };
    })
    .filter(Boolean)
    .map((entry) => ({ ...entry, baseType: detectBaseField(entry) }));
}

function detectBaseField(entry) {
  const normalizedLabel = normalize(entry.label);
  const normalizedValue = normalize(entry.value);

  if (normalizedLabel.includes('longitud') || normalizedValue.includes('longitud')) return 'lng';
  if (normalizedLabel.includes('latitud') || normalizedValue.includes('latitud')) return 'lat';
  if (normalizedLabel.includes('direccion') || normalizedLabel.includes('direcci')) return 'street';
  if (normalizedValue.includes('direccion') || normalizedValue.includes('direcci')) return 'street';
  return null;
}

function extractBaseCandidates(entries) {
  const candidates = {};

  entries.forEach((entry) => {
    if (!entry.baseType) return;
    const sanitizedReference = suggestReference(entry.value);
    candidates[entry.baseType] = {
      name: entry.value,
      reference: sanitizedReference
    };
  });

  return candidates;
}

function renderBaseCandidates(candidates) {
  baseResults.innerHTML = '';
  const labels = {
    street: 'Dirección',
    lat: 'Latitud',
    lng: 'Longitud'
  };

  const candidateKeys = Object.keys(labels);
  candidateKeys.forEach((key) => {
    const candidate = candidates[key];
    const defaultName = labels[key];
    const defaultReference = suggestReference(defaultName);
    const row = document.createElement('div');
    row.className = 'thesaurus-row';

    if (candidate) {
      row.innerHTML = `
        <label class="thesaurus-check">
          <input type="checkbox" class="thesaurus-base-check" data-field="${key}" checked />
          <span>Usar este nombre para ${labels[key]}</span>
        </label>
        <input type="text" class="thesaurus-base-name" data-field="${key}" value="${candidate.name}" />
        <p class="help-text">Referencia sugerida: ${candidate.reference}</p>
      `;
    } else {
      row.innerHTML = `
        <label class="thesaurus-check">
          <input type="checkbox" class="thesaurus-base-check" data-field="${key}" checked />
          <span>Asignar ${labels[key]} con el nombre por defecto</span>
        </label>
        <input type="text" class="thesaurus-base-name" data-field="${key}" value="${defaultName}" />
        <p class="help-text">Referencia sugerida: ${defaultReference}</p>
      `;
    }

    baseResults.appendChild(row);
  });
}

function renderExtraCandidates(extras) {
  extrasResults.innerHTML = '';

  if (!extras.length) {
    extrasResults.innerHTML = '<p class="meta">No se detectaron campos adicionales para añadir.</p>';
    return;
  }

  extras.forEach((extra) => {
    const option = document.createElement('label');
    option.className = 'thesaurus-extra';
    option.innerHTML = `
      <input type="checkbox" class="thesaurus-extra-check" data-name="${extra.value}" checked />
      <div>
        <strong>${extra.value}</strong>
        <p class="help-text">Referencia sugerida: ${toCamelCase(extra.value)}</p>
      </div>
    `;
    extrasResults.appendChild(option);
  });
}

function collectBaseSelections() {
  const selections = {};
  const checks = modal.querySelectorAll('.thesaurus-base-check');

  checks.forEach((check) => {
    const field = check.dataset.field;
    const nameInput = modal.querySelector(`.thesaurus-base-name[data-field="${field}"]`);
    const value = nameInput?.value.trim();
    if (check.checked && value) {
      selections[field] = { name: value, reference: suggestReference(value) };
    }
  });

  return selections;
}

function collectSelectedExtras() {
  const checks = modal.querySelectorAll('.thesaurus-extra-check');
  return Array.from(checks)
    .filter((check) => check.checked)
    .map((check) => {
      const name = check.dataset.name;
      return {
        name,
        reference: toCamelCase(name)
      };
    });
}

function openNextCustomColumn() {
  if (pendingThesaurusExtras.length === 0) return;
  const next = pendingThesaurusExtras[0];
  isUsingDetectedPrefill = true;
  openColumnModalWithPrefill(next);
}

function handleColumnAddedFromQueue() {
  if (!isUsingDetectedPrefill || pendingThesaurusExtras.length === 0) return;
  pendingThesaurusExtras.shift();
  isUsingDetectedPrefill = false;
  setTimeout(openNextCustomColumn, 120);
}

function handleColumnModalClosed() {
  isUsingDetectedPrefill = false;
}

function handleThesaurusPrefillAccepted(event) {
  if (!pendingThesaurusExtras.length) return;
  const pending = pendingThesaurusExtras[0];
  const normalizedName = normalize(event.detail?.name || '');
  const normalizedPending = normalize(pending.name);

  if (normalizedName === normalizedPending) {
    isUsingDetectedPrefill = true;
  }
}

function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]/g, '');
}

function suggestReference(text) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
}

function toCamelCase(text) {
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

export function getPendingThesaurusExtra() {
  return pendingThesaurusExtras[0] || null;
}
