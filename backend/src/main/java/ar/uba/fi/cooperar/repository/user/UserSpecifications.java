package ar.uba.fi.cooperar.repository.user;

import ar.uba.fi.cooperar.domain.user.Role;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.domain.user.UserCriteria;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

/** The accounts that match what the observatory is looking for. */
final class UserSpecifications {

    private UserSpecifications() {}

    static Specification<UserAccount> of(UserCriteria criteria) {
        return (user, query, builder) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (criteria.query() != null) {
                predicates.add(builder.like(
                        builder.lower(builder.function("unaccent", String.class, searchableText(user, builder))),
                        "%" + escapeLike(fold(criteria.query())) + "%",
                        '!'));
            }
            if (criteria.role() != null) {
                predicates.add(builder.equal(user.get("role"), criteria.role()));
            }
            if (criteria.emailVerified() != null) {
                predicates.add(
                        criteria.emailVerified()
                                ? builder.isNotNull(user.get("emailVerifiedAt"))
                                : builder.isNull(user.get("emailVerifiedAt")));
            }
            if (criteria.withoutOrganizations()) {
                // An observatory account never manages organizations, so it is not one that is missing them.
                predicates.add(builder.equal(user.get("role"), Role.COOPERATIVE));
                predicates.add(builder.isEmpty(user.get("organizations")));
            }
            return builder.and(predicates.toArray(Predicate[]::new));
        };
    }

    /** Name, surname and email in one text, so «maria gomez» finds María Gómez. */
    private static Expression<String> searchableText(Root<UserAccount> user, CriteriaBuilder builder) {
        Expression<String> firstName = builder.coalesce(user.get("firstName"), "");
        Expression<String> lastName = builder.coalesce(user.get("lastName"), "");
        return builder.concat(
                builder.concat(builder.concat(builder.concat(firstName, " "), lastName), " "), user.get("email"));
    }

    private static String fold(String text) {
        return Normalizer.normalize(text, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
    }

    private static String escapeLike(String text) {
        return text.replace("!", "!!").replace("%", "!%").replace("_", "!_");
    }
}
