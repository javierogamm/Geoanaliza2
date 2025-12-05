# Log de cambios

## Versión 1.0.0 - 2025-02-03
- Añadida configuración de `vercel.json` en la raíz para reescribir todas las rutas hacia el frontend estático y proxy de `/api` al backend hospedado en Render, evitando errores 404 en el despliegue de Vercel.

## Versión 1.1.0 - 2025-12-04
- Conserva los puntos geográficos al importar códigos de expediente, evitando que se reemplacen los resultados ya obtenidos.
- Mantiene los valores generados en columnas personalizadas al volver a renderizar la tabla, reduciendo sobrescrituras involuntarias.

## Versión 1.1.1 - 2025-12-04
- Corrige la transposición de datos para que utilice los expedientes importados junto a los puntos mostrados, generando filas para los campos base y personalizados seleccionados.

## Versión 1.2.0 - 2025-12-05
- Añadido endpoint serverless en `/api/points` dentro del propio despliegue de Vercel reutilizando la aplicación Express del backend.
- Actualizadas las reglas de reescritura de Vercel para dirigir las peticiones API internas al backend en Vercel en lugar de Render.
- Mantenida la ruta del frontend sirviendo desde la carpeta `frontend` dentro del mismo proyecto.

## Versión 1.2.1 - 2025-12-05
- Se añaden logs detallados en la función serverless y en la ruta `/api/points` del backend para depurar por qué no se devuelven puntos.

## Versión 1.2.2 - 2025-12-05
- Se añade un `package.json` en la raíz con dependencias del backend para que Vercel instale y resuelva correctamente `express`, `cors` y `node-fetch` en la función serverless.
- Se configura `vercel.json` para incluir los archivos del backend en el bundle de la función `/api/points`, evitando errores 500 por dependencias ausentes al desplegar en Vercel.

## Versión 1.2.3 - 2025-12-05
- Se agrega un script `postinstall` en la raíz para instalar automáticamente las dependencias del backend durante el build en
  Vercel, garantizando que la función `/api/points` tenga disponibles sus módulos al desplegar.

## Versión 1.2.4 - 2025-12-05
- Se define `outputDirectory` en `vercel.json` apuntando a la carpeta `frontend`, evitando fallos de despliegue por falta de
  directorio `public` tras el comando de build en Vercel.

## Versión 1.2.5 - 2025-12-05
- La función serverless `/api/points` ahora reutiliza la versión compilada del backend (`backend/dist/app.js`) cuando está
  disponible, garantizando que en Vercel se ejecute el mismo código que en Render y evitando errores en tiempo de
  ejecución por falta de compilación de TypeScript.
- Se limita el bundle de la función en `vercel.json` a los artefactos compilados del backend (`backend/dist/**`) para asegurar
  que el despliegue incluya el código listo para ejecutarse y no omita dependencias necesarias.

## Versión 1.2.6 - 2025-12-05
- Se añaden trazas detalladas en la función serverless y en las capas de routing y servicios (Nominatim y Overpass) para
  registrar pasos, tiempos y parámetros de cada petición, facilitando la detección de dónde falla la obtención de puntos
  en Vercel.

## Versión 1.2.7 - 2025-12-05
- La función serverless `/api/points` ahora localiza el módulo de Express entre varias rutas candidatas (incluyendo las rutas
  empaquetadas por Vercel) y devuelve un error descriptivo si no puede cargarlo, evitando 500 silenciosos por fallos de
  resolución de paths durante el despliegue.

## Versión 1.2.8 - 2025-12-05
- Añadida búsqueda por área delimitada en mapa con Leaflet, permitiendo dibujar un rectángulo y consultar puntos dentro de la
  zona seleccionada desde el frontend.
- Ampliado el endpoint `/api/points` para aceptar búsquedas con bounding box y reutilizar Overpass sin necesidad de resolver
  ciudad o barrio, manteniendo la compatibilidad con la búsqueda tradicional.
- Ajustados estilos y textos de interfaz para guiar la selección y consulta de áreas, mostrando el alcance de la búsqueda en
  los metadatos de resultados.

## Versión 1.2.9 - 2025-12-05
- Se asegura la carga de Leaflet de forma dinámica en el frontend, mostrando mensajes de error claros si falla y forzando la
  recomputación de tamaño del mapa para que se renderice correctamente en Vercel.
- Se ajusta el estilo del contenedor del mapa para ocupar el ancho completo del panel y facilitar la interacción al dibujar
  el área.
