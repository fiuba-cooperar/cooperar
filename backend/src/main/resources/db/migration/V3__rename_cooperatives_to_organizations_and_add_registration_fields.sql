-- Nullable because the initial admin is created from environment variables, without a name.
ALTER TABLE users
    ADD COLUMN first_name text,
    ADD COLUMN last_name  text;

-- The table holds ERTs that are not cooperatives too, so it takes the general name.
ALTER TABLE cooperatives RENAME TO organizations;
ALTER TABLE organizations RENAME CONSTRAINT cooperatives_pkey TO organizations_pkey;
ALTER TABLE user_cooperatives RENAME TO user_organizations;
ALTER TABLE user_organizations RENAME COLUMN cooperative_id TO organization_id;
ALTER TABLE user_organizations RENAME CONSTRAINT user_cooperatives_pkey TO user_organizations_pkey;
ALTER TABLE user_organizations RENAME CONSTRAINT user_cooperatives_user_id_fkey TO user_organizations_user_id_fkey;
ALTER TABLE user_organizations
    RENAME CONSTRAINT user_cooperatives_cooperative_id_fkey TO user_organizations_organization_id_fkey;

-- The CUIT is stored as its 11 digits, without dashes. The remaining profile fields arrive with #3 and #14.
ALTER TABLE organizations
    ADD COLUMN type     text NOT NULL CHECK (type IN ('COOPERATIVE', 'ERT', 'COOPERATIVE_AND_ERT')),
    ADD COLUMN cuit     text NOT NULL,
    ADD COLUMN sector   text NOT NULL CHECK (sector IN ('FOOD', 'TEXTILE', 'METALWORKING', 'PRINTING', 'SERVICES', 'OTHER')),
    ADD COLUMN province text NOT NULL CHECK (province IN (
        'BUENOS_AIRES', 'CITY_OF_BUENOS_AIRES', 'CATAMARCA', 'CHACO', 'CHUBUT', 'CORDOBA', 'CORRIENTES',
        'ENTRE_RIOS', 'FORMOSA', 'JUJUY', 'LA_PAMPA', 'LA_RIOJA', 'MENDOZA', 'MISIONES', 'NEUQUEN', 'RIO_NEGRO',
        'SALTA', 'SAN_JUAN', 'SAN_LUIS', 'SANTA_CRUZ', 'SANTA_FE', 'SANTIAGO_DEL_ESTERO', 'TIERRA_DEL_FUEGO',
        'TUCUMAN')),
    -- Typed by hand for now; geocoding and a location column arrive with #13.
    ADD COLUMN district              text NOT NULL,
    ADD COLUMN locality              text NOT NULL,
    ADD COLUMN street                text NOT NULL,
    ADD COLUMN additional_references text;

CREATE UNIQUE INDEX organizations_cuit_key ON organizations (cuit);
