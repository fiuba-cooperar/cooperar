package ar.uba.fi.cooperar.repository.inquiries;

import ar.uba.fi.cooperar.domain.inquiries.Inquiry;
import ar.uba.fi.cooperar.domain.inquiries.InquiryStatus;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

/** The inquiries of an organization that match its inbox search. */
final class InquirySpecifications {

    private InquirySpecifications() {}

    /**
     * Every word of `query` has to appear in some field (the sender's name, email and phone, the product's name, the
     * quantity or the message), regardless of case and accents. `status` and `query` are optional.
     */
    static Specification<Inquiry> of(UUID organizationId, InquiryStatus status, String query) {
        return (inquiry, criteria, builder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(builder.equal(inquiry.get("organizationId"), organizationId));
            if (status != null) {
                predicates.add(builder.equal(inquiry.get("status"), status));
            }
            if (query != null) {
                Expression<String> text =
                        builder.lower(builder.function("unaccent", String.class, searchableText(inquiry, builder)));
                Arrays.stream(fold(query).split("\\s+"))
                        .filter(word -> !word.isEmpty())
                        .forEach(word -> predicates.add(builder.like(text, "%" + escapeLike(word) + "%", '!')));
            }
            return builder.and(predicates.toArray(Predicate[]::new));
        };
    }

    /** The ones before `inquiry` in the inbox order (newest first, then by id), or after it. */
    static Specification<Inquiry> around(Inquiry inquiry, boolean before) {
        return (other, criteria, builder) -> {
            if (before) {
                return builder.or(
                        builder.greaterThan(other.get("createdAt"), inquiry.getCreatedAt()),
                        builder.and(
                                builder.equal(other.get("createdAt"), inquiry.getCreatedAt()),
                                builder.greaterThan(other.get("id"), inquiry.getId())));
            }
            return builder.or(
                    builder.lessThan(other.get("createdAt"), inquiry.getCreatedAt()),
                    builder.and(
                            builder.equal(other.get("createdAt"), inquiry.getCreatedAt()),
                            builder.lessThan(other.get("id"), inquiry.getId())));
        };
    }

    /** The fields in one text. The phone also goes with its digits alone, so «44445555» finds «(011) 4444-5555». */
    private static Expression<String> searchableText(Root<Inquiry> inquiry, CriteriaBuilder builder) {
        Expression<String> phone = builder.coalesce(inquiry.get("senderPhone"), "");
        Expression<String> phoneDigits = builder.function(
                "regexp_replace",
                String.class,
                phone,
                builder.literal("[^0-9]"),
                builder.literal(""),
                builder.literal("g"));
        Expression<String> quantity =
                builder.coalesce(builder.function("text", String.class, inquiry.get("quantity")), "");
        List<Expression<String>> fields = List.of(
                inquiry.get("senderName"),
                builder.coalesce(inquiry.get("senderEmail"), ""),
                phone,
                phoneDigits,
                inquiry.get("productName"),
                quantity,
                inquiry.get("message"));
        Expression<String> text = fields.getFirst();
        for (Expression<String> field : fields.subList(1, fields.size())) {
            text = builder.concat(builder.concat(text, " "), field);
        }
        return text;
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
