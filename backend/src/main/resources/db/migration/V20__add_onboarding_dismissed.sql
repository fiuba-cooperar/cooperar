-- Whether the people who manage the organization closed the getting-started card of the panel for good.
ALTER TABLE organizations
    ADD COLUMN onboarding_dismissed boolean NOT NULL DEFAULT false;
