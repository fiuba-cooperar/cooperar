package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationPhoto;
import java.util.List;

/** An organization with its photos in display order. */
public record OrganizationWithPhotos(Organization organization, List<OrganizationPhoto> photos) {}
