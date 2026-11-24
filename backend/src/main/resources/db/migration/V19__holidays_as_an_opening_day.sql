-- Public holidays are one more day of the opening hours, with their own ranges, instead of an open/closed flag.
ALTER TABLE organizations
    DROP COLUMN holiday_opening;

ALTER TABLE organization_opening_hours
    DROP CONSTRAINT organization_opening_hours_day_of_week_check;
ALTER TABLE organization_opening_hours
    ADD CONSTRAINT organization_opening_hours_day_of_week_check CHECK (day_of_week IN
        ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY', 'HOLIDAY'));
