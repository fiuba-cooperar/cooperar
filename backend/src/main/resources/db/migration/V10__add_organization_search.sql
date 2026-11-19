-- Public search of organizations (#15): Spanish full-text with stemming that ignores accents, so "panaderia" finds
-- "Panadería". unaccent runs before the Spanish stemmer, and since a text search configuration is immutable it can be
-- used in a generated column.
CREATE TEXT SEARCH CONFIGURATION spanish_unaccent (COPY = spanish);
ALTER TEXT SEARCH CONFIGURATION spanish_unaccent
    ALTER MAPPING FOR hword, hword_part, word WITH unaccent, spanish_stem;

-- Words in Spanish for what is stored as codes (type, sectors, activity types and province), so they can be searched
-- by name. The application keeps it up to date; the backfill below uses the same words.
ALTER TABLE organizations ADD COLUMN search_keywords text NOT NULL DEFAULT '';

UPDATE organizations o
SET search_keywords = concat_ws(' ',
        CASE o.type WHEN 'ERT' THEN 'empresa recuperada ERT' ELSE 'cooperativa de trabajo' END,
        (SELECT string_agg(CASE s.sector
                               WHEN 'FOOD' THEN 'alimentos'
                               WHEN 'TEXTILE' THEN 'textil'
                               WHEN 'METALWORKING' THEN 'metalúrgica'
                               WHEN 'PRINTING' THEN 'gráfica'
                               WHEN 'SERVICES' THEN 'servicios'
                               ELSE '' END, ' ')
         FROM organization_sectors s WHERE s.organization_id = o.id),
        (SELECT string_agg(CASE a.activity_type
                               WHEN 'WORK' THEN 'trabajo'
                               WHEN 'SERVICE' THEN 'servicio'
                               WHEN 'PRODUCT' THEN 'producto'
                               END, ' ')
         FROM organization_activity_types a WHERE a.organization_id = o.id),
        CASE o.province
            WHEN 'BUENOS_AIRES' THEN 'Buenos Aires'
            WHEN 'CITY_OF_BUENOS_AIRES' THEN 'Ciudad Autónoma de Buenos Aires CABA'
            WHEN 'CATAMARCA' THEN 'Catamarca'
            WHEN 'CHACO' THEN 'Chaco'
            WHEN 'CHUBUT' THEN 'Chubut'
            WHEN 'CORDOBA' THEN 'Córdoba'
            WHEN 'CORRIENTES' THEN 'Corrientes'
            WHEN 'ENTRE_RIOS' THEN 'Entre Ríos'
            WHEN 'FORMOSA' THEN 'Formosa'
            WHEN 'JUJUY' THEN 'Jujuy'
            WHEN 'LA_PAMPA' THEN 'La Pampa'
            WHEN 'LA_RIOJA' THEN 'La Rioja'
            WHEN 'MENDOZA' THEN 'Mendoza'
            WHEN 'MISIONES' THEN 'Misiones'
            WHEN 'NEUQUEN' THEN 'Neuquén'
            WHEN 'RIO_NEGRO' THEN 'Río Negro'
            WHEN 'SALTA' THEN 'Salta'
            WHEN 'SAN_JUAN' THEN 'San Juan'
            WHEN 'SAN_LUIS' THEN 'San Luis'
            WHEN 'SANTA_CRUZ' THEN 'Santa Cruz'
            WHEN 'SANTA_FE' THEN 'Santa Fe'
            WHEN 'SANTIAGO_DEL_ESTERO' THEN 'Santiago del Estero'
            WHEN 'TIERRA_DEL_FUEGO' THEN 'Tierra del Fuego'
            WHEN 'TUCUMAN' THEN 'Tucumán'
            END);

-- Only public fields go in: the name weighs the most, then what it does and where, then its description.
ALTER TABLE organizations
    ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('spanish_unaccent', name), 'A')
            || setweight(to_tsvector('spanish_unaccent', search_keywords || ' ' || locality || ' ' || district), 'B')
            || setweight(to_tsvector('spanish_unaccent', coalesce(description, '')), 'C')
        ) STORED;

CREATE INDEX organizations_search_vector_idx ON organizations USING gin (search_vector);

-- Every search of the public directory, with or without results: the input to detect unmet demand (#47). Nothing
-- identifies the visitor (privacy rule 5): no IP, no user agent, no location.
CREATE TABLE organization_searches
(
    id             uuid PRIMARY KEY,
    query          text,
    types          text[]      NOT NULL,
    sectors        text[]      NOT NULL,
    activity_types text[]      NOT NULL,
    province       text,
    result_count   integer     NOT NULL CHECK (result_count >= 0),
    searched_at    timestamptz NOT NULL
);

CREATE INDEX organization_searches_searched_at_idx ON organization_searches (searched_at);
