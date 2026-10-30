package ar.uba.fi.cooperar.service.user;

import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Sector;

public record NewOrganization(String name, OrganizationType type, String cuit, Sector sector, Address address) {}
