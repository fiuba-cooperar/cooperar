# Frontend: CooperAR web

React 19 + TypeScript 6 (estricto) sobre Vite 8, con React Router 8 y TanStack Query 5. El contexto del producto, el glosario y las reglas de privacidad están en el [`CLAUDE.md` de la raíz](../CLAUDE.md).

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
├── app/                     Composición: App (providers), routes, queryClient
├── api/generated/           Cliente generado por orval. NO se edita a mano; está excluido de lint y formato
├── components/
│   ├── layout/              AppLayout (header, main, footer, skip link)
│   └── ui/                  Componentes de UI reutilizables y sin lógica de dominio (se crea con el primero)
├── features/<module>/       Una carpeta por módulo de dominio, alineada con el backend
│   ├── api/                 Hooks de datos que envuelven al cliente generado (useXxx)
│   ├── components/          Componentes propios del módulo
│   └── XxxPage.tsx          Páginas que se montan en las rutas
└── test/                    Helpers de test: renderRoute, stubFetchJson, expectNoA11yViolations
```

Las features actuales son `home` (pantalla inicial), `health` (estado del backend) y `errors` (404).

## Reglas

- **Acceso a datos solo por el cliente generado.** Nada de `fetch` a mano contra la API. Si falta un endpoint, primero se agrega en el backend y después se corre `make api`. El CI falla si `src/api/generated` no coincide con `api/openapi.json`.
- **Los componentes no usan los hooks generados directamente.** Cada feature expone hooks propios en `features/<module>/api/` que envuelven al generado y fijan las opciones (`select`, `refetchInterval`, invalidaciones). Así un cambio de contrato se absorbe en un solo lugar.
- **Estado del servidor en TanStack Query**, y estado de UI local con `useState`/`useReducer`. No se agrega una librería de estado global sin una decisión con issue.
- **Imports absolutos con `@/`** (`@/features/health/...`). Los relativos solo dentro de la misma feature.
- **Rutas.** Se declaran en `app/routes.tsx`. Las rutas protegidas por rol llegan con la #7.
- **Estilos.** CSS Modules por componente (`Xxx.module.css`) y tokens de `index.css` (`var(--color-*)`, `var(--space-*)`). No se usan colores sueltos. La librería de componentes es una decisión pendiente (#7).
- **Idioma.** Código, nombres de archivos, identificadores y tests en inglés. **Todo texto visible para el usuario va en español** rioplatense, en voseo ("Buscá", "Volver al inicio").
- **TypeScript estricto** (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`). Nada de `any` ni de `!` para silenciar el compilador.

## Accesibilidad y responsive (WCAG 2.1 AA)

Muchas personas del sector usan la plataforma desde el celular y sin experiencia técnica (#58).

- HTML semántico: un `h1` por página, landmarks (`header`, `main`, `footer`) y botones que sean `<button>`.
- Todo se puede usar con teclado y con el foco visible. Ya existe un skip link "Saltar al contenido principal".
- Los contenidos que cambian solos se anuncian con `role="status"` o `aria-live`.
- Formularios con `<label>` asociado y errores vinculados con `aria-describedby`.
- Contraste AA en modo claro y en modo oscuro (`prefers-color-scheme`). También se respeta `prefers-reduced-motion`.
- Mobile first: los layouts se piensan desde 320 px y se usan unidades relativas.
- Cada página nueva tiene un test con `expectNoA11yViolations` (axe-core). `eslint-plugin-jsx-a11y` no se usa porque no soporta ESLint 10 y no se actualiza desde 2024.

## Tests

- Vitest + Testing Library en `jsdom`. Los tests van junto al código (`Xxx.test.tsx`).
- Se consulta por rol y por texto visible (`getByRole`, `findByText`), no por clases ni test ids.
- Las páginas se renderizan con `renderRoute(path)`, que monta las rutas reales con un `QueryClient` sin reintentos.
- La API se simula con `stubFetchJson(body, status)` / `stubFetchNetworkError()`. Los stubs se limpian solos entre tests.
