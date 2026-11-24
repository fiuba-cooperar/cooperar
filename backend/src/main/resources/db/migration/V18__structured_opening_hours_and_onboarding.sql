-- Opening hours as one row per range instead of a free text, so a day can have several (a split shift) and the
-- profile can say when the organization is open. Public holidays are one more day, with their own ranges. The text they
-- replace cannot be read back reliably, so it is dropped.
CREATE TABLE organization_opening_hours
(
    organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    day_of_week     text NOT NULL CHECK (day_of_week IN
                                         ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY',
                                          'HOLIDAY')),
    opens_at        time NOT NULL,
    closes_at       time NOT NULL,
    CHECK (opens_at < closes_at),
    PRIMARY KEY (organization_id, day_of_week, opens_at)
);

ALTER TABLE organizations
    DROP COLUMN opening_hours;

-- Whether the people who manage the organization closed the getting-started card of the panel for good.
ALTER TABLE organizations
    ADD COLUMN onboarding_dismissed boolean NOT NULL DEFAULT false;
