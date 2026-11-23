package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.OrganizationAddress;
import ar.uba.fi.cooperar.domain.organizations.OrganizationSearchCriteria;
import ar.uba.fi.cooperar.domain.organizations.Visibility;
import ar.uba.fi.cooperar.repository.organizations.LocatedOrganization;
import ar.uba.fi.cooperar.repository.organizations.OrganizationMapRepository;
import java.util.Collections;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * The organizations on the public map (#17). All of them come in one answer, filtered in memory as the directory does,
 * since the sector is a few thousand organizations: the visitor's browser then finds the nearest ones on its own, so
 * where the visitor is never reaches the server (privacy rule 5).
 */
@Service
public class OrganizationMapService {

    private final OrganizationMapRepository organizations;

    public OrganizationMapService(OrganizationMapRepository organizations) {
        this.organizations = organizations;
    }

    /** The located organizations that match, by name; the query of the criteria is not used. */
    public List<OrganizationMapPoint> locate(OrganizationSearchCriteria criteria) {
        return organizations.findLocated().stream()
                .filter(organization -> matches(organization, criteria))
                .map(OrganizationMapService::onTheMap)
                .toList();
    }

    private static OrganizationMapPoint onTheMap(LocatedOrganization organization) {
        return new OrganizationMapPoint(
                organization.slug(),
                organization.name(),
                organization.type(),
                organization.sectors(),
                organization.province(),
                organization.district(),
                organization.locality(),
                organization.logoUrl(),
                OrganizationAddress.publicPoint(organization.location(), organization.streetVisibility()),
                organization.streetVisibility() == Visibility.PRIVATE);
    }

    private static boolean matches(LocatedOrganization organization, OrganizationSearchCriteria criteria) {
        return (criteria.types().isEmpty() || criteria.types().contains(organization.type()))
                && (criteria.sectors().isEmpty() || !Collections.disjoint(criteria.sectors(), organization.sectors()))
                && (criteria.activityTypes().isEmpty()
                        || !Collections.disjoint(criteria.activityTypes(), organization.activityTypes()))
                && (criteria.province() == null || criteria.province() == organization.province());
    }
}
