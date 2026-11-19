package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.ActivityProfile;
import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.ContactProfile;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import java.util.UUID;
import org.locationtech.jts.geom.Point;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The profile of an organization: what anyone sees, and what the accounts that manage it edit, section by section. */
@Service
public class OrganizationProfileService {

    private final OrganizationRepository organizations;

    public OrganizationProfileService(OrganizationRepository organizations) {
        this.organizations = organizations;
    }

    /** Every organization is public: requests still under review are not organizations yet. */
    @Transactional(readOnly = true)
    public Organization getPublicProfile(String slug) {
        return organizations.findBySlug(slug).orElseThrow(OrganizationNotFoundException::new);
    }

    /** Not found also when another account manages it, so its existence does not leak. */
    @Transactional(readOnly = true)
    public Organization getManagedProfile(UUID organizationId, UUID accountId) {
        return managed(organizationId, accountId);
    }

    @Transactional
    public Organization updateIdentification(
            UUID organizationId, UUID accountId, String name, String legalName, boolean legalNamePublic) {
        Organization organization = managed(organizationId, accountId);
        organization.updateIdentification(name, legalName, legalNamePublic);
        return organization;
    }

    @Transactional
    public Organization updateActivity(UUID organizationId, UUID accountId, ActivityProfile activity) {
        Organization organization = managed(organizationId, accountId);
        organization.updateActivity(activity);
        return organization;
    }

    @Transactional
    public Organization updateLocation(
            UUID organizationId, UUID accountId, Address address, boolean streetPublic, Point location) {
        Organization organization = managed(organizationId, accountId);
        organization.updateLocation(address, streetPublic, location);
        return organization;
    }

    @Transactional
    public Organization updateContact(UUID organizationId, UUID accountId, ContactProfile contact) {
        Organization organization = managed(organizationId, accountId);
        organization.updateContact(contact);
        return organization;
    }

    private Organization managed(UUID organizationId, UUID accountId) {
        return organizations.findManagedBy(organizationId, accountId).orElseThrow(OrganizationNotFoundException::new);
    }
}
