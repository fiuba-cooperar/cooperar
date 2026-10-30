package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrganizationProfileService {

    private final OrganizationRepository organizations;

    public OrganizationProfileService(OrganizationRepository organizations) {
        this.organizations = organizations;
    }

    // TODO(#12): only approved organizations have a public profile.
    @Transactional(readOnly = true)
    public Organization getPublicProfile(String slug) {
        return organizations.findBySlug(slug).orElseThrow(OrganizationNotFoundException::new);
    }
}
