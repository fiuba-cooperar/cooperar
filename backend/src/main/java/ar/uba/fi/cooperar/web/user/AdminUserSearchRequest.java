package ar.uba.fi.cooperar.web.user;

import ar.uba.fi.cooperar.domain.user.Role;
import ar.uba.fi.cooperar.domain.user.UserCriteria;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

/** The query string of the list of accounts the observatory sees. */
public record AdminUserSearchRequest(
        @Schema(description = "A part of the name, the surname or the email, without caring about case or accents")
        @Size(max = 200)
        String q,

        @Schema(description = "Only the accounts with this role")
        Role role,

        @Schema(description = "Only the accounts that confirmed their email (true) or that did not (false)")
        Boolean emailVerified,

        @Schema(description = "Only the organization accounts that manage no approved organization")
        Boolean withoutOrganizations,

        @Schema(description = "From 0; 0 by default") @Min(0)
        Integer page,

        @Schema(description = "20 by default") @Min(1) @Max(MAX_SIZE)
        Integer size) {

    static final int MAX_SIZE = 50;
    private static final int DEFAULT_SIZE = 20;

    UserCriteria criteria() {
        return new UserCriteria(q, role, emailVerified, Boolean.TRUE.equals(withoutOrganizations));
    }

    int pageOrDefault() {
        return page == null ? 0 : page;
    }

    int sizeOrDefault() {
        return size == null ? DEFAULT_SIZE : size;
    }
}
