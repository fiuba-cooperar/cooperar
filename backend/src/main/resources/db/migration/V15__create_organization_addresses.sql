-- Other addresses of an organization besides its main one (the one in organizations): a branch, a store, another
-- plant. Each one has a type (only SECONDARY for now) and the same fields and privacy rules as the main address: a
-- private street also hides the references, and the public map shows only the area.
CREATE TABLE organization_addresses
(
    id                    uuid PRIMARY KEY,
    organization_id       uuid     NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    type                  text     NOT NULL CHECK (type IN ('SECONDARY')),
    province              text     NOT NULL,
    district              text     NOT NULL,
    locality              text     NOT NULL,
    street                text     NOT NULL,
    additional_references text,
    street_visibility     text     NOT NULL CHECK (street_visibility IN ('PUBLIC', 'PRIVATE')),
    location              geometry(Point, 4326),
    position              integer  NOT NULL
);

CREATE INDEX organization_addresses_organization_id_idx ON organization_addresses (organization_id);
CREATE INDEX organization_addresses_province_idx ON organization_addresses (province);
