-- An organization is either a cooperative or an ERT; the combined type is no longer offered.
UPDATE organizations SET type = 'ERT' WHERE type = 'COOPERATIVE_AND_ERT';

ALTER TABLE organizations DROP CONSTRAINT organizations_type_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_type_check CHECK (type IN ('COOPERATIVE', 'ERT'));
