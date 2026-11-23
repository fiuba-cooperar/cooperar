package ar.uba.fi.cooperar.domain.geography;

import ar.uba.fi.cooperar.domain.organizations.Province;

/** A locality, or a neighborhood in the City of Buenos Aires, inside its district. */
public record Locality(String id, Province province, String districtId, String name) {}
