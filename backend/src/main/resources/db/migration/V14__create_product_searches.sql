-- Every search of the public catalog, with or without results: the input to detect unmet demand (#47). Nothing
-- identifies the visitor (privacy rule 5): no IP, no user agent, no location.
CREATE TABLE product_searches
(
    id           uuid PRIMARY KEY,
    query        text,
    category_id  uuid,
    sale_modes   text[]      NOT NULL,
    province     text,
    result_count integer     NOT NULL CHECK (result_count >= 0),
    searched_at  timestamptz NOT NULL
);

CREATE INDEX product_searches_searched_at_idx ON product_searches (searched_at);
