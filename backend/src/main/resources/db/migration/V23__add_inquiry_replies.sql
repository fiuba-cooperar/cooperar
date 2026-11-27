-- The answers an organization sends from the panel to whoever made an inquiry. They go out by email, so only inquiries
-- with an email have them. The author's name is kept as it was when answering, so the history stays readable if the
-- account is deleted or renamed.
CREATE TABLE inquiry_replies
(
    id          uuid PRIMARY KEY,
    inquiry_id  uuid        NOT NULL REFERENCES inquiries (id) ON DELETE CASCADE,
    author_id   uuid REFERENCES users (id) ON DELETE SET NULL,
    author_name text,
    message     text        NOT NULL,
    sent_at     timestamptz NOT NULL
);

CREATE INDEX inquiry_replies_inquiry_idx ON inquiry_replies (inquiry_id, sent_at);

-- The inbox counts the inquiries of each status.
CREATE INDEX inquiries_organization_status_idx ON inquiries (organization_id, status);

-- Every account that manages the organization is told about a new inquiry in its panel too.
ALTER TABLE notifications
    ADD COLUMN inquiry_id uuid REFERENCES inquiries (id) ON DELETE CASCADE;

ALTER TABLE notifications
    DROP CONSTRAINT notifications_type_check;

ALTER TABLE notifications
    ADD CONSTRAINT notifications_type_check CHECK (type IN
                                                   ('REGISTRATION_APPROVED', 'REGISTRATION_REJECTED',
                                                    'REGISTRATION_CHANGES_REQUESTED', 'INQUIRY_RECEIVED'));
