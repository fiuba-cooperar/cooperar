# CooperAR

Observatorio digital abierto de empresas recuperadas por sus trabajadores (ERT) y cooperativas de trabajo. Es el Trabajo Profesional de Ingeniería en Informática (FIUBA), hecho con la Secretaría de Extensión Universitaria (SEU).

Reemplaza registros burocráticos y desactualizados por una plataforma de uso cotidiano que combina catálogo comercial, red intercooperativa, ferias y puntos de venta, y memoria histórica del sector. **El alcance es exploratorio: los módulos van a cambiar.** Las historias de usuario son las issues del repo (#1 a #62), agrupadas en milestones.

Lo específico de cada parte está en [`backend/CLAUDE.md`](backend/CLAUDE.md) y [`frontend/CLAUDE.md`](frontend/CLAUDE.md).

## Idioma (regla obligatoria)

Esta regla vale en todas las sesiones y para todo el equipo:

| Va en **inglés** | Va en **español** |
|---|---|
| Todo el código: identificadores, paquetes, clases, archivos, rutas de la API, tablas y columnas | Documentación: `*.md`, `docs/`, incluidos los `CLAUDE.md` |
| Comentarios y Javadoc/JSDoc | Mensajes de commit (Conventional Commits con la descripción en español) |
| Mensajes de log y mensajes de error de la API | Título y descripción de los PRs |
| Nombres y descripciones de tests | Issues y comentarios en GitHub |
| Comentarios y mensajes en Dockerfiles, workflows de CI, `docker-compose.yml`, `Makefile`, `.env.example` y archivos de configuración | Textos de la interfaz que ve el usuario, en voseo rioplatense ("Buscá", "Volver al inicio") |
| | Las respuestas de Claude en la conversación |

Los términos del dominio se traducen siempre igual en el código: ficha → `profile`, consulta → `inquiry`, feria → `fair`, hito → `milestone`, relevamiento → `survey`, necesidad → `need`, cooperativa → `cooperative`, organización (cooperativa o ERT) → `organization`, alta (de una organización) → `registration`, aprobación/revisión del alta → `review` (estado `OrganizationStatus`: `PENDING`, `APPROVED`, `REJECTED`), aviso por email → `notification`, rubro → `sector`, departamento/partido/comuna → `district`, localidad/barrio → `locality`, tipo de organización (cooperativa, ERT o ambas) → `OrganizationType`. ERT y MIA se mantienen como siglas: `Ert`, `Mia`. Si aparece un término nuevo, se agrega a esta lista.

## Perfiles

| Perfil | Login | Qué hace |
|---|---|---|
| Público general | No | Busca empresas, explora el catálogo (sin compras en la plataforma), ve el mapa y la línea de tiempo del sector, consulta ferias y eventos, envía consultas. |
| Cooperativa / ERT | Sí (`COOPERATIVE`) | Carga su ficha con privacidad por campo, ABM de productos, responde consultas, carga su memoria institucional, participa de la red intercooperativa. |
| Admin del observatorio | Sí (`ADMIN`) | Aprueba altas, arma cuestionarios de relevamiento, ve analítica, administra contenidos. |

## Glosario

- **ERT**: Empresa Recuperada por sus Trabajadores. Empresa que, tras la quiebra o el abandono de sus dueños, los trabajadores pusieron a producir de nuevo, en general organizados como cooperativa de trabajo.
- **Cooperativa de trabajo**: cooperativa cuyos asociados son los propios trabajadores. Muchas ERT adoptan esta forma, pero no todas las cooperativas son ERT.
- **SEU**: Secretaría de Extensión Universitaria de la FIUBA. Es la contraparte del proyecto: valida prioridades y articula con las cooperativas.
- **Observatorio**: la plataforma y el equipo que la administra. Releva, consolida y publica información del sector. "Visible solo para el observatorio" significa visible para los admins y nunca para el público.
- **MIA**: Moneda de Intercambio Argentina, la moneda social que usa la red de empresas recuperadas (integrada por Recoop). La plataforma solo registra operaciones que ya ocurrieron: no procesa pagos.
- **Vaciamiento**: maniobra de los dueños que descapitaliza la empresa antes del cierre o la quiebra (retiro de maquinaria y activos, deudas impagas, salarios adeudados). Suele ser el origen del proceso de recuperación y es un hito habitual en la línea de tiempo.
- **Reconversión de espacios**: uso social de la infraestructura excedente de una ERT, como bachilleratos populares, centros culturales, guarderías o alquiler de salones.
- **Toma / recuperación**: ocupación de la planta por los trabajadores para defender la fuente de trabajo, normalmente seguida de una expropiación o una cesión judicial.
- **Ficha**: perfil público de una cooperativa o ERT (datos, ubicación, contacto, productos, historia).
- **Hito**: evento de la historia de una empresa, con una fecha que puede ser imprecisa (año, mes o rango).
- **Relevamiento**: cuestionario que el observatorio asigna a las cooperativas para recolectar datos del sector.
- **Fuentes de datos**: INAES (padrón de cooperativas), RENACER (registro de ERT), programa Facultad Abierta de la UBA (informes sobre ERT) y Recoop (comercializadora de la red).

## Stack y versiones

| Parte | Tecnología |
|---|---|
| Backend | Java 25 (LTS), Spring Boot 4.1.2, Gradle 9.8.2 (Kotlin DSL, wrapper commiteado) |
| | Spring Web MVC, Spring Security (resource server JWT HS256), Spring Data JPA, Flyway, Bean Validation, Actuator, springdoc-openapi 3.2.0 |
| | Tests: JUnit 5, AssertJ, Mockito, MockMvcTester, Testcontainers |
| | Formato: Spotless + palantir-java-format |
| Base de datos | PostgreSQL 18 + PostGIS 3.6 (imagen oficial `postgis/postgis:18-3.6-alpine`), `unaccent`. pgvector se suma con la búsqueda semántica (#45). |
| Frontend | Node 24 LTS, React 19, TypeScript 6.0 (estricto), Vite 8, React Router 8, TanStack Query 5, Mantine 9 (componentes de UI) |
| | Cliente de API generado con orval desde `api/openapi.json` |
| | ESLint 10 (typescript-eslint strict type-checked) + Prettier, Vitest 5 + Testing Library + axe-core |
| Infra | Docker Compose; imágenes `eclipse-temurin:25-jre-alpine` y `nginx:1.30-alpine` |
| CI | GitHub Actions: un workflow por parte (filtrado por ruta) con un solo job: lint y test en el backend (`gradlew`), y lint, test y build en el frontend (`npm`), sin Docker salvo el que usa Testcontainers. La imagen y el deploy van en un workflow aparte sobre `main` (#9). |

Restricción de producción: va a correr en servidores de la Facultad con hardware limitado. Hay que priorizar imágenes livianas y pocos servicios, y no usar servicios propietarios de un cloud (nada de S3, Cloud SQL, colas gestionadas, etc.). Todo tiene que poder autohospedarse.

## Estructura del repo

```
api/openapi.json        Contrato de la API (lo exporta el backend; de acá se genera el cliente del front)
backend/                Spring Boot (ver backend/CLAUDE.md)
frontend/               React + Vite (ver frontend/CLAUDE.md)
docs/                   Modelo de datos, minutas, relevamientos, evaluaciones
.github/                CI, plantillas de PR e issues
docker-compose.yml      Entorno completo de desarrollo
Makefile                Atajos: up, down, test, lint, api
```

## Arquitectura

### Vista general

```
navegador ──► nginx (frontend) ──/api/──► Spring Boot ──► PostgreSQL (PostGIS)
```

- El front y la API comparten un mismo origen: nginx, o el proxy de Vite en desarrollo, reenvía `/api`. Así no hace falta configurar CORS.
- La API es REST y stateless, autenticada con JWT. Lo público no requiere token. `/api/admin/**` exige el rol `ADMIN` y `/api/cooperative/**` exige el rol `COOPERATIVE`.
- El contrato es `api/openapi.json`. El frontend consume el backend **solo** a través del cliente generado desde ese archivo, y el CI falla si el contrato o el cliente quedaron desactualizados.

### Backend (resumen)

Arquitectura por capas con **paquetes por capa en el primer nivel y un subpaquete por módulo de dominio adentro**:

```
ar.uba.fi.cooperar
├── web/<module>          Controllers y DTOs (Request/Response). Sin lógica de negocio.
├── service/<module>      Casos de uso, transacciones, reglas de negocio
├── domain/<module>       Entidades JPA, value objects, enums
├── repository/<module>   Spring Data JPA y consultas SQL
└── shared/               Transversal: error (ProblemDetail), security, config
```

Módulos previstos según las issues: `organizations` (fichas, privacidad), `catalog`, `inquiries`, `users`, `fairs`, `spaces`, `history`, `network` (necesidades, MIA, grafo), `surveys`, `metrics`, `search` y `content`. Hoy existen `health`, `user` (registro, confirmación del email, login y sesión), `organizations` (la entidad `Organization`, cooperativa, ERT o ambas, con los datos del alta: tipo, nombre, CUIT, rubro y dirección, y la aprobación por el observatorio) y `notifications` (emails a las cuentas, por SMTP). Cada módulo se crea con su primera issue: no se dejan paquetes vacíos. Detalle en `backend/CLAUDE.md`.

### Frontend (resumen)

Estructura por features (`src/features/<module>`) con componentes compartidos en `src/components`, acceso a datos mediante hooks que envuelven el cliente generado (`src/api/generated`) y TanStack Query para la caché del servidor. Detalle en `frontend/CLAUDE.md`.

### Preparación para las funcionalidades de investigación

La búsqueda semántica (#45), las consultas en lenguaje natural (#46), la demanda insatisfecha (#47), el asistente de línea de tiempo con LLM (#49) y el grafo intercooperativo (#52, #53) todavía **no** están implementados. La base que ya está preparada:

- **PostGIS** queda habilitado desde la primera migración, porque lo necesitan issues Must cercanas (#13, #17, #24, #27).
- **pgvector todavía no está instalado**, porque nada lo usa hasta la #45. Cuando llegue, hay que hacer dos cosas: (1) cambiar a una imagen que traiga PostGIS y pgvector juntos (ninguna oficial los trae, así que habrá que construirla compilando pgvector sobre `postgis/postgis`), usando la misma imagen en `docker-compose.yml` y en `TestcontainersConfiguration`; (2) agregar una migración que haga `CREATE EXTENSION vector`. Los embeddings van a ser columnas `vector(n)` en las tablas del dominio, con índice HNSW, para que la búsqueda híbrida sea una sola consulta SQL que combina full-text y similitud.
- **Proveedores intercambiables.** Toda dependencia de un modelo (embeddings, LLM) se define como una interfaz en `service/<module>`, por ejemplo `EmbeddingProvider` o `TimelineExtractor`. Las implementaciones van en una capa `integration/<provider>` y se eligen por configuración (`cooperar.ai.*`). La lógica de negocio nunca importa el SDK de un proveedor. Se prefieren los modelos locales por la restricción de hardware y de cloud.
- **Trabajo pesado fuera del request.** El cálculo de embeddings y de recomendaciones se dispara con eventos de dominio (`@TransactionalEventListener` + `@Async`) y no bloquea el guardado.
- **Registro de búsquedas.** El buscador (#15) registra cada búsqueda con su texto, filtros, cantidad de resultados y zona aproximada. Ese registro es el insumo de la demanda insatisfecha y de las métricas.
- **Grafo.** Se arma en memoria (JGraphT) a partir de consultas a los repositorios. Si algún día hace falta una base de grafos, se decide con una issue.

## Comandos

Requisitos: Docker con Compose v2. Para trabajar fuera de Docker: JDK 25 y Node 24.

| Qué | Comando |
|---|---|
| Levantar todo (base, backend y front) | `docker compose up --build` o `make up` |
| Frontend | http://localhost:5173 |
| API / Swagger UI (perfil dev) | http://localhost:8080/api/health · http://localhost:8080/swagger-ui.html |
| Tests de todo | `make test` |
| Lint de todo | `make lint` |
| Regenerar contrato y cliente después de cambiar la API | `make api` |
| Backend local contra un Postgres de Testcontainers | `cd backend && ./gradlew bootTestRun` |
| Frontend con recarga en caliente (necesita el backend en :8080) | `cd frontend && npm run dev` |

Los comandos de cada parte están en su `CLAUDE.md`.

## Convenciones

### Código

- Inyección por constructor, sin `@Autowired` en campos. DTOs separados de las entidades. Los controllers no tienen lógica.
- Errores de la API siempre en formato `ProblemDetail` (RFC 9457).
- Tests desde el primer día: toda funcionalidad nueva entra con sus tests, y un bug se corrige con un test que lo reproduce.
- Nada de código muerto ni de `TODO`/`FIXME` sin el número de issue: `// TODO(#23): ...`.
- Comentarios solo cuando explican el porqué. El qué tiene que leerse en el código.

### Commits y ramas

- [Conventional Commits](https://www.conventionalcommits.org/es/) con la descripción en español: `feat(catalog): alta de productos con fotos`, `fix(security): ...`, `chore`, `docs`, `test`, `refactor`, `ci`, `build`.
- El scope es el módulo o la parte: `backend`, `frontend`, `infra`, `ci` o el nombre de un módulo.
- Ramas `<tipo>/<descripcion-corta>`, por ejemplo `feat/registro-cooperativas`. PR contra `main` con `Closes #N`. No se pushea directo a `main`.
- **No se commitea ni se pushea cada cambio.** Se agrupa el trabajo en pocos commits que tengan sentido por sí solos (por ejemplo, uno por parte o por funcionalidad), y se pushea en pocas tandas. Claude no commitea ni pushea por iniciativa propia: espera a que se lo pidan.
- **Por qué:** los minutos de GitHub Actions de la organización son limitados, y cada push a un PR abierto corre todo el CI (los commits locales no gastan nada). Un push por cada ajuste los consume sin necesidad.
- **Antes de pushear, se corre lo mismo que el CI** en la máquina de cada uno: `make lint`, `make test` y `make diff-cover` (cobertura global del backend ≥ 80 % y de las líneas cambiadas ≥ 85 %). No se pushea «para probar» el CI.

## Privacidad de los datos

La plataforma guarda datos de cooperativas y de personas (contactos, quienes envían consultas), y se rige por la **Ley 25.326 de Protección de Datos Personales**. Estas reglas no se negocian:

1. **Visibilidad por campo de la ficha.** Cada campo es *siempre público*, *siempre privado* (solo observatorio) o *configurable por la cooperativa* (#3, #14). La definición vive en el backend y no se puede cambiar desde el cliente.
2. **La API pública nunca devuelve campos privados.** Lo público usa DTOs propios que solo contienen campos visibles; nunca se serializa una entidad, y nunca se "oculta en el front" un dato que el backend ya envió. Cada endpoint público lleva un test que verifica que no expone campos privados.
3. **Los datos de contacto de quienes envían consultas** los ve solo la cooperativa destinataria (y el admin si hace falta para moderar). No aparecen en métricas ni en exportaciones.
4. **Las transacciones con MIA** las ve solo la cooperativa que las registró. El admin solo accede a agregados (#39, #44).
5. **Métricas y registros de búsqueda sin datos identificables.** No se guardan IPs, user agents completos ni ubicaciones precisas de visitantes: la zona se guarda con poca precisión (por ejemplo, localidad). Para el rate limiting anti-spam (#22) la IP se usa en memoria y de forma transitoria.
6. **Los paneles del admin muestran agregados** del sector, nunca el detalle de una cooperativa individual, salvo en las pantallas de gestión que lo requieren (por ejemplo, la aprobación de altas).
7. **Los logs no contienen datos personales** (emails, teléfonos, contenido de consultas, tokens). Se loguean identificadores.
8. **Los datos semilla** salen solo de fuentes públicas cuya licencia permite reutilizarlos (#4), y se documenta la fuente.
9. **Sin secretos en el repo.** La configuración va por variables de entorno (`.env.example` documenta cuáles). `.env` está en `.gitignore`.
10. **Mínimo necesario.** No se pide ni se guarda un dato sin una finalidad clara. Si se agrega un dato personal, se documenta su finalidad y plazo de conservación (#57).

## Decisiones pendientes

| Decisión | Issue |
|---|---|
| Alcance del MVP y priorización MoSCoW con la SEU | #2 |
| Modelo de dominio y diagrama ER | #1 |
| Campos de la ficha y su nivel de privacidad | #3 |
| Fuente de los datos semilla | #4 |
| Staging: la #9 propone Render, que choca con la regla de no usar cloud propietario. Hay que decidir si staging va en Render (aceptado solo para staging) o en la Facultad. | #9, #59 |
| Servidor SMTP de producción (el de la Facultad u otro autohospedado). El envío ya es por SMTP genérico y en desarrollo los emails van a Mailpit. | #12, #23 |
| Almacenamiento de imágenes (disco local o compatible con S3 autohospedado, como MinIO) | #13 |
| Geocodificación (Nominatim público con límites o instancia propia) | #13 |
| Librería de mapas (MapLibre o Leaflet) | #17 |
| Modelo y proveedor de embeddings | #45, #48 |
| Proveedor de LLM y uso de Spring AI para el asistente | #49, #51 |
| Caché (Redis solo si las pruebas de carga lo justifican) | #56 |
| Pasar a Node 26 (LTS desde el 28/10/2026) y a TypeScript 7 cuando typescript-eslint lo soporte | — |
