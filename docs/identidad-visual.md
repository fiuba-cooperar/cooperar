# Identidad visual

Los logos de CooperAR están en [`frontend/public/brand/`](../frontend/public/brand/). Viven ahí, y no en `docs/`, porque el build de Docker del front solo ve esa carpeta y la app sirve algunos desde esa ruta. Hay una sola copia de cada uno.

| Archivo | Qué es |
|---|---|
| `logo-with-tagline.png` | Logo completo: símbolo, nombre y la bajada "Observatorio de cooperativas y empresas recuperadas". |
| `logo.png` | Símbolo y nombre, sin bajada. |
| `symbol.png` | Solo el símbolo (el triángulo con tres puntos). |
| `logo-transparent.png` | Símbolo y nombre, recortados y con fondo transparente. Se usa en el login y en el `README.md` principal. |
| `symbol-mocks.png` | Símbolo con los trazos engrosados y fondo transparente, para que se lea bien a tamaños chicos (encabezado de la app y mocks). Es un retoque del `symbol.png`, no el logo oficial. |

Los tres primeros son PNG de 2000×2000 con fondo blanco. Como todo lo de `public/` se copia al build, también se publican con la app.

## Colores

Los de los logos, aproximados:

| Color | Hex |
|---|---|
| Amarillo | `#FDC110` |
| Celeste | `#4FB4F0` |
| Azul | `#208EEB` |
| Azul marino | `#033670` |
