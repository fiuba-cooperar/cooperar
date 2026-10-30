package ar.uba.fi.cooperar.domain.organizations;

import org.locationtech.jts.geom.Point;

/** The optional data of an organization's profile ("ficha"), beyond what the registration asks for. */
public record OrganizationProfile(String description, String phone, String email, Point location) {}
