package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.ReviewOutcome;
import java.util.UUID;

/**
 * Published when the observatory approves or rejects a registration request, or asks for changes, to let the account
 * that sent it know. `organizationId` is only there for an approval.
 */
public record RegistrationReviewed(
        UUID accountId,
        String email,
        String firstName,
        UUID requestId,
        String organizationName,
        UUID organizationId,
        ReviewOutcome outcome,
        String message) {}
