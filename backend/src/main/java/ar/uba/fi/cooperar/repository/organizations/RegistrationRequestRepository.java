package ar.uba.fi.cooperar.repository.organizations;

import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.RegistrationRequest;
import ar.uba.fi.cooperar.domain.organizations.RegistrationStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RegistrationRequestRepository extends JpaRepository<RegistrationRequest, UUID> {

    /**
     * The review queue: pending requests whose account confirmed its email, the ones that went into the review first
     * on top, of the given organization type or of any when it is null. Loads the account and the previous decisions,
     * which the reviewer needs to see.
     */
    @Query("""
            select request from RegistrationRequest request
              join fetch request.registeredBy account
              left join fetch request.reviews review
              left join fetch review.reviewedBy
            where request.status = ar.uba.fi.cooperar.domain.organizations.RegistrationStatus.PENDING
              and account.emailVerifiedAt is not null
              and (:type is null or request.type = :type)
            order by request.submittedAt
            """)
    List<RegistrationRequest> findAwaitingReview(OrganizationType type);

    /**
     * Requests with the given status, of the given organization type or of any when it is null, with their account and
     * their decisions loaded, in no particular order.
     */
    @Query("""
            select request from RegistrationRequest request
              left join fetch request.registeredBy
              left join fetch request.reviews review
              left join fetch review.reviewedBy
            where request.status = :status
              and (:type is null or request.type = :type)
            """)
    List<RegistrationRequest> findWithReviewsByStatus(RegistrationStatus status, OrganizationType type);

    /**
     * How many requests of the given organization type, or of any when it is null, there are in each status; pending
     * ones count only once they reach the review.
     */
    @Query("""
            select request.status as status, count(request) as total
            from RegistrationRequest request left join request.registeredBy account
            where (request.status <> ar.uba.fi.cooperar.domain.organizations.RegistrationStatus.PENDING
                   or account.emailVerifiedAt is not null)
              and (:type is null or request.type = :type)
            group by request.status
            """)
    List<StatusCount> countByStatus(OrganizationType type);

    /** The requests an account sent that did not end in an organization, newest first. */
    @Query("""
            select request from RegistrationRequest request
            where request.registeredBy.id = :accountId
              and request.status <> ar.uba.fi.cooperar.domain.organizations.RegistrationStatus.APPROVED
            order by request.createdAt desc
            """)
    List<RegistrationRequest> findUnapprovedSentBy(UUID accountId);

    /** The request, only if the account sent it, with the organization it became and its decisions loaded. */
    @Query("""
            select request from RegistrationRequest request
              left join fetch request.organization
              left join fetch request.reviews
            where request.id = :id and request.registeredBy.id = :accountId
            """)
    Optional<RegistrationRequest> findSentBy(UUID id, UUID accountId);

    /**
     * Every request the account sent, newest first, with its decisions and the organization each approved one became
     * loaded.
     */
    @Query("""
            select request from RegistrationRequest request
              left join fetch request.organization
              left join fetch request.reviews
            where request.registeredBy.id = :accountId
            order by request.createdAt desc
            """)
    List<RegistrationRequest> findAllSentBy(UUID accountId);

    /** Whether another request still under review claims the CUIT; rejected and approved ones no longer hold it. */
    @Query("""
            select count(request) > 0 from RegistrationRequest request
            where request.cuit = :cuit and request.id <> :excludedId
              and request.status in (
                ar.uba.fi.cooperar.domain.organizations.RegistrationStatus.PENDING,
                ar.uba.fi.cooperar.domain.organizations.RegistrationStatus.CHANGES_REQUESTED)
            """)
    boolean existsOpenWithCuit(String cuit, UUID excludedId);

    interface StatusCount {
        RegistrationStatus getStatus();

        long getTotal();
    }
}
