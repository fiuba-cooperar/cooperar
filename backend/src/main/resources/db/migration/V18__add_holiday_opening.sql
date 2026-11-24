-- Whether the organization attends on public holidays. Optional: missing means it did not say.
ALTER TABLE organizations
    ADD COLUMN holiday_opening text CHECK (holiday_opening IN ('OPEN', 'CLOSED'));
