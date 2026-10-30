package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import java.time.Clock;
import java.util.List;
import java.util.UUID;
import java.util.function.Consumer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The observatory's review of new organizations: approving one makes it public, rejecting one requires a reason. */
@Service
public class OrganizationReviewService {

    private static final Logger log = LoggerFactory.getLogger(OrganizationReviewService.class);

    private final OrganizationRepository organizations;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    public OrganizationReviewService(
            OrganizationRepository organizations, ApplicationEventPublisher events, Clock clock) {
        this.organizations = organizations;
        this.events = events;
        this.clock = clock;
    }

    /** Organizations awaiting review, oldest first, with the account that registered them loaded. */
    @Transactional(readOnly = true)
    public List<Organization> listAwaitingReview() {
        return organizations.findAwaitingReview();
    }

    @Transactional
    public void approve(UUID organizationId, UUID reviewerId) {
        review(organizationId, organization -> organization.approve(reviewerId, clock.instant()));
    }

    @Transactional
    public void reject(UUID organizationId, String reason, UUID reviewerId) {
        review(organizationId, organization -> organization.reject(reason, reviewerId, clock.instant()));
    }

    private void review(UUID organizationId, Consumer<Organization> decision) {
        Organization organization =
                organizations.findById(organizationId).orElseThrow(OrganizationNotFoundException::new);
        decision.accept(organization);
        log.info("Organization {} was reviewed: {}", organization.getId(), organization.getStatus());

        // An organization awaiting review always has the account that registered it.
        UserAccount account = organization.getRegisteredBy();
        events.publishEvent(new OrganizationReviewed(
                account.getId(),
                account.getEmail(),
                account.getFirstName(),
                organization.getName(),
                organization.getStatus(),
                organization.getRejectionReason()));
    }
}
