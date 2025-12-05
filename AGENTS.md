````markdown
# AGENTS.md

Guía para agentes (IA o humanos) que desarrollan esta aplicación.

---

## 1. Objetivo del proyecto

El propósito de este proyecto es construir **una aplicación web simple**, ejecutada desde `index.html`, llamada **AppGeoAnaliza**, que permita:

- Introducir un **municipio** (ej.: "Zaragoza").
- Opcionalmente introducir un **barrio** dentro del municipio.
- Indicar cuántos **puntos geolocalizados** se desean obtener.
- Consultar **OpenStreetMap** (Nominatim + Overpass API) para obtener:
  - Calle / dirección (si existe)
  - Latitud
  - Longitud
- Devolver **N puntos**, pudiendo ser aleatorios.
- Mostrar los resultados en la interfaz web.

El proyecto debe ser modular, fácil de extender y entendible por agentes.

---

## 2. Estructura del proyecto

```txt
/
├─ frontend/
│  ├─ index.html
│  ├─ src/
│  │  ├─ main.js
│  │  ├─ api.js
│  │  └─ ui.js
│  └─ styles/
│     └─ styles.css
│
├─ backend/
│  ├─ src/
│  │  ├─ server.ts|js
│  │  ├─ routes/
│  │  │  └─ points.ts|js
│  │  ├─ services/
│  │  │  ├─ nominatim.ts|js
│  │  │  └─ overpass.ts|js
│  │  └─ utils/
│  ├─ package.json
│  └─ tsconfig.json (si aplica)
│
├─ tests/
│  ├─ backend/
│  └─ frontend/
│
└─ AGENTS.md
```
````

### Normas para agentes

- Analizar siempre primero este archivo.
- No modificar `/frontend/index.html` sin motivo funcional claro.
- Mantener la lógica de OpenStreetMap siempre dentro del backend.
- Mantener separación estricta entre frontend y backend.

---

## 3. Reglas de consumo de OpenStreetMap

AppGeoAnaliza debe consumir exclusivamente datos de **OpenStreetMap**, a través de:

- **Nominatim** (geocodificación)
- **Overpass API** (consulta de puntos dentro de un área)

### 3.1 Nominatim

Usar Nominatim para:

- Convertir un nombre de ciudad en coordenadas + bounding box.
- Identificar barrios mediante `suburb`, `neighbourhood` o `city_district`.

Toda llamada desde el backend a Nominatim debe incluir este encabezado:

```http
User-Agent: "AppGeoAnaliza/1.0 (contact: josem.juangracia@gmail.com)"
```

Requisitos adicionales:

- Respetar los límites de uso (aprox. 1 petición/segundo hacia la instancia pública).
- No utilizar Nominatim para geocodificación masiva.
- Añadir en la interfaz de AppGeoAnaliza la atribución:

  - `Datos geográficos © OpenStreetMap contributors`.

### 3.2 Overpass API

Usar Overpass para:

- Obtener nodos (`node`) dentro del área definida por ciudad o barrio.
- Filtrar por amenities o nodos generales según las necesidades de AppGeoAnaliza.
- Seleccionar puntos aleatorios si el usuario solicita N puntos.

Requisitos:

- No hacer consultas excesivamente pesadas o continuas.
- Configurar también un `User-Agent` identificable, por ejemplo:

```http
User-Agent: "AppGeoAnaliza/1.0 (contact: josem.juangracia@gmail.com)"
```

- Todas las consultas deben hacerse desde el backend, nunca desde el frontend.

---

## 4. Backend API Contract

### GET `/api/points`

**Descripción:**

Devuelve puntos geolocalizados obtenidos desde OpenStreetMap para un municipio y, opcionalmente, un barrio.

**Parámetros (query):**

- `city` (obligatorio): nombre del municipio.
- `neighbourhood` (opcional): nombre del barrio/zona.
- `limit` (opcional, por defecto 20): número máximo de puntos a devolver.

**Respuesta JSON:**

```json
{
  "city": "Zaragoza",
  "neighbourhood": "Delicias",
  "totalAvailable": 134,
  "returned": 20,
  "points": [
    {
      "id": "node/123456",
      "name": "Parque",
      "street": "Calle Ejemplo 12",
      "lat": 41.6532,
      "lng": -0.8903,
      "source": "osm"
    }
  ]
}
```

### Normas obligatorias para agentes

- Validar `city` antes de cualquier petición externa.
- No devolver más puntos que el valor de `limit`.
- Si `neighbourhood` no se reconoce o no existe, usar toda la ciudad.
- Controlar errores de red y de Overpass/Nominatim y devolver mensajes claros.
- No cambiar el formato de respuesta sin actualizar este AGENTS.md.

---

## 5. Convenciones de código

### Backend

- Preferido: **TypeScript** (pero se permite JavaScript si está justificado).
- Mantener código modular, separando:

  - Rutas (`routes/`)
  - Servicios externos (`services/`)
  - Utilidades (`utils/`)

- Prohibido mezclar lógica de Nominatim/Overpass en la capa de rutas.
- Funciones con nombres descriptivos (ej.: `fetchCityBoundingBox`, `queryOverpassForNodes`).

### Frontend

- JavaScript ES6+ sin frameworks obligatorios.
- Archivos:

  - `main.js`: orquestación general (event listeners, flujo principal).
  - `api.js`: funciones para llamar al backend (`fetchPoints`).
  - `ui.js`: manipulación del DOM (renderizado de resultados, mensajes de error).

- `index.html` debe contener la estructura básica:

  - Inputs para ciudad, barrio y límite.
  - Botón de búsqueda.
  - Contenedor de resultados.

### Nombres y comentarios

- Usar nombres claros y no abreviados.
- Documentar especialmente:

  - Construcción de consultas Overpass.
  - Transformación de la respuesta OSM a objetos de tipo `Point`.

---

## 6. Modelo de datos de salida

El backend debe transformar los datos de OSM a un modelo homogéneo:

```ts
type Point = {
  id: string; // Ej.: "node/123456"
  name: string | null; // Nombre si existe
  street: string | null; // Calle o descripción legible, si está disponible
  lat: number;
  lng: number;
  source: "osm";
};
```

Los agentes pueden añadir campos adicionales si son útiles, pero estos son obligatorios.

---

## 7. Testing

Los agentes deben asegurar tests, como mínimo, para:

- `services/nominatim`
- `services/overpass`
- `routes/points`

Comandos recomendados:

```bash
npm test
npm test -- --coverage
```

---

## 8. Normas para Pull Requests generados por IA

Un PR debe:

1. Describir claramente qué parte de la funcionalidad de AppGeoAnaliza modifica o añade.
2. Referenciar las secciones relevantes de este AGENTS.md.
3. Mantener el PR enfocado en un solo objetivo (no mezclar muchas cosas).
4. Asegurar que todos los tests pasan.
5. No romper el contrato público de `/api/points`.
6. Incluir captura de pantalla o descripción de cambios de UI si afectan al frontend.

---

## 9. Checks programáticos antes de merge

Antes de integrar cambios importantes, los agentes deben ejecutar:

```bash
npm run lint
npm run type-check
npm run build
```

Todos los comandos deben finalizar correctamente.

---

## 10. Reglas innegociables

- **Nunca usar Google Maps ni APIs de Google en este proyecto.**

- Nunca llamar directamente a Nominatim u Overpass desde el frontend.

- Respetar los límites y políticas de uso de OSM.

- Mantener la estructura de directorios indicada, salvo cambios documentados aquí.

- Mantener el contrato de `/api/points` y el modelo `Point`.

- Usar siempre el `User-Agent`:

  ```http
  "AppGeoAnaliza/1.0 (contact: josem.juangracia@gmail.com)"
  ```

  en todas las peticiones a Nominatim y Overpass.

- Mantener en la UI el texto de atribución:

  - `Datos geográficos © OpenStreetMap contributors`.

---

## 11. Meta final del proyecto

Producir una aplicación llamada **AppGeoAnaliza** que:

- Se lance desde `index.html`.
- Permita obtener puntos geolocalizados a partir de:

  - Un municipio (mínimo).
  - Un barrio (opcional).

- Muestre calle, latitud y longitud de cada punto.
- Use únicamente datos abiertos de OpenStreetMap.
- Sea simple, rápida, modular y mantenible por agentes humanos y de IA.

```

```
