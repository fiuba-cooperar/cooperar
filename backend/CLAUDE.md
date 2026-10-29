# Backend: CooperAR API

Spring Boot 4.1.2 sobre Java 25, con Gradle 9.8.2 (wrapper). El contexto del producto, el glosario y las reglas de privacidad están en el [`CLAUDE.md` de la raíz](../CLAUDE.md).

## Comandos (desde `backend/`)

| Qué | Comando |
|---|---|
| Tests (unitarios, slices e integración con Testcontainers) | `./gradlew test` |
| Un test | `./gradlew test --tests '*HealthControllerTest'` |
| Formatear | `./gradlew spotlessApply` |
| Chequear formato (CI) | `./gradlew spotlessCheck` |
| Cobertura: global ≥ 80 % y líneas cambiadas ≥ 85 % (CI) | `make diff-cover` desde la raíz (necesita `pip install diff-cover`) |
| Jar ejecutable | `./gradlew bootJar` |
| Correr contra un Postgres efímero (Testcontainers) | `./gradlew bootTestRun` |
| Correr contra la base de `docker compose` | `docker compose up -d db` y luego `./gradlew bootRun` |
| Exportar el OpenAPI y regenerar el cliente del front | `make api` (desde la raíz) |

Los tests de integración necesitan Docker: Testcontainers levanta un Postgres temporal con la imagen `postgis/postgis:18-3.6-alpine` (la misma que `docker compose`) y lo borra al terminar.

## Paquetes

El primer nivel es la capa y adentro de cada capa hay un subpaquete por módulo de dominio, siempre con el mismo nombre en todas las capas:

```
ar.uba.fi.cooperar
├── CooperarApplication
├── web/<module>/          @RestController + DTOs (XxxRequest, XxxResponse)
├── service/<module>/      @Service: casos de uso, @Transactional, reglas de negocio
├── domain/<module>/       @Entity, records, enums: el modelo
├── repository/<module>/   Spring Data JPA (interfaces) o JdbcClient para SQL específico
├── integration/<provider>/  (cuando haga falta) adaptadores a servicios externos: email, geocodificación, LLM
└── shared/
    ├── error/             GlobalExceptionHandler → ProblemDetail
    ├── security/          SecurityConfig, JwtProperties, ProblemDetailSecurityHandler
    └── config/            OpenApiConfig y otra configuración transversal
```

Hoy existen los módulos `health` y `user` (cuentas, login y sesión; en `web`, `service`, `domain` y `repository`) y, de `organizations`, solo la entidad mínima `Cooperative` (el resto llega con las fichas, #3 y #14).

### Reglas entre capas

- Las dependencias van `web → service → repository/domain`. Nunca al revés, y `web` no usa `repository`.
- **Controllers sin lógica.** Reciben y validan (`@Valid`) el DTO, llaman a un único método del service y traducen el resultado a la respuesta HTTP.
- **DTOs separados de las entidades.** Una entidad nunca sale por la API. La conversión se hace en el DTO (`XxxResponse.from(entity)`) o en un mapper del paquete `web/<module>`. Los DTOs son `record`.
- **Vistas públicas con DTO propio.** Si un recurso tiene vista pública y vista privada (por ejemplo, la ficha), cada una tiene su DTO, y el público solo contiene campos visibles (regla de privacidad 2).
- **Dependencias externas detrás de interfaces.** La interfaz se define en `service/<module>` y la implementación vive en `integration/<provider>`. Se elige por configuración.
- Las transacciones van en el service, nunca en el controller.

## Convenciones

- Código, comentarios, logs y mensajes de error de la API **en inglés**.
- Inyección por constructor (sin `@Autowired`). `record` para DTOs y value objects. Los beans de Spring no son `final`, porque los proxies de `@Transactional` y `@Configuration` necesitan extenderlos.
- Rutas en inglés, en plural y kebab-case, bajo `/api`: `/api/organizations/{slug}`. Lo que requiere un rol va bajo `/api/admin/**` o `/api/cooperative/**`.
- Cada endpoint declara `operationId` con `@Operation`, porque es el nombre de la función y del hook que se generan en el front.
- **Errores.** Se lanzan excepciones de dominio y `GlobalExceptionHandler` las traduce a `ProblemDetail`. Los errores de Spring MVC y de validación ya salen como `ProblemDetail`, y lo inesperado se convierte en un 500 sin detalles internos. Los 401 y 403 también usan `ProblemDetail`.
- **Logs.** SLF4J, sin datos personales (ver la regla de privacidad 7). En `prod` se emiten en formato estructurado ECS (JSON).
- Formato con Spotless (palantir-java-format). El CI falla si no está aplicado.

## Base de datos y migraciones

- El esquema lo maneja **solo Flyway** (`src/main/resources/db/migration`). Hibernate corre con `ddl-auto: validate`.
- Nombres: `V<n>__<description_in_english>.sql`, por ejemplo `V2__create_organizations.sql`. **Una migración aplicada no se edita nunca**: los cambios van en una migración nueva.
- Tablas y columnas en inglés y snake_case, con nombres de tabla en plural.
- `V1` habilita `postgis` y `unaccent`. pgvector se agrega con la #45 (ver el `CLAUDE.md` de la raíz). En producción el usuario que corre las migraciones necesita permiso para crear extensiones, o un DBA las crea antes.
- Geometrías: `geometry(Point, 4326)`. Búsqueda full-text: `tsvector` con configuración `spanish` + `unaccent` e índices GIN.

## Seguridad

- Resource server JWT con HS256 y clave en `JWT_SECRET` (mínimo 32 caracteres; se valida al arrancar). Los roles viajan en el claim `roles` (`["ADMIN"]`, `["COOPERATIVE"]`) y se mapean a `ROLE_*`.
- **Login** (`/api/auth/login`, `/refresh`, `/logout`, públicos): el access token es un JWT de 15 minutos (`cooperar.security.session.access-token-ttl`) y el refresh token es opaco, de 7 días, y se guarda en la base solo como hash SHA-256. Cada `/refresh` lo rota (el anterior queda revocado) y `/logout` lo revoca. Las contraseñas van con BCrypt.
- `GET /api/me` devuelve la cuenta, su rol y sus cooperativas.
- **Admin inicial**: al arrancar, si no existe ningún admin y están `ADMIN_EMAIL` y `ADMIN_PASSWORD`, se crea. En `prod` no hay valores por defecto.
- Pendiente: limitar los intentos de login (rate limiting, #22).
- Las reglas por ruta están en `SecurityConfig`. Lo que no matchea ninguna regla se deniega (`denyAll`).
- Actuator expone solo `health` (con probes `liveness` y `readiness`) e `info`.

## Perfiles

| Perfil | Uso |
|---|---|
| `dev` (por defecto) | Desarrollo local: Swagger UI en `/swagger-ui.html`, logs legibles, `JWT_SECRET` de desarrollo por defecto |
| `test` | Tests: lo activa `@IntegrationTest` y la base la pone Testcontainers |
| `prod` | Producción: logs ECS, sin `/v3/api-docs` ni Swagger UI, `JWT_SECRET` obligatorio |

La conexión se configura con `DB_URL`, `DB_USER` y `DB_PASSWORD` (ver `.env.example`).

## Tests

| Tipo | Cómo | Ejemplo |
|---|---|---|
| Unitario | JUnit + Mockito, sin Spring | `HealthServiceTest` |
| Slice web | `@WebMvcTest` + `@Import(SecurityConfig, ProblemDetailSecurityHandler)` + `@MockitoBean` del service | `HealthControllerTest` |
| Integración | `@IntegrationTest` (contexto completo, MockMvc y Postgres real con PostGIS) | `HealthIntegrationTest`, `SecurityIntegrationTest` |

- Las aserciones se escriben con AssertJ y `MockMvcTester`.
- `OpenApiSpecExportTest` exporta `build/openapi/openapi.json`. El CI lo compara con `../api/openapi.json`, así que si cambiás la API corré `make api` y commiteá el resultado.
- Los nombres de los tests describen el comportamiento: `rejectsUsersWithTheWrongRole`.
