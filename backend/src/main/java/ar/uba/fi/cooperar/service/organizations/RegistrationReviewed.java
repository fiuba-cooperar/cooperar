package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.ReviewOutcome;
import java.util.UUID;

/**
 * Published when the observatory approves or rejects a registration request, or asks for changes, to let the account
 * that sent it know.
 */
public record RegistrationReviewed(
        UUID accountId,
        String email,
        String firstName,
        String organizationName,
        ReviewOutcome outcome,
        String message) {}
