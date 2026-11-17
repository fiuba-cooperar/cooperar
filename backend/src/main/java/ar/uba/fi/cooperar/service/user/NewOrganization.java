package ar.uba.fi.cooperar.service.user;

import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import java.util.Set;

/** The organization of a sign-up, with the role in it of the person who is registering it. */
public record NewOrganization(
        String name,
        String legalName,
        OrganizationType type,
        String cuit,
        Set<Sector> sectors,
        Set<ActivityType> activityTypes,
        Address address,
        String registrantRole) {}
