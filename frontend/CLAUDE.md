# Frontend: CooperAR web

React 19 + TypeScript 6 (estricto) sobre Vite 8, con React Router 8, TanStack Query 5 y Mantine 9 como librería de componentes. El contexto del producto, el glosario y las reglas de privacidad están en el [`CLAUDE.md` de la raíz](../CLAUDE.md).

## Comandos (desde `frontend/`)

| Qué                                                                            | Comando                                                                                    |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Instalar                                                                       | `npm ci`                                                                                   |
| Desarrollo con recarga en caliente (proxy de `/api` → `http://localhost:8080`) | `npm run dev`                                                                              |
| Otro backend para el proxy                                                     | `API_PROXY_TARGET=http://host:puerto npm run dev`                                          |
| Tests                                                                          | `npm test` (`npm run test:watch` en modo watch)                                            |
| Lint / tipos / formato                                                         | `npm run lint` · `npm run typecheck` · `npm run format:check` (`npm run format` corrige)   |
| Build de producción                                                            | `npm run build`                                                                            |
| Regenerar el cliente de API desde `../api/openapi.json`                        | `npm run api:generate` (o `make api` desde la raíz, que antes exporta el spec del backend) |

## Estructura

```
src/
├── main.tsx                 Punto de entrada
├── index.css                Tokens de diseño (variables CSS), reset, foco visible, modo oscuro
├── app/                     Composición: App (providers), routes, queryClient, theme (tema de Mantine)
├── api/generated/           Cliente generado por orval. NO se edita a mano; está excluido de lint y formato
├── components/
│   ├── layout/              AppLayout (header con el menú, main, footer) y publicSections (secciones del menú); Brand (logo) y SkipLink, que comparten todos los layouts
│   ├── ConfirmDialog.tsx    Diálogo de confirmación antes de una acción difícil de deshacer (ícono, título, texto y dos botones)
│   ├── form/                LabelWithHint (label con un ícono de info que muestra la aclaración del campo en un tooltip)
│   ├── map/                 LocationMap (Leaflet, se carga de forma diferida; con `onMove` el pin se arrastra y con `approximate` marca una zona)
├── features/<module>/       Una carpeta por módulo de dominio, alineada con el backend
│   ├── api/                 Hooks de datos que envuelven al cliente generado (useXxx)
│   ├── components/          Componentes propios del módulo
│   └── XxxPage.tsx          Páginas que se montan en las rutas
└── test/                    Helpers de test: renderRoute, stubFetchJson, expectNoA11yViolations
```

Las features actuales son `home` (portada, con el buscador que lleva a «Entidades», y páginas «Próximamente» de las secciones que todavía no existen), `auth` (registro en dos pasos, confirmación del email en `/verify-email`, login, sesión y guardas de ruta), `organizations` (el buscador público de entidades en `/organizations` (`OrganizationSearchPage`): caja de búsqueda que busca al enviar, filtros con casillas por tipo de organización, rubro y qué ofrecen, cada valor con su cantidad, y por provincia (`SearchFilters`), los filtros activos como botones que los quitan, orden por relevancia o por nombre, paginación de a 20 y un estado vacío; todo queda en la URL (`?q=…&type=…&sector=…&activityType=…&province=…&sort=…&page=…`, con los valores en minúscula, los filtros repetidos para sumar valores y la página desde 1, en `organizationSearch`), y la portada manda su buscador ahí con `searchPath`; la ficha pública en `/organizations/:slug`, que muestra solo lo que la API pública devuelve y, si la calle es privada, la zona en el mapa en lugar del punto, los campos del alta que comparten el registro y la corrección (`OrganizationRegistrationFields` y `registrationForm`), el selector del tipo de organización, la tarjeta de una solicitud que usan los dos paneles (`RegistrationCard`, con `DetailList` y `registrationDetails`), las etiquetas y colores de tipos, estados, rubros y provincias, y la validación y el formato del CUIT), `admin` (panel del observatorio: `AdminLayout` con su header y menú lateral propios, la portada con las herramientas «Próximamente», «Solicitudes», con filtros (combobox) por estado —pendientes, aprobadas, rechazadas y con solicitud de cambios, con la cantidad de cada uno— y por tipo de entidad —ambas, cooperativa de origen o empresa recuperada—, y un orden (más nuevas, más antiguas o por nombre, que se aplica en el cliente; por defecto las pendientes van de la más antigua y el resto de la más nueva), que quedan en la URL (`?status=…&type=…&sort=…`), y cada solicitud con `RegistrationCard`, que comparte con el panel de la cooperativa: resumida en una línea (CUIT, partido y provincia, fecha de envío) con una flecha que despliega el resto de los datos, quién la registró y el historial de revisiones; las pendientes se aprueban, se rechazan con motivo o se les pide más información; aprobar una solicitud es lo que crea la entidad; y «Entidades», que lista las entidades aprobadas por nombre con filtros (combobox) por tipo de entidad, tipo de actividad y rubro, también en la URL (`?type=…&activityType=…&sector=…`), cada una con su resumen y el enlace a la ficha pública), `cooperative` (panel de la cooperativa: `CooperativeLayout` con header, selector de la cooperativa activa y menú lateral propios; la portada saluda, pide confirmar el email si falta y muestra las solicitudes de alta que todavía no se aprobaron con su estado. «Solicitudes de alta» (`/cooperative/registration-requests`) lista todas las solicitudes de la cuenta y permite mandar una nueva (`/new`, también desde «Agregar cooperativa» en el selector); cada solicitud se ve con la misma tarjeta que usa el observatorio (`RegistrationCard`, en `organizations`: resumen en una línea y una flecha que despliega los datos y el historial de revisiones), en modo lectura y sin quién la revisó, con el aviso de su estado debajo; solo si el observatorio pidió cambios, `/cooperative/registration-requests/:id` muestra el pedido y el formulario para corregirla y reenviarla. El formulario de alta y el de corrección comparten `RegistrationRequestForm`. «Mi ficha» (`/cooperative/profile`, `ProfilePage`) edita la ficha de la entidad activa por secciones (identificación, actividad, fotos, ubicación y contacto, en `components/profile`), con un menú que dice qué falta en cada una (`profileStatus`), la sección abierta en la URL (`?section=…`) y un guardado por sección; los campos fijos muestran su visibilidad con `VisibilityBadge` y los configurables con `VisibilityToggle` (Público/Privado). La ubicación muestra el mapa con el pin arrastrable; si no se mueve el pin, el backend vuelve a ubicar la dirección al guardar. Las fotos son una vista previa deshabilitada hasta que se decida el almacenamiento (#13). La portada muestra el progreso real de la ficha. Mientras la cuenta no tenga ninguna entidad aprobada, el menú lateral solo muestra «Inicio» y «Solicitudes de alta», y no hay selector de entidad; las secciones sin historia son «Próximamente») y `errors` (404 y acceso denegado). «Categorías» en el panel del observatorio (`/admin/product-categories`, `ProductCategoriesPage`) agrega, renombra y elimina las categorías de productos (no se puede eliminar una con productos). `catalog` guarda las etiquetas de modalidades, el hook de las categorías, el formato del precio orientativo y el listado público de productos de la ficha (`PublicProducts`). «Productos y servicios» (`/cooperative/products`, `ProductsPage`) lista los de la entidad activa con su estado, y `ProductFormPage` (`/new` y `/:id`) da el alta y la edición; el formulario guarda («Guardar», el producto queda sin publicar si es nuevo) o guarda y publica; en el listado, un menú por fila permite publicar o ocultar del catálogo (pide confirmación) y eliminar definitivamente (con confirmación). Las fotos del formulario (`ProductPhotosField`, hasta 5) se eligen y se suben al guardar el producto; las que ya tiene se quitan al instante, y la primera es la portada.

Los mapas usan las teselas públicas de OpenStreetMap. Para usar otro servidor de teselas, se define `VITE_MAP_TILE_URL` (una plantilla de URL de Leaflet) al hacer el build.

## Reglas

- **Acceso a datos solo por el cliente generado.** Nada de `fetch` a mano contra la API. Si falta un endpoint, primero se agrega en el backend y después se corre `make api`. El CI falla si `src/api/generated` no coincide con `api/openapi.json`.
- **Los componentes no usan los hooks generados directamente.** Cada feature expone hooks propios en `features/<module>/api/` que envuelven al generado y fijan las opciones (`select`, `refetchInterval`, invalidaciones). Así un cambio de contrato se absorbe en un solo lugar.
- **Estado del servidor en TanStack Query**, y estado de UI local con `useState`/`useReducer`. No se agrega una librería de estado global sin una decisión con issue.
- **Imports absolutos con `@/`** (`@/features/auth/...`). Los relativos solo dentro de la misma feature.
- **Rutas.** Se declaran en `app/routes.tsx`. Las rutas por rol cuelgan de `RequireRole` (`features/auth`): sin sesión redirige a `/login` y con otro rol redirige a `/forbidden` («Acceso denegado», dentro del layout público). Los paneles del admin y de la cooperativa no usan `AppLayout`: cuelgan de `RequireRole` en árboles aparte con su `AdminLayout` y su `CooperativeLayout`.
- **Estilos y componentes.** Se usa Mantine (`@mantine/core`) para los componentes (`Button`, `TextInput`, `Paper`, `Alert`, etc.). El tema (colores del logo, tipografía Inter/Poppins, radio, modo claro/oscuro automático) está en `app/theme.ts` y se aplica con `MantineProvider`. Lo que Mantine no cubre se escribe con CSS Modules (`Xxx.module.css`) usando las variables de Mantine (`var(--mantine-color-brand-6)`, `var(--mantine-spacing-md)`); no se usan colores sueltos. Si un componente hace falta en más de una feature, se arma sobre los de Mantine en `src/components/`.
- **Idioma.** Código, nombres de archivos, identificadores y tests en inglés. **Todo texto visible para el usuario va en español** rioplatense, en voseo ("Buscá", "Volver al inicio").
- **TypeScript estricto** (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`). Nada de `any` ni de `!` para silenciar el compilador.

## Sesión

- Los tokens viven en `localStorage` (`src/api/session.ts`). `AuthProvider` expone `useAuth()` con `status`, `user`, `login`, `logout` y `refreshUser` (vuelve a pedir `/api/me`, por ejemplo después de confirmar el email o para ver si el alta ya fue revisada).
- Todas las llamadas generadas pasan por `src/api/apiFetch.ts` (mutator de orval): agrega el `Authorization`, y ante un 401 renueva el par de tokens una sola vez (aunque haya varias llamadas en paralelo) y reintenta. Si el refresh es rechazado limpia la sesión y avisa a la UI.
- Es la única excepción a «sin `fetch` a mano»: el propio refresh no puede pasar por el cliente generado.

## Accesibilidad y responsive (WCAG 2.1 AA)

Muchas personas del sector usan la plataforma desde el celular y sin experiencia técnica (#58).

- HTML semántico: un `h1` por página, landmarks (`header`, `main`, `footer`) y botones que sean `<button>`.
- Todo se puede usar con teclado y con el foco visible. Ya existe un skip link "Saltar al contenido principal".
- Los contenidos que cambian solos se anuncian con `role="status"` o `aria-live`.
- Formularios con `<label>` asociado y errores vinculados con `aria-describedby`. Las aclaraciones de un campo van en un tooltip junto al label con `LabelWithHint` (`src/components/form`), no como texto debajo. El ícono queda fuera del orden de tabulación (Tab pasa de campo en campo), así que el campo lleva la misma aclaración en `aria-description` para los lectores de pantalla.
- Contraste AA en modo claro y en modo oscuro (`prefers-color-scheme`). También se respeta `prefers-reduced-motion`.
- Mobile first: los layouts se piensan desde 320 px y se usan unidades relativas.
- Cada página nueva tiene un test con `expectNoA11yViolations` (axe-core). `eslint-plugin-jsx-a11y` no se usa porque no soporta ESLint 10 y no se actualiza desde 2024.

## Tests

- Los tests montan `MantineProvider` (con `env="test"`) dentro de `renderRoute`, y `test/setup.ts` simula `matchMedia`, `ResizeObserver` y `scrollIntoView` (lo usa el `Select` al abrirse), que jsdom no trae. jsdom tampoco tiene `document.fonts`, que usa el `Textarea` con `autosize`: en su lugar se usa `rows`.

- Vitest + Testing Library en `jsdom`. Los tests van junto al código (`Xxx.test.tsx`).
- Se consulta por rol y por texto visible (`getByRole`, `findByText`), no por clases ni test ids.
- Las páginas se renderizan con `renderRoute(path)`, que monta las rutas reales con un `QueryClient` sin reintentos.
- La API se simula con `stubFetchJson(body, status)` / `stubFetchNetworkError()`, o con `stubFetchRoutes` por ruta (`'GET /api/organizations'` atiende cualquier query string; con la query, solo esa). Los stubs se limpian solos entre tests.
