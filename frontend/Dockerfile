# Build: produce the static files. The API client is committed, so the backend is not needed.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# Runtime: nginx serves the SPA and proxies /api to the backend (single origin, no CORS).
FROM nginx:1.30-alpine
ENV BACKEND_URL=http://backend:8080
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s --retries=5 CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1
