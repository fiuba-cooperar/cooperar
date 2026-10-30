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

Hoy existen estos módulos:

- `health`.
- `user`: cuentas, registro, confirmación del email, login y sesión (en `web`, `service`, `domain` y `repository`).
- `organizations`: la entidad `Organization` (tabla `organizations`) con los datos del alta, los value objects `Cuit` y `Address` (embebido; por ahora se escribe a mano salvo la provincia, y la geocodificación llega con la #13), los enums `OrganizationType` (cooperativa, ERT o ambas), `Sector`, `Province` y `OrganizationStatus`, y la revisión del alta por el admin (`OrganizationReviewService`, `/api/admin/organizations`). El resto de la ficha llega con la #3 y la #14.
- `notifications` (solo en `service`): `AccountNotifications` arma los emails en español y los manda por la interfaz `EmailSender`, cuya implementación SMTP está en `integration/smtp`.

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
- `GET /api/me` devuelve la cuenta, su rol, si confirmó el email y sus organizaciones con su estado (y el motivo, si fue rechazada).
- **Registro** (`/api/auth/register`, público): crea en una transacción la cuenta con rol `COOPERATIVE` y su primera organización (cooperativa, ERT o ambas). El email y el CUIT son únicos (el CUIT se guarda como 11 dígitos y se valida el dígito verificador); si alguno ya existe responde 409 con la lista `conflicts` (`EMAIL`, `CUIT`).
- **Confirmación del email**: el registro manda un enlace `PUBLIC_URL/verify-email?token=...` con un token opaco de un solo uso que vence a las 48 horas (en la base, solo su SHA-256). `POST /api/auth/verify-email` (público) lo canjea y `POST /api/me/email-verification` manda uno nuevo e invalida los anteriores. La cuenta puede loguearse sin confirmar, pero sus organizaciones no llegan al admin hasta que confirme. El admin inicial nace confirmado.
- **Aprobación de altas** (#12): toda organización nueva queda `PENDING`, y solo las `APPROVED` son públicas, así que **toda consulta pública de organizaciones tiene que filtrar por `status = 'APPROVED'`**. `GET /api/admin/organizations/pending` lista las pendientes cuya cuenta ya confirmó el email, de la más antigua a la más nueva, con la cuenta que las registró (`registered_by`). `POST .../{id}/approve` y `POST .../{id}/reject` (con `reason` obligatorio) responden 409 si la organización no está esperando revisión. En ambos casos se avisa por email a la cuenta que la registró.
- **Admin inicial**: al arrancar, si no existe ningún admin y están `ADMIN_EMAIL` y `ADMIN_PASSWORD`, se crea. En `prod` no hay valores por defecto.
- Pendiente: limitar los intentos de login (rate limiting, #22).
- Las reglas por ruta están en `SecurityConfig`. Lo que no matchea ninguna regla se deniega (`denyAll`).
- Actuator expone solo `health` (con probes `liveness` y `readiness`) e `info`. El indicador de mail está apagado: si el SMTP no responde, la API sigue disponible.

## Emails

- Se mandan por SMTP (`spring.mail.*`, configurado con `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_SMTP_AUTH` y `MAIL_SMTP_STARTTLS`), con remitente `MAIL_FROM`. Los enlaces apuntan a `PUBLIC_URL`, la dirección del frontend. Fuera de `dev`, `MAIL_HOST`, `MAIL_FROM` y `PUBLIC_URL` son obligatorios.
- En `dev` van a Mailpit (`localhost:1025`, interfaz en http://localhost:8025), que `docker compose` levanta.
- Los services publican eventos (`VerificationEmailRequested`, `OrganizationReviewed`) y `AccountNotifications` los manda con `@TransactionalEventListener`, o sea después del commit: si el envío falla se loguea (sin la dirección) y lo guardado no se deshace.
- En los tests, `RecordingEmailSender` reemplaza al SMTP y guarda los emails en memoria. Como se mandan después del commit, los tests que los leen no pueden ser `@Transactional` y limpian la base al terminar (ver `OrganizationReviewIntegrationTest`).

## Perfiles

| Perfil | Uso |
|---|---|
| `dev` (por defecto) | Desarrollo local: Swagger UI en `/swagger-ui.html`, logs legibles, `JWT_SECRET` de desarrollo por defecto y emails a Mailpit |
| `test` | Tests: lo activa `@IntegrationTest` y la base la pone Testcontainers |
| `prod` | Producción: logs ECS, sin `/v3/api-docs` ni Swagger UI, `JWT_SECRET` y la configuración de email obligatorios |

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
