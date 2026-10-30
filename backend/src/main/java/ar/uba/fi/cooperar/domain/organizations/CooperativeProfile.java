package ar.uba.fi.cooperar.domain.organizations;

import org.locationtech.jts.geom.Point;

/** The editable data of a cooperative's profile ("ficha"). Every field is optional. */
public record CooperativeProfile(
        Industry industry,
        String description,
        String locality,
        String province,
        String address,
        String phone,
        String email,
        Point location) {}
