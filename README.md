# CooperAR

Observatorio digital abierto de empresas recuperadas por sus trabajadores (ERT) y cooperativas de trabajo.

Es el Trabajo Profesional de Ingeniería en Informática de la FIUBA, junto a la Secretaría de Extensión Universitaria.

Reúne un catálogo comercial, la red intercooperativa, ferias y puntos de venta, y la memoria histórica del sector en una plataforma abierta y de uso cotidiano.

## Arranque rápido

Requisitos: [Docker](https://docs.docker.com/get-docker/) con Compose v2.

```bash
git clone git@github.com:fiuba-cooperar/cooperar.git
cd cooperar
docker compose up --build
```

La primera vez tarda unos minutos porque construye las imágenes. Cuando termina, quedan disponibles:

| Servicio | URL |
|---|---|
| Aplicación web | http://localhost:5173 |
| API: estado | http://localhost:8080/api/health |
| API: documentación (Swagger UI) | http://localhost:8080/swagger-ui.html |
| PostgreSQL | `localhost:5432` (usuario, contraseña y base `cooperar`) |

La pantalla inicial muestra si el backend y la base de datos responden.

Todas las variables tienen un valor por defecto pensado para desarrollo. Para cambiar puertos o credenciales, copiá `.env.example` a `.env` y editalo. Para detener todo usá `docker compose down` (los datos persisten en el volumen `db-data`), y `docker compose down -v` si además querés borrarlos.

## Desarrollo

Para trabajar sin reconstruir imágenes en cada cambio se necesitan **JDK 25** y **Node 24**.

```bash
# Base de datos
docker compose up -d db

# Backend (http://localhost:8080)
cd backend && ./gradlew bootRun

# Frontend con recarga en caliente (http://localhost:5173, con /api redirigido al backend)
cd frontend && npm ci && npm run dev
```

Comandos útiles desde la raíz:

| Comando | Qué hace |
|---|---|
| `make test` | Tests del backend (con Testcontainers, necesita Docker) y del frontend |
| `make lint` | Formato y lint de ambas partes |
| `make api` | Exporta el OpenAPI del backend a `api/openapi.json` y regenera el cliente TypeScript |

Si cambiás la API, corré `make api` y commiteá los archivos generados. Si no lo hacés, el CI falla.

## Documentación

- [`CLAUDE.md`](CLAUDE.md): contexto del producto, glosario, arquitectura, convenciones, reglas de privacidad y decisiones pendientes.
- [`backend/CLAUDE.md`](backend/CLAUDE.md) y [`frontend/CLAUDE.md`](frontend/CLAUDE.md): lo específico de cada parte.
- [`docs/`](docs/): modelo de datos, minutas, relevamientos y evaluaciones.
- Backlog: [issues](https://github.com/fiuba-cooperar/cooperar/issues) y [milestones](https://github.com/fiuba-cooperar/cooperar/milestones).

## Contribuir

Ramas `<tipo>/<descripcion>`, commits con [Conventional Commits](https://www.conventionalcommits.org/es/) en español y PR contra `main` con `Closes #N`. El CI corre lint, tests y build de cada parte. Detalles en [`CLAUDE.md`](CLAUDE.md#convenciones).
