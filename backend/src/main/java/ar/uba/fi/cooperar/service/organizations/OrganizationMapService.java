package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.OrganizationAddress;
import ar.uba.fi.cooperar.domain.organizations.OrganizationSearchCriteria;
import ar.uba.fi.cooperar.domain.organizations.Visibility;
import ar.uba.fi.cooperar.repository.organizations.LocatedAddress;
import ar.uba.fi.cooperar.repository.organizations.OrganizationMapRepository;
import ar.uba.fi.cooperar.repository.organizations.OrganizationSearchHit;
import ar.uba.fi.cooperar.repository.organizations.OrganizationSearchRepository;
import ar.uba.fi.cooperar.service.organizations.OrganizationOnMap.Place;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

/**
 * The organizations on the public map (#17), each with all its located addresses. All of them come in one answer,
 * filtered in memory as the directory does, since the sector is a few thousand organizations: the visitor's browser then
 * finds the nearest ones on its own, so where the visitor is never reaches the server (privacy rule 5).
 */
@Service
public class OrganizationMapService {

    private final OrganizationMapRepository addresses;
    private final OrganizationSearchRepository search;

    public OrganizationMapService(OrganizationMapRepository addresses, OrganizationSearchRepository search) {
        this.addresses = addresses;
        this.search = search;
    }

    /**
     * The organizations that match and have at least one located address, by name. The words match as in the
     * directory, and the province matches any of the located addresses. Unlike the directory, nothing is logged: the
     * map shows a search the directory already logged, or no search at all.
     */
    public List<OrganizationOnMap> locate(OrganizationSearchCriteria criteria) {
        String tsQuery = OrganizationSearchService.toTsQuery(criteria.query());
        Set<UUID> matching = tsQuery == null
                ? null
                : search.match(tsQuery, null, true).stream()
                        .map(OrganizationSearchHit::id)
                        .collect(Collectors.toSet());
        return located().values().stream()
                .filter(located ->
                        matching == null || matching.contains(located.getFirst().organizationId()))
                .filter(located -> matches(located, criteria))
                .map(OrganizationMapService::onTheMap)
                .toList();
    }

    /** Every located address, grouped by organization in the order of the query. */
    private LinkedHashMap<UUID, List<LocatedAddress>> located() {
        LinkedHashMap<UUID, List<LocatedAddress>> byOrganization = new LinkedHashMap<>();
        for (LocatedAddress address : addresses.findLocated()) {
            byOrganization
                    .computeIfAbsent(address.organizationId(), id -> new ArrayList<>())
                    .add(address);
        }
        return byOrganization;
    }

    private static OrganizationOnMap onTheMap(List<LocatedAddress> located) {
        LocatedAddress organization = located.getFirst();
        return new OrganizationOnMap(
                organization.slug(),
                organization.name(),
                organization.type(),
                organization.sectors(),
                organization.logoUrl(),
                located.stream().map(OrganizationMapService::place).toList());
    }

    private static Place place(LocatedAddress address) {
        return new Place(
                address.addressType(),
                address.addressName(),
                address.province(),
                address.district(),
                address.locality(),
                address.streetVisibility().reveal(address.street()),
                OrganizationAddress.publicPoint(address.location(), address.streetVisibility()),
                address.streetVisibility() == Visibility.PRIVATE);
    }

    private static boolean matches(List<LocatedAddress> located, OrganizationSearchCriteria criteria) {
        LocatedAddress organization = located.getFirst();
        return (criteria.types().isEmpty() || criteria.types().contains(organization.type()))
                && (criteria.sectors().isEmpty() || !Collections.disjoint(criteria.sectors(), organization.sectors()))
                && (criteria.activityTypes().isEmpty()
                        || !Collections.disjoint(criteria.activityTypes(), organization.activityTypes()))
                && (criteria.province() == null
                        || located.stream().anyMatch(address -> address.province() == criteria.province()));
    }
}
