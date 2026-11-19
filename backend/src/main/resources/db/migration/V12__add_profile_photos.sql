-- The photos of the profile (#13), all of them public: a logo, a cover photo and a gallery. The images live in the
-- image storage (disk or Cloudinary); here is how the storage knows each one, to delete it, and the address anyone
-- opens it at.
ALTER TABLE organizations
    ADD COLUMN logo_storage_ref  text,
    ADD COLUMN logo_url          text,
    ADD COLUMN cover_storage_ref text,
    ADD COLUMN cover_url         text,
    ADD CONSTRAINT organizations_logo_complete CHECK ((logo_storage_ref IS NULL) = (logo_url IS NULL)),
    ADD CONSTRAINT organizations_cover_complete CHECK ((cover_storage_ref IS NULL) = (cover_url IS NULL));

CREATE TABLE organization_photos
(
    id              uuid PRIMARY KEY,
    organization_id uuid        NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    storage_ref     text        NOT NULL,
    url             text        NOT NULL,
    position        integer     NOT NULL,
    created_at      timestamptz NOT NULL
);

CREATE INDEX organization_photos_organization_id_idx ON organization_photos (organization_id);
