-- The rest of the profile, which the organization fills in after it is approved (#13), and the visibility of the
-- fields the organization may show or hide (#14). Fields without a visibility column are always public, or always
-- private (the CUIT); that is decided in the backend, never by the client.
ALTER TABLE organizations
    ADD COLUMN legal_name_visibility   text NOT NULL DEFAULT 'PRIVATE'
        CHECK (legal_name_visibility IN ('PUBLIC', 'PRIVATE')),
    -- When it began working as a cooperative: for an ERT, the year its workers recovered it.
    ADD COLUMN start_year              integer CHECK (start_year >= 1800),
    ADD COLUMN worker_count            integer CHECK (worker_count > 0),
    ADD COLUMN worker_count_visibility text NOT NULL DEFAULT 'PUBLIC'
        CHECK (worker_count_visibility IN ('PUBLIC', 'PRIVATE')),
    -- A private street also hides the additional references, and the public map shows only the area.
    ADD COLUMN street_visibility       text NOT NULL DEFAULT 'PUBLIC'
        CHECK (street_visibility IN ('PUBLIC', 'PRIVATE')),
    ADD COLUMN phone_visibility        text NOT NULL DEFAULT 'PUBLIC'
        CHECK (phone_visibility IN ('PUBLIC', 'PRIVATE')),
    ADD COLUMN whatsapp                text,
    ADD COLUMN whatsapp_visibility     text NOT NULL DEFAULT 'PUBLIC'
        CHECK (whatsapp_visibility IN ('PUBLIC', 'PRIVATE')),
    ADD COLUMN email_visibility        text NOT NULL DEFAULT 'PUBLIC'
        CHECK (email_visibility IN ('PUBLIC', 'PRIVATE')),
    ADD COLUMN website                 text,
    ADD COLUMN social_media            text,
    ADD COLUMN opening_hours           text,
    ADD COLUMN response_time           text
        CHECK (response_time IN ('SAME_DAY', 'ONE_DAY', 'TWO_DAYS', 'ONE_WEEK'));
