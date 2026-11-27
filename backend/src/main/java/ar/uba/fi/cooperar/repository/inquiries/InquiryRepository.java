package ar.uba.fi.cooperar.repository.inquiries;

import ar.uba.fi.cooperar.domain.inquiries.Inquiry;
import ar.uba.fi.cooperar.domain.inquiries.InquiryStatus;
import java.util.EnumMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface InquiryRepository extends JpaRepository<Inquiry, UUID>, JpaSpecificationExecutor<Inquiry> {

    /** A page of the inquiries of an organization, newest first; `status` and `query` are optional. */
    default Page<Inquiry> search(UUID organizationId, InquiryStatus status, String query, int page, int size) {
        return findAll(
                InquirySpecifications.of(organizationId, status, query),
                PageRequest.of(page, size, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))));
    }

    /**
     * The inquiries next to `inquiry` in the inbox as it is searched and filtered, and how many match. Works also when
     * `inquiry` itself no longer matches (it was just answered and the new ones are asked for): its neighbors are still
     * the ones around its place.
     */
    default InboxNeighbors neighbors(Inquiry inquiry, InquiryStatus status, String query) {
        Specification<Inquiry> matching = InquirySpecifications.of(inquiry.getOrganizationId(), status, query);
        Sort newestFirst = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));
        Optional<Inquiry> previous = findAll(
                        matching.and(InquirySpecifications.around(inquiry, true)),
                        PageRequest.of(0, 1, newestFirst.reverse()))
                .stream()
                .findFirst();
        Optional<Inquiry> next =
                findAll(matching.and(InquirySpecifications.around(inquiry, false)), PageRequest.of(0, 1, newestFirst))
                        .stream()
                        .findFirst();
        return new InboxNeighbors(
                previous.map(Inquiry::getId).orElse(null),
                next.map(Inquiry::getId).orElse(null),
                count(matching));
    }

    record InboxNeighbors(UUID previousId, UUID nextId, long total) {}

    /** How many of the inquiries that match `query` are in each status, whatever the status filter. */
    default Map<InquiryStatus, Long> countByStatus(UUID organizationId, String query) {
        Map<InquiryStatus, Long> counts = new EnumMap<>(InquiryStatus.class);
        for (InquiryStatus status : InquiryStatus.values()) {
            counts.put(status, count(InquirySpecifications.of(organizationId, status, query)));
        }
        return counts;
    }

    Optional<Inquiry> findByIdAndOrganizationId(UUID id, UUID organizationId);
}
