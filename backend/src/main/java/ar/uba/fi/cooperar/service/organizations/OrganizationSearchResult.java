package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import java.util.List;
import java.util.Map;

/**
 * One page of what the public directory found, with how many organizations there are in total and how many each filter
 * value would leave: those counts apply every criterion except the one of their own filter, so choosing another value
 * of it adds to the results instead of emptying them.
 */
public record OrganizationSearchResult(
        List<Organization> items,
        int total,
        int page,
        int size,
        Map<OrganizationType, Integer> typeCounts,
        Map<Sector, Integer> sectorCounts,
        Map<ActivityType, Integer> activityTypeCounts) {}
