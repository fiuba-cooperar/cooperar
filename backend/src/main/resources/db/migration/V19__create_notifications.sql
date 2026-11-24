-- What the platform tells an account inside its panel: today the outcome of the review of its registration requests.
-- `subject`, `message` and the two references are what the front needs to word the notification and to link to what
-- it is about; the wording itself lives in the front, per type.
CREATE TABLE notifications
(
    id                      uuid PRIMARY KEY,
    account_id              uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type                    text        NOT NULL CHECK (type IN
                                                        ('REGISTRATION_APPROVED', 'REGISTRATION_REJECTED',
                                                         'REGISTRATION_CHANGES_REQUESTED')),
    subject                 text        NOT NULL,
    message                 text,
    registration_request_id uuid REFERENCES registration_requests (id) ON DELETE CASCADE,
    organization_id         uuid REFERENCES organizations (id) ON DELETE SET NULL,
    created_at              timestamptz NOT NULL,
    read_at                 timestamptz
);

CREATE INDEX notifications_account_created_idx ON notifications (account_id, created_at DESC);
CREATE INDEX notifications_unread_idx ON notifications (account_id) WHERE read_at IS NULL;

-- The decisions already made become the history of the account, read: nobody is told again about old news.
INSERT INTO notifications (id, account_id, type, subject, message, registration_request_id, organization_id,
                           created_at, read_at)
SELECT gen_random_uuid(),
       rr.registered_by,
       CASE rv.outcome
           WHEN 'APPROVED' THEN 'REGISTRATION_APPROVED'
           WHEN 'REJECTED' THEN 'REGISTRATION_REJECTED'
           ELSE 'REGISTRATION_CHANGES_REQUESTED'
           END,
       rr.name,
       rv.message,
       rr.id,
       CASE WHEN rv.outcome = 'APPROVED' THEN rr.organization_id END,
       rv.reviewed_at,
       rv.reviewed_at
FROM registration_reviews rv
         JOIN registration_requests rr ON rr.id = rv.registration_request_id
WHERE rr.registered_by IS NOT NULL;
