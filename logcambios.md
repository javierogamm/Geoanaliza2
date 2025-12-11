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

## Versión 1.2.7 - 2025-12-06
- Permite consultar puntos solo dibujando un área en el mapa, sin exigir el parámetro de municipio, resolviendo la ciudad
  automáticamente a partir del bounding box cuando es posible.
- Devuelve y muestra las coordenadas (sur, oeste, norte, este) del rectángulo dibujado para mayor trazabilidad de la
  búsqueda sobre el mapa.
- Mantiene la compatibilidad del despliegue en Vercel utilizando el mismo endpoint `/api/points` que reutiliza la
  aplicación del backend.

## Versión 1.3.0 - 2025-12-07
- Se sustituye el rectángulo por un flujo de dibujo de polígonos, permitiendo definir cualquier área añadiendo vértices con
  clics sucesivos y cerrando sobre el primer punto.
- Se muestra bajo el mapa la lista completa de coordenadas (latitud, longitud) de cada vértice seleccionado para facilitar
  la trazabilidad de la búsqueda.
- Se mantienen intactas las configuraciones de despliegue en Vercel para asegurar que el nuevo flujo no afecte al
  funcionamiento actual en producción.

## Versión 1.4.0 - 2025-12-08
- Permite solicitar hasta 1000 puntos consolidando los resultados en lotes de 100, mostrando el progreso en la interfaz y
  evitando bloqueos al dividir las llamadas a la API.
- Mantiene la tabla y los metadatos actualizados a medida que llegan los lotes y desduplica los puntos por identificador
  para conservar un recuento coherente.
- Amplía el límite del endpoint `/api/points` para acompañar el nuevo flujo y preserva la configuración de despliegue en
  Vercel sin cambios adicionales.

## Versión 1.4.1 - 2025-12-08
- Permite seleccionar siempre las columnas base (dirección, latitud y longitud) al transponer, incluso cuando aún no se han
  configurado los tesauros de columnas base.

## Versión 1.5.0 - 2025-12-09
- La exportación de datos transpuestos genera CSV en UTF-8 con BOM y escapado de campos, sustituyendo la salida Excel previa.
- Las columnas numéricas permiten definir el número de decimales y distribuir valores mediante tramos porcentuales configurables.
- Las columnas de moneda aceptan decimales personalizados y reparto por tramos con porcentajes que suman el 100%.

## Versión 1.5.1 - 2025-12-10
- Corrige la visualización de campos tipo selector y columnas importadas desde CSV, mostrando sus valores en pantalla.
- Pre-rellena el primer tramo de columnas numéricas y de moneda con los valores mínimo y máximo definidos, facilitando asignar el porcentaje inicial.
