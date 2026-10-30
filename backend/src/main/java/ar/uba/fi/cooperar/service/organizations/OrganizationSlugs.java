package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.Slugs;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Picks the slug for a new organization: the name's slug, numbered from 2 when another organization already has it. */
@Service
public class OrganizationSlugs {

    private final OrganizationRepository organizations;

    public OrganizationSlugs(OrganizationRepository organizations) {
        this.organizations = organizations;
    }

    @Transactional(readOnly = true)
    public String uniqueFor(String name) {
        String base = Slugs.fromName(name);
        String candidate = base;
        for (int suffix = 2; organizations.existsBySlug(candidate); suffix++) {
            candidate = base + "-" + suffix;
        }
        return candidate;
    }
}
