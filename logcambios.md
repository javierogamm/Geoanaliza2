# Log de cambios

## Versión 2.1.1 - 2026-04-13
- Se endurece la consulta de puntos para evitar caídas por saturación de Overpass: la APP ahora reintenta automáticamente cuando recibe errores temporales (429/502/503/504/timeout) y aplica espera progresiva entre intentos.
- En cada reintento se reduce el tamaño del bloque solicitado (de mayor a menor) para disminuir carga y evitar sobreespamear el servicio cuando está saturado.
- Se añade confirmación explícita al terminar la carga indicando cuántos puntos se han completado frente a los solicitados, incluso cuando no hay más puntos únicos disponibles en ese momento.
- La consulta Overpass pasa a incluir límite por petición (`out center <limit>`) y timeout más acotado para hacer cada llamada más ligera y estable.

## Versión 2.1.0 - 2026-04-01
- Se reestructura la navegación principal con dos accesos superiores: **Crear expedientes** y **Geolocalización**, separando la acción rápida de creación del flujo de localización.
- Se incorpora una vista dedicada de **Crear expedientes** con una explicación breve y el botón de ejecución centralizado.
- La vista de **Geolocalización** reorganiza los pasos 1, 2 y 3 en modo acordeón, iniciando colapsados y avanzando automáticamente al siguiente bloque al completar o saltar cada fase.
- El paso de tesauros mantiene el **Paso 4** como opcional (saltable), se añade un nuevo **Paso 5** para **Añadir columna** y el bloque de transposición pasa a **Paso 6**.
- Se retiran de la cabecera de resultados los botones de **Crear Expedientes** y **Añadir columna** para evitar duplicidades y mantener el flujo guiado por pasos.

## Versión 2.0.6 - 2026-03-25
- La transposición deja de incluir el campo base de arriba (Dirección): se oculta el bloque “Columnas base” en el modal y ya no se generan filas base durante la transposición.
- El modal de selección para transponer valida únicamente columnas personalizadas (tesauros traídos por CSV/Excel o creados manualmente).
- Se mantiene que la carga inicial de expedientes en la vista simplificada no pide ni crea tesauro.

## Versión 2.0.5 - 2026-03-25
- Se garantiza que al abrir “Importar expedientes” desde la vista simplificada, el modal entre siempre en modo **solo códigos** aunque se dispare con el botón general.
- En ese contexto simplificado se ocultan de forma forzada “Nombre del tesauro” y “Referencia”, evitando pedir o crear un tesauro inicial en la carga de expedientes.
- Se mantiene el modo estándar intacto para la vista completa.

## Versión 2.0.4 - 2026-03-25
- Se corrige la tabla de seguimiento de la vista simplificada para mostrar **un único camino** según la opción elegida: o tesauros importados desde Excel/CSV, o tesauros creados manualmente.
- Se elimina la situación de estados simultáneos confusos en filas no aplicables (por ejemplo, “Pendiente” en importación CSV cuando el flujo activo es creación manual).
- Se mantiene que la importación de expedientes en simplificada solo carga códigos y no añade automáticamente un tesauro adicional en ese paso.

## Versión 2.0.3 - 2026-03-25
- En la vista simplificada, el paso 1 de importación de expedientes pasa a modo **solo códigos**: oculta nombre/referencia de tesauro y toma directamente los códigos del Excel seleccionado.
- Se fija internamente la importación simplificada de expedientes como `Código expediente` con referencia `expediente`, evitando configurar un tesauro manual en ese primer paso.
- Se ajusta el seguimiento simplificado para reflejar explícitamente que se están cargando códigos de expediente y no un tesauro adicional.

## Versión 2.0.2 - 2026-03-25
- En la vista simplificada, la pregunta 3 ahora gobierna el flujo: si se marca **Sí** se muestra el paso para cargar Excel/CSV y si se marca **No** se oculta ese paso y se despliega visualmente el paso 4 para creación manual.
- Se añade una tabla de seguimiento en tiempo real en la vista simplificada para ver, según se importa, el estado de expediente, nuevas columnas CSV, tesauros creados manualmente y tesauros base asignados.
- Se emite un evento al importar expedientes para refrescar automáticamente el seguimiento de la vista simplificada sin tocar el flujo inferior de transponer y exportar.

## Versión 2.0.1 - 2026-03-25
- Se separan completamente las dos experiencias: la vista habitual y la vista simplificada ya no aparecen mezcladas en pantalla.
- Se añade un botón en la cabecera para cambiar a vista simplificada; al activarla se oculta todo el flujo estándar y solo queda visible la funcionalidad reducida de transposición.
- Se añade también el botón de retorno a vista completa para recuperar el landing habitual sin recargar la página.

## Versión 2.0.0 - 2026-03-25
- Se añade en la parte superior una **vista simplificada de transposición** con un flujo guiado de 5 pasos: importar expedientes, indicar si existe fichero de datos por expediente, cargar ese fichero si aplica, crear datos manuales y lanzar la exportación transpuesta.
- La vista simplificada permite importar de una sola vez columnas desde **CSV/XLSX/XLS** (una fila por expediente y una columna por dato), creando automáticamente tesauros tipo `csv` para reutilizarlos en la transposición.
- La transposición deja de incluir latitud/longitud en la selección de campos para operar en modo reducido sin coordenadas, manteniendo el formato de exportación CSV existente.

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

## Versión 1.6.0 - 2025-12-10
- Añade un selector de modo para elegir entre búsqueda por municipio o por mapa, mostrando solo los controles necesarios en cada caso y sincronizando el límite de puntos entre ambos flujos.
- Duplica la altura del mapa y permite desplazarlo con el botón derecho mientras se dibujan polígonos, mejorando la navegación sin afectar al despliegue existente.
- Dibuja en el mapa los puntos obtenidos en las búsquedas, ajustando automáticamente la vista cuando no se está editando un área.

## Versión 1.7.0 - 2025-12-11
- Se añade un modal para pegar listados de campos y detectar automáticamente los nombres de tesauros, proponiendo referencias sin espacios ni tildes.
- Los campos base (dirección, latitud y longitud) se pueden validar desde el detector y aplicar directamente a la configuración base de la tabla.
- Los campos adicionales detectados se pueden abrir secuencialmente en el modal de columnas personalizadas con los nombres sugeridos, agilizando su alta sin romper el mapa ni los tesauros existentes.

## Versión 1.7.1 - 2025-12-12
- Al validar tesauros se precargan por defecto los nombres de Dirección, Latitud y Longitud para que queden configurados aunque no se detecten en el pegado.
- Los tesauros adicionales detectados ahora proponen referencias en camelCase y pueden reutilizarse al pulsar "Crear columna", preguntando si se desea configurar alguno pendiente.
- Se sincroniza el flujo de apertura y cierre de modales para que validar tesauros abra correctamente las columnas detectadas y las marque como usadas al añadirlas.

## Versión 1.7.2 - 2025-12-12
- Conservar los tesauros adicionales detectados al cerrar el modal de validación permite que el botón "Crear columna" pregunte y abra con los datos sugeridos.

## Versión 1.7.3 - 2025-12-12
- Sustituye el `layerGroup` de marcadores por un `featureGroup` en el mapa para poder calcular los límites de los puntos sin
  errores al buscar por población y ajustar correctamente la vista a los resultados.

## Versión 1.7.4 - 2025-12-12
- Las columnas numéricas y de moneda muestran por defecto un primer tramo editable alineado con los límites definidos y
  permiten seguir añadiendo nuevos tramos sin perder el inicial.
- Al validar tesauros detectados se encadenan automáticamente las configuraciones de todas las columnas adicionales hasta
  completar la lista sugerida.

## Versión 1.7.5 - 2025-12-12
- Se restaura la visibilidad del botón de transposición de datos en la interfaz principal para poder acceder a la función sin
  pasos adicionales tras importar.

## Versión 1.8.0 - 2025-12-13
- Añade un panel de tesauros configurados con edición y eliminación de columnas personalizadas desde la interfaz, mostrando
  su tipo y referencia.
- Permite reabrir y editar columnas existentes reutilizando el modal de tesauros, rellenando automáticamente los tramos y
  opciones anteriores.
- Refuerza los modales de tesauros para evitar cierres accidentales al hacer clic fuera del contenido.

## Versión 1.8.1 - 2025-12-13
- Cada columna muestra su propia acción de edición: las bases se ajustan desde su chip y las personalizadas mantienen edición
  y borrado individuales.
- Se elimina el botón global de columnas base y se mejora la visibilidad de la configuración con estilos diferenciados.
- La cola de tesauros detectados vuelve a procesarse secuencialmente para abrir todas las configuraciones pendientes.

## Versión 1.8.2 - 2025-12-14
- La exportación CSV de los datos transpuestos mantiene la latitud y la longitud exactamente como llegan las coordenadas, sin
  aplicar formatos locales ni separadores de miles que alteren los valores.

## Versión 1.8.3 - 2025-12-14
- La exportación CSV principal conserva las coordenadas tal como se generan (sin redondeos ni formatos locales), evitando que
  se alteren por separadores de miles al abrir el archivo.

## Versión 1.8.4 - 2025-12-14
- Centraliza la construcción del CSV de transposición en un módulo reutilizable para mantener los campos y valores tal como se
  generan en pantalla.
- Simula la exportación con datos de ejemplo para comprobar que las filas exportadas conservan valores críticos como
  dirección, latitud y longitud sin alteraciones.

## Versión 1.8.5 - 2025-12-14
- La exportación CSV de la transposición fuerza las coordenadas a texto para que Excel mantenga los puntos decimales exactos
  que se muestran en la aplicación sin reinterpretarlos como millones u otros formatos numéricos.

## Versión 1.9.0 - 2025-12-15
- Reordena la interfaz en fases claras (importar expedientes, crear puntos, tesauros y transposición) con botones para
  saltar cada etapa sin perder flujo.
- Los expedientes importados generan puntos ficticios con coordenadas visibles y se pintan en el mapa automáticamente,
  cambiando al modo de mapa para seguir trabajando con ellos.
- Las búsquedas por ciudad o área marcan el paso como completado y pintan los resultados en el mapa manteniendo el resto de
  acciones (CSV, columnas y creación de expedientes) disponibles debajo.

## Versión 1.9.1 - 2025-12-16
- Los campos numéricos y de moneda empiezan sin tramos definidos y solo activan la distribución porcentual al añadir un
  nuevo tramo, mostrando los campos de porcentaje y validando que la suma alcance el 100%.

## Versión 1.9.2 - 2025-12-16
- Los pasos iniciales de la interfaz se marcan automáticamente al importar expedientes, dibujar áreas y lanzar búsquedas,
  mostrando mensajes de progreso mientras se cargan puntos y se pintan en el mapa.
- Se resaltan visualmente los bloques activos y completados para seguir el flujo sin afectar mapas, despliegues ni el
  comportamiento existente.

## Versión 1.9.3 - 2025-12-17
- Cada fase se marca en verde al completarse, incluyendo el pintado de puntos en mapa, la validación de tesauros pegados y
  la exportación exitosa de la transposición.
- Los bloques activos hacen scroll automático al activarse, manteniendo la guía visual del flujo sin alterar el mapa ni
  los resultados.

## Versión 1.9.4 - 2025-12-18
- La exportación de transposición adopta los encabezados del CSV de referencia y mantiene las coordenadas como texto para
  evitar reformatos numéricos en latitud y longitud.
- El botón de exportar abre un modal dedicado donde se introducen el nombre de la entidad y el de la tarea antes de
  generar el CSV.

## Versión 1.9.5 - 2025-12-19
- El CSV transpuesto conserva las coordenadas como texto usando el prefijo `[coordenda]` en lugar del formato `=""`,
  evitando reinterpretaciones numéricas al abrir el archivo en hojas de cálculo.

## Versión 1.9.6 - 2025-12-20
- El CSV transpuesto sigue exportando las coordenadas como texto pero ahora solo antepone el símbolo `[`, evitando fórmulas
  y manteniendo latitud y longitud sin reinterpretaciones numéricas.
- El mapa incorpora un buscador de localidades que centra la vista antes de dibujar el polígono y muestra un marcador en el
  punto encontrado sin afectar al flujo existente.
- Los puntos ficticios o sin procedencia OSM dejan de pintarse en el mapa de inicio para evitar marcadores en el océano
  Atlántico hasta que se cargan resultados reales.

## Versión 1.9.7 - 2025-12-21
- La exportación transpuesta elimina el corchete de cierre y solo antepone `[` en latitudes y longitudes para que se
  mantengan como texto sin fórmulas ocultas.
- El buscador de localidad del mapa ahora se muestra únicamente en el modo "Con mapa" cuando se van a pintar puntos por
  área, evitando ruido en otros modos.

## Versión 1.9.8 - 2025-12-22
- El buscador de localidades valida que Nominatim devuelva coordenadas y bounding box válidos antes de centrar el mapa,
  evitando errores como "Cannot read properties of undefined (reading 'lat')" al pintar el marcador.
- Si la localidad no tiene datos utilizables, se muestra un mensaje claro al usuario sin interrumpir el flujo del mapa.

## Versión 1.9.9 - 2025-12-23
- La exportación CSV de la transposición utiliza la coma como separador decimal en números, monedas y coordenadas.
- Las coordenadas se exportan sin corchetes prefijados para mantener el formato simple solicitado.
