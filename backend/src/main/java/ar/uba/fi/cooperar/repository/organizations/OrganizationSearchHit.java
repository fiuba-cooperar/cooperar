package ar.uba.fi.cooperar.repository.organizations;

import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import java.util.Set;
import java.util.UUID;

/** An organization that matches the text and the province, with what the other filters and the order need. */
public record OrganizationSearchHit(
        UUID id,
        String name,
        OrganizationType type,
        Set<Sector> sectors,
        Set<ActivityType> activityTypes,
        double rank) {}
