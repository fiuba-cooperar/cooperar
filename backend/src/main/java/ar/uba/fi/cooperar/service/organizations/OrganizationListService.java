package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.ActivityType;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationType;
import ar.uba.fi.cooperar.domain.organizations.Sector;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository;
import ar.uba.fi.cooperar.repository.user.UserAccountRepository.OrganizationUser;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The organizations the observatory manages: every approved one, filtered as the observatory asks. */
@Service
public class OrganizationListService {

    private final OrganizationRepository organizations;
    private final UserAccountRepository users;

    public OrganizationListService(OrganizationRepository organizations, UserAccountRepository users) {
        this.organizations = organizations;
        this.users = users;
    }

    /** By name, each with the accounts that manage it; each filter that is null leaves its criterion out. */
    @Transactional(readOnly = true)
    public List<OrganizationSummary> list(OrganizationType type, ActivityType activityType, Sector sector) {
        List<Organization> found = organizations.findFiltered(type, activityType, sector);
        Map<UUID, List<OrganizationUser>> usersByOrganization = found.isEmpty()
                ? Map.of()
                : users
                        .findOrganizationUsers(
                                found.stream().map(Organization::getId).toList())
                        .stream()
                        .collect(Collectors.groupingBy(OrganizationUser::getOrganizationId));
        return found.stream()
                .map(organization -> new OrganizationSummary(
                        organization, usersByOrganization.getOrDefault(organization.getId(), List.of())))
                .toList();
    }
}
