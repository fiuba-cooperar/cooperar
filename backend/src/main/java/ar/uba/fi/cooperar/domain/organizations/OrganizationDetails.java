package ar.uba.fi.cooperar.domain.organizations;

import java.util.Set;

/**
 * What an organization declares when it registers, or when it corrects its registration at the observatory's request,
 * with the role in it of the person who registers it. The CUIT is as typed: with or without dashes.
 */
public record OrganizationDetails(
        String name,
        String legalName,
        OrganizationType type,
        String cuit,
        Set<Sector> sectors,
        Set<ActivityType> activityTypes,
        Address address,
        String registrantRole) {}
