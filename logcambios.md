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
