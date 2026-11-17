-- Registration details requested by the SEU: the legal name, the role of the person who registered the organization
-- and what it offers. Nullable because organizations registered before this migration do not have them.
ALTER TABLE organizations
    ADD COLUMN legal_name      text,
    ADD COLUMN registrant_role text;

-- An organization can work in more than one sector, so the single column becomes a collection.
CREATE TABLE organization_sectors (
    organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    sector          text NOT NULL CHECK (sector IN ('FOOD', 'TEXTILE', 'METALWORKING', 'PRINTING', 'SERVICES', 'OTHER')),
    PRIMARY KEY (organization_id, sector)
);

INSERT INTO organization_sectors (organization_id, sector)
SELECT id, sector FROM organizations;

ALTER TABLE organizations DROP COLUMN sector;

CREATE TABLE organization_activity_types (
    organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    activity_type   text NOT NULL CHECK (activity_type IN ('WORK', 'SERVICE', 'PRODUCT')),
    PRIMARY KEY (organization_id, activity_type)
);
