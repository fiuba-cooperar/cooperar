-- A short name for each address, so the organization and its visitors can tell them apart ("sucursal", "depósito").
-- Optional and always public.
ALTER TABLE organizations
    ADD COLUMN address_name text CHECK (char_length(address_name) <= 50);

ALTER TABLE organization_addresses
    ADD COLUMN name text CHECK (char_length(name) <= 50);
