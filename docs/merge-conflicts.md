# Guía rápida para resolver conflictos de fusión

Cuando Git muestra un conflicto, las herramientas de merge (VS Code, GitHub, etc.) ofrecen opciones como **Current Change** y **Incoming Change**. Esta guía resume qué significan y cómo elegir en AppGeoAnaliza.

## Qué significan las opciones
- **Current Change** (también "ours"): el contenido de **tu rama/commit local**, es decir, lo que ya estaba en el archivo antes de intentar integrar cambios externos.
- **Incoming Change** (también "theirs"): el contenido que **viene de la rama que intentas integrar** (por ejemplo, `main` o la rama remota del PR).
- **Both Changes**: insertar uno después del otro; útil solo si quieres conservar partes de ambos y luego editarlas para que hagan sentido.

## Cómo elegir
1. **Prefiere la lógica más reciente**: si el cambio remoto corrige bugs o adapta la API, elige *Incoming Change* y re-aplica tus ajustes encima si siguen siendo necesarios.
2. **Conserva el comportamiento local**: si tus cambios implementan la nueva funcionalidad y el remoto no la tiene, elige *Current Change* y luego incorpora manualmente lo que falte.
3. **Combina con intención**: si ambas partes aportan algo válido (p. ej., estilos nuevos y un bugfix previo), usa *Both Changes* y edita el bloque resultante para dejar un único flujo coherente.

## Pasos recomendados para AppGeoAnaliza
1. Revisa el archivo completo: entiende qué parte del backend (rutas/servicios) o frontend (UI, API) está en conflicto.
2. Elige *Current* vs *Incoming* según la regla anterior y edita si necesitas fusionar manualmente.
3. Elimina todos los marcadores `<<<<<<<`, `=======`, `>>>>>>>` antes de guardar.
4. Ejecuta los comandos habituales (`npm run build`, tests) si están disponibles para verificar que no se rompió la API `/api/points` ni la UI.
5. Haz commit y describe brevemente qué elegiste (Current/Incoming/ambos) para dejar rastro en el historial.

## Ejemplo breve
```txt
<<<<<<< Current Change
const source = "local";
=======
const source = "remote";
>>>>>>> Incoming Change
```
- Si quieres mantener tu versión local: deja `const source = "local";` y borra el resto.
- Si prefieres la versión remota: deja `const source = "remote";`.
- Si necesitas ambas: escribe un bloque nuevo (por ejemplo, elige una variable según entorno) y elimina los marcadores.
