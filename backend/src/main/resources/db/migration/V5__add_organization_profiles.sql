ALTER TABLE organizations
    ADD COLUMN slug        text,
    ADD COLUMN description text,
    ADD COLUMN phone       text,
    ADD COLUMN email       text,
    ADD COLUMN location    geometry(Point, 4326);

-- Existing organizations get the same slug the application would generate, numbered when names collide.
WITH base AS (
    SELECT id,
           created_at,
           coalesce(nullif(trim(BOTH '-' FROM regexp_replace(lower(unaccent(name)), '[^a-z0-9]+', '-', 'g')), ''),
                    'organizacion') AS slug
    FROM organizations
),
numbered AS (
    SELECT id, slug, row_number() OVER (PARTITION BY slug ORDER BY created_at, id) AS position
    FROM base
)
UPDATE organizations
SET slug = CASE WHEN numbered.position = 1 THEN numbered.slug ELSE numbered.slug || '-' || numbered.position END
FROM numbered
WHERE numbered.id = organizations.id;

ALTER TABLE organizations
    ALTER COLUMN slug SET NOT NULL,
    ADD CONSTRAINT organizations_slug_key UNIQUE (slug);
