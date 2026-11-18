package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.Cuit;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import ar.uba.fi.cooperar.repository.organizations.RegistrationRequestRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** A CUIT is taken by an organization, or by a request still under review. Rejected requests no longer hold it. */
@Service
public class CuitAvailability {

    private static final UUID NO_REQUEST = new UUID(0, 0);

    private final OrganizationRepository organizations;
    private final RegistrationRequestRepository requests;

    public CuitAvailability(OrganizationRepository organizations, RegistrationRequestRepository requests) {
        this.organizations = organizations;
        this.requests = requests;
    }

    @Transactional(readOnly = true)
    public boolean isTaken(Cuit cuit) {
        return isTakenByOtherThan(cuit, NO_REQUEST);
    }

    /** Ignores the given request, which is the one being corrected. */
    @Transactional(readOnly = true)
    public boolean isTakenByOtherThan(Cuit cuit, UUID requestId) {
        return organizations.existsByCuit(cuit.digits()) || requests.existsOpenWithCuit(cuit.digits(), requestId);
    }
}
