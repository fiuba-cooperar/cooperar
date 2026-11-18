package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.ProfileActivity;
import ar.uba.fi.cooperar.domain.organizations.ProfileContact;
import ar.uba.fi.cooperar.domain.organizations.ProfileIdentification;
import ar.uba.fi.cooperar.domain.organizations.Visibility;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import java.time.Clock;
import java.time.Year;
import java.util.UUID;
import org.locationtech.jts.geom.Point;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The profile ("ficha") of an organization: its public view, and the editing by the accounts that manage it. Each
 * section is saved on its own, as the panel does.
 */
@Service
public class OrganizationProfileService {

    private final OrganizationRepository organizations;
    private final Geocoder geocoder;
    private final Clock clock;

    public OrganizationProfileService(OrganizationRepository organizations, Geocoder geocoder, Clock clock) {
        this.organizations = organizations;
        this.geocoder = geocoder;
        this.clock = clock;
    }

    /** Every organization is public: requests still under review are not organizations yet. */
    @Transactional(readOnly = true)
    public Organization getPublicProfile(String slug) {
        return organizations.findBySlug(slug).orElseThrow(OrganizationNotFoundException::new);
    }

    /** Not found also when the organization exists but the account does not manage it, so that is not revealed. */
    @Transactional(readOnly = true)
    public Organization getManaged(UUID organizationId, UUID accountId) {
        return managed(organizationId, accountId);
    }

    @Transactional
    public Organization updateIdentification(
            UUID organizationId, UUID accountId, ProfileIdentification identification) {
        Organization organization = managed(organizationId, accountId);
        organization.updateIdentification(identification);
        return organization;
    }

    @Transactional
    public Organization updateActivity(UUID organizationId, UUID accountId, ProfileActivity activity) {
        Organization organization = managed(organizationId, accountId);
        organization.updateActivity(activity, Year.now(clock).getValue());
        return organization;
    }

    /**
     * {@code point} is where the organization placed the pin. Without it, a new address (or one never located) is
     * geocoded, and an unchanged one keeps its point.
     */
    @Transactional
    public Organization updateLocation(
            UUID organizationId, UUID accountId, Address address, Visibility streetVisibility, Point point) {
        Organization organization = managed(organizationId, accountId);
        Point location = point;
        if (location == null) {
            boolean unchanged = address.equals(organization.getAddress()) && organization.getLocation() != null;
            location = unchanged
                    ? organization.getLocation()
                    : geocoder.locate(address).orElse(null);
        }
        organization.updateLocation(address, streetVisibility, location);
        return organization;
    }

    @Transactional
    public Organization updateContact(UUID organizationId, UUID accountId, ProfileContact contact) {
        Organization organization = managed(organizationId, accountId);
        organization.updateContact(contact);
        return organization;
    }

    private Organization managed(UUID organizationId, UUID accountId) {
        return organizations.findManagedBy(organizationId, accountId).orElseThrow(OrganizationNotFoundException::new);
    }
}
