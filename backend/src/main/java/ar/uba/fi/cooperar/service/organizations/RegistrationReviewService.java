package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.RegistrationRequest;
import ar.uba.fi.cooperar.domain.organizations.RegistrationReview;
import ar.uba.fi.cooperar.domain.organizations.RegistrationStatus;
import ar.uba.fi.cooperar.domain.organizations.ReviewOutcome;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import ar.uba.fi.cooperar.repository.organizations.RegistrationRequestRepository;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The observatory's review of registration requests: approving one creates the organization, while rejecting it or
 * asking for changes requires a message for the account that sent it.
 */
@Service
public class RegistrationReviewService {

    private static final Logger log = LoggerFactory.getLogger(RegistrationReviewService.class);

    private final RegistrationRequestRepository requests;
    private final OrganizationRepository organizations;
    private final OrganizationSlugs slugs;
    private final UserAccountRepository users;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    public RegistrationReviewService(
            RegistrationRequestRepository requests,
            OrganizationRepository organizations,
            OrganizationSlugs slugs,
            UserAccountRepository users,
            ApplicationEventPublisher events,
            Clock clock) {
        this.requests = requests;
        this.organizations = organizations;
        this.slugs = slugs;
        this.users = users;
        this.events = events;
        this.clock = clock;
    }

    /**
     * Requests with the given status and organization type (any type when it is null), with the account that sent them
     * and every decision loaded. Pending ones are only those awaiting review, the oldest submission first; the rest go
     * from the latest decision back.
     */
    @Transactional(readOnly = true)
    public List<RegistrationRequest> list(RegistrationStatus status, OrganizationType type) {
        if (status == RegistrationStatus.PENDING) {
            return requests.findAwaitingReview(type);
        }
        return requests.findWithReviewsByStatus(status, type).stream()
                .sorted(Comparator.comparing(RegistrationReviewService::lastDecision)
                        .reversed())
                .toList();
    }

    /** How many requests of the organization type (any when it is null) there are in each status, all present. */
    @Transactional(readOnly = true)
    public Map<RegistrationStatus, Long> countByStatus(OrganizationType type) {
        Map<RegistrationStatus, Long> counts = new EnumMap<>(RegistrationStatus.class);
        for (RegistrationStatus status : RegistrationStatus.values()) {
            counts.put(status, 0L);
        }
        requests.countByStatus(type).forEach(count -> counts.put(count.getStatus(), count.getTotal()));
        return counts;
    }

    /** Creates the organization, managed from then on by the account that sent the request. */
    @Transactional
    public void approve(UUID requestId, UUID reviewerId) {
        RegistrationRequest request = find(requestId);
        if (organizations.existsByCuit(request.getCuit().digits())) {
            throw new CuitAlreadyRegisteredException();
        }
        Organization organization =
                request.approve(slugs.uniqueFor(request.getName()), users.getReferenceById(reviewerId), now());
        log.info("Registration request {} was approved as organization {}", requestId, organization.getId());
        notify(request, ReviewOutcome.APPROVED);
    }

    @Transactional
    public void reject(UUID requestId, String reason, UUID reviewerId) {
        RegistrationRequest request = find(requestId);
        request.reject(reason, users.getReferenceById(reviewerId), now());
        log.info("Registration request {} was rejected", requestId);
        notify(request, ReviewOutcome.REJECTED);
    }

    @Transactional
    public void requestChanges(UUID requestId, String message, UUID reviewerId) {
        RegistrationRequest request = find(requestId);
        request.requestChanges(message, users.getReferenceById(reviewerId), now());
        log.info("Registration request {} was sent back for changes", requestId);
        notify(request, ReviewOutcome.CHANGES_REQUESTED);
    }

    private RegistrationRequest find(UUID requestId) {
        return requests.findById(requestId).orElseThrow(RegistrationRequestNotFoundException::new);
    }

    private Instant now() {
        return clock.instant();
    }

    private void notify(RegistrationRequest request, ReviewOutcome outcome) {
        // A request awaiting review always has the account that sent it.
        UserAccount account = request.getRegisteredBy();
        events.publishEvent(new RegistrationReviewed(
                account.getId(),
                account.getEmail(),
                account.getFirstName(),
                request.getName(),
                outcome,
                request.getReviewMessage()));
    }

    private static Instant lastDecision(RegistrationRequest request) {
        List<RegistrationReview> reviews = request.getReviews();
        return reviews.isEmpty() ? request.getSubmittedAt() : reviews.getLast().getReviewedAt();
    }
}
