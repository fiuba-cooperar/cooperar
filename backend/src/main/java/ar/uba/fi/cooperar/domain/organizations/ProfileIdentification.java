package ar.uba.fi.cooperar.domain.organizations;

/** The names of an organization. The type and the CUIT were validated by the observatory and are not edited here. */
public record ProfileIdentification(String name, String legalName, Visibility legalNameVisibility) {}
