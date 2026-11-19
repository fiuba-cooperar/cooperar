package ar.uba.fi.cooperar.domain.organizations;

import java.util.Set;

/** What the organization does, as it shows in its profile. The worker count is public only if it chooses so. */
public record ActivityProfile(
        Set<Sector> sectors,
        Set<ActivityType> activityTypes,
        String description,
        Integer foundingYear,
        Integer workerCount,
        boolean workerCountPublic) {}
