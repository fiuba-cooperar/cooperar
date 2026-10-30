-- Closed list so the map and the search can filter by industry; the observatory maintains it.
CREATE TABLE industries (
    id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE
);

INSERT INTO industries (name)
VALUES ('Alimentos'), ('Textil'), ('Metalúrgica'), ('Gráfica'), ('Servicios');

ALTER TABLE cooperatives
    ADD COLUMN slug        text,
    ADD COLUMN industry_id uuid REFERENCES industries (id),
    ADD COLUMN description text,
    ADD COLUMN locality    text,
    ADD COLUMN province    text,
    ADD COLUMN address     text,
    ADD COLUMN phone       text,
    ADD COLUMN email       text,
    ADD COLUMN location    geometry(Point, 4326);

-- Existing cooperatives get the same slug the application would generate, numbered when names collide.
WITH base AS (
    SELECT id,
           created_at,
           coalesce(nullif(trim(BOTH '-' FROM regexp_replace(lower(unaccent(name)), '[^a-z0-9]+', '-', 'g')), ''),
                    'cooperativa') AS slug
    FROM cooperatives
),
numbered AS (
    SELECT id, slug, row_number() OVER (PARTITION BY slug ORDER BY created_at, id) AS position
    FROM base
)
UPDATE cooperatives
SET slug = CASE WHEN numbered.position = 1 THEN numbered.slug ELSE numbered.slug || '-' || numbered.position END
FROM numbered
WHERE numbered.id = cooperatives.id;

ALTER TABLE cooperatives
    ALTER COLUMN slug SET NOT NULL,
    ADD CONSTRAINT cooperatives_slug_key UNIQUE (slug);

CREATE INDEX cooperatives_industry_id_idx ON cooperatives (industry_id);
