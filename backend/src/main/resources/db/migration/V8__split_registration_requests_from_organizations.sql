-- A registration request is what an account sends to the observatory to add an organization: the observatory
-- approves it, rejects it or asks for changes, and the account corrects it and sends it again. The organization only
-- exists once the request is approved, so every row in organizations is public.
CREATE TABLE registration_requests (
    id                    uuid PRIMARY KEY,
    name                  text        NOT NULL,
    -- Missing for requests sent before the legal name and the role were asked for.
    legal_name            text,
    type                  text        NOT NULL CHECK (type IN ('COOPERATIVE', 'ERT')),
    cuit                  text        NOT NULL,
    province              text        NOT NULL CHECK (province IN (
        'BUENOS_AIRES', 'CITY_OF_BUENOS_AIRES', 'CATAMARCA', 'CHACO', 'CHUBUT', 'CORDOBA', 'CORRIENTES',
        'ENTRE_RIOS', 'FORMOSA', 'JUJUY', 'LA_PAMPA', 'LA_RIOJA', 'MENDOZA', 'MISIONES', 'NEUQUEN', 'RIO_NEGRO',
        'SALTA', 'SAN_JUAN', 'SAN_LUIS', 'SANTA_CRUZ', 'SANTA_FE', 'SANTIAGO_DEL_ESTERO', 'TIERRA_DEL_FUEGO',
        'TUCUMAN')),
    district              text        NOT NULL,
    locality              text        NOT NULL,
    street                text        NOT NULL,
    additional_references text,
    registrant_role       text,
    registered_by         uuid REFERENCES users (id) ON DELETE SET NULL,
    status                text        NOT NULL
        CHECK (status IN ('PENDING', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED')),
    -- The message of the last decision, while the request is rejected or waiting for changes.
    review_message        text,
    -- The organization created when the request was approved.
    organization_id       uuid UNIQUE REFERENCES organizations (id) ON DELETE SET NULL,
    created_at            timestamptz NOT NULL,
    -- When it last went into the review: on sign-up, and again each time it is corrected. The queue is ordered by it.
    submitted_at          timestamptz NOT NULL,
    CONSTRAINT registration_requests_review_message_check
        CHECK ((status IN ('REJECTED', 'CHANGES_REQUESTED')) = (review_message IS NOT NULL))
);

-- Two open requests cannot claim the same CUIT; a rejected one no longer holds it.
CREATE UNIQUE INDEX registration_requests_open_cuit_key ON registration_requests (cuit)
    WHERE status IN ('PENDING', 'CHANGES_REQUESTED');
CREATE INDEX registration_requests_pending_idx ON registration_requests (submitted_at) WHERE status = 'PENDING';
CREATE INDEX registration_requests_registered_by_idx ON registration_requests (registered_by);

CREATE TABLE registration_request_sectors (
    registration_request_id uuid NOT NULL REFERENCES registration_requests (id) ON DELETE CASCADE,
    sector                  text NOT NULL
        CHECK (sector IN ('FOOD', 'TEXTILE', 'METALWORKING', 'PRINTING', 'SERVICES', 'OTHER')),
    PRIMARY KEY (registration_request_id, sector)
);

CREATE TABLE registration_request_activity_types (
    registration_request_id uuid NOT NULL REFERENCES registration_requests (id) ON DELETE CASCADE,
    activity_type           text NOT NULL CHECK (activity_type IN ('WORK', 'SERVICE', 'PRODUCT')),
    PRIMARY KEY (registration_request_id, activity_type)
);

-- Every decision of the observatory on a request, so one that went through several rounds keeps all of them.
CREATE TABLE registration_reviews (
    id                      uuid PRIMARY KEY,
    registration_request_id uuid        NOT NULL REFERENCES registration_requests (id) ON DELETE CASCADE,
    outcome                 text        NOT NULL CHECK (outcome IN ('APPROVED', 'REJECTED', 'CHANGES_REQUESTED')),
    message                 text,
    reviewed_by             uuid REFERENCES users (id) ON DELETE SET NULL,
    reviewed_at             timestamptz NOT NULL,
    CONSTRAINT registration_reviews_message_check CHECK ((outcome = 'APPROVED') = (message IS NULL))
);

CREATE INDEX registration_reviews_request_idx ON registration_reviews (registration_request_id, reviewed_at);

-- Every existing organization becomes a request with the same id. Approved ones keep their organization; the rest
-- only live on as requests.
INSERT INTO registration_requests (
    id, name, legal_name, type, cuit, province, district, locality, street, additional_references, registrant_role,
    registered_by, status, review_message, organization_id, created_at, submitted_at)
SELECT id, name, legal_name, type, cuit, province, district, locality, street, additional_references,
       registrant_role, registered_by, status, rejection_reason, CASE WHEN status = 'APPROVED' THEN id END,
       created_at, created_at
FROM organizations;

INSERT INTO registration_request_sectors (registration_request_id, sector)
SELECT organization_id, sector FROM organization_sectors;

INSERT INTO registration_request_activity_types (registration_request_id, activity_type)
SELECT organization_id, activity_type FROM organization_activity_types;

-- Organizations approved before the review existed have no reviewer or date: their sign-up stands in for it.
INSERT INTO registration_reviews (id, registration_request_id, outcome, message, reviewed_by, reviewed_at)
SELECT gen_random_uuid(), id, status, rejection_reason, reviewed_by, coalesce(reviewed_at, created_at)
FROM organizations
WHERE status IN ('APPROVED', 'REJECTED');

DELETE FROM organizations WHERE status <> 'APPROVED';

DROP INDEX organizations_pending_idx;
ALTER TABLE organizations
    DROP COLUMN status,
    DROP COLUMN rejection_reason,
    DROP COLUMN reviewed_by,
    DROP COLUMN reviewed_at;
