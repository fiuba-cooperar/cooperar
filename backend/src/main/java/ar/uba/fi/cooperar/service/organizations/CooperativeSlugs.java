package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.Slugs;
import ar.uba.fi.cooperar.repository.organizations.CooperativeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Picks the slug for a new cooperative: the name's slug, numbered from 2 when another cooperative already has it. */
@Service
public class CooperativeSlugs {

    private final CooperativeRepository cooperatives;

    public CooperativeSlugs(CooperativeRepository cooperatives) {
        this.cooperatives = cooperatives;
    }

    @Transactional(readOnly = true)
    public String uniqueFor(String name) {
        String base = Slugs.fromName(name);
        String candidate = base;
        for (int suffix = 2; cooperatives.existsBySlug(candidate); suffix++) {
            candidate = base + "-" + suffix;
        }
        return candidate;
    }
}
