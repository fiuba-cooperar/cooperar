package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The organizations the observatory manages: every approved one, filtered as the observatory asks. */
@Service
public class OrganizationListService {

    private final OrganizationRepository organizations;

    public OrganizationListService(OrganizationRepository organizations) {
        this.organizations = organizations;
    }

    /** By name; each filter that is null leaves its criterion out. */
    @Transactional(readOnly = true)
    public List<Organization> list(OrganizationType type, ActivityType activityType, Sector sector) {
        return organizations.findFiltered(type, activityType, sector);
    }
}
