const modal = document.getElementById('base-columns-modal');
const closeBtn = document.getElementById('close-base-modal');
const cancelBtn = document.getElementById('cancel-base-modal');
const form = document.getElementById('base-columns-form');

// Configuración de tesauros base
let baseColumnsConfig = null;

// Callback que se ejecuta cuando se configura
let onConfiguredCallback = null;

export function initBaseColumnsModal(onConfigured) {
  onConfiguredCallback = onConfigured;

  // Cerrar modal
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Submit del formulario
  form.addEventListener('submit', handleFormSubmit);
}

export function openBaseColumnsModal() {
  // Inicializar valores por defecto si no hay configuración
  if (!baseColumnsConfig) {
    document.getElementById('street-name').value = 'Dirección';
    document.getElementById('street-reference').value = 'direccion';
    document.getElementById('lat-name').value = 'Latitud';
    document.getElementById('lat-reference').value = 'latitud';
    document.getElementById('lng-name').value = 'Longitud';
    document.getElementById('lng-reference').value = 'longitud';
  } else {
    // Cargar configuración existente
    document.getElementById('street-name').value = baseColumnsConfig.street.name;
    document.getElementById('street-reference').value = baseColumnsConfig.street.reference;
    document.getElementById('lat-name').value = baseColumnsConfig.lat.name;
    document.getElementById('lat-reference').value = baseColumnsConfig.lat.reference;
    document.getElementById('lng-name').value = baseColumnsConfig.lng.name;
    document.getElementById('lng-reference').value = baseColumnsConfig.lng.reference;
  }

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

  // Guardar configuración
  baseColumnsConfig = {
    street: { name: streetName, reference: streetReference },
    lat: { name: latName, reference: latReference },
    lng: { name: lngName, reference: lngReference }
  };

  closeModal();

  // Ejecutar callback
  if (onConfiguredCallback) {
    onConfiguredCallback(baseColumnsConfig);
  }
}

export function getBaseColumnsConfig() {
  return baseColumnsConfig;
}

export function hasBaseColumnsConfig() {
  return baseColumnsConfig !== null;
}
