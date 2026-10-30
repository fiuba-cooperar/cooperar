package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationStatus;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrganizationProfileService {

    private final OrganizationRepository organizations;

    public OrganizationProfileService(OrganizationRepository organizations) {
        this.organizations = organizations;
    }

    /** Unapproved organizations answer as if they did not exist, so a sign-up in progress stays private. */
    @Transactional(readOnly = true)
    public Organization getPublicProfile(String slug) {
        return organizations
                .findBySlugAndStatus(slug, OrganizationStatus.APPROVED)
                .orElseThrow(OrganizationNotFoundException::new);
    }
}
