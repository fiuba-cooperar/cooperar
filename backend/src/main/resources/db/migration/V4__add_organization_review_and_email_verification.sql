-- Accounts confirm their email before their organizations reach the observatory. Existing accounts predate the
-- check, so they count as confirmed.
ALTER TABLE users ADD COLUMN email_verified_at timestamptz;
UPDATE users SET email_verified_at = created_at;

-- Only the SHA-256 of each token is stored, as with refresh tokens.
CREATE TABLE email_verification_tokens (
    id         uuid PRIMARY KEY,
    user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash text        NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX email_verification_tokens_user_id_idx ON email_verification_tokens (user_id);

-- New organizations wait for the observatory's approval. Existing ones were published on sign-up, so they count as
-- approved, and whoever manages them is taken as the account that registered them.
ALTER TABLE organizations
    ADD COLUMN status           text NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    ADD COLUMN registered_by    uuid REFERENCES users (id) ON DELETE SET NULL,
    ADD COLUMN rejection_reason text,
    ADD COLUMN reviewed_by      uuid REFERENCES users (id) ON DELETE SET NULL,
    ADD COLUMN reviewed_at      timestamptz,
    ADD CONSTRAINT organizations_rejection_reason_check CHECK ((status = 'REJECTED') = (rejection_reason IS NOT NULL));

ALTER TABLE organizations ALTER COLUMN status DROP DEFAULT;

UPDATE organizations o
SET registered_by = (SELECT uo.user_id FROM user_organizations uo WHERE uo.organization_id = o.id LIMIT 1);

-- The review queue lists pending organizations by registration date.
CREATE INDEX organizations_pending_idx ON organizations (created_at) WHERE status = 'PENDING';
