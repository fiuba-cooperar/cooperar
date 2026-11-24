-- Whether a catalog entry is a product or a service. Until now it was only implied by its category.
ALTER TABLE products
    ADD COLUMN type text NOT NULL DEFAULT 'PRODUCT' CHECK (type IN ('PRODUCT', 'SERVICE'));

UPDATE products
SET type = 'SERVICE'
WHERE category_id IN (SELECT id FROM product_categories WHERE name = 'Servicios');

ALTER TABLE products
    ALTER COLUMN type DROP DEFAULT;
