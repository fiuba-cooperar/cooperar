-- Questions and quote requests that visitors send about a product, without an account. The email and the phone are
-- personal data the recipient organization needs to answer, so they are only ever shown to that organization; at least
-- one of them is needed.
-- The product name is kept because the product can be deleted later and the inquiry must stay readable.
CREATE TABLE inquiries
(
    id              uuid PRIMARY KEY,
    organization_id uuid        NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    product_id      uuid REFERENCES products (id) ON DELETE SET NULL,
    product_name    text        NOT NULL,
    sender_name     text        NOT NULL,
    sender_email    text,
    sender_phone    text,
    quantity        integer CHECK (quantity > 0),
    message         text        NOT NULL,
    status          text        NOT NULL CHECK (status IN ('NEW', 'RESPONDED', 'CLOSED')),
    created_at      timestamptz NOT NULL,
    CHECK (sender_email IS NOT NULL OR sender_phone IS NOT NULL)
);

CREATE INDEX inquiries_organization_created_idx ON inquiries (organization_id, created_at DESC);
