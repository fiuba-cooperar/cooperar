CREATE TABLE cooperatives (
    id         uuid PRIMARY KEY,
    name       text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id            uuid PRIMARY KEY,
    email         text        NOT NULL,
    password_hash text        NOT NULL,
    role          text        NOT NULL CHECK (role IN ('ADMIN', 'COOPERATIVE')),
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- Emails are stored lower-cased by the application; this index also guards against case variants.
CREATE UNIQUE INDEX users_email_key ON users (lower(email));

CREATE TABLE user_cooperatives (
    user_id        uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    cooperative_id uuid NOT NULL REFERENCES cooperatives (id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, cooperative_id)
);

-- Only the SHA-256 of each opaque refresh token is stored, so a database leak does not expose live sessions.
CREATE TABLE refresh_tokens (
    id         uuid PRIMARY KEY,
    user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash text        NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens (user_id);
