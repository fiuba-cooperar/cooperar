-- Every address of an organization lives in organization_addresses (#101): the main one, which comes from the
-- registration, becomes a row of type MAIN at position 0, and the other ones move one position down. Each one keeps its
-- name, its street visibility and its point.
ALTER TABLE organization_addresses DROP CONSTRAINT organization_addresses_type_check;
ALTER TABLE organization_addresses ADD CONSTRAINT organization_addresses_type_check
    CHECK (type IN ('MAIN', 'SECONDARY'));

UPDATE organization_addresses SET position = position + 1;

INSERT INTO organization_addresses (id, organization_id, type, name, province, district, locality, street,
                                    additional_references, street_visibility, location, position)
SELECT gen_random_uuid(), o.id, 'MAIN', o.address_name, o.province, o.district, o.locality, o.street,
       o.additional_references, o.street_visibility, o.location, 0
FROM organizations o;

CREATE UNIQUE INDEX organization_addresses_one_main_idx ON organization_addresses (organization_id)
    WHERE type = 'MAIN';

-- The search index can only use columns of its own table, so the main address's locality and district join the
-- keywords, where the places of the other addresses already are (see SearchKeywords). They keep weight B.
UPDATE organizations SET search_keywords = concat_ws(' ', search_keywords, locality, district);

DROP INDEX organizations_search_vector_idx;
ALTER TABLE organizations DROP COLUMN search_vector;
ALTER TABLE organizations
    ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('spanish_unaccent', name), 'A')
            || setweight(to_tsvector('spanish_unaccent', search_keywords), 'B')
            || setweight(to_tsvector('spanish_unaccent', coalesce(description, '')), 'C')
        ) STORED;
CREATE INDEX organizations_search_vector_idx ON organizations USING gin (search_vector);

ALTER TABLE organizations
    DROP COLUMN province,
    DROP COLUMN district,
    DROP COLUMN locality,
    DROP COLUMN street,
    DROP COLUMN additional_references,
    DROP COLUMN address_name,
    DROP COLUMN street_visibility,
    DROP COLUMN location;
