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
│   ├── form/                LabelWithHint (label con un ícono de info que muestra la aclaración del campo en un tooltip)
│   ├── map/                 LocationMap (Leaflet, se carga de forma diferida)
├── features/<module>/       Una carpeta por módulo de dominio, alineada con el backend
│   ├── api/                 Hooks de datos que envuelven al cliente generado (useXxx)
│   ├── components/          Componentes propios del módulo
│   └── XxxPage.tsx          Páginas que se montan en las rutas
└── test/                    Helpers de test: renderRoute, stubFetchJson, expectNoA11yViolations
```

Las features actuales son `home` (portada y páginas «Próximamente» de las secciones que todavía no existen), `auth` (registro en dos pasos, confirmación del email en `/verify-email`, login, sesión y guardas de ruta), `organizations` (ficha pública en `/organizations/:slug`, el selector del tipo de organización, las etiquetas de tipos, estados, rubros y provincias, y la validación y el formato del CUIT), `admin` (panel del observatorio: `AdminLayout` con su header y menú lateral propios, la portada con las herramientas «Próximamente» y las altas pendientes, donde se aprueban o rechazan con motivo), `cooperative` (sección por rol: la portada muestra el estado de cada organización y pide confirmar el email si falta) y `errors` (404 y acceso denegado).

Los mapas usan las teselas públicas de OpenStreetMap. Para usar otro servidor de teselas, se define `VITE_MAP_TILE_URL` (una plantilla de URL de Leaflet) al hacer el build.

## Reglas

- **Acceso a datos solo por el cliente generado.** Nada de `fetch` a mano contra la API. Si falta un endpoint, primero se agrega en el backend y después se corre `make api`. El CI falla si `src/api/generated` no coincide con `api/openapi.json`.
- **Los componentes no usan los hooks generados directamente.** Cada feature expone hooks propios en `features/<module>/api/` que envuelven al generado y fijan las opciones (`select`, `refetchInterval`, invalidaciones). Así un cambio de contrato se absorbe en un solo lugar.
- **Estado del servidor en TanStack Query**, y estado de UI local con `useState`/`useReducer`. No se agrega una librería de estado global sin una decisión con issue.
- **Imports absolutos con `@/`** (`@/features/auth/...`). Los relativos solo dentro de la misma feature.
- **Rutas.** Se declaran en `app/routes.tsx`. Las rutas por rol cuelgan de `RequireRole` (`features/auth`): sin sesión redirige a `/login` y con otro rol redirige a `/forbidden` («Acceso denegado», dentro del layout público). El panel del admin no usa `AppLayout`: cuelga de `RequireRole` en un árbol aparte con su `AdminLayout`.
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

- Los tests montan `MantineProvider` (con `env="test"`) dentro de `renderRoute`, y `test/setup.ts` simula `matchMedia` y `ResizeObserver`, que jsdom no trae. jsdom tampoco tiene `document.fonts`, que usa el `Textarea` con `autosize`: en su lugar se usa `rows`.

- Vitest + Testing Library en `jsdom`. Los tests van junto al código (`Xxx.test.tsx`).
- Se consulta por rol y por texto visible (`getByRole`, `findByText`), no por clases ni test ids.
- Las páginas se renderizan con `renderRoute(path)`, que monta las rutas reales con un `QueryClient` sin reintentos.
- La API se simula con `stubFetchJson(body, status)` / `stubFetchNetworkError()`. Los stubs se limpian solos entre tests.
