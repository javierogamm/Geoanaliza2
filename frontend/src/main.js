import { fetchPoints, fetchPointsInBoundingBox, searchLocation } from './api.js';
import {
  clearResults,
  renderMeta,
  renderPoints,
  setStatus,
  exportCSV,
  getCurrentPoints,
  getCustomColumnsDataMap,
  invalidateCustomColumnData
} from './ui.js';
import { initColumnModal, openColumnModalForEdit, registerDetectedExtraProvider } from './columnModal.js';
import {
  initBaseColumnsModal,
  openBaseColumnsModal,
  hasBaseColumnsConfig,
  getBaseColumnsConfig
} from './baseColumnsModal.js';
import { initImportExcel, getExpedientesData, hasExpedientes } from './importExcel.js';
import { initImportCsv } from './importCsv.js';
import { initTranspose, showTransposeButton } from './transposeData.js';
import { addCustomColumn, getCustomColumns, removeCustomColumn } from './columnManager.js';
import { initCreateExpedients } from './createExpedients.js';
import { initThesaurusDetector, getPendingThesaurusExtra } from './thesaurusDetector.js';

const form = document.getElementById('search-form');
const cityInput = document.getElementById('city');
const neighbourhoodInput = document.getElementById('neighbourhood');
const limitInput = document.getElementById('limit');
const mapLimitInput = document.getElementById('map-limit');
const exportButton = document.getElementById('export-btn');
const areaMapContainer = document.getElementById('area-map');
const drawAreaButton = document.getElementById('draw-area-btn');
const resetAreaButton = document.getElementById('reset-area-btn');
const searchAreaButton = document.getElementById('search-area-btn');
const areaSearchInput = document.getElementById('area-search');
const areaSearchButton = document.getElementById('area-search-btn');
const areaSearchSlot = document.getElementById('area-search-slot');
const searchModeRadios = document.querySelectorAll('input[name="search-mode"]');
const formPanel = document.querySelector('.form-panel');
const mapPanel = document.querySelector('.area-panel');
const areaStatus = document.getElementById('area-status');
const areaCoordinatesContainer = document.getElementById('area-coordinates');
const baseThesaurusList = document.getElementById('base-thesaurus-list');
const customColumnsList = document.getElementById('custom-columns-list');
const customThesaurusFeedback = document.getElementById('custom-thesaurus-feedback');
const stepPanels = document.querySelectorAll('.step-panel');
const stepSkipButtons = document.querySelectorAll('.step-skip-btn');
const MAX_LIMIT = 1000;
const BATCH_SIZE = 100;
const DEFAULT_LIMIT = 20;

// Variable para guardar los últimos puntos y poder re-renderizar
let lastPointsData = null;
// Variable para guardar puntos ficticios generados
let mockPoints = [];
// Variables para la selección de área en mapa
let mapInstance = null;
let drawnArea = null;
let previewPath = null;
let selectionEnabled = false;
let areaBounds = null;
let polygonVertices = [];
let vertexMarkers = [];
let pointsLayerGroup = null;
let locationMarker = null;
let searchMode = 'city';
const orderedStepPanels = Array.from(stepPanels);

const formatBoundingBoxLabel = (bbox) =>
  `S:${bbox.south.toFixed(5)} W:${bbox.west.toFixed(5)} N:${bbox.north.toFixed(5)} E:${bbox.east.toFixed(5)}`;

const convertBoundsToBoundingBox = (bounds) => ({
  south: bounds.getSouth(),
  west: bounds.getWest(),
  north: bounds.getNorth(),
  east: bounds.getEast()
});

const fitMapToBoundingBox = (bbox) => {
  if (!mapInstance || !bbox) return;
  const bounds = L.latLngBounds(
    [bbox.south, bbox.west],
    [bbox.north, bbox.east]
  );
  mapInstance.fitBounds(bounds, { padding: [24, 24], maxZoom: 13 });
};

const parseLimit = (value) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  if (parsed > MAX_LIMIT) return MAX_LIMIT;
  return parsed;
};

const syncLimitInputs = (value) => {
  if (limitInput && limitInput.value !== value) {
    limitInput.value = value;
  }

  if (mapLimitInput && mapLimitInput.value !== value) {
    mapLimitInput.value = value;
  }
};

const getActiveLimit = () => {
  const valueFromInput = searchMode === 'map' && mapLimitInput ? mapLimitInput.value : limitInput?.value;
  return parseLimit(valueFromInput || DEFAULT_LIMIT);
};

const togglePanelsByMode = () => {
  if (formPanel) {
    formPanel.classList.toggle('is-hidden', searchMode !== 'city');
  }

  if (mapPanel) {
    mapPanel.classList.toggle('is-hidden', searchMode !== 'map');
  }

  if (areaSearchSlot) {
    areaSearchSlot.classList.toggle('is-hidden', searchMode !== 'map');
  }
};

const scrollToPanel = (panel) => {
  if (!panel) return;
  panel.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
};

const markStepAsSkipped = (panel) => {
  if (!panel) return;
  panel.classList.remove('is-active', 'is-done');
  panel.classList.add('is-skipped');
  const feedback = panel.querySelector('.step-feedback');
  if (feedback) {
    feedback.textContent = 'Fase saltada. Puedes retomarla cuando lo necesites.';
    feedback.classList.add('step-feedback--skipped');
    feedback.classList.remove('step-feedback--active');
  }
};

const markStepAsActive = (panel, message) => {
  if (!panel) return;
  const wasActive = panel.classList.contains('is-active');
  panel.classList.remove('is-skipped', 'is-done');
  panel.classList.add('is-active');
  const feedback = panel.querySelector('.step-feedback');
  if (feedback && message) {
    feedback.textContent = message;
    feedback.classList.remove('step-feedback--skipped');
    feedback.classList.add('step-feedback--active');
  }
  if (!wasActive) {
    scrollToPanel(panel);
  }
};

const markStepAsDone = (panel, message) => {
  if (!panel) return;
  const wasDone = panel.classList.contains('is-done');
  panel.classList.remove('is-skipped', 'is-active');
  panel.classList.add('is-done');
  const feedback = panel.querySelector('.step-feedback');
  if (feedback && message) {
    feedback.textContent = message;
    feedback.classList.remove('step-feedback--skipped', 'step-feedback--active');
  }
  if (!wasDone) {
    scrollToPanel(panel);
  }
};

const mergePointsById = (currentPoints, incomingPoints = []) => {
  const registry = new Map(currentPoints.map((point) => [point.id, point]));
  incomingPoints.forEach((point) => {
    registry.set(point.id, point);
  });
  return Array.from(registry.values());
};

const fetchPointsInBatches = async ({ limit, requestFactory }) => {
  const safeLimit = Math.max(1, Math.min(limit, MAX_LIMIT));
  const plannedBatches = Math.max(1, Math.ceil(safeLimit / BATCH_SIZE));
  let collectedPoints = [];

  const aggregatedMeta = {
    city: null,
    neighbourhood: null,
    boundingBox: null,
    areaLabel: undefined,
    totalAvailable: 0
  };

  for (let batchIndex = 0; batchIndex < plannedBatches; batchIndex += 1) {
    const remaining = safeLimit - collectedPoints.length;
    if (remaining <= 0) break;

    setStatus(
      `Buscando puntos en OpenStreetMap... (bloque ${batchIndex + 1}/${plannedBatches})`,
      false,
      { loading: true }
    );

    const data = await requestFactory(Math.min(BATCH_SIZE, remaining));

    aggregatedMeta.city ??= data.city ?? null;
    aggregatedMeta.neighbourhood ??= data.neighbourhood ?? null;
    aggregatedMeta.boundingBox ??= data.boundingBox ?? null;
    aggregatedMeta.areaLabel ??= data.areaLabel;
    aggregatedMeta.totalAvailable = Math.max(aggregatedMeta.totalAvailable, data.totalAvailable || 0);

    collectedPoints = mergePointsById(collectedPoints, data.points || []);

    const targetForRender = aggregatedMeta.totalAvailable
      ? Math.min(aggregatedMeta.totalAvailable, safeLimit)
      : safeLimit;

    renderMeta({
      city: aggregatedMeta.city || '',
      neighbourhood: aggregatedMeta.neighbourhood || '',
      totalAvailable: aggregatedMeta.totalAvailable || targetForRender,
      returned: collectedPoints.length,
      areaLabel: aggregatedMeta.areaLabel,
      boundingBox: aggregatedMeta.boundingBox
    });
    renderPoints(collectedPoints);

    plotPointsOnMap(collectedPoints);

    if (collectedPoints.length >= targetForRender) {
      break;
    }
  }

  setStatus('');

  return {
    ...aggregatedMeta,
    totalAvailable: aggregatedMeta.totalAvailable || collectedPoints.length,
    returned: collectedPoints.length,
    points: collectedPoints
  };
};

// Función para verificar si hay datos cargados
function hasData() {
  return (lastPointsData && lastPointsData.points && lastPointsData.points.length > 0) || mockPoints.length > 0;
}

function refreshTableWithCurrentData() {
  if (lastPointsData && lastPointsData.points && lastPointsData.points.length > 0) {
    renderPoints(lastPointsData.points);
    return;
  }

  if (mockPoints.length > 0) {
    renderPoints(mockPoints);
    return;
  }

  renderPoints([]);
}

function renderBaseThesaurusSection() {
  if (!baseThesaurusList) return;

  baseThesaurusList.innerHTML = '';
  const defaults = {
    street: { name: 'Dirección', reference: 'direccion' },
    lat: { name: 'Latitud', reference: 'latitud' },
    lng: { name: 'Longitud', reference: 'longitud' }
  };

  const config = getBaseColumnsConfig();
  const entries = [config?.street || defaults.street, config?.lat || defaults.lat, config?.lng || defaults.lng];

  entries.forEach((entry, index) => {
    const chip = document.createElement('div');
    chip.className = 'thesaurus-chip thesaurus-chip--base';
    chip.innerHTML = `
      <div class="thesaurus-chip__info">
        <span class="thesaurus-chip__name">${entry.name}</span>
        <span class="thesaurus-chip__meta">${entry.reference} · Columna base ${index + 1}</span>
      </div>
      <div class="thesaurus-chip__actions">
        <button class="chip-action" data-action="edit-base" data-field="${entry.reference}">Editar</button>
      </div>
    `;
    baseThesaurusList.appendChild(chip);
  });
}

function formatColumnType(type) {
  switch (type) {
    case 'selector':
      return 'Selector';
    case 'number':
      return 'Número';
    case 'currency':
      return 'Moneda';
    case 'date':
      return 'Fecha';
    case 'csv':
      return 'CSV';
    default:
      return type;
  }
}

function renderCustomThesaurusSection() {
  if (!customColumnsList || !customThesaurusFeedback) return;

  customColumnsList.innerHTML = '';
  const columns = getCustomColumns();

  if (!columns.length) {
    customThesaurusFeedback.textContent = 'No hay tesauros personalizados configurados todavía.';
    return;
  }

  customThesaurusFeedback.textContent = 'Cada columna tiene acciones rápidas para editar o eliminar.';

  columns.forEach((column) => {
    const chip = document.createElement('div');
    chip.className = 'thesaurus-chip';
    chip.innerHTML = `
      <div class="thesaurus-chip__info">
        <span class="thesaurus-chip__name">${column.name}</span>
        <span class="thesaurus-chip__meta">${column.reference} · ${formatColumnType(column.type)}</span>
      </div>
      <div class="thesaurus-chip__actions">
        <button class="chip-action" data-action="edit" data-column-id="${column.id}">Editar</button>
        <button class="chip-action" data-action="delete" data-column-id="${column.id}">Eliminar</button>
      </div>
    `;

    customColumnsList.appendChild(chip);
  });
}

function renderThesaurusBoard() {
  renderBaseThesaurusSection();
  renderCustomThesaurusSection();
}

// Función para generar puntos ficticios
function generateMockPoints(numRows) {
  mockPoints = [];
  for (let i = 0; i < numRows; i++) {
    mockPoints.push({
      id: `mock_${i}`,
      name: `Punto ${i + 1}`,
      street: `Calle ficticia ${i + 1}`,
      lat: 0,
      lng: 0,
      source: 'mock'
    });
  }
}

function setAreaStatus(message, isError = false) {
  if (!areaStatus) return;
  areaStatus.textContent = message;
  areaStatus.style.color = isError ? '#f87171' : 'var(--muted)';
}

function renderAreaCoordinates(points = []) {
  if (!areaCoordinatesContainer) return;

  areaCoordinatesContainer.innerHTML = '';

  const title = document.createElement('h3');
  title.textContent = 'Coordenadas del área';
  areaCoordinatesContainer.appendChild(title);

  if (!points.length) {
    const hint = document.createElement('p');
    hint.className = 'meta';
    hint.textContent = 'Añade vértices haciendo clic en el mapa para ver sus coordenadas.';
    areaCoordinatesContainer.appendChild(hint);
    return;
  }

  const list = document.createElement('ol');
  list.className = 'area-coordinates-list';

  points.forEach((point, index) => {
    const item = document.createElement('li');
    item.textContent = `P${index + 1}: ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
    list.appendChild(item);
  });

  areaCoordinatesContainer.appendChild(list);
}

function showBoundingBoxStatus(bbox, prefix = 'Área seleccionada') {
  if (!bbox) return;
  const message = `${prefix}: ${formatBoundingBoxLabel(bbox)}`;
  setAreaStatus(message);
}

// Función para generar puntos desde expedientes importados
function generatePointsFromExpedientes(expedientes) {
  const { values } = expedientes;

  // Si ya tenemos puntos reales cargados, mantenerlos y solo añadir la columna de expedientes
  if (lastPointsData && lastPointsData.points && lastPointsData.points.length > 0) {
    return lastPointsData.points;
  }

  // En caso contrario, generar filas ficticias para mostrar los expedientes
  mockPoints = [];
  const offsetStep = 0.0025;
  for (let i = 0; i < values.length; i++) {
    const latOffset = (i % 10) * offsetStep;
    const lngOffset = Math.floor(i / 10) * offsetStep;
    mockPoints.push({
      id: `expediente_${i}`,
      name: `Expediente ${i + 1}`,
      street: '',
      lat: latOffset,
      lng: lngOffset,
      source: 'expediente',
      expedienteValue: values[i]
    });
  }

  return mockPoints;
}

// Inicializar el modal de columnas personalizadas
initColumnModal({
  onSaved: ({ numRows, action, columnId }) => {
    if (action === 'edit' && columnId) {
      invalidateCustomColumnData(columnId);
      refreshTableWithCurrentData();
    } else if (numRows) {
      generateMockPoints(numRows);
      renderPoints(mockPoints);
    } else if (lastPointsData) {
      renderPoints(lastPointsData.points);
    } else if (mockPoints.length > 0) {
      renderPoints(mockPoints);
    } else {
      renderPoints([]);
    }

    renderThesaurusBoard();
  },
  hasData
});

// Inicializar el modal de tesauros base
initBaseColumnsModal((config) => {
  // Una vez configurado, proceder con la búsqueda
  renderThesaurusBoard();
  performSearch();
});

// Inicializar el módulo de importación de Excel
initImportExcel((expedientes) => {
  // Cuando se importan expedientes, generar puntos y renderizar
  markStepAsActive(
    orderedStepPanels[0],
    'Cargando expedientes y generando filas ficticias para dibujarlas en el mapa...'
  );
  const pointsToRender = generatePointsFromExpedientes(expedientes);
  renderPoints(pointsToRender);
  plotPointsOnMap(pointsToRender);
  if (searchModeRadios?.length) {
    searchModeRadios.forEach((radio) => {
      radio.checked = radio.value === 'map';
    });
    searchMode = 'map';
    togglePanelsByMode();
  }
  markStepAsDone(orderedStepPanels[1], 'Puntos de los expedientes dibujados en el mapa.');
  markStepAsDone(
    orderedStepPanels[0],
    'Expedientes importados. Se generan filas ficticias y se representan en el mapa.'
  );
  // Mostrar botón de transponer
  showTransposeButton();
});

// Inicializar el módulo de importación de CSV
initImportCsv((columnData) => {
  // Cuando se importa una columna CSV, añadirla como columna personalizada
  addCustomColumn({
    name: columnData.name,
    reference: columnData.reference,
    type: 'csv',
    config: {
      values: columnData.values
    }
  });

  // Re-renderizar la tabla con la nueva columna
  if (lastPointsData && lastPointsData.points && lastPointsData.points.length > 0) {
    renderPoints(lastPointsData.points);
  } else if (mockPoints.length > 0) {
    renderPoints(mockPoints);
  } else {
    renderPoints([]);
  }

  renderThesaurusBoard();
});

// Inicializar el módulo de transposición
initTranspose(getCurrentPoints, getCustomColumnsDataMap);

// Inicializar el módulo de crear expedientes
initCreateExpedients();

// Inicializar identificador de tesauros a partir de texto pegado
initThesaurusDetector({ refreshTable: refreshTableWithCurrentData });
registerDetectedExtraProvider(() => getPendingThesaurusExtra());
renderThesaurusBoard();

document.addEventListener('thesaurus-workflow-start', () => {
  markStepAsActive(
    orderedStepPanels[3],
    'Revisa los tesauros pegados, valida referencias y confirma para aplicarlos.'
  );
});

document.addEventListener('thesaurus-validated', () => {
  markStepAsDone(
    orderedStepPanels[3],
    'Tesauros validados y aplicados. Puedes seguir con la transposición.'
  );
});

document.addEventListener('transposition-started', () => {
  markStepAsActive(
    orderedStepPanels[4],
    'Selecciona los campos a transponer y revisa la vista previa antes de exportar.'
  );
});

document.addEventListener('transposition-exported', () => {
  markStepAsDone(
    orderedStepPanels[4],
    'Transposición exportada correctamente. Los datos se han descargado en CSV.'
  );
});

if (limitInput) {
  limitInput.addEventListener('input', (event) => syncLimitInputs(event.target.value));
}

if (mapLimitInput) {
  mapLimitInput.addEventListener('input', (event) => syncLimitInputs(event.target.value));
}

if (customColumnsList) {
  customColumnsList.addEventListener('click', (event) => {
    const action = event.target?.dataset?.action;
    const columnId = event.target?.dataset?.columnId;
    if (!action || !columnId) return;

    if (action === 'edit') {
      const column = getCustomColumns().find((item) => item.id === columnId);
      if (column) {
        openColumnModalForEdit(column);
      }
      return;
    }

    if (action === 'delete') {
      const column = getCustomColumns().find((item) => item.id === columnId);
      const shouldDelete = confirm(`¿Eliminar el tesauro "${column?.name || 'sin nombre'}"?`);
      if (!shouldDelete) return;

      removeCustomColumn(columnId);
      invalidateCustomColumnData(columnId);
      renderThesaurusBoard();
      refreshTableWithCurrentData();
    }
  });
}

if (baseThesaurusList) {
  baseThesaurusList.addEventListener('click', (event) => {
    const action = event.target?.dataset?.action;
    if (action === 'edit-base') {
      openBaseColumnsModal(getBaseColumnsConfig());
    }
  });
}

if (stepSkipButtons?.length) {
  stepSkipButtons.forEach((button) => {
    button.addEventListener('click', () => {
      markStepAsSkipped(button.closest('.step-panel'));
    });
  });
}

if (searchModeRadios?.length) {
  searchModeRadios.forEach((radio) => {
    radio.addEventListener('change', (event) => {
      if (!event.target.checked) return;
      searchMode = event.target.value;
      togglePanelsByMode();
      markStepAsDone(
        orderedStepPanels[1],
        searchMode === 'map'
          ? 'Has elegido dibujar en mapa. Añade vértices y consulta los puntos.'
          : 'Has elegido buscar por ciudad. Completa los campos y lanza la búsqueda.'
      );
    });
  });
}

togglePanelsByMode();
syncLimitInputs(limitInput?.value || mapLimitInput?.value || DEFAULT_LIMIT);

if (areaMapContainer) {
  initAreaMap();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (searchMode !== 'city') {
    setStatus('Activa "Indicar población" para buscar por municipio o usa el mapa para dibujar el área.', true);
    return;
  }

  const city = cityInput.value.trim();
  if (!city) {
    setStatus('Introduce un municipio para buscar.', true);
    return;
  }

  // Si no hay configuración de tesauros base, mostrar modal
  if (!hasBaseColumnsConfig()) {
    openBaseColumnsModal();
  } else {
    // Si ya hay configuración, proceder con la búsqueda
    performSearch();
  }
});

async function performSearch() {
  clearResults();

  const city = cityInput.value.trim();
  const neighbourhood = neighbourhoodInput.value.trim();
  const limit = getActiveLimit();

  if (!city) {
    setStatus('Introduce un municipio para buscar.', true);
    return;
  }

  try {
    markStepAsActive(
      orderedStepPanels[1],
      'Buscando puntos por municipio y preparando el siguiente bloque de mapa.'
    );
    markStepAsActive(
      orderedStepPanels[2],
      'Llegarán los puntos en bloques. Se irán pintando en cuanto estén listos.'
    );
    const data = await fetchPointsInBatches({
      limit,
      requestFactory: (chunkLimit) => fetchPoints({ city, neighbourhood, limit: chunkLimit })
    });

    lastPointsData = data; // Guardamos los datos para re-renderizar
    mockPoints = []; // Limpiar puntos ficticios cuando se cargan datos reales
    renderMeta({
      city: data.city,
      neighbourhood: data.neighbourhood,
      totalAvailable: data.totalAvailable,
      returned: data.returned,
      boundingBox: data.boundingBox
    });
    renderPoints(data.points);
    plotPointsOnMap(data.points);
    markStepAsDone(
      orderedStepPanels[1],
      'Consulta por municipio completada y puntos pintados en el mapa.'
    );
    markStepAsDone(
      orderedStepPanels[2],
      'Puntos obtenidos. Los resultados están listos para enriquecer o transponer.'
    );
  } catch (error) {
    setStatus(error.message || 'No se pudo obtener puntos', true, { loading: false });
  }
}

exportButton.addEventListener('click', () => {
  try {
    exportCSV();
  } catch (error) {
    setStatus('No se pudo exportar el CSV', true);
  }
});

if (drawAreaButton) {
  drawAreaButton.addEventListener('click', () => {
    startAreaSelection();
  });
}

if (resetAreaButton) {
  resetAreaButton.addEventListener('click', () => {
    clearAreaSelection();
  });
}

if (searchAreaButton) {
  searchAreaButton.addEventListener('click', () => {
    if (searchMode !== 'map') {
      setStatus('Selecciona "Con mapa" para buscar dibujando un área.', true);
      return;
    }
    performAreaSearch();
  });
}

if (areaSearchButton) {
  areaSearchButton.addEventListener('click', () => {
    focusOnSearchedLocation();
  });
}

if (areaSearchInput) {
  areaSearchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      focusOnSearchedLocation();
    }
  });
}

function clearAreaSelection() {
  areaBounds = null;
  polygonVertices = [];
  selectionEnabled = false;
  if (mapInstance) {
    mapInstance.doubleClickZoom.enable();
  }
  removeAreaLayers();
  if (areaMapContainer) {
    areaMapContainer.classList.remove('drawing');
  }
  setAreaStatus('Área reiniciada. Pulsa "Dibujar área" para seleccionar nuevamente.');
  renderAreaCoordinates([]);
}

function plotPointsOnMap(points = []) {
  if (!mapInstance || !pointsLayerGroup) return;

  pointsLayerGroup.clearLayers();

  const validPoints = (points || []).filter(
    (point) => typeof point?.lat === 'number' && typeof point?.lng === 'number' && point?.source === 'osm'
  );

  validPoints.forEach((point) => {
    const marker = L.circleMarker([point.lat, point.lng], {
      radius: 6,
      color: '#22d3ee',
      weight: 2,
      fillColor: '#22d3ee',
      fillOpacity: 0.65
    });

    const label = [point.name || 'Punto sin nombre', point.street].filter(Boolean).join(' · ');
    marker.bindPopup(label || 'Punto obtenido');
    marker.addTo(pointsLayerGroup);
  });

  if (!selectionEnabled) {
    const bounds = pointsLayerGroup.getBounds();
    if (bounds?.isValid() && validPoints.length) {
      mapInstance.fitBounds(bounds, { padding: [24, 24], maxZoom: 15 });
    }
  }

  if (validPoints.length) {
    markStepAsDone(orderedStepPanels[1], 'Puntos dibujados en el mapa.');
    markStepAsDone(orderedStepPanels[2], 'Mapa actualizado con los puntos obtenidos.');
  }
}

function enableRightClickScroll() {
  if (!areaMapContainer || !mapInstance?.dragging?._draggable) return;

  areaMapContainer.addEventListener('contextmenu', (event) => event.preventDefault());

  areaMapContainer.addEventListener('mousedown', (event) => {
    if (event.button !== 2) return;
    event.preventDefault();
    mapInstance.dragging._draggable._onDown(event);
  });
}

function initAreaMap() {
  if (!window.L || !areaMapContainer) {
    setAreaStatus('El mapa no pudo cargarse.');
    renderAreaCoordinates([]);
    return;
  }

  mapInstance = L.map(areaMapContainer, {
    zoomControl: true,
    scrollWheelZoom: true
  }).setView([40.4168, -3.7038], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Datos geográficos © OpenStreetMap contributors'
  }).addTo(mapInstance);

  pointsLayerGroup = L.featureGroup().addTo(mapInstance);

  mapInstance.on('click', handleMapClick);
  mapInstance.on('mousemove', (event) => {
    if (!selectionEnabled || !polygonVertices.length) return;
    updatePreviewPath(event.latlng);
  });

  enableRightClickScroll();

  setAreaStatus('Pulsa "Dibujar área" y ve marcando los vértices sobre el mapa.');
  renderAreaCoordinates([]);
}

function startAreaSelection() {
  if (!mapInstance) return;

  selectionEnabled = true;
  areaBounds = null;
  polygonVertices = [];
  removeAreaLayers();
  mapInstance.doubleClickZoom.disable();

  if (areaMapContainer) {
    areaMapContainer.classList.add('drawing');
  }

  markStepAsActive(
    orderedStepPanels[1],
    'Dibuja el área en el mapa para crear los puntos del siguiente bloque.'
  );
  markStepAsActive(
    orderedStepPanels[2],
    'Completa el polígono para lanzar la consulta y pintar los resultados.'
  );

  setAreaStatus('Haz clic en el mapa para añadir vértices. Cierra el polígono pulsando sobre el primer punto.');
  renderAreaCoordinates([]);
}

function removeAreaLayers() {
  if (mapInstance && drawnArea) {
    mapInstance.removeLayer(drawnArea);
    drawnArea = null;
  }

  if (mapInstance && previewPath) {
    mapInstance.removeLayer(previewPath);
    previewPath = null;
  }

  if (mapInstance && vertexMarkers.length) {
    vertexMarkers.forEach((marker) => mapInstance.removeLayer(marker));
    vertexMarkers = [];
  }
}

function clearLocationMarker() {
  if (mapInstance && locationMarker) {
    mapInstance.removeLayer(locationMarker);
    locationMarker = null;
  }
}

async function focusOnSearchedLocation() {
  if (!areaSearchInput || searchMode !== 'map') {
    setAreaStatus('Activa "Con mapa" para ubicar la zona antes de dibujar.', true);
    return;
  }

  const query = areaSearchInput.value.trim();
  if (!query) {
    setAreaStatus('Introduce una localidad para centrar el mapa.', true);
    return;
  }

  if (!mapInstance) {
    setAreaStatus('El mapa todavía no está listo.', true);
    return;
  }

  if (areaSearchButton) {
    areaSearchButton.disabled = true;
  }
  setAreaStatus(`Buscando ${query} en el mapa...`);

  try {
    const location = await searchLocation(query);
    const hasValidCenter =
      location?.center &&
      Number.isFinite(location.center.lat) &&
      Number.isFinite(location.center.lng);
    if (!hasValidCenter || !location?.boundingBox) {
      throw new Error('La localidad encontrada no tiene coordenadas utilizables. Prueba con otra búsqueda.');
    }
    clearAreaSelection();
    clearLocationMarker();
    fitMapToBoundingBox(location.boundingBox);
    locationMarker = L.marker([location.center.lat, location.center.lng], { title: location.name }).addTo(
      mapInstance
    );
    if (location.name) {
      locationMarker.bindPopup(location.name).openPopup();
    }
    setAreaStatus(`Localidad encontrada: ${location.name}. Dibuja el área sobre el mapa.`);
  } catch (error) {
    setAreaStatus(error.message || 'No se pudo localizar la zona indicada.', true);
  } finally {
    if (areaSearchButton) {
      areaSearchButton.disabled = false;
    }
  }
}

function handleMapClick(event) {
  if (!selectionEnabled || !event?.latlng) return;

  if (isClosingClick(event.latlng)) {
    finalizePolygon();
    return;
  }

  addPolygonVertex(event.latlng);
}

function isClosingClick(latlng) {
  if (!mapInstance || polygonVertices.length < 3) return false;

  const firstPoint = mapInstance.latLngToLayerPoint(polygonVertices[0]);
  const newPoint = mapInstance.latLngToLayerPoint(latlng);
  return firstPoint.distanceTo(newPoint) < 12;
}

function addPolygonVertex(latlng) {
  polygonVertices.push(latlng);

  const marker = L.circleMarker(latlng, {
    radius: 5,
    color: '#f59e0b',
    weight: 2,
    fillColor: '#f59e0b',
    fillOpacity: 0.8
  }).addTo(mapInstance);
  vertexMarkers.push(marker);

  updatePreviewPath();
  renderAreaCoordinates(polygonVertices);

  const readyToClose = polygonVertices.length >= 3;
  setAreaStatus(
    readyToClose
      ? 'Haz clic sobre el primer punto para cerrar el polígono.'
      : 'Añade al menos 3 vértices para poder cerrar el área.'
  );
}

function updatePreviewPath(hoverLatLng) {
  if (!mapInstance) return;

  if (previewPath) {
    mapInstance.removeLayer(previewPath);
    previewPath = null;
  }

  const points = [...polygonVertices];
  if (hoverLatLng) {
    points.push(hoverLatLng);
  }

  if (points.length < 2) return;

  previewPath = L.polyline(points, {
    color: '#f59e0b',
    weight: 2,
    dashArray: '6 4'
  }).addTo(mapInstance);
}

function finalizePolygon() {
  if (!mapInstance) return;

  if (polygonVertices.length < 3) {
    setAreaStatus('Necesitas al menos 3 vértices para cerrar el área.', true);
    return;
  }

  selectionEnabled = false;
  mapInstance.doubleClickZoom.enable();

  if (previewPath) {
    mapInstance.removeLayer(previewPath);
    previewPath = null;
  }

  if (drawnArea) {
    mapInstance.removeLayer(drawnArea);
  }

  drawnArea = L.polygon(polygonVertices, {
    color: '#f59e0b',
    weight: 2,
    fillColor: '#f59e0b',
    fillOpacity: 0.15
  }).addTo(mapInstance);

  areaBounds = drawnArea.getBounds();
  mapInstance.fitBounds(areaBounds, { padding: [20, 20] });

  showBoundingBoxStatus(convertBoundsToBoundingBox(areaBounds), 'Área preparada (polígono)');
  setAreaStatus('Área cerrada. Pulsa "Buscar en área" para obtener puntos.');
  if (areaMapContainer) {
    areaMapContainer.classList.remove('drawing');
  }
  renderAreaCoordinates(polygonVertices);
  markStepAsActive(
    orderedStepPanels[2],
    'Área cerrada. Pulsa "Buscar en área" para pintar los puntos en el mapa.'
  );
}

async function performAreaSearch() {
  if (!areaBounds) {
    setAreaStatus('Dibuja y cierra un polígono en el mapa antes de buscar.', true);
    setStatus('Selecciona un área para buscar puntos.', true);
    return;
  }

  const limit = getActiveLimit();
  const bbox = [
    areaBounds.getSouth(),
    areaBounds.getWest(),
    areaBounds.getNorth(),
    areaBounds.getEast()
  ];

  setAreaStatus('Consultando el área en bloques de 100 puntos para evitar bloqueos...');
  markStepAsActive(
    orderedStepPanels[1],
    'Consultando el área dibujada y recogiendo puntos en bloques.'
  );
  markStepAsActive(
    orderedStepPanels[2],
    'Pintaremos los puntos y columnas a medida que lleguen los resultados.'
  );

  try {
    const data = await fetchPointsInBatches({
      limit,
      requestFactory: (chunkLimit) =>
        fetchPointsInBoundingBox({ bbox, limit: chunkLimit, city: cityInput.value.trim() })
    });

    lastPointsData = data;
    mockPoints = [];
    renderMeta({
      city: data.city,
      neighbourhood: data.neighbourhood,
      totalAvailable: data.totalAvailable,
      returned: data.returned,
      areaLabel: data.areaLabel || 'Área seleccionada',
      boundingBox: data.boundingBox
    });
    renderPoints(data.points);
    plotPointsOnMap(data.points);
    if (data.boundingBox) {
      showBoundingBoxStatus(data.boundingBox, 'Resultados cargados en el área');
    } else {
      setAreaStatus('Resultados cargados. Puedes volver a dibujar para refinar.');
    }
    markStepAsDone(
      orderedStepPanels[1],
      'Área consultada y puntos dibujados en el mapa.'
    );
    markStepAsDone(
      orderedStepPanels[2],
      'Área consultada. Los puntos obtenidos se han dibujado en el mapa.'
    );
  } catch (error) {
    setStatus(error.message || 'No se pudo obtener puntos', true, { loading: false });
    setAreaStatus('No se pudo obtener puntos para el área seleccionada.', true);
  }
}
