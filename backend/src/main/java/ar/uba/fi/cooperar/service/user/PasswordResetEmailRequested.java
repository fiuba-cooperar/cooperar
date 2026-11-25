package ar.uba.fi.cooperar.service.user;

import java.util.UUID;

/** Published when an account asks for a link to choose a new password. The token only lives in memory and in the email. */
public record PasswordResetEmailRequested(UUID accountId, String email, String firstName, String token) {}
