-- A new sector in the closed list the observatory keeps: pharmaceutical.
ALTER TABLE organization_sectors
    DROP CONSTRAINT organization_sectors_sector_check,
    ADD CONSTRAINT organization_sectors_sector_check
        CHECK (sector IN ('FOOD', 'TEXTILE', 'METALWORKING', 'PRINTING', 'SERVICES', 'PHARMACEUTICAL', 'OTHER'));

ALTER TABLE registration_request_sectors
    DROP CONSTRAINT registration_request_sectors_sector_check,
    ADD CONSTRAINT registration_request_sectors_sector_check
        CHECK (sector IN ('FOOD', 'TEXTILE', 'METALWORKING', 'PRINTING', 'SERVICES', 'PHARMACEUTICAL', 'OTHER'));
