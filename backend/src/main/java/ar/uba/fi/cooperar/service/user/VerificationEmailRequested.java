package ar.uba.fi.cooperar.service.user;

import java.util.UUID;

/** Published when an account needs a link to confirm its email. The token only lives in memory and in the email. */
public record VerificationEmailRequested(UUID accountId, String email, String firstName, String token) {}
