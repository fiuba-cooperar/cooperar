# PostgreSQL 18 + PostGIS 3.6 (official PostGIS image) + pgvector built from source.
# No official image ships both extensions; building pgvector on Alpine keeps the image small.
FROM postgis/postgis:18-3.6-alpine

ARG PGVECTOR_VERSION=0.8.7

RUN apk add --no-cache --virtual .pgvector-build build-base \
    && wget -qO- "https://github.com/pgvector/pgvector/archive/refs/tags/v${PGVECTOR_VERSION}.tar.gz" | tar xz -C /tmp \
    && make -C "/tmp/pgvector-${PGVECTOR_VERSION}" with_llvm=no OPTFLAGS="" \
    && make -C "/tmp/pgvector-${PGVECTOR_VERSION}" with_llvm=no install \
    && rm -rf "/tmp/pgvector-${PGVECTOR_VERSION}" \
    && apk del .pgvector-build
