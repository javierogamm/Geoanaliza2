const modal = document.getElementById('base-columns-modal');
const closeBtn = document.getElementById('close-base-modal');
const cancelBtn = document.getElementById('cancel-base-modal');
const form = document.getElementById('base-columns-form');

// Configuración de tesauros base
let baseColumnsConfig = null;

// Callback que se ejecuta cuando se configura
let onConfiguredCallback = null;

function normalizeReference(value, fallback) {
  if (!value) return fallback;
  const normalized = value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();

  return normalized || fallback;
}

export function initBaseColumnsModal(onConfigured) {
  onConfiguredCallback = onConfigured;

  // Cerrar modal
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) return; // Evitar cierres accidentales al pulsar fuera
  });

  // Submit del formulario
  form.addEventListener('submit', handleFormSubmit);
}

export function openBaseColumnsModal(prefillConfig) {
  const defaults = {
    street: { name: 'Dirección', reference: 'direccion' },
    lat: { name: 'Latitud', reference: 'latitud' },
    lng: { name: 'Longitud', reference: 'longitud' }
  };

  const configToUse = {
    street: prefillConfig?.street || baseColumnsConfig?.street || defaults.street,
    lat: prefillConfig?.lat || baseColumnsConfig?.lat || defaults.lat,
    lng: prefillConfig?.lng || baseColumnsConfig?.lng || defaults.lng
  };

  document.getElementById('street-name').value = configToUse.street.name;
  document.getElementById('street-reference').value = configToUse.street.reference;
  document.getElementById('lat-name').value = configToUse.lat.name;
  document.getElementById('lat-reference').value = configToUse.lat.reference;
  document.getElementById('lng-name').value = configToUse.lng.name;
  document.getElementById('lng-reference').value = configToUse.lng.reference;

  modal.classList.add('active');
}

function closeModal() {
  modal.classList.remove('active');
}

function handleFormSubmit(e) {
  e.preventDefault();

  const streetName = document.getElementById('street-name').value.trim();
  const streetReference = document.getElementById('street-reference').value.trim();
  const latName = document.getElementById('lat-name').value.trim();
  const latReference = document.getElementById('lat-reference').value.trim();
  const lngName = document.getElementById('lng-name').value.trim();
  const lngReference = document.getElementById('lng-reference').value.trim();

  if (!streetName || !streetReference || !latName || !latReference || !lngName || !lngReference) {
    alert('Por favor, completa todos los campos obligatorios');
    return;
  }

  setBaseColumnsConfig(
    {
      street: { name: streetName, reference: streetReference },
      lat: { name: latName, reference: latReference },
      lng: { name: lngName, reference: lngReference }
    },
    { runCallback: true }
  );

  closeModal();
}

export function getBaseColumnsConfig() {
  return baseColumnsConfig;
}

export function hasBaseColumnsConfig() {
  return baseColumnsConfig !== null;
}

export function setBaseColumnsConfig(config, { runCallback = false } = {}) {
  baseColumnsConfig = {
    street: {
      name: config.street.name,
      reference: normalizeReference(config.street.reference, 'direccion')
    },
    lat: {
      name: config.lat.name,
      reference: normalizeReference(config.lat.reference, 'latitud')
    },
    lng: {
      name: config.lng.name,
      reference: normalizeReference(config.lng.reference, 'longitud')
    }
  };

  if (runCallback && onConfiguredCallback) {
    onConfiguredCallback(baseColumnsConfig);
  }

  return baseColumnsConfig;
}
