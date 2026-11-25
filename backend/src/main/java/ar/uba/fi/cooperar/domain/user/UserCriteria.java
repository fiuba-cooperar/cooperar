package ar.uba.fi.cooperar.domain.user;

/**
 * What the observatory looks for among the accounts: a part of the name, the surname or the email (without caring
 * about case or accents), a role, whether the email is confirmed, and only the organization accounts that manage no
 * approved organization. A null criterion, or {@code withoutOrganizations} false, leaves that filter out.
 */
public record UserCriteria(String query, Role role, Boolean emailVerified, boolean withoutOrganizations) {

    public UserCriteria {
        query = query == null || query.isBlank() ? null : query.trim();
    }
}
