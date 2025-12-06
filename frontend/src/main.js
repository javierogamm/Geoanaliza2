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
import { initColumnModal } from './columnModal.js';
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
const exportButton = document.getElementById('export-btn');
const areaMapContainer = document.getElementById('area-map');
const drawAreaButton = document.getElementById('draw-area-btn');
const resetAreaButton = document.getElementById('reset-area-btn');
const searchAreaButton = document.getElementById('search-area-btn');
const areaStatus = document.getElementById('area-status');

// Variable para guardar los últimos puntos y poder re-renderizar
let lastPointsData = null;
// Variable para guardar puntos ficticios generados
let mockPoints = [];
// Variables para la selección de área en mapa
let mapInstance = null;
let drawnArea = null;
let drawStart = null;
let isDrawing = false;
let selectionEnabled = false;
let areaBounds = null;

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
  if (Number.isNaN(parsed) || parsed <= 0) return 20;
  if (parsed > 100) return 100;
  return parsed;
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

if (areaMapContainer) {
  initAreaMap();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

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
  const limit = parseLimit(limitInput.value);

  if (!city) {
    setStatus('Introduce un municipio para buscar.', true);
    return;
  }

  setStatus('Buscando puntos en OpenStreetMap...');

  try {
    const data = await fetchPoints({ city, neighbourhood, limit });
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
    setStatus('');
  } catch (error) {
    setStatus(error.message || 'No se pudo obtener puntos', true);
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
    selectionEnabled = true;
    drawStart = null;
    isDrawing = false;
    if (areaMapContainer) {
      areaMapContainer.classList.add('drawing');
    }
    setAreaStatus('Haz clic y arrastra sobre el mapa para delimitar el área.');
  });
}

if (resetAreaButton) {
  resetAreaButton.addEventListener('click', () => {
    clearAreaSelection();
    setAreaStatus('Área reiniciada. Pulsa "Dibujar área" para seleccionar nuevamente.');
  });
}

if (searchAreaButton) {
  searchAreaButton.addEventListener('click', () => {
    performAreaSearch();
  });
}

function clearAreaSelection() {
  areaBounds = null;
  drawStart = null;
  isDrawing = false;
  selectionEnabled = false;
  if (mapInstance && drawnArea) {
    mapInstance.removeLayer(drawnArea);
    drawnArea = null;
  }
  if (areaMapContainer) {
    areaMapContainer.classList.remove('drawing');
  }
}

function initAreaMap() {
  if (!window.L || !areaMapContainer) {
    setAreaStatus('El mapa no pudo cargarse.');
    return;
  }

  mapInstance = L.map(areaMapContainer, {
    zoomControl: true,
    scrollWheelZoom: true
  }).setView([40.4168, -3.7038], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Datos geográficos © OpenStreetMap contributors'
  }).addTo(mapInstance);

  const finishDrawing = (event) => {
    if (!isDrawing || !drawnArea || !event?.latlng) {
      return;
    }
    isDrawing = false;
    selectionEnabled = false;
    mapInstance.dragging.enable();
    if (areaMapContainer) {
      areaMapContainer.classList.remove('drawing');
    }

    areaBounds = L.latLngBounds(drawStart, event.latlng);
    drawnArea.setBounds(areaBounds);
    showBoundingBoxStatus(
      convertBoundsToBoundingBox(areaBounds),
      'Área preparada (coordenadas)'
    );
  };

  mapInstance.on('mousedown', (event) => {
    if (!selectionEnabled) return;

    drawStart = event.latlng;
    isDrawing = true;
    areaBounds = null;

    if (drawnArea) {
      mapInstance.removeLayer(drawnArea);
    }
    drawnArea = L.rectangle([drawStart, drawStart], {
      color: '#f59e0b',
      weight: 2,
      fillColor: '#f59e0b',
      fillOpacity: 0.15
    }).addTo(mapInstance);

    mapInstance.dragging.disable();
  });

  mapInstance.on('mousemove', (event) => {
    if (!isDrawing || !drawStart || !drawnArea) return;

    const bounds = L.latLngBounds(drawStart, event.latlng);
    drawnArea.setBounds(bounds);
  });

  mapInstance.on('mouseup', finishDrawing);
  mapInstance.on('mouseout', finishDrawing);

  setAreaStatus('Pulsa "Dibujar área" y arrastra en el mapa para delimitar la búsqueda.');
}

async function performAreaSearch() {
  if (!areaBounds) {
    setAreaStatus('Dibuja un rectángulo en el mapa antes de buscar.', true);
    setStatus('Selecciona un área para buscar puntos.', true);
    return;
  }

  const limit = parseLimit(limitInput.value);
  const bbox = [
    areaBounds.getSouth(),
    areaBounds.getWest(),
    areaBounds.getNorth(),
    areaBounds.getEast()
  ];

  setStatus('Buscando puntos en el área seleccionada...');

  try {
    const data = await fetchPointsInBoundingBox({ bbox, limit, city: cityInput.value.trim() });
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
    setStatus('');
    if (data.boundingBox) {
      showBoundingBoxStatus(data.boundingBox, 'Resultados cargados en el área');
    } else {
      setAreaStatus('Resultados cargados. Puedes volver a dibujar para refinar.');
    }
  } catch (error) {
    setStatus(error.message || 'No se pudo obtener puntos', true);
    setAreaStatus('No se pudo obtener puntos para el área seleccionada.', true);
  }
}
