package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.AddressDetails;
import ar.uba.fi.cooperar.domain.organizations.AddressType;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationAddress;
import ar.uba.fi.cooperar.domain.organizations.ProfileActivity;
import ar.uba.fi.cooperar.domain.organizations.ProfileContact;
import ar.uba.fi.cooperar.domain.organizations.ProfileIdentification;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import java.time.Clock;
import java.time.Year;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
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
     * Saves every address, the main one included; each {@code location} is where the organization placed the pin.
     * Without it, a new address (or one never located) is geocoded, and an unchanged one keeps its point. The main
     * address is compared with the main one the organization has, and the others with the one their id names.
     */
    @Transactional
    public Organization updateLocation(UUID organizationId, UUID accountId, List<AddressDetails> addresses) {
        Organization organization = managed(organizationId, accountId);
        Map<UUID, OrganizationAddress> others = organization.getOtherAddresses().stream()
                .collect(Collectors.toMap(OrganizationAddress::getId, Function.identity()));
        organization.replaceAddresses(addresses.stream()
                .map(details -> {
                    OrganizationAddress previous = details.type() == AddressType.MAIN
                            ? organization.getMainAddress()
                            : details.id() == null ? null : others.get(details.id());
                    Point located = locate(
                            details.address(),
                            details.location(),
                            previous == null ? null : previous.getAddress(),
                            previous == null ? null : previous.getLocation());
                    return new AddressDetails(
                            details.id(),
                            details.type(),
                            details.name(),
                            details.address(),
                            details.streetVisibility(),
                            located);
                })
                .toList());
        return organization;
    }

    /** The pin the organization placed; else the point it had, if the address did not change; else geocoded. */
    private Point locate(Address address, Point pin, Address previousAddress, Point previousPoint) {
        if (pin != null) {
            return pin;
        }
        if (address.equals(previousAddress) && previousPoint != null) {
            return previousPoint;
        }
        return geocoder.locate(address).orElse(null);
    }

    /**
     * Where the address would go on the map, without saving anything, so the organization can check the pin before
     * saving. Empty when it cannot be found. Not transactional: no connection is held while the geocoder answers.
     */
    public Optional<Point> locateAddress(UUID organizationId, UUID accountId, Address address) {
        managed(organizationId, accountId);
        return geocoder.locate(address);
    }

    @Transactional
    public Organization updateContact(UUID organizationId, UUID accountId, ProfileContact contact) {
        Organization organization = managed(organizationId, accountId);
        organization.updateContact(contact);
        return organization;
    }

    @Transactional
    public Organization dismissOnboarding(UUID organizationId, UUID accountId) {
        Organization organization = managed(organizationId, accountId);
        organization.dismissOnboarding();
        return organization;
    }

    private Organization managed(UUID organizationId, UUID accountId) {
        return organizations.findManagedBy(organizationId, accountId).orElseThrow(OrganizationNotFoundException::new);
    }
}
