-- The rest of the profile ("ficha") that an organization edits from its panel (#13), and which of the configurable
-- fields it chose to make public (#14). Configurable fields start private: nothing personal is shown until the
-- organization decides to show it.
ALTER TABLE organizations
    ADD COLUMN founding_year       integer CHECK (founding_year BETWEEN 1800 AND 2100),
    ADD COLUMN worker_count        integer CHECK (worker_count > 0),
    ADD COLUMN whatsapp            text,
    ADD COLUMN website             text,
    ADD COLUMN social_media        text,
    ADD COLUMN opening_hours       text,
    ADD COLUMN response_time       text CHECK (response_time IN ('SAME_DAY', 'ONE_DAY', 'TWO_DAYS', 'ONE_WEEK')),
    ADD COLUMN legal_name_public   boolean NOT NULL DEFAULT false,
    ADD COLUMN worker_count_public boolean NOT NULL DEFAULT false,
    ADD COLUMN street_public       boolean NOT NULL DEFAULT false,
    ADD COLUMN phone_public        boolean NOT NULL DEFAULT false,
    ADD COLUMN whatsapp_public     boolean NOT NULL DEFAULT false,
    ADD COLUMN email_public        boolean NOT NULL DEFAULT false;
