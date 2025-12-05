# Log de cambios

## Versión 1.0.0 - 2025-02-03
- Añadida configuración de `vercel.json` en la raíz para reescribir todas las rutas hacia el frontend estático y proxy de `/api` al backend hospedado en Render, evitando errores 404 en el despliegue de Vercel.

## Versión 1.1.0 - 2025-12-04
- Conserva los puntos geográficos al importar códigos de expediente, evitando que se reemplacen los resultados ya obtenidos.
- Mantiene los valores generados en columnas personalizadas al volver a renderizar la tabla, reduciendo sobrescrituras involuntarias.

## Versión 1.1.1 - 2025-12-04
- Corrige la transposición de datos para que utilice los expedientes importados junto a los puntos mostrados, generando filas para los campos base y personalizados seleccionados.
