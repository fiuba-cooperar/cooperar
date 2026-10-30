package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.OrganizationStatus;
import java.util.UUID;

/** Published when the observatory approves or rejects an organization, to let the account that registered it know. */
public record OrganizationReviewed(
        UUID accountId,
        String email,
        String firstName,
        String organizationName,
        OrganizationStatus outcome,
        String rejectionReason) {}
