-- The files live in the image storage, under the photo's id; this table only keeps their order and type.
CREATE TABLE organization_photos
(
    id              uuid PRIMARY KEY,
    organization_id uuid        NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    sort_order      integer     NOT NULL,
    content_type    text        NOT NULL,
    created_at      timestamptz NOT NULL
);

CREATE INDEX organization_photos_organization_idx ON organization_photos (organization_id, sort_order);
