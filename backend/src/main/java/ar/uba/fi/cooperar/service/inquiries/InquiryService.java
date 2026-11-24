package ar.uba.fi.cooperar.service.inquiries;

import ar.uba.fi.cooperar.domain.catalog.Product;
import ar.uba.fi.cooperar.domain.inquiries.Inquiry;
import ar.uba.fi.cooperar.domain.inquiries.InquiryContent;
import ar.uba.fi.cooperar.repository.inquiries.InquiryRepository;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import ar.uba.fi.cooperar.service.catalog.ProductService;
import ar.uba.fi.cooperar.shared.ratelimit.TooManyRequestsException;
import java.time.Clock;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InquiryService {

    private static final Logger log = LoggerFactory.getLogger(InquiryService.class);

    private final InquiryRepository inquiries;
    private final OrganizationRepository organizations;
    private final ProductService products;
    private final InquiryRateLimiter rateLimiter;
    private final Clock clock;

    public InquiryService(
            InquiryRepository inquiries,
            OrganizationRepository organizations,
            ProductService products,
            InquiryRateLimiter rateLimiter,
            Clock clock) {
        this.inquiries = inquiries;
        this.organizations = organizations;
        this.products = products;
        this.rateLimiter = rateLimiter;
        this.clock = clock;
    }

    /**
     * A visitor, with no account, asks the organization that offers a published product. `sender` identifies who is
     * sending it (their address) only to limit abuse. `accountId` is the signed-in account, if any: one that manages
     * the organization cannot ask about its own product.
     *
     * @throws OwnProductInquiryException if the account manages the organization that offers the product
     * @throws TooManyRequestsException if `sender` already sent the maximum for the period
     */
    @Transactional
    public Inquiry send(UUID productId, InquiryContent content, String sender, UUID accountId) {
        // First, so that probing products does not escape the limit either.
        rateLimiter.acquire(sender);
        Product product = products.getPublic(productId);
        if (accountId != null
                && organizations
                        .findManagedBy(product.getOrganization().getId(), accountId)
                        .isPresent()) {
            throw new OwnProductInquiryException();
        }
        Inquiry inquiry = inquiries.save(new Inquiry(
                product.getOrganization().getId(), product.getId(), product.getName(), content, clock.instant()));
        log.info("Inquiry {} received for organization {}", inquiry.getId(), inquiry.getOrganizationId());
        return inquiry;
    }
}
