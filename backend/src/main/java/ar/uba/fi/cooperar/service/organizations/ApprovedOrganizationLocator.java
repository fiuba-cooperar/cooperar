package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.Address;
import ar.uba.fi.cooperar.domain.organizations.OrganizationAddress;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import java.util.Optional;
import java.util.UUID;
import org.locationtech.jts.geom.Point;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Places a newly approved organization on the public map by geocoding the address of its registration, so it does not
 * wait for the organization to save its location. It runs after the approval commits and off the request, since the
 * geocoder may take seconds; if the address cannot be found the organization places the pin by hand, as before.
 */
@Component
public class ApprovedOrganizationLocator {

    private static final Logger log = LoggerFactory.getLogger(ApprovedOrganizationLocator.class);

    private final OrganizationRepository organizations;
    private final Geocoder geocoder;
    private final TransactionTemplate readOnly;
    private final TransactionTemplate readWrite;

    public ApprovedOrganizationLocator(
            OrganizationRepository organizations, Geocoder geocoder, PlatformTransactionManager transactions) {
        this.organizations = organizations;
        this.geocoder = geocoder;
        this.readOnly = new TransactionTemplate(transactions);
        this.readOnly.setReadOnly(true);
        this.readWrite = new TransactionTemplate(transactions);
    }

    @Async
    @TransactionalEventListener
    public void onRegistrationReviewed(RegistrationReviewed event) {
        UUID organizationId = event.organizationId();
        if (organizationId != null) {
            locate(organizationId);
        }
    }

    // No transaction is open while the geocoder answers, so no connection is held meanwhile.
    private void locate(UUID organizationId) {
        Optional<Address> address = readOnly.execute(status -> organizations
                .findById(organizationId)
                .map(organization -> organization.getMainAddress())
                .filter(main -> main.getLocation() == null)
                .map(OrganizationAddress::getAddress));
        if (address == null || address.isEmpty()) {
            return;
        }
        Optional<Point> point = geocoder.locate(address.get());
        if (point.isEmpty()) {
            log.info("Could not locate the main address of organization {} on approval", organizationId);
            return;
        }
        Boolean located = readWrite.execute(status -> organizations
                .findById(organizationId)
                .map(organization -> organization.locateMainAddress(address.get(), point.get()))
                .orElse(false));
        if (Boolean.TRUE.equals(located)) {
            log.info("Located the main address of organization {} on approval", organizationId);
        }
    }
}
