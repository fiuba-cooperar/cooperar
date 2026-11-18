package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.Cuit;
import ar.uba.fi.cooperar.domain.organizations.OrganizationDetails;
import ar.uba.fi.cooperar.domain.organizations.RegistrationRequest;
import ar.uba.fi.cooperar.domain.user.UserAccount;
import ar.uba.fi.cooperar.repository.organizations.RegistrationRequestRepository;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository;
import java.time.Clock;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Registration requests as the account that sent them sees them: sending a new one, and correcting it when the
 * observatory asks for changes. Requests of other accounts are reported as missing, so as not to reveal them.
 */
@Service
public class RegistrationRequestService {

    private static final Logger log = LoggerFactory.getLogger(RegistrationRequestService.class);

    private final RegistrationRequestRepository requests;
    private final UserAccountRepository users;
    private final CuitAvailability cuits;
    private final Clock clock;

    public RegistrationRequestService(
            RegistrationRequestRepository requests, UserAccountRepository users, CuitAvailability cuits, Clock clock) {
        this.requests = requests;
        this.users = users;
        this.cuits = cuits;
        this.clock = clock;
    }

    /** Every request the account sent, newest first. */
    @Transactional(readOnly = true)
    public List<RegistrationRequest> list(UUID accountId) {
        return requests.findAllSentBy(accountId);
    }

    /**
     * Sends a request to add another organization. Like the one sent on sign-up, it reaches the review once the
     * account has confirmed its email.
     */
    @Transactional
    public RegistrationRequest create(UUID accountId, OrganizationDetails details) {
        if (cuits.isTaken(Cuit.parse(details.cuit()))) {
            throw new CuitAlreadyRegisteredException();
        }
        UserAccount account = users.getReferenceById(accountId);
        RegistrationRequest request = new RegistrationRequest(details, account, clock.instant());
        try {
            requests.saveAndFlush(request);
        } catch (DataIntegrityViolationException e) {
            // Another request took the CUIT between the check above and the insert.
            throw new CuitAlreadyRegisteredException();
        }
        log.info("Account {} sent registration request {}", accountId, request.getId());
        return request;
    }

    @Transactional(readOnly = true)
    public RegistrationRequest get(UUID requestId, UUID accountId) {
        return sentBy(requestId, accountId);
    }

    /** Saves the corrected request and sends it back to the observatory's review. */
    @Transactional
    public RegistrationRequest resubmit(UUID requestId, UUID accountId, OrganizationDetails details) {
        RegistrationRequest request = sentBy(requestId, accountId);
        if (cuits.isTakenByOtherThan(Cuit.parse(details.cuit()), requestId)) {
            throw new CuitAlreadyRegisteredException();
        }
        request.resubmit(details, clock.instant());
        try {
            requests.saveAndFlush(request);
        } catch (DataIntegrityViolationException e) {
            // Another request took the CUIT between the check above and the update.
            throw new CuitAlreadyRegisteredException();
        }
        log.info("Registration request {} was resubmitted for review", requestId);
        return request;
    }

    private RegistrationRequest sentBy(UUID requestId, UUID accountId) {
        return requests.findSentBy(requestId, accountId).orElseThrow(RegistrationRequestNotFoundException::new);
    }
}
