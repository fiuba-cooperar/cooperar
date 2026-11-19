-- The categories a product or service can belong to: a list the observatory maintains (#19).
CREATE TABLE product_categories
(
    id         uuid PRIMARY KEY,
    name       text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX product_categories_name_key ON product_categories (lower(name));

INSERT INTO product_categories (id, name)
SELECT gen_random_uuid(), name
FROM (VALUES ('Indumentaria'),
             ('Alimentos'),
             ('Accesorios'),
             ('Servicios'),
             ('Metalurgia y herramientas'),
             ('Gráfica y papelería'),
             ('Construcción'),
             ('Farmacia y perfumería'),
             ('Otros')) AS initial (name);

-- Products and services an organization offers (#19). A discontinued one is kept, but it is no longer shown publicly.
CREATE TABLE products
(
    id               uuid PRIMARY KEY,
    organization_id  uuid           NOT NULL REFERENCES organizations (id),
    name             text           NOT NULL,
    category_id      uuid           NOT NULL REFERENCES product_categories (id),
    description      text,
    -- Always an indicative price, in Argentine pesos; optional.
    indicative_price numeric(12, 2) CHECK (indicative_price >= 0),
    status           text           NOT NULL CHECK (status IN ('PUBLISHED', 'UNPUBLISHED')),
    created_at       timestamptz    NOT NULL,
    updated_at       timestamptz    NOT NULL
);

CREATE INDEX products_organization_id_idx ON products (organization_id);
CREATE INDEX products_category_id_idx ON products (category_id);

CREATE TABLE product_sale_modes
(
    product_id uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    sale_mode  text NOT NULL CHECK (sale_mode IN ('RETAIL', 'WHOLESALE')),
    PRIMARY KEY (product_id, sale_mode)
);

-- Photos of a product (#19): the image itself lives in the configured image storage, not in the database.
CREATE TABLE product_photos
(
    id          uuid PRIMARY KEY,
    product_id  uuid        NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    -- How the storage knows the image, to delete it; and the address anyone opens it at.
    storage_ref text        NOT NULL,
    url         text        NOT NULL,
    position    integer     NOT NULL,
    created_at  timestamptz NOT NULL
);

CREATE INDEX product_photos_product_id_idx ON product_photos (product_id);
