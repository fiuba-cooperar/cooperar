package ar.uba.fi.cooperar.service.organizations;

import ar.uba.fi.cooperar.domain.organizations.Organization;
import ar.uba.fi.cooperar.domain.organizations.OrganizationStatus;
import ar.uba.fi.cooperar.repository.organizations.OrganizationPhotoRepository;
import ar.uba.fi.cooperar.repository.organizations.OrganizationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrganizationProfileService {

    private final OrganizationRepository organizations;
    private final OrganizationPhotoRepository photos;

    public OrganizationProfileService(OrganizationRepository organizations, OrganizationPhotoRepository photos) {
        this.organizations = organizations;
        this.photos = photos;
    }

    /** Unapproved organizations answer as if they did not exist, so a sign-up in progress stays private. */
    @Transactional(readOnly = true)
    public OrganizationWithPhotos getPublicProfile(String slug) {
        Organization organization = organizations
                .findBySlugAndStatus(slug, OrganizationStatus.APPROVED)
                .orElseThrow(OrganizationNotFoundException::new);
        return new OrganizationWithPhotos(
                organization, photos.findByOrganizationIdOrderBySortOrder(organization.getId()));
    }
}
