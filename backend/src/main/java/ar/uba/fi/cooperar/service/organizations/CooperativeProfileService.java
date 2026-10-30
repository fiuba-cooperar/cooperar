package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.Cooperative;
import ar.uba.fi.cooperar.repository.organizations.CooperativeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CooperativeProfileService {

    private final CooperativeRepository cooperatives;

    public CooperativeProfileService(CooperativeRepository cooperatives) {
        this.cooperatives = cooperatives;
    }

    // TODO(#12): only approved cooperatives have a public profile.
    @Transactional(readOnly = true)
    public Cooperative getPublicProfile(String slug) {
        return cooperatives.findBySlug(slug).orElseThrow(CooperativeNotFoundException::new);
    }
}
