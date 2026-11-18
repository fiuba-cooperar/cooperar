package ar.uba.fi.cooperar.domain.organizations;

import java.util.Set;

/**
 * What an organization does. The start year is when it began working as a cooperative: for an ERT, the year its
 * workers recovered it.
 */
public record ProfileActivity(
        Set<Sector> sectors,
        Set<ActivityType> activityTypes,
        String description,
        Integer startYear,
        Integer workerCount,
        Visibility workerCountVisibility) {}
