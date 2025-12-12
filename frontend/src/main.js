import { fetchPoints, fetchPointsInBoundingBox } from './api.js';
import {
  clearResults,
  renderMeta,
  renderPoints,
  setStatus,
  exportCSV,
  getCurrentPoints,
  getCustomColumnsDataMap
} from './ui.js';
import { initColumnModal, startDetectedThesaurusValidation } from './columnModal.js';
import { initBaseColumnsModal, openBaseColumnsModal, hasBaseColumnsConfig } from './baseColumnsModal.js';
import { initImportExcel, getExpedientesData, hasExpedientes } from './importExcel.js';
import { initImportCsv } from './importCsv.js';
import { initTranspose, showTransposeButton, hideTransposeButton } from './transposeData.js';
import { addCustomColumn } from './columnManager.js';
import { initCreateExpedients } from './createExpedients.js';

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
const searchModeRadios = document.querySelectorAll('input[name="search-mode"]');
const formPanel = document.querySelector('.form-panel');
const mapPanel = document.querySelector('.area-panel');
const areaStatus = document.getElementById('area-status');
const areaCoordinatesContainer = document.getElementById('area-coordinates');
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
let searchMode = 'city';

const formatBoundingBoxLabel = (bbox) =>
  `S:${bbox.south.toFixed(5)} W:${bbox.west.toFixed(5)} N:${bbox.north.toFixed(5)} E:${bbox.east.toFixed(5)}`;

const convertBoundsToBoundingBox = (bounds) => ({
  south: bounds.getSouth(),
  west: bounds.getWest(),
  north: bounds.getNorth(),
  east: bounds.getEast()
});

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
  for (let i = 0; i < values.length; i++) {
    mockPoints.push({
      id: `expediente_${i}`,
      name: `Expediente ${i + 1}`,
      street: '',
      lat: 0,
      lng: 0,
      source: 'expediente',
      expedienteValue: values[i]
    });
  }

  return mockPoints;
}

// Inicializar el modal de columnas personalizadas
initColumnModal((numRows) => {
  // Callback: cuando se añade una columna
  if (numRows) {
    // Si se especifica número de filas, generar puntos ficticios
    generateMockPoints(numRows);
    renderPoints(mockPoints);
  } else if (lastPointsData) {
    // Si hay datos reales, re-renderizar con los datos
    renderPoints(lastPointsData.points);
  } else if (mockPoints.length > 0) {
    // Si hay puntos ficticios, re-renderizar con ellos
    renderPoints(mockPoints);
  } else {
    // Si no hay nada, renderizar tabla vacía
    renderPoints([]);
  }
}, hasData);

document.addEventListener('thesaurus-detection:validate', (event) => {
  const detectedTesauros = event.detail?.detectedTesauros;

  if (!Array.isArray(detectedTesauros) || detectedTesauros.length === 0) {
    return;
  }

  startDetectedThesaurusValidation(detectedTesauros, () => {
    if (lastPointsData?.points) {
      renderPoints(lastPointsData.points);
      return;
    }

    if (mockPoints.length > 0) {
      renderPoints(mockPoints);
      return;
    }

    renderPoints([]);
  });
});

// Inicializar el modal de tesauros base
initBaseColumnsModal((config) => {
  // Una vez configurado, proceder con la búsqueda
  performSearch();
});

// Inicializar el módulo de importación de Excel
initImportExcel((expedientes) => {
  // Cuando se importan expedientes, generar puntos y renderizar
  const pointsToRender = generatePointsFromExpedientes(expedientes);
  renderPoints(pointsToRender);
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
});

// Inicializar el módulo de transposición
initTranspose(getCurrentPoints, getCustomColumnsDataMap);

// Inicializar el módulo de crear expedientes
initCreateExpedients();

if (limitInput) {
  limitInput.addEventListener('input', (event) => syncLimitInputs(event.target.value));
}

if (mapLimitInput) {
  mapLimitInput.addEventListener('input', (event) => syncLimitInputs(event.target.value));
}

if (searchModeRadios?.length) {
  searchModeRadios.forEach((radio) => {
    radio.addEventListener('change', (event) => {
      if (!event.target.checked) return;
      searchMode = event.target.value;
      togglePanelsByMode();
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

  const validPoints = (points || []).filter((point) =>
    typeof point?.lat === 'number' && typeof point?.lng === 'number'
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
    if (bounds?.isValid()) {
      mapInstance.fitBounds(bounds, { padding: [24, 24], maxZoom: 15 });
    }
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

  pointsLayerGroup = L.layerGroup().addTo(mapInstance);

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
    if (data.boundingBox) {
      showBoundingBoxStatus(data.boundingBox, 'Resultados cargados en el área');
    } else {
      setAreaStatus('Resultados cargados. Puedes volver a dibujar para refinar.');
    }
  } catch (error) {
    setStatus(error.message || 'No se pudo obtener puntos', true, { loading: false });
    setAreaStatus('No se pudo obtener puntos para el área seleccionada.', true);
  }
}
