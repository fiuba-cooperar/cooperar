# Shortcuts for the most common tasks. Each part can also be driven with its own tooling
# (./gradlew in backend/, npm in frontend/); see README.md.

.PHONY: up down logs test lint api diff-cover

up: ## Start database, backend and frontend
	docker compose up --build -d

down: ## Stop the services (the database volume is kept)
	docker compose down

logs:
	docker compose logs -f

test: ## Backend (Testcontainers) and frontend tests
	cd backend && ./gradlew test
	cd frontend && npm test

lint: ## Formatting and lint for both parts
	cd backend && ./gradlew spotlessCheck
	cd frontend && npm run lint && npm run format:check && npm run typecheck

api: ## Export the backend OpenAPI spec and regenerate the TypeScript client
	cd backend && ./gradlew test --tests '*OpenApiSpecExportTest'
	cp backend/build/openapi/openapi.json api/openapi.json
	cd frontend && npm run api:generate

diff-cover: ## Backend coverage of the lines changed against origin/main (needs `pip install diff-cover`)
	cd backend && ./gradlew test jacocoTestCoverageVerification
	diff-cover backend/build/reports/jacoco/test/jacocoTestReport.xml --src-roots backend/src/main/java --compare-branch=origin/main --fail-under=85
