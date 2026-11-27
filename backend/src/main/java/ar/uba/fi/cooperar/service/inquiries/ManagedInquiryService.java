package ar.uba.fi.cooperar.service.inquiries;

import ar.uba.fi.cooperar.domain.inquiries.Inquiry;
import ar.uba.fi.cooperar.domain.inquiries.InquiryStatus;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.repository.inquiries.InquiryRepository;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository;
import ar.uba.fi.cooperar.service.organizations.OrganizationNotFoundException;
import java.time.Clock;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The inbox of an organization: the inquiries it received, its answers and their status. Every operation is only for
 * the accounts that manage the organization; for any other, the organization and its inquiries do not exist.
 */
@Service
public class ManagedInquiryService {

    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 50;

    private static final Logger log = LoggerFactory.getLogger(ManagedInquiryService.class);

    private final InquiryRepository inquiries;
    private final OrganizationRepository organizations;
    private final UserAccountRepository accounts;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    public ManagedInquiryService(
            InquiryRepository inquiries,
            OrganizationRepository organizations,
            UserAccountRepository accounts,
            ApplicationEventPublisher events,
            Clock clock) {
        this.inquiries = inquiries;
        this.organizations = organizations;
        this.accounts = accounts;
        this.events = events;
        this.clock = clock;
    }

    /**
     * The newest first; `status`, when given, leaves only the inquiries in it, and `query` the ones with all its words.
     * The counts follow the search but not the status.
     */
    @Transactional(readOnly = true)
    public InquiryPage list(
            UUID organizationId, UUID accountId, InquiryStatus status, String query, int page, int size) {
        managed(organizationId, accountId);
        int pageNumber = Math.max(page, 0);
        int pageSize = Math.clamp(size, 1, MAX_PAGE_SIZE);
        String search = query == null || query.isBlank() ? null : query.strip();
        Page<Inquiry> found = inquiries.search(organizationId, status, search, pageNumber, pageSize);
        return new InquiryPage(
                found.getContent(),
                pageNumber,
                pageSize,
                found.getTotalElements(),
                inquiries.countByStatus(organizationId, search));
    }

    @Transactional(readOnly = true)
    public ManagedInquiry get(UUID organizationId, UUID accountId, UUID inquiryId) {
        Organization organization = managed(organizationId, accountId);
        return ManagedInquiry.of(find(organizationId, inquiryId), organization);
    }

    /**
     * Emails the answer to whoever asked, once the transaction commits, with the profile's contact email to reply to,
     * and leaves the inquiry answered.
     *
     * @throws OrganizationEmailMissingException if the profile has no contact email
     */
    @Transactional
    public ManagedInquiry reply(UUID organizationId, UUID accountId, UUID inquiryId, String message) {
        Organization organization = managed(organizationId, accountId);
        Inquiry inquiry = find(organizationId, inquiryId);
        if (organization.getEmail() == null) {
            throw new OrganizationEmailMissingException();
        }
        String authorName =
                accounts.findById(accountId).map(UserAccount::getFirstName).orElse(null);
        String reply =
                inquiry.reply(accountId, authorName, message, clock.instant()).getMessage();
        events.publishEvent(new InquiryReplied(
                inquiry.getId(),
                organization.getName(),
                organization.getSlug(),
                organization.getEmail(),
                inquiry.getProductId(),
                inquiry.getProductName(),
                inquiry.getSenderName(),
                inquiry.getSenderEmail(),
                reply));
        log.info("Account {} answered inquiry {}", accountId, inquiry.getId());
        return ManagedInquiry.of(inquiry, organization);
    }

    @Transactional
    public ManagedInquiry changeStatus(UUID organizationId, UUID accountId, UUID inquiryId, InquiryStatus status) {
        Organization organization = managed(organizationId, accountId);
        Inquiry inquiry = find(organizationId, inquiryId);
        inquiry.changeStatus(status);
        return ManagedInquiry.of(inquiry, organization);
    }

    /** The inquiries before and after this one in the inbox searched and filtered as given, to go through them. */
    @Transactional(readOnly = true)
    public InquiryNeighbors neighbors(
            UUID organizationId, UUID accountId, UUID inquiryId, InquiryStatus status, String query) {
        managed(organizationId, accountId);
        String search = query == null || query.isBlank() ? null : query.strip();
        InquiryRepository.InboxNeighbors found = inquiries.neighbors(find(organizationId, inquiryId), status, search);
        return new InquiryNeighbors(found.previousId(), found.nextId(), found.total());
    }

    private Organization managed(UUID organizationId, UUID accountId) {
        return organizations.findManagedBy(organizationId, accountId).orElseThrow(OrganizationNotFoundException::new);
    }

    private Inquiry find(UUID organizationId, UUID inquiryId) {
        return inquiries
                .findByIdAndOrganizationId(inquiryId, organizationId)
                .orElseThrow(InquiryNotFoundException::new);
    }
}
